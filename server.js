/**
 * server.js
 *
 * Entry point for the VT Liquor API. This Express server handles
 * Vermont-compliant checkout where liquor and retail items must
 * be processed as separate Stripe transactions per state law.
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const { authMiddleware } = require('./middleware/auth');
const checkoutRouter = require('./routes/checkout');
const { initDb } = require('./db/logTransaction');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve the front-end website from /public
app.use(express.static(path.join(__dirname, 'public')));

// All /api routes require a valid retailer API key
app.use('/api', authMiddleware);

// Mount checkout route
app.use('/api', checkoutRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  try {
    await initDb();
    console.log('Database connected');
  } catch (err) {
    console.warn('Database not available — API routes will fail but front-end is still served.');
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VT Liquor API running on port ${PORT}`);
  });
}

start();

module.exports = app;
