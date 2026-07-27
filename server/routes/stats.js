const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const totalIncidents = await pool.query('SELECT COUNT(*) FROM incidents');
    const totalPackets = await pool.query('SELECT COUNT(*) FROM packets');
    const totalCustodyLogs = await pool.query('SELECT COUNT(*) FROM custody_logs');
    const confirmedLeaks = await pool.query(
      "SELECT COUNT(*) FROM incidents WHERE leak_status = 'Confirmed'"
    );

    res.json({
      total_incidents: parseInt(totalIncidents.rows[0].count),
      confirmed_leaks: parseInt(confirmedLeaks.rows[0].count),
      total_packets_tracked: parseInt(totalPackets.rows[0].count),
      total_custody_scans: parseInt(totalCustodyLogs.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;