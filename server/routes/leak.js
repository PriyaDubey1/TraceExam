const { PDFParse } = require('pdf-parse');
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const officeParser = require('officeparser');
const { fromPath } = require('pdf2pic');
const Groq = require('groq-sdk');
const stringSimilarity = require('string-similarity');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

const leakLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many leak-report requests. Please wait before trying again.' },
});

function fuzzyMatchScore(text, phrase) {
  const phraseWords = phrase.trim().split(/\s+/);
  const textWords = text.trim().split(/\s+/);
  const windowSize = phraseWords.length;

  if (textWords.length < windowSize) {
    return stringSimilarity.compareTwoStrings(text.toLowerCase(), phrase.toLowerCase());
  }

  let bestScore = 0;
  for (let i = 0; i <= textWords.length - windowSize; i++) {
    const window = textWords.slice(i, i + windowSize).join(' ');
    const score = stringSimilarity.compareTwoStrings(window.toLowerCase(), phrase.toLowerCase());
    if (score > bestScore) bestScore = score;
  }
  return bestScore;
}

const FUZZY_MATCH_THRESHOLD = 0.6;

async function aiClassifyLeak(text) {
  const completion = await groq.chat.completions.create({
    model: 'openai/gpt-oss-120b',
    messages: [
      {
        role: 'system',
        content:
          'You are an exam-integrity triage analyst. IMPORTANT: You only have the raw text of a document — you have NO information about who uploaded it, when, or whether it was authorized. You CANNOT confirm whether something is an actual unauthorized leak just from its content, because a legitimate, officially-released exam paper (e.g. uploaded by a student after the exam is over) will look structurally identical to a leaked one (same booklet codes, signatures, instructions). ' +
          'Your job is narrower: flag whether this text resembles genuine exam-paper material (question paper, answer key, or other exam-confidential content) that is WORTH a human investigator reviewing — not to declare it a confirmed leak. Base your flag only on content structure (exam instructions, booklet/roll-number fields, answer formats, subject-specific questions), not on assumptions about timing or authorization. ' +
          'Respond ONLY in strict JSON: {"is_suspected_leak": true/false, "confidence": "High"|"Medium"|"Low", "summary": "one plain-language sentence describing what structural features were found, without asserting this is confirmed to be an unauthorized leak"}',
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

async function extractText(filePath, mimetype, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (mimetype.startsWith('image/')) {
    const result = await Tesseract.recognize(filePath, 'eng');
    return result.data.text;
  }

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();

    const cleanedText = parsed.text
      ? parsed.text.replace(/--\s*\d+\s*of\s*\d+\s*--/gi, '').trim()
      : '';

    if (cleanedText.length > 300) {
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

router.post('/report-file', leakLimiter, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const extractedText = await extractText(req.file.path, req.file.mimetype, req.file.originalname);
    fs.unlinkSync(req.file.path);

    // Content ka fingerprint banao — same file dubara upload hone pe duplicate na bane
    const contentHash = crypto.createHash('sha256').update(extractedText.trim()).digest('hex');

    const existingIncident = await pool.query(
      'SELECT id, exam_name FROM incidents WHERE content_hash = $1 LIMIT 1',
      [contentHash]
    );

    if (existingIncident.rows.length > 0) {
      return res.json({
        already_reported: true,
        existing_incident_id: existingIncident.rows[0].id,
        exam_name: existingIncident.rows[0].exam_name,
        message: 'This exact file has already been analyzed and reported. No duplicate created.',
      });
    }

    const allPackets = await pool.query('SELECT * FROM packets');

    let matchedPacket = allPackets.rows.find((p) =>
      extractedText.toLowerCase().includes(p.canary_phrase.toLowerCase())
    );
    let matchScore = matchedPacket ? 1 : 0;
    let matchType = matchedPacket ? 'exact' : null;

    if (!matchedPacket) {
      let bestScore = 0;
      let bestPacket = null;

      for (const p of allPackets.rows) {
        const score = fuzzyMatchScore(extractedText, p.canary_phrase);
        if (score > bestScore) {
          bestScore = score;
          bestPacket = p;
        }
      }

      if (bestScore >= FUZZY_MATCH_THRESHOLD) {
        matchedPacket = bestPacket;
        matchScore = bestScore;
        matchType = 'fuzzy';
      }
    }

    if (!matchedPacket) {
      const aiVerdict = await aiClassifyLeak(extractedText);

      if (aiVerdict.is_suspected_leak) {
        const incidentId = 'LIVE-AI-' + Date.now();
        await pool.query(
          `INSERT INTO incidents (id, exam_name, date, year, leak_status, action_taken, description, is_demo_seed, content_hash)
           VALUES ($1, 'Unidentified Exam (AI-flagged)', CURRENT_DATE, $2, 'Alleged', 'AI-flagged, pending manual verification', $3, true, $4)`,
          [
            incidentId,
            new Date().getFullYear(),
            `AI classifier flagged this content as a suspected leak (confidence: ${aiVerdict.confidence}). ${aiVerdict.summary}`,
            contentHash,
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

    const matchScorePct = (matchScore * 100).toFixed(1);
    const incidentId = 'LIVE-' + Date.now();
    await pool.query(
      `INSERT INTO incidents (id, exam_name, date, year, leak_status, action_taken, description, is_demo_seed, content_hash)
       VALUES ($1, $2, CURRENT_DATE, $3, 'Confirmed', 'Auto-flagged, investigation pending', $4, true, $5)`,
      [
        incidentId,
        matchedPacket.exam_name,
        new Date().getFullYear(),
        `Leak detected via fingerprint matching (${matchType} match, score: ${matchScorePct}%) from uploaded ${path.extname(req.file.originalname)} file. Packet ${matchedPacket.id} traced to stage: ${lastStage ? lastStage.stage : 'unknown'}, official: ${lastStage ? lastStage.official_name : 'unknown'}.`,
        contentHash,
      ]
    );

    const aiVerdict = await aiClassifyLeak(extractedText);

    res.json({
      match_found: true,
      match_type: matchType,
      match_score: `${matchScorePct}%`,
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

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message.includes('Unsupported file type')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;