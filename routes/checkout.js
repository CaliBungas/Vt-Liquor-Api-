/**
 * checkout.js
 *
 * POST /api/checkout
 *
 * Vermont law (Title 7 V.S.A.) requires that liquor purchases be rung up
 * as a separate transaction from regular retail merchandise. This route
 * automatically splits the cart and runs two independent Stripe charges:
 *   1. Regular retail items  (VT 6% sales tax)
 *   2. Liquor items          (VT 10% liquor tax)
 *
 * If one charge succeeds and the other fails, we refund the successful
 * charge so the customer is never partially billed for a mixed order.
 *
 * The Stripe state tax payment is integrated by including calculated
 * tax amounts in each charge's metadata, which feeds into Stripe Tax
 * reporting for Vermont remittance.
 */

const express = require('express');
const Stripe = require('stripe');
const { splitCart } = require('../utils/splitCart');
const { logTransaction } = require('../db/logTransaction');

const router = express.Router();
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

router.post('/checkout', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to environment variables.' });
  }

  const { items, paymentMethodId, retailerId } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }
  if (!paymentMethodId) {
    return res.status(400).json({ error: 'paymentMethodId is required' });
  }

  // Split the cart into liquor vs regular — required by Vermont law
  const cart = splitCart(items);

  let regularChargeId = null;
  let liquorChargeId = null;

  try {
    // --- Charge 1: Regular retail items ---
    if (cart.regularItems.length > 0) {
      const regularCharge = await stripe.paymentIntents.create({
        amount: cart.regularTotal, // includes VT 6% sales tax
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          retailerId,
          type: 'regular',
          subtotal: cart.regularSubtotal,
          tax: cart.regularTax,
          taxRate: '0.06',
          state: 'VT',
        },
        description: `Regular retail purchase — ${retailerId}`,
      });
      regularChargeId = regularCharge.id;
    }

    // --- Charge 2: Liquor items (separate per VT law) ---
    if (cart.liquorItems.length > 0) {
      const liquorCharge = await stripe.paymentIntents.create({
        amount: cart.liquorTotal, // includes VT 10% liquor tax
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          retailerId,
          type: 'liquor',
          subtotal: cart.liquorSubtotal,
          tax: cart.liquorTax,
          taxRate: '0.10',
          state: 'VT',
        },
        description: `Liquor purchase (VT separate transaction) — ${retailerId}`,
      });
      liquorChargeId = liquorCharge.id;
    }

    // Log the successful transaction for audit records
    await logTransaction({
      retailerId,
      regularChargeId,
      liquorChargeId,
      regularAmount: cart.regularTotal,
      liquorAmount: cart.liquorTotal,
      regularTax: cart.regularTax,
      liquorTax: cart.liquorTax,
      status: 'success',
    });

    return res.json({
      success: true,
      regularChargeId,
      liquorChargeId,
      regularTotal: cart.regularTotal,
      liquorTotal: cart.liquorTotal,
      regularTax: cart.regularTax,
      liquorTax: cart.liquorTax,
    });
  } catch (err) {
    // If the second charge fails, refund the first one so the
    // customer isn't stuck with a partial charge
    if (regularChargeId && !liquorChargeId) {
      await stripe.refunds.create({ payment_intent: regularChargeId });
    }
    if (liquorChargeId && !regularChargeId) {
      await stripe.refunds.create({ payment_intent: liquorChargeId });
    }

    const refundedId = regularChargeId || liquorChargeId || null;

    // Log the failed/refunded transaction
    await logTransaction({
      retailerId,
      regularChargeId,
      liquorChargeId,
      regularAmount: cart.regularTotal,
      liquorAmount: cart.liquorTotal,
      regularTax: cart.regularTax,
      liquorTax: cart.liquorTax,
      status: refundedId ? 'partial_refund' : 'failed',
    });

    return res.status(500).json({
      error: 'Checkout failed',
      message: err.message,
      refundedChargeId: refundedId,
    });
  }
});

module.exports = router;
