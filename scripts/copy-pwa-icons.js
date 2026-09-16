const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'icon_960.png');
const publicDir = path.join(root, 'public');

async function main() {
  if (!fs.existsSync(src)) {
    throw new Error(`Missing app icon at ${src}`);
  }
  fs.mkdirSync(publicDir, { recursive: true });

  const sharp = require('sharp');
  const background = { r: 245, g: 248, b: 243, alpha: 1 };

  const writeSquare = async (size, filename) => {
    await sharp(src)
      .resize(size, size, { fit: 'contain', background })
      .png()
      .toFile(path.join(publicDir, filename));
  };

  await writeSquare(512, 'logo512.png');
  await writeSquare(192, 'logo192.png');
  await writeSquare(180, 'apple-touch-icon.png');
  await sharp(src).resize(32, 32, { fit: 'contain', background }).png().toFile(path.join(publicDir, 'favicon.png'));

  console.log('Generated PWA icons in public/');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
