/**
 * auth.js
 *
 * API key authentication middleware. Each licensed retailer is issued
 * a unique API key. The key must be sent in the x-api-key header
 * along with the retailerId in the request body so we can verify
 * the key belongs to that retailer.
 */

// Parse VALID_API_KEYS env var into a Map of retailerId -> apiKey
function loadApiKeys() {
  const raw = process.env.VALID_API_KEYS || '';
  const keys = new Map();

  for (const entry of raw.split(',')) {
    const [retailerId, apiKey] = entry.split(':').map((s) => s.trim());
    if (retailerId && apiKey) {
      keys.set(retailerId, apiKey);
    }
  }

  return keys;
}

const apiKeys = loadApiKeys();

/**
 * Express middleware that validates the x-api-key header.
 * Returns 401 if the key is missing, unrecognized, or does not
 * match the retailerId in the request body.
 */
async function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing x-api-key header' });
  }

  const { retailerId } = req.body;

  if (!retailerId) {
    return res.status(401).json({ error: 'Missing retailerId in request body' });
  }

  const expectedKey = apiKeys.get(retailerId);

  if (!expectedKey || expectedKey !== apiKey) {
    return res.status(401).json({ error: 'Invalid API key for this retailer' });
  }

  next();
}

module.exports = { authMiddleware };
