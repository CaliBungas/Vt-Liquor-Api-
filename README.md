# VT Liquor API

Vermont-compliant payment API that automatically splits liquor and regular retail items into separate Stripe transactions, as required by Vermont state law (Title 7 V.S.A.).

## Why separate transactions?

Vermont law requires licensed retailers to process liquor purchases as a completely separate financial transaction from regular merchandise. This API handles the split automatically so retailers don't have to manage it themselves.

## Setup

```bash
npm install
cp .env.example .env
# Fill in your Stripe key, database URL, and API keys in .env
npm start
```

Requires a running PostgreSQL database. The transactions table is created automatically on startup.

## API

### POST /api/checkout

Split-charges a mixed cart into separate liquor and retail transactions.

**Headers:**

```
x-api-key: key_abc123
Content-Type: application/json
```

**Sample Request:**

```json
{
  "retailerId": "retailer_001",
  "paymentMethodId": "pm_card_visa",
  "items": [
    { "name": "Maple Syrup",      "category": "grocery", "price": 1200, "quantity": 1 },
    { "name": "Cheddar Cheese",   "category": "grocery", "price": 800,  "quantity": 2 },
    { "name": "Vermont Bourbon",  "category": "liquor",  "price": 3500, "quantity": 1 },
    { "name": "Local IPA 6-pack", "category": "liquor",  "price": 1400, "quantity": 1 }
  ]
}
```

Prices are in cents. Items with `category: "liquor"` are charged separately.

**Sample Response (success):**

```json
{
  "success": true,
  "regularChargeId": "pi_3abc...",
  "liquorChargeId": "pi_7xyz...",
  "regularTotal": 2968,
  "liquorTotal": 5390,
  "regularTax": 168,
  "liquorTax": 490
}
```

**Sample Response (failure with refund):**

```json
{
  "error": "Checkout failed",
  "message": "Your card was declined.",
  "refundedChargeId": "pi_3abc..."
}
```

### GET /health

Returns `{ "status": "ok" }`.

## Tax Rates

| Type    | Rate | Applies to                       |
|---------|------|----------------------------------|
| Regular | 6%   | All non-liquor retail items      |
| Liquor  | 10%  | Spirits, wine, and malt beverages|

Tax amounts are included in Stripe charge metadata for state remittance reporting.

## Environment Variables

| Variable           | Description                              |
|--------------------|------------------------------------------|
| `STRIPE_SECRET_KEY`| Stripe secret API key                    |
| `DATABASE_URL`     | PostgreSQL connection string             |
| `PORT`             | Server port (default: 3000)              |
| `VALID_API_KEYS`   | Comma-separated `retailerId:key` pairs   |
