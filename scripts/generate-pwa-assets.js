import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Standard Google Weather Icon Vector with Material 3 depth & lighting
const standardSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#217af4"/>
      <stop offset="50%" stop-color="#1a73e8"/>
      <stop offset="100%" stop-color="#1256b8"/>
    </linearGradient>
    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="40%" stop-color="#fbbc04"/>
      <stop offset="100%" stop-color="#ea4335"/>
    </linearGradient>
    <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e8f0fe"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0d47a1" flood-opacity="0.35"/>
    </filter>
    <filter id="cloudShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#0f3b7d" flood-opacity="0.25"/>
    </filter>
    <filter id="sunGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- App Icon Base Squircle -->
  <rect width="512" height="512" rx="124" fill="url(#bgGrad)" filter="url(#shadow)"/>

  <!-- Subtle specular highlight arc -->
  <path d="M0 124 C 0 55, 55 0, 124 0 L 388 0 C 457 0, 512 55, 512 124 C 512 70, 420 30, 256 30 C 92 30, 0 70, 0 124 Z" fill="#ffffff" opacity="0.12"/>

  <!-- Warm Glowing Sun -->
  <circle cx="320" cy="205" r="92" fill="url(#sunGrad)" filter="url(#sunGlow)"/>

  <!-- Secondary Sun Radiance -->
  <circle cx="320" cy="205" r="108" fill="#fbbc04" opacity="0.18"/>

  <!-- Volumetric Google Material Cloud -->
  <g filter="url(#cloudShadow)">
    <path d="M 350 355 
             L 182 355 
             A 72 72 0 0 1 170 212 
             A 94 94 0 0 1 346 226 
             A 64 64 0 0 1 350 355 Z" 
          fill="url(#cloudGrad)"/>
  </g>
</svg>
`;

// Maskable Icon: Full bleed background that extends to 100% of the canvas,
// with all critical iconography strictly positioned inside the 80% central safe zone (diameter 410px).
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#217af4"/>
      <stop offset="50%" stop-color="#1a73e8"/>
      <stop offset="100%" stop-color="#1256b8"/>
    </linearGradient>
    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="40%" stop-color="#fbbc04"/>
      <stop offset="100%" stop-color="#ea4335"/>
    </linearGradient>
    <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e8f0fe"/>
    </linearGradient>
    <filter id="cloudShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0f3b7d" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Full-bleed background filling all edges for maskable adaptive shapes -->
  <rect width="512" height="512" fill="url(#bgGrad)"/>

  <!-- Centered within 78% safe area (radius ~200px from center 256, 256) -->
  <g transform="translate(14, 18) scale(0.92)">
    <!-- Sun -->
    <circle cx="305" cy="205" r="76" fill="url(#sunGrad)"/>
    <circle cx="305" cy="205" r="90" fill="#fbbc04" opacity="0.18"/>

    <!-- Cloud -->
    <g filter="url(#cloudShadow)">
      <path d="M 335 340 
               L 190 340 
               A 64 64 0 0 1 180 214 
               A 82 82 0 0 1 332 226 
               A 56 56 0 0 1 335 340 Z" 
            fill="url(#cloudGrad)"/>
    </g>
  </g>
</svg>
`;

// Mobile Standalone Splash Screen Graphic (used for mobile preview screenshot & splash)
const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <linearGradient id="splashBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1a73e8"/>
      <stop offset="60%" stop-color="#1558b0"/>
      <stop offset="100%" stop-color="#0d47a1"/>
    </linearGradient>
    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="40%" stop-color="#fbbc04"/>
      <stop offset="100%" stop-color="#ea4335"/>
    </linearGradient>
    <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="70%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e8f0fe"/>
    </linearGradient>
    <filter id="cloudShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="28" flood-color="#072d68" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1920" fill="url(#splashBg)"/>

  <!-- Decorative ambient circles -->
  <circle cx="900" cy="300" r="400" fill="#ffffff" opacity="0.04"/>
  <circle cx="180" cy="1600" r="500" fill="#ffffff" opacity="0.03"/>

  <!-- Centered Splash Logo Group -->
  <g transform="translate(390, 720)">
    <!-- Sun -->
    <circle cx="210" cy="120" r="85" fill="url(#sunGrad)"/>
    <circle cx="210" cy="120" r="105" fill="#fbbc04" opacity="0.2"/>

    <!-- Cloud -->
    <g filter="url(#cloudShadow)">
      <path d="M 230 260 
               L 80 260 
               A 68 68 0 0 1 70 126 
               A 90 90 0 0 1 228 138 
               A 62 62 0 0 1 230 260 Z" 
            fill="url(#cloudGrad)"/>
    </g>
  </g>

  <!-- Brand Typography -->
  <text x="540" y="1120" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Product Sans', 'Segoe UI', Roboto, sans-serif" font-size="58" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="-0.5">
    Google Weather
  </text>
  <text x="540" y="1180" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', 'Product Sans', 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="500" fill="#bbdefb" text-anchor="middle" letter-spacing="1">
    POWERED BY OPEN-METEO
  </text>

  <!-- Loading Bar Indicator at Bottom -->
  <rect x="440" y="1740" width="200" height="6" rx="3" fill="#ffffff" opacity="0.3"/>
  <rect x="440" y="1740" width="80" height="6" rx="3" fill="#ffffff" opacity="0.9"/>
</svg>
`;

async function run() {
  const publicDir = path.join(process.cwd(), 'public');

  console.log('Generating high-fidelity PWA icons & splash screen assets...');

  // 1. Update public/weather-icon.svg
  fs.writeFileSync(path.join(publicDir, 'weather-icon.svg'), standardSvg);

  // 2. Generate icon-192x192.png
  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-192x192.png'));
  console.log('✓ Created public/icon-192x192.png');

  // 3. Generate icon-512x512.png
  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-512x512.png'));
  console.log('✓ Created public/icon-512x512.png');

  // 4. Generate icon-maskable-512x512.png
  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'icon-maskable-512x512.png'));
  console.log('✓ Created public/icon-maskable-512x512.png');

  // 5. Generate apple-touch-icon.png (180x180)
  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created public/apple-touch-icon.png');

  // 6. Generate splash screen screenshot: splash-screen-portrait.png (540x960)
  await sharp(Buffer.from(splashSvg))
    .resize(540, 960)
    .png({ quality: 90 })
    .toFile(path.join(publicDir, 'splash-screen-portrait.png'));
  console.log('✓ Created public/splash-screen-portrait.png');

  console.log('All PWA assets generated successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
