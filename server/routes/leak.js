const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST /api/leak/report -> simulate a leak report, check for canary match
router.post('/report', async (req, res) => {
  const { suspected_text } = req.body; // text extracted from the "leaked" image (OCR simulated for now)

  try {
    // find a packet whose canary phrase appears in the suspected leaked text
    const allPackets = await pool.query('SELECT * FROM packets');
    const matchedPacket = allPackets.rows.find((p) =>
      suspected_text.toLowerCase().includes(p.canary_phrase.toLowerCase())
    );

    if (!matchedPacket) {
      return res.json({ match_found: false, message: 'No canary phrase match found.' });
    }

    // find where this packet currently is (its latest custody stage)
    const lastLog = await pool.query(
      'SELECT * FROM custody_logs WHERE packet_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [matchedPacket.id]
    );
    const lastStage = lastLog.rows.length > 0 ? lastLog.rows[0] : null;

    // auto-create an incident
    const incidentId = 'LIVE-' + Date.now();
    await pool.query(
      `INSERT INTO incidents (id, exam_name, date, year, leak_status, action_taken, description, is_demo_seed)
       VALUES ($1, $2, CURRENT_DATE, $3, 'Confirmed', 'Auto-flagged, investigation pending',
       $4, true)`,
      [
        incidentId,
        matchedPacket.exam_name,
        new Date().getFullYear(),
        `Canary phrase match detected. Packet ${matchedPacket.id} traced to stage: ${lastStage ? lastStage.stage : 'unknown'}, official: ${lastStage ? lastStage.official_name : 'unknown'}.`,
      ]
    );

    res.json({
      match_found: true,
      packet_id: matchedPacket.id,
      traced_to_stage: lastStage ? lastStage.stage : 'unknown',
      traced_to_official: lastStage ? lastStage.official_name : 'unknown',
      new_incident_id: incidentId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;