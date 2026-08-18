import Tesseract from 'tesseract.js';

const result = await Tesseract.recognize('leaked_photo.png', 'eng');
console.log('OCR ne ye text nikala:');
console.log(result.data.text);