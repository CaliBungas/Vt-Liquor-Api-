/**
 * server.js
 *
 * Entry point for the VT Liquor API.
 */

require('dotenv').config();

const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve the front-end website from /public
app.use(express.static(path.join(__dirname, 'public')));

// Health check — must respond immediately for Railway
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Only load API routes if dependencies are available
try {
  const { authMiddleware } = require('./middleware/auth');
  const checkoutRouter = require('./routes/checkout');
  const { initDb } = require('./db/logTransaction');

  // All /api routes require a valid retailer API key
  app.use('/api', authMiddleware);
  app.use('/api', checkoutRouter);

  // Try to connect DB but don't block startup
  initDb()
    .then(() => console.log('Database connected'))
    .catch(() => console.warn('Database not available — front-end still works.'));
} catch (err) {
  console.warn('API modules not fully configured:', err.message);
  console.warn('Front-end will still be served.');
}

// Catch-all: serve index.html for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VT Liquor API running on port ${PORT}`);
});

module.exports = app;
