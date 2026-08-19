const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const officeParser = require('officeparser');
const { fromPath } = require('pdf2pic');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// File upload: 15MB max, sirf image/pdf/office docs allow
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: JPG, PNG, PDF, PPTX, DOCX.'));
    }
  },
});

// Ye endpoint costly hai (Groq API call), isliye stricter limit: 10 requests / 15 min per IP
const leakLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many leak-report requests. Please wait before trying again.' },
});

// ---------- AI helper: ask Groq to judge whether text looks like a genuine exam-paper leak ----------
async function aiClassifyLeak(text) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content:
          'You are an exam-integrity analyst. Given a piece of text (possibly from a leaked document, social media post, or chat), decide if it looks like a genuine exam paper leak (answer key, question paper, exam-related confidential content). Respond ONLY in strict JSON: {"is_suspected_leak": true/false, "confidence": "High"|"Medium"|"Low", "summary": "one plain-language sentence explaining why"}',
      },
      {
        role: 'user',
        content: `Analyze this text:\n\n${text.slice(0, 3000)}`,
      },
    ],
    temperature: 0.2,
  });

  const raw = completion.choices[0].message.content;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { is_suspected_leak: false, confidence: 'Low', summary: 'AI could not parse a clear verdict.' };
  }
}

// ---------- helper: extract text depending on file type ----------
async function extractText(filePath, mimetype, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (mimetype.startsWith('image/')) {
    const result = await Tesseract.recognize(filePath, 'eng');
    return result.data.text;
  }

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(buffer);

    if (parsed.text && parsed.text.trim().length > 20) {
      return parsed.text;
    }

    const converter = fromPath(filePath, {
      density: 150,
      savePath: 'uploads/',
      format: 'png',
      width: 1200,
      height: 1600,
    });

    let combinedText = '';
    for (let page = 1; page <= 3; page++) {
      try {
        const pageImage = await converter(page);
        const ocrResult = await Tesseract.recognize(pageImage.path, 'eng');
        combinedText += ' ' + ocrResult.data.text;
        fs.unlinkSync(pageImage.path);
      } catch (e) {
        break;
      }
    }
    return combinedText;
  }

  if (ext === '.pptx' || ext === '.docx' || ext === '.ppt' || ext === '.doc') {
    const text = await officeParser.parseOfficeAsync(filePath);
    return text;
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

// ---------- POST /api/leak/report-file -> upload any file, auto-detect leak ----------
router.post('/report-file', leakLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const extractedText = await extractText(req.file.path, req.file.mimetype, req.file.originalname);
    fs.unlinkSync(req.file.path);

    const allPackets = await pool.query('SELECT * FROM packets');
    const matchedPacket = allPackets.rows.find((p) =>
      extractedText.toLowerCase().includes(p.canary_phrase.toLowerCase())
    );

    if (!matchedPacket) {
      const aiVerdict = await aiClassifyLeak(extractedText);

      if (aiVerdict.is_suspected_leak) {
        const incidentId = 'LIVE-AI-' + Date.now();
        await pool.query(
          `INSERT INTO incidents (id, exam_name, date, year, leak_status, action_taken, description, is_demo_seed)
           VALUES ($1, 'Unidentified Exam (AI-flagged)', CURRENT_DATE, $2, 'Alleged', 'AI-flagged, pending manual verification', $3, true)`,
          [
            incidentId,
            new Date().getFullYear(),
            `AI classifier flagged this content as a suspected leak (confidence: ${aiVerdict.confidence}). ${aiVerdict.summary}`,
          ]
        );

        return res.json({
          match_found: false,
          ai_flagged: true,
          confidence: aiVerdict.confidence,
          ai_summary: aiVerdict.summary,
          new_incident_id: incidentId,
        });
      }

      return res.json({
        match_found: false,
        ai_flagged: false,
        ai_summary: aiVerdict.summary,
        message: 'No canary match, and AI did not flag this as a suspected leak.',
      });
    }

    const lastLog = await pool.query(
      'SELECT * FROM custody_logs WHERE packet_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [matchedPacket.id]
    );
    const lastStage = lastLog.rows.length > 0 ? lastLog.rows[0] : null;

    const incidentId = 'LIVE-' + Date.now();
    await pool.query(
      `INSERT INTO incidents (id, exam_name, date, year, leak_status, action_taken, description, is_demo_seed)
       VALUES ($1, $2, CURRENT_DATE, $3, 'Confirmed', 'Auto-flagged, investigation pending', $4, true)`,
      [
        incidentId,
        matchedPacket.exam_name,
        new Date().getFullYear(),
        `Canary phrase match detected from uploaded ${path.extname(req.file.originalname)} file. Packet ${matchedPacket.id} traced to stage: ${lastStage ? lastStage.stage : 'unknown'}, official: ${lastStage ? lastStage.official_name : 'unknown'}.`,
      ]
    );

    const aiVerdict = await aiClassifyLeak(extractedText);

    res.json({
      match_found: true,
      packet_id: matchedPacket.id,
      traced_to_stage: lastStage ? lastStage.stage : 'unknown',
      traced_to_official: lastStage ? lastStage.official_name : 'unknown',
      new_incident_id: incidentId,
      ai_summary: aiVerdict.summary,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
  }
});

// ---------- keep the old text-based endpoint too (for quick testing)
router.post('/report', async (req, res) => {
  const { suspected_text } = req.body;
  try {
    const allPackets = await pool.query('SELECT * FROM packets');
    const matchedPacket = allPackets.rows.find((p) =>
      suspected_text.toLowerCase().includes(p.canary_phrase.toLowerCase())
    );

    if (!matchedPacket) {
      return res.json({ match_found: false, message: 'No canary phrase match found.' });
    }

    const lastLog = await pool.query(
      'SELECT * FROM custody_logs WHERE packet_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [matchedPacket.id]
    );
    const lastStage = lastLog.rows.length > 0 ? lastLog.rows[0] : null;

    const incidentId = 'LIVE-' + Date.now();
    await pool.query(
      `INSERT INTO incidents (id, exam_name, date, year, leak_status, action_taken, description, is_demo_seed)
       VALUES ($1, $2, CURRENT_DATE, $3, 'Confirmed', 'Auto-flagged, investigation pending', $4, true)`,
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
    res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
  }
});

// Multer errors (file too big, wrong type) ko clean response me convert karo
router.post('/report', async (req, res) => {
  const { suspected_text } = req.body;
  try {
    const allPackets = await pool.query('SELECT * FROM packets');
    const matchedPacket = allPackets.rows.find((p) =>
      suspected_text.toLowerCase().includes(p.canary_phrase.toLowerCase())
    );

    if (!matchedPacket) {
      return res.json({ match_found: false, message: 'No canary phrase match found.' });
    }

    const lastLog = await pool.query(
      'SELECT * FROM custody_logs WHERE packet_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [matchedPacket.id]
    );
    const lastStage = lastLog.rows.length > 0 ? lastLog.rows[0] : null;

    const incidentId = 'LIVE-' + Date.now();
    await pool.query(
      `INSERT INTO incidents (id, exam_name, date, year, leak_status, action_taken, description, is_demo_seed)
       VALUES ($1, $2, CURRENT_DATE, $3, 'Confirmed', 'Auto-flagged, investigation pending', $4, true)`,
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
    res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
  }
});

// Multer errors (file too big, wrong type) ko clean response me convert karo
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message.includes('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;