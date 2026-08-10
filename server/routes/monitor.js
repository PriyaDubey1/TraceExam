const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/feed', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM social_feed ORDER BY posted_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/scan', async (req, res) => {
  try {
    const unchecked = await pool.query('SELECT * FROM social_feed WHERE checked = false');
    const packets = await pool.query('SELECT * FROM packets');
    let flaggedCount = 0;

    for (const post of unchecked.rows) {
      const matchedPacket = packets.rows.find((p) =>
        post.post_text.toLowerCase().includes(p.canary_phrase.toLowerCase())
      );

      const flagged = !!matchedPacket;
      if (flagged) flaggedCount++;

      await pool.query(
        'UPDATE social_feed SET checked = true, flagged = $1, matched_packet_id = $2 WHERE id = $3',
        [flagged, matchedPacket ? matchedPacket.id : null, post.id]
      );
    }

    res.json({ scanned: unchecked.rows.length, flagged: flaggedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;