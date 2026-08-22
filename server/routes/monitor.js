const express = require('express');
const router = express.Router();
const pool = require('../db');

const PLATFORMS = ['Telegram', 'Twitter', 'WhatsApp'];

const BENIGN_HANDLES = ['@examgroup_delhi', '@student_voice', '@coaching_updates', '@exam_watch', '@studybuddy2026', '@toppers_talk'];
const SUSPICIOUS_HANDLES = ['@leaked_papers_2026', '@exam_insider', '@paper_seller99', 'Unknown Group', 'Anonymous User'];

const BENIGN_TEMPLATES = [
  'Good luck everyone for tomorrow\'s exam!',
  'Anyone else nervous about the exam tomorrow?',
  'Reminder: mock test tomorrow at 10 AM',
  'NEET aspirants — stay focused, avoid distractions',
  'Just finished revising, feeling confident',
  'Exam centre changed for some candidates, check your admit card',
  'All the best to everyone appearing this year',
];

const LEAK_TEMPLATES = [
  'Answer key: {canary} confirmed, DM for full paper',
  'URGENT: {canary} is the code, paper leaked check now',
  'Selling leaked paper, code: {canary}, message me for details',
  '{canary} — got the real deal, who wants it?',
  'Leaked question paper available, verification code {canary}',
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------- Har scan se pehle kuch fresh simulated posts generate karo ----------
async function generateFreshPosts() {
  const packets = await pool.query('SELECT * FROM packets');
  const newPosts = [];

  // 2-3 benign posts, har baar
  const benignCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < benignCount; i++) {
    newPosts.push({
      platform: randomFrom(PLATFORMS),
      author_handle: randomFrom(BENIGN_HANDLES),
      post_text: randomFrom(BENIGN_TEMPLATES),
    });
  }

  // 40% chance ek suspicious/leak-style post bhi aaye (agar packets exist karte hain)
  if (packets.rows.length > 0 && Math.random() < 0.4) {
    const packet = randomFrom(packets.rows);
    const template = randomFrom(LEAK_TEMPLATES);
    newPosts.push({
      platform: randomFrom(PLATFORMS),
      author_handle: randomFrom(SUSPICIOUS_HANDLES),
      post_text: template.replace('{canary}', packet.canary_phrase),
    });
  }

  for (const post of newPosts) {
    await pool.query(
      `INSERT INTO social_feed (platform, author_handle, post_text, posted_at, checked, flagged)
       VALUES ($1, $2, $3, NOW(), false, false)`,
      [post.platform, post.author_handle, post.post_text]
    );
  }

  return newPosts.length;
}

router.get('/feed', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM social_feed ORDER BY posted_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
  }
});

router.post('/scan', async (req, res) => {
  try {
    const freshCount = await generateFreshPosts();

    const unchecked = await pool.query('SELECT * FROM social_feed WHERE checked = false');
    const packets = await pool.query('SELECT * FROM packets');
    let flaggedCount = 0;
    const newIncidents = [];

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

      if (flagged) {
        const lastLog = await pool.query(
          'SELECT * FROM custody_logs WHERE packet_id = $1 ORDER BY timestamp DESC LIMIT 1',
          [matchedPacket.id]
        );
        const lastStage = lastLog.rows.length > 0 ? lastLog.rows[0] : null;

        const incidentId = 'MON-' + Date.now() + '-' + post.id;
        await pool.query(
          `INSERT INTO incidents (id, exam_name, date, year, leak_status, action_taken, description, is_demo_seed)
           VALUES ($1, $2, CURRENT_DATE, $3, 'Suspected', 'Detected via social-media monitoring, investigation pending', $4, true)`,
          [
            incidentId,
            matchedPacket.exam_name,
            new Date().getFullYear(),
            `Canary phrase match found in a public ${post.platform} post by ${post.author_handle}. Packet ${matchedPacket.id} traced to stage: ${lastStage ? lastStage.stage : 'unknown'}, official: ${lastStage ? lastStage.official_name : 'unknown'}. Post text: "${post.post_text}"`,
          ]
        );

        newIncidents.push(incidentId);
      }
    }

    res.json({
      scanned: unchecked.rows.length,
      new_posts_found: freshCount,
      flagged: flaggedCount,
      new_incident_ids: newIncidents,
      scan_time: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
  }
});

module.exports = router;