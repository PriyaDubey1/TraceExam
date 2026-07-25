const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/incidents  -> all 174 incidents
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incidents ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/incidents/demo  -> only the 20 curated demo incidents
router.get('/demo', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM incidents WHERE is_demo_seed = true ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/incidents/:id  -> single incident by id (e.g. PL-0172)
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM incidents WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
