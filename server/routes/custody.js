const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');

// POST /api/custody -> log a custody scan entry
router.post('/', async (req, res) => {
  const { packet_id, stage, official_name, location } = req.body;
  try {
    // get the last entry's hash for this packet (to build the chain)
    const last = await pool.query(
      'SELECT entry_hash FROM custody_logs WHERE packet_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [packet_id]
    );
    const prev_hash = last.rows.length > 0 ? last.rows[0].entry_hash : 'GENESIS';

    const timestamp = new Date().toISOString();
    const entry_hash = crypto
      .createHash('sha256')
      .update(prev_hash + stage + official_name + timestamp)
      .digest('hex');

    const result = await pool.query(
  ` INSERT INTO custody_logs (packet_id, stage, official_name, location, timestamp, prev_hash, entry_hash)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [packet_id, stage, official_name, location, timestamp, prev_hash, entry_hash]
   );
   
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;