/**
 * Generate AMOTPay app icon assets (FlowMark on graphite).
 * Run: node scripts/generate-amotpay-icons.mjs
 */
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'mobile', 'assets');

function markSvg(size, padding = 0) {
  const scale = (size - padding * 2) / 48;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0E1116"/>
  <g transform="translate(${padding} ${padding}) scale(${scale})">
    <rect x="2" y="2" width="44" height="44" rx="13" fill="#141C19" stroke="rgba(201,162,39,0.35)" stroke-width="1.25"/>
    <path d="M14 24 H34" stroke="rgba(201,162,39,0.45)" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="14" cy="24" r="4.5" fill="#C9A227"/>
    <circle cx="34" cy="24" r="3.5" fill="#E8C96A"/>
    <circle cx="24" cy="24" r="2.5" fill="#D4AF37"/>
    <path d="M22 17 L26 24 L22 31" stroke="#C9A227" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>
</svg>`;
}

mkdirSync(assets, { recursive: true });

async function render() {
  const sharp = (await import('sharp')).default;

  const targets = [
    { file: 'icon.png', size: 1024, pad: 160 },
    { file: 'splash-icon.png', size: 512, pad: 64 },
    { file: 'adaptive-icon.png', size: 1024, pad: 200 },
  ];

  for (const t of targets) {
    const out = join(assets, t.file);
    await sharp(Buffer.from(markSvg(t.size, t.pad))).png().toFile(out);
    console.log('Wrote', out);
  }
}

render().catch((e) => {
  console.error(e);
  process.exit(1);
});
