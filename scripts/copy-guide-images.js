const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'assets', 'guide');
const dest = path.join(__dirname, '..', 'public', 'media', 'guide');

fs.mkdirSync(dest, { recursive: true });
const files = fs.readdirSync(src).filter((file) => file.endsWith('.jpg'));
for (const file of files) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}
console.log(`Copied ${files.length} guide images to public/media/guide`);
