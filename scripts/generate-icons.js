const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const sizes = [16, 48, 128];
const outputDir = path.join(__dirname, "../src/icons");

// Upewnij się, że katalog istnieje
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generuj prostą ikonę z tekstem "S" w kółku
async function generateIcon(size) {
  const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <circle cx="${size / 2}" cy="${size / 2}" r="${
    size / 2
  }" fill="#4A90E2"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-weight="bold" font-size="${
              size / 2
            }px">S</text>
        </svg>
    `;

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(outputDir, `icon${size}.png`));
}

// Generuj ikony dla wszystkich rozmiarów
async function generateAllIcons() {
  for (const size of sizes) {
    await generateIcon(size);
    console.log(`Wygenerowano ikonę ${size}x${size}`);
  }
}

generateAllIcons().catch(console.error);
