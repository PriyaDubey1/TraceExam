const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const officeParser = require('officeparser');
const { fromPath } = require('pdf2pic');

const upload = multer({ dest: 'uploads/' });

// ---------- helper: extract text depending on file type ----------
async function extractText(filePath, mimetype, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  // 1. IMAGE -> straight to OCR
  if (mimetype.startsWith('image/')) {
    const result = await Tesseract.recognize(filePath, 'eng');
    return result.data.text;
  }

  // 2. PDF -> try text layer first, fall back to OCR on rendered pages
  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(buffer);

    if (parsed.text && parsed.text.trim().length > 20) {
      // real text layer found (not a scanned image)
      return parsed.text;
    }

    // scanned PDF: convert first 3 pages to images, then OCR each
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
        fs.unlinkSync(pageImage.path); // cleanup rendered image
      } catch (e) {
        break; // no more pages
      }
    }
    return combinedText;
  }

  // 3. PPTX / DOCX -> officeparser extracts embedded text directly
  if (ext === '.pptx' || ext === '.docx' || ext === '.ppt' || ext === '.doc') {
    const text = await officeParser.parseOfficeAsync(filePath);
    return text;
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

// ---------- POST /api/leak/report-file -> upload any file, auto-detect leak ----------
router.post('/report-file', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const extractedText = await extractText(req.file.path, req.file.mimetype, req.file.originalname);

    // cleanup uploaded file
    fs.unlinkSync(req.file.path);

    const allPackets = await pool.query('SELECT * FROM packets');
    const matchedPacket = allPackets.rows.find((p) =>
      extractedText.toLowerCase().includes(p.canary_phrase.toLowerCase())
    );

    if (!matchedPacket) {
      return res.json({
        match_found: false,
        message: 'No canary phrase match found.',
        extracted_text_preview: extractedText.slice(0, 200),
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

// ---------- keep the old text-based endpoint too (for quick testing) ----------
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;