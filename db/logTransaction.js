/**
 * logTransaction.js
 *
 * Logs every checkout transaction to PostgreSQL for audit purposes.
 * Vermont's liquor control regulations require retailers to maintain
 * records of all liquor transactions separately from regular sales,
 * so we store both charge IDs and amounts individually.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Creates the transactions table if it doesn't exist.
 * Call once at server startup.
 */
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id              SERIAL PRIMARY KEY,
      retailer_id     VARCHAR(100) NOT NULL,
      regular_charge_id VARCHAR(100),
      liquor_charge_id  VARCHAR(100),
      regular_amount  INTEGER DEFAULT 0,
      liquor_amount   INTEGER DEFAULT 0,
      regular_tax     INTEGER DEFAULT 0,
      liquor_tax      INTEGER DEFAULT 0,
      status          VARCHAR(20) NOT NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

/**
 * Inserts a transaction record.
 *
 * @param {Object} txn
 * @param {string} txn.retailerId
 * @param {string|null} txn.regularChargeId
 * @param {string|null} txn.liquorChargeId
 * @param {number} txn.regularAmount    - amount in cents
 * @param {number} txn.liquorAmount     - amount in cents
 * @param {number} txn.regularTax       - tax in cents
 * @param {number} txn.liquorTax        - tax in cents
 * @param {string} txn.status           - "success" | "partial_refund" | "failed"
 */
async function logTransaction(txn) {
  await pool.query(
    `INSERT INTO transactions
       (retailer_id, regular_charge_id, liquor_charge_id,
        regular_amount, liquor_amount, regular_tax, liquor_tax, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      txn.retailerId,
      txn.regularChargeId,
      txn.liquorChargeId,
      txn.regularAmount,
      txn.liquorAmount,
      txn.regularTax,
      txn.liquorTax,
      txn.status,
    ]
  );
}

module.exports = { initDb, logTransaction, pool };
