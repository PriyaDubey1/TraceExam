import fs from 'fs';
import Tesseract from 'tesseract.js';
import stringSimilarity from 'string-similarity';

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

async function checkLeak(imagePath) {
  console.log(`\n--- Testing: ${imagePath} ---`);

  if (!fs.existsSync(imagePath)) {
    console.log('ERROR: File nahi mili. Filename check karo.');
    return;
  }

  let extractedText;
  try {
    const result = await Tesseract.recognize(imagePath, 'eng');
    extractedText = result.data.text;
  } catch (err) {
    console.log('ERROR: Ye file ek valid image nahi hai (corrupt ho sakti hai).');
    return;
  }

  if (extractedText.trim() === '') {
    console.log('ERROR: OCR ko koi text nahi mila is image mein.');
    return;
  }

  const matchScore = stringSimilarity.compareTwoStrings(extractedText, masterText) * 100;
  console.log(`Match score with master paper: ${matchScore.toFixed(1)}%`);

  if (matchScore > 30) {
    console.log('CONFIRMED: Ye leaked paper hamara exam paper hai.');

    let foundCenter = null;
    let matchedVia = null;

    for (const [name, center] of Object.entries(nameToCenter)) {
      if (extractedText.toLowerCase().includes(name.toLowerCase())) {
        foundCenter = center;
        matchedVia = `name fingerprint ('${name}')`;
        break;
      }
    }

    if (!foundCenter) {
      for (const [code, center] of Object.entries(refcodeToCenter)) {
        if (extractedText.toLowerCase().includes(code.toLowerCase())) {
          foundCenter = center;
          matchedVia = `reference code fingerprint ('${code}')`;
          break;
        }
      }
    }

    if (foundCenter) {
      console.log(`Fingerprint matched via: ${matchedVia}`);
      console.log(`Leak traced to: ${foundCenter}`);
    } else {
      console.log('Dono fingerprints (naam aur ref code) nahi mile.');
      console.log('Suggestion: Manual review needed, image bahut zyada crop/blur hai.');
    }
  } else {
    console.log('Ye hamara exam paper nahi lagta (match score bahut kam hai).');
  }
}

async function runAllTests() {
  await checkLeak('leaked_photo.png');
  await checkLeak('blurry_leak.png');
  await checkLeak('random_image.png');
}

runAllTests();