/**
 * splitCart.js
 *
 * Vermont law (Title 7, Chapter 1) requires that liquor sales be processed
 * as a completely separate financial transaction from regular retail goods.
 * This utility splits a mixed cart into two groups so each can be charged
 * independently through Stripe.
 */

// Vermont sales tax rate (6%) applies to regular retail items
const VT_SALES_TAX_RATE = 0.06;

// Vermont liquor tax rate (10%) — includes the state excise markup
// on spirits, wine, and malt beverages sold through licensed retailers
const VT_LIQUOR_TAX_RATE = 0.10;

/**
 * Splits cart items into liquor and regular groups with subtotals and tax.
 *
 * @param {Array<{name: string, category: string, price: number, quantity: number}>} items
 * @returns {{ liquorItems: Array, regularItems: Array, liquorSubtotal: number, regularSubtotal: number, liquorTax: number, regularTax: number, liquorTotal: number, regularTotal: number }}
 */
function splitCart(items) {
  const liquorItems = [];
  const regularItems = [];

  for (const item of items) {
    if (item.category === 'liquor') {
      liquorItems.push(item);
    } else {
      regularItems.push(item);
    }
  }

  const liquorSubtotal = liquorItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const regularSubtotal = regularItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Vermont taxes liquor and regular goods at different rates
  const liquorTax = Math.round(liquorSubtotal * VT_LIQUOR_TAX_RATE);
  const regularTax = Math.round(regularSubtotal * VT_SALES_TAX_RATE);

  return {
    liquorItems,
    regularItems,
    liquorSubtotal,
    regularSubtotal,
    liquorTax,
    regularTax,
    liquorTotal: liquorSubtotal + liquorTax,
    regularTotal: regularSubtotal + regularTax,
  };
}

module.exports = { splitCart, VT_SALES_TAX_RATE, VT_LIQUOR_TAX_RATE };
