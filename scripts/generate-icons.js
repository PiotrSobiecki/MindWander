const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const sizes = [16, 48, 128];
const outputDir = path.join(__dirname, "../src/icons");

// Upewnij się, że katalog istnieje
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generuj ikonę z MW i elementami związanymi z odkrywaniem
async function generateIcon(size) {
  const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#4f46e5;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#4338ca;stop-opacity:1" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1"/>
                    <feComposite in="SourceGraphic"/>
                </filter>
            </defs>
            
            <!-- Tło z gradientem -->
            <circle cx="${size / 2}" cy="${size / 2}" r="${
    size / 2
  }" fill="url(#grad)"/>
            
            <!-- Dekoracyjne elementy - kompasy odkrywania -->
            <g transform="translate(${size * 0.25}, ${size * 0.25})">
                <circle r="${size * 0.06}" fill="white" opacity="0.1"/>
                <path d="M0,-${size * 0.06} L0,${size * 0.06} M-${
    size * 0.06
  },0 L${size * 0.06},0" 
                    stroke="white" 
                    stroke-width="${size * 0.015}" 
                    opacity="0.2"/>
            </g>
            
            <g transform="translate(${size * 0.75}, ${size * 0.75})">
                <circle r="${size * 0.06}" fill="white" opacity="0.1"/>
                <path d="M0,-${size * 0.06} L0,${size * 0.06} M-${
    size * 0.06
  },0 L${size * 0.06},0" 
                    stroke="white" 
                    stroke-width="${size * 0.015}" 
                    opacity="0.2"/>
            </g>
            
            <!-- Tekst MW z efektami -->
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" 
                fill="#ffffff" 
                font-family="Arial" 
                font-weight="900" 
                font-size="${size * 0.45}px"
                style="text-shadow: 0 0 2px rgba(255,255,255,0.5), 0 0 4px rgba(255,255,255,0.3);"
                filter="url(#glow)">MW</text>
                
            <!-- Dekoracyjne linie połączeń -->
            <path d="M${size * 0.2} ${size * 0.5} 
                    Q${size * 0.3} ${size * 0.4} ${size * 0.4} ${size * 0.5}
                    T${size * 0.6} ${size * 0.5}
                    T${size * 0.8} ${size * 0.5}" 
                stroke="white" 
                stroke-width="${size * 0.015}" 
                fill="none" 
                opacity="0.15"/>
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
