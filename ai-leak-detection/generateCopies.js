import fs from 'fs';

const names = ['Ramesh', 'Suresh', 'Mahesh'];
const centers = ['Center_Kanpur', 'Center_Lucknow', 'Center_Delhi'];
const refCodes = ['KNP7', 'LKO7', 'DEL7'];

const masterText = fs.readFileSync('master_paper.txt', 'utf-8');

for (let i = 0; i < 3; i++) {
  let copyText = masterText.replace('Ramesh', names[i]);
  copyText = copyText + `\n\nRef: ${refCodes[i]}`;
  const filename = `copy_${i + 1}.txt`;
  fs.writeFileSync(filename, copyText);
  console.log(`${filename} created for ${centers[i]} with ref code ${refCodes[i]}`);
}