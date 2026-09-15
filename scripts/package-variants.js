import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'release-artifacts');

// Helper to copy directory recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Helper to create a zip file using python3 zipfile
function createZip(sourceDir, targetZipPath) {
  if (fs.existsSync(targetZipPath)) {
    fs.unlinkSync(targetZipPath);
  }
  const pyScript = `
import zipfile, os, sys
target_zip = sys.argv[1]
source_dir = sys.argv[2]
with zipfile.ZipFile(target_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(source_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, source_dir)
            zf.write(full_path, rel_path)
`;
  execSync(`python3 - "${targetZipPath}" "${sourceDir}"`, {
    input: pyScript,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
}

// Helper to create tar.gz
function createTarGz(sourceDir, targetTarPath) {
  if (fs.existsSync(targetTarPath)) {
    fs.unlinkSync(targetTarPath);
  }
  execSync(`tar -czf "${targetTarPath}" -C "${sourceDir}" .`, { stdio: 'inherit' });
}

// Calculate SHA-256 hash
function calculateSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Main packaging pipeline
async function main() {
  console.log('🚀 Starting ClimaCast Multi-Platform Packaging Pipeline...');

  // 1. Verify dist folder exists
  if (!fs.existsSync(DIST_DIR) || !fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.log('📦 Production build not found. Running npm run build first...');
    execSync('npm run build', { stdio: 'inherit' });
  }

  // 2. Determine release version
  const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  let version = process.argv[2] || process.env.RELEASE_TAG || `v${pkgJson.version || '1.0.0'}`;
  if (!version.startsWith('v')) {
    version = `v${version}`;
  }
  console.log(`🔖 Target Release Version: ${version}`);

  // 3. Prepare fresh release-artifacts directory
  if (fs.existsSync(ARTIFACTS_DIR)) {
    fs.rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const tempDir = path.join(ARTIFACTS_DIR, 'temp');
  fs.mkdirSync(tempDir, { recursive: true });

  // -------------------------------------------------------------
  // VARIANT 1: Web App & PWA Distribution
  // -------------------------------------------------------------
  console.log('📦 [1/4] Assembling Web & Progressive Web App (PWA) variant...');
  const webDir = path.join(tempDir, 'climacast-web-pwa');
  copyDirSync(DIST_DIR, webDir);
  // Add PWA deployment README
  fs.writeFileSync(
    path.join(webDir, 'README-PWA.txt'),
    `ClimaCast Web & PWA Distribution (${version})
===================================================
Features:
- Offline-ready with Progressive Web App (PWA) Service Worker
- Open-Meteo & PurpleAir real-time weather analytics
- Interactive 3D Globe, Radar, and UV / AQI Diagnostics

Deployment Instructions:
- Deploy this directory directly to GitHub Pages, Netlify, Cloudflare Pages, Vercel, or any static host.
- Ensure the server serves index.html for SPA routes.
- Access https://your-domain/ and select "Install ClimaCast" or "Add to Home Screen".
`
  );

  const webZipName = `climacast-web-pwa-${version}.zip`;
  const webZipPath = path.join(ARTIFACTS_DIR, webZipName);
  createZip(webDir, webZipPath);
  console.log(`✅ Created ${webZipName}`);

  // -------------------------------------------------------------
  // VARIANT 2: Google Chrome Extension (Manifest V3)
  // -------------------------------------------------------------
  console.log('📦 [2/4] Assembling Google Chrome Extension (Manifest V3) variant...');
  const extDir = path.join(tempDir, 'climacast-chrome-extension');
  copyDirSync(DIST_DIR, extDir);

  // Replace default web manifest with extension manifest
  const extManifestSrc = path.join(ROOT_DIR, 'public', 'chrome-extension', 'manifest.json');
  if (fs.existsSync(extManifestSrc)) {
    const extManifest = JSON.parse(fs.readFileSync(extManifestSrc, 'utf8'));
    // Sync version
    const cleanVersion = version.replace(/^v/, '').split('-')[0] || '1.0.0';
    extManifest.version = cleanVersion;
    fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(extManifest, null, 2));
  }

  fs.writeFileSync(
    path.join(extDir, 'README-CHROME-EXTENSION.txt'),
    `ClimaCast Google Chrome Extension (Manifest V3 - ${version})
===================================================
How to install in Google Chrome / Brave / Edge:
1. Extract this zip archive into a folder.
2. Open your browser and navigate to chrome://extensions/ (or edge://extensions/).
3. Turn on the "Developer mode" switch in the top right corner.
4. Click "Load unpacked".
5. Select the extracted folder containing manifest.json.
6. Pin ClimaCast to your browser toolbar for instant 380px popup weather access!
`
  );

  const extZipName = `climacast-chrome-extension-${version}.zip`;
  const extZipPath = path.join(ARTIFACTS_DIR, extZipName);
  createZip(extDir, extZipPath);
  console.log(`✅ Created ${extZipName}`);

  // -------------------------------------------------------------
  // VARIANT 3: Standalone Full-Stack Node.js Server & Docker
  // -------------------------------------------------------------
  console.log('📦 [3/4] Assembling Full-Stack Node.js & Docker Server variant...');
  const serverDir = path.join(tempDir, 'climacast-fullstack-server');
  fs.mkdirSync(serverDir, { recursive: true });

  // Copy dist
  copyDirSync(DIST_DIR, path.join(serverDir, 'dist'));
  // Copy public
  if (fs.existsSync(path.join(ROOT_DIR, 'public'))) {
    copyDirSync(path.join(ROOT_DIR, 'public'), path.join(serverDir, 'public'));
  }
  // Copy config & database
  ['package.json', 'db.json', '.env.example', 'Dockerfile', 'capacitor.config.json'].forEach((file) => {
    const p = path.join(ROOT_DIR, file);
    if (fs.existsSync(p)) {
      fs.copyFileSync(p, path.join(serverDir, file));
    }
  });

  fs.writeFileSync(
    path.join(serverDir, 'README-SERVER.txt'),
    `ClimaCast Standalone Full-Stack Server & Docker (${version})
===================================================
This bundle contains the pre-compiled production server (dist/server.cjs) and all static assets.

Quick Start (Node.js):
1. Extract archive: tar -xzf climacast-fullstack-server-${version}.tar.gz
2. Install production dependencies: npm install --omit=dev
3. Start server: npm start
4. Open http://localhost:3000/

Quick Start (Docker):
1. docker build -t climacast:latest .
2. docker run -d -p 3000:3000 --name climacast climacast:latest
3. Access http://localhost:3000/
`
  );

  const serverTarName = `climacast-fullstack-server-${version}.tar.gz`;
  const serverTarPath = path.join(ARTIFACTS_DIR, serverTarName);
  createTarGz(serverDir, serverTarPath);

  const serverZipName = `climacast-fullstack-server-${version}.zip`;
  const serverZipPath = path.join(ARTIFACTS_DIR, serverZipName);
  createZip(serverDir, serverZipPath);
  console.log(`✅ Created ${serverTarName} and ${serverZipName}`);

  // -------------------------------------------------------------
  // VARIANT 4: Capacitor Mobile Source Bundle (Android & iOS)
  // -------------------------------------------------------------
  console.log('📦 [4/4] Assembling Capacitor Mobile (Android & iOS) source variant...');
  const mobileDir = path.join(tempDir, 'climacast-capacitor-mobile');
  fs.mkdirSync(mobileDir, { recursive: true });

  copyDirSync(DIST_DIR, path.join(mobileDir, 'dist'));
  ['capacitor.config.json', 'package.json'].forEach((file) => {
    const p = path.join(ROOT_DIR, file);
    if (fs.existsSync(p)) {
      fs.copyFileSync(p, path.join(mobileDir, file));
    }
  });

  fs.writeFileSync(
    path.join(mobileDir, 'README-MOBILE.txt'),
    `ClimaCast Capacitor Native Mobile Project (${version})
===================================================
Requirements: Node.js 18+, Android Studio (for Android) or Xcode (for iOS on macOS)

Android Build:
1. npm install @capacitor/core @capacitor/cli @capacitor/android
2. npx cap add android
3. npx cap sync android
4. npx cap open android
5. Click "Build" > "Generate Signed Bundle / APK" in Android Studio.

iOS Build:
1. npm install @capacitor/core @capacitor/cli @capacitor/ios
2. npx cap add ios
3. npx cap sync ios
4. npx cap open ios
5. Build and run in Xcode.
`
  );

  const mobileZipName = `climacast-capacitor-mobile-${version}.zip`;
  const mobileZipPath = path.join(ARTIFACTS_DIR, mobileZipName);
  createZip(mobileDir, mobileZipPath);
  console.log(`✅ Created ${mobileZipName}`);

  // Check if compiled Android APK exists and copy it
  const apkSource = path.join(ROOT_DIR, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  const releaseApkName = `climacast-android-${version}.apk`;
  if (fs.existsSync(apkSource)) {
    fs.copyFileSync(apkSource, path.join(ARTIFACTS_DIR, releaseApkName));
    console.log(`✅ Included compiled Android APK: ${releaseApkName}`);
  }

  // Check if compiled Google Play Store Android App Bundle (.aab) exists and copy it
  const aabSource = path.join(ROOT_DIR, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
  const releaseAabName = `climacast-android-playstore-${version}.aab`;
  if (fs.existsSync(aabSource)) {
    fs.copyFileSync(aabSource, path.join(ARTIFACTS_DIR, releaseAabName));
    console.log(`✅ Included Google Play Store Android App Bundle (.aab): ${releaseAabName}`);
  }

  // Clean up temporary assembly folder
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  // -------------------------------------------------------------
  // 5. Generate Checksums (SHA-256)
  // -------------------------------------------------------------
  generateChecksumsAndNotes(version);
}

// Helper to generate checksums and markdown release notes across all artifacts (.zip, .tar.gz, .apk, .ipa)
export function generateChecksumsAndNotes(version) {
  console.log('🔒 Generating SHA-256 Checksums for all release artifacts...');
  const artifactFiles = fs.readdirSync(ARTIFACTS_DIR).filter((f) => 
    f.endsWith('.zip') || f.endsWith('.tar.gz') || f.endsWith('.apk') || f.endsWith('.aab') || f.endsWith('.ipa')
  );
  const checksumLines = [];
  const checksumTableLines = [];
  const variantsTableLines = [];

  for (const file of artifactFiles) {
    const filePath = path.join(ARTIFACTS_DIR, file);
    const hash = calculateSha256(filePath);
    const sizeMb = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
    checksumLines.push(`${hash}  ${file}`);
    checksumTableLines.push(`| \`${file}\` | ${sizeMb} MB | \`${hash.substring(0, 16)}...\` |`);

    let description = 'Release package';
    let icon = '📦';
    if (file.includes('android') && file.endsWith('.aab')) {
      icon = '🏪';
      description = 'Google Play Store Android App Bundle (.aab). Upload directly to Google Play Console releases.';
    } else if (file.includes('android') && file.endsWith('.apk')) {
      icon = '🤖';
      description = 'Android direct installation package (APK). Sideload & run on any Android phone.';
    } else if (file.includes('ios-simulator')) {
      icon = '🍎';
      description = 'iOS Simulator bundle for testing in Xcode Simulator without developer certificates.';
    } else if (file.includes('ios') && (file.includes('project') || file.includes('xcode'))) {
      icon = '📱';
      description = 'Pre-configured native iOS Xcode project ready to open, sign, and run on physical iPhones.';
    } else if (file.includes('web-pwa')) {
      icon = '🌐';
      description = 'Static SPA with PWA manifest and service worker for Netlify, Vercel, and GitHub Pages.';
    } else if (file.includes('chrome-extension')) {
      icon = '🧩';
      description = 'Manifest V3 Google Chrome Extension popup bundle ready for Developer Mode / Web Store.';
    } else if (file.includes('fullstack-server')) {
      icon = '🖥️';
      description = 'Full-stack Node.js server and Docker bundle with backend API and static web app.';
    } else if (file.includes('capacitor-mobile')) {
      icon = '📲';
      description = 'Capacitor cross-platform native source project for both Android & iOS.';
    }

    variantsTableLines.push(`| **${icon} \`${file}\`** | ${sizeMb} MB | ${description} |`);
  }

  const checksumFile = path.join(ARTIFACTS_DIR, 'checksums.txt');
  fs.writeFileSync(checksumFile, checksumLines.join('\n') + '\n');
  console.log(`✅ Generated checksums.txt with ${artifactFiles.length} artifacts`);

  // -------------------------------------------------------------
  // 6. Generate Release Notes Markdown
  // -------------------------------------------------------------
  const releaseNotes = `# ClimaCast Release ${version}

Automated public release generated by GitHub Actions CI/CD.

## 📦 Available Release Binaries & Variants

| Package Binary / Archive | Size | Description & Installation |
| :--- | :--- | :--- |
${variantsTableLines.join('\n')}

---

## 🔒 Verification & Checksums (SHA-256)

| Artifact File | Size | SHA-256 Prefix |
| :--- | :--- | :--- |
${checksumTableLines.join('\n')}

*Full cryptographic hashes for verification are recorded in \`checksums.txt\`.*

---

## 🚀 Installation & Quick Start

- **🏪 Google Play Store**: Upload \`climacast-android-playstore-*.aab\` directly to Google Play Console ("Create new release").
- **🤖 Android Direct (APK)**: Download \`climacast-android-*.apk\`, transfer to your Android device (or download directly in mobile browser), tap to install ("Install Unknown Apps").
- **🌐 Web / PWA**: Extract \`climacast-web-pwa-*.zip\` to your web hosting provider or deploy via GitHub Pages.
- **🧩 Google Chrome**: Download and unzip \`climacast-chrome-extension-*.zip\`, navigate to \`chrome://extensions/\`, enable **Developer mode**, and select **Load unpacked**.
- **🍎 Apple iOS**:
  - For **Simulators / CI**: Extract \`climacast-ios-simulator-*.zip\` and drag \`App.app\` into Simulator.
  - For **Physical iPhones**: Extract \`climacast-ios-project-*.zip\`, open in Xcode on a Mac, connect your iPhone via cable or Wi-Fi, and click **Run**.
- **🖥️ Docker / Cloud Server**: Extract \`climacast-fullstack-server-*.tar.gz\` and run:
  \`\`\`bash
  docker build -t climacast . && docker run -d -p 3000:3000 climacast
  \`\`\`
`;

  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'release-notes.md'), releaseNotes);
  console.log(`✅ Generated release-notes.md`);
}

// Allow running with --checksums-only flag to regenerate checksums from existing release-artifacts
if (process.argv.includes('--checksums-only')) {
  const version = process.argv[3] || process.env.RELEASE_TAG || 'v1.0.0';
  generateChecksumsAndNotes(version);
} else {
  main().catch((err) => {
    console.error('❌ Error packaging variants:', err);
    process.exit(1);
  });
}
