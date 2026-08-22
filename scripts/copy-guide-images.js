const fs = require('fs');
const path = require('path');

function copyDir(src, dest, ext) {
  fs.mkdirSync(dest, { recursive: true });
  const files = fs.readdirSync(src).filter((file) => file.endsWith(ext));
  for (const file of files) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
  return files.length;
}

const root = path.join(__dirname, '..');
const guideCount = copyDir(path.join(root, 'assets', 'guide'), path.join(root, 'public', 'media', 'guide'), '.jpg');
const partnerCount = copyDir(
  path.join(root, 'assets', 'partners'),
  path.join(root, 'public', 'media', 'partners'),
  '.png',
);
console.log(`Copied ${guideCount} guide images and ${partnerCount} partner logos to public/media`);
