import fs from 'fs';
import Tesseract from 'tesseract.js';
import stringSimilarity from 'string-similarity';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const { Client } = pg;

const masterText = fs.readFileSync('master_paper.txt', 'utf-8');

const nameToCenter = {
  Ramesh: 'Center_Kanpur',
  Suresh: 'Center_Lucknow',
  Mahesh: 'Center_Delhi'
};

const refcodeToCenter = {
  KNP7: 'Center_Kanpur',
  LKO7: 'Center_Lucknow',
  DEL7: 'Center_Delhi'
};

async function detectAndInsert(imagePath) {
  const result = await Tesseract.recognize(imagePath, 'eng');
  const extractedText = result.data.text;

  const matchScore = stringSimilarity.compareTwoStrings(extractedText, masterText) * 100;

  if (matchScore <= 30) {
    console.log('Ye exam paper nahi lagta, insert nahi kiya jayega.');
    return;
  }

  let foundCenter = null;
  for (const [name, center] of Object.entries(nameToCenter)) {
    if (extractedText.toLowerCase().includes(name.toLowerCase())) {
      foundCenter = center;
      break;
    }
  }
  if (!foundCenter) {
    for (const [code, center] of Object.entries(refcodeToCenter)) {
      if (extractedText.toLowerCase().includes(code.toLowerCase())) {
        foundCenter = center;
        break;
      }
    }
  }

  if (!foundCenter) {
    console.log('Fingerprint nahi mila, insert nahi kiya jayega.');
    return;
  }

  console.log(`Leak detected! Traced to: ${foundCenter}, Match: ${matchScore.toFixed(1)}%`);

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const incidentId = crypto.randomUUID();
  const today = new Date().toISOString().split('T')[0];
  const year = new Date().getFullYear();

  await client.query(
    `INSERT INTO incidents (
      id, exam_name, date, year, conducting_body, body_type,
      region, leak_status, action_taken, description,
      source_name, confidence, is_demo_seed
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      incidentId,
      'Demo Exam Paper (TraceExam Test)',
      today,
      year,
      'TraceExam Demo Board',
      'Simulated',
      foundCenter,
      'Detected - Under Investigation',
      'Auto-flagged by AI leak detection module',
      `Leak detected via fingerprint matching. OCR match score: ${matchScore.toFixed(1)}%`,
      'AI Detection System',
      `${matchScore.toFixed(1)}%`,
      true
    ]
  );

  await client.end();
  console.log('Incident inserted successfully!');
}

detectAndInsert('leaked_photo.png');