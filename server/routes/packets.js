const express = require('express');
const router = express.Router();
const pool = require('../db');
const crypto = require('crypto');

// POST /api/packets  -> create a new paper packet
router.post('/', async (req, res) => {
  const { id, exam_name, canary_phrase } = req.body;
  try {
    const paper_hash = crypto.createHash('sha256').update(id + canary_phrase).digest('hex');
    const result = await pool.query(
      'INSERT INTO packets (id, exam_name, canary_phrase, paper_hash) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, exam_name, canary_phrase, paper_hash]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/packets/:id -> get one packet + its custody trail
router.get('/:id', async (req, res) => {
  try {
    const packet = await pool.query('SELECT * FROM packets WHERE id = $1', [req.params.id]);
    const logs = await pool.query(
      'SELECT * FROM custody_logs WHERE packet_id = $1 ORDER BY timestamp ASC',
      [req.params.id]
    );
    if (packet.rows.length === 0) {
      return res.status(404).json({ error: 'Packet not found' });
    }
    res.json({ packet: packet.rows[0], custody_trail: logs.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/verify', async (req, res) => {
  try {
    const logs = await pool.query(
      'SELECT * FROM custody_logs WHERE packet_id = $1 ORDER BY timestamp ASC',
      [req.params.id]
    );
    const crypto = require('crypto');
    let expectedPrev = 'GENESIS';
    let isValid = true;
    let brokenAt = null;

    for (const entry of logs.rows) {
      const recalculated = crypto
        .createHash('sha256')
        .update(expectedPrev + entry.stage + entry.official_name + entry.timestamp)
        .digest('hex');

      if (entry.prev_hash !== expectedPrev || recalculated !== entry.entry_hash) {
        isValid = false;
        brokenAt = entry.stage;
        break;
      }
      expectedPrev = entry.entry_hash;
    }

    res.json({ packet_id: req.params.id, chain_valid: isValid, broken_at: brokenAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;