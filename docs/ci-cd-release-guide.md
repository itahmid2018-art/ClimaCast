# ClimaCast GitHub Release CI/CD Guide

This guide details the automated Continuous Integration and Continuous Deployment (CI/CD) release pipeline configured in `.github/workflows/release.yml`.

---

## ⚡ Overview & Workflow

Every time changes are committed and pushed to the `main` or `master` branch on GitHub (or when a version tag like `v1.1.0` is pushed), GitHub Actions executes a parallel multi-job workflow:
1. **Version Calculation (`determine-version`)**: Computes the release tag (`v1.0.0-build.X` or semantic tag `v*`).
2. **Web & Extension Build (`build-web-and-extension`)**: Lints TypeScript, compiles the frontend & backend server with Vite and esbuild, and packages the PWA, Google Chrome Extension, Docker server, and base archives.
3. **Automated Android APK Compilation (`build-android-apk`)**:
   - Boots an `ubuntu-latest` runner with Java 21 JDK and Android SDK.
   - Syncs web assets into Capacitor Android (`npx cap sync android`).
   - Executes Gradle (`./gradlew assembleDebug`).
   - Generates the ready-to-install Android package: `climacast-android-*.apk`.
4. **Automated Apple iOS Compilation (`build-ios-app`)**:
   - Boots a `macos-14` (Apple Silicon M-series) runner with Xcode.
   - Syncs web assets into Capacitor iOS (`npx cap sync ios`).
   - Runs `xcodebuild` targeting iOS Simulator (`climacast-ios-simulator-*.zip`) without requiring developer certificates.
   - Packages the complete Xcode project workspace (`climacast-ios-xcode-project-*.zip`) ready to open, sign, and deploy to physical iPhones.
5. **Consolidation & Public GitHub Release (`publish-release`)**:
   - Downloads all binaries from the parallel build jobs.
   - Calculates unified SHA-256 cryptographic hashes into `checksums.txt`.
   - Tags the Git commit.
   - Publishes a public GitHub Release with direct binary download attachments.
6. **Live Web Deployment (`deploy-github-pages`)**: Updates the public PWA on GitHub Pages.

---

## 📦 Downloadable Public Release Binaries

Every automated release generates and attaches the following public binaries and packages:

| Platform / Binary | Filename Format | Direct User Experience |
| :--- | :--- | :--- |
| **🤖 Android Phone** | `climacast-android-*.apk` | **Direct Mobile Installer**: Download on any Android phone, tap to install, and run natively with hardware acceleration and splash screen. |
| **🧩 Google Chrome** | `climacast-chrome-extension-*.zip` | **Browser Popup Extension**: Extract and load unpacked into `chrome://extensions/` or upload to the Chrome Web Store. |
| **🌐 Web App & PWA** | `climacast-web-pwa-*.zip` | **Static Web & PWA**: Deploy to Netlify, Vercel, Firebase Hosting, Cloudflare Pages, or static Nginx servers. |
| **🍎 Apple iOS (Simulator)** | `climacast-ios-simulator-*.zip` | **iOS Simulator Package**: Drag and drop `App.app` into Xcode Simulator for testing without Apple Developer certificates. |
| **📱 Apple iOS (Xcode Project)** | `climacast-ios-xcode-project-*.zip` | **Native Xcode Workspace**: Open in Xcode on macOS, connect physical iPhone via USB or Wi-Fi, and click **Run**. |
| **🖥️ Full-Stack Server** | `climacast-fullstack-server-*.tar.gz` and `.zip` | **Standalone Server & Docker**: Pre-compiled Node.js server (`dist/server.cjs`), static files, and `Dockerfile`. |
| **📲 Capacitor Project** | `climacast-capacitor-mobile-*.zip` | Complete multi-platform mobile project scaffold. |
| **🔒 SHA-256 Checksums** | `checksums.txt` | Cryptographic hashes for all published files to verify authenticity. |

---

## 🛠️ Triggering Releases

### 1. Automatic on Commit (Default)
Pushing to the `main` or `master` branch automatically triggers the workflow:
```bash
git add .
git commit -m "feat: enhance Doppler radar zoom levels"
git push origin main
```
The pipeline automatically computes an incremental build version tag:
`v1.0.0-build.<run_number>`

### 2. Semantic Version Tagging
To release an official milestone version (e.g. `v1.1.0`):
```bash
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```
The workflow detects the tag and publishes the release under `v1.1.0`.

### 3. Manual Trigger (GitHub UI)
1. Go to your repository on GitHub.
2. Click **Actions** > **Release CI/CD**.
3. Click **Run workflow**.
4. Optionally specify a custom tag (e.g., `v1.2.0-beta.1`) or leave blank for automated build numbering.

---

## 💻 Local Testing & Packaging

You can test the entire packaging pipeline locally at any time:

```bash
# 1. Build the production artifacts
npm run build

# 2. Package all variants (optional tag argument)
npm run package:all -- v1.0.0

# 3. View the generated archives in /release-artifacts
ls -lh release-artifacts/
```

All variants, `checksums.txt`, and `release-notes.md` will be placed in the `release-artifacts/` folder.

---

## 🚀 Variant Usage Instructions

### 🤖 Native Android APK Variant
1. Download `climacast-android-*.apk` directly from the GitHub Release assets.
2. Transfer the file to your Android phone (or download it directly in Chrome / Firefox on Android).
3. Tap the file in your notifications or Downloads manager.
4. If prompted, toggle **"Allow from this source"** (Install Unknown Apps permission).
5. Tap **Install**. The native ClimaCast app icon appears in your app drawer with hardware acceleration, native GPS location, and custom splash screen!

### 🧩 Chrome Extension Variant
1. Extract `climacast-chrome-extension-*.zip`.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable the **Developer mode** toggle in the top-right corner.
4. Click **Load unpacked** and select the extracted folder.
5. Pin the weather icon in your browser toolbar for instant popup access!
*(You can also submit this exact zip file to the Google Chrome Web Store Developer Dashboard).*

### 🍎 Apple iOS (iPhone) Variants
- **For iOS Simulator (No Developer Account Required)**:
  1. Download and extract `climacast-ios-simulator-*.zip`.
  2. Open the Xcode iOS Simulator (`open -a Simulator`).
  3. Drag and drop `App.app` into the running simulator window.
- **For Physical iPhones (Using Xcode Workspace)**:
  1. Download and extract `climacast-ios-xcode-project-*.zip`.
  2. Open `ios/App/App.xcworkspace` in Xcode on your Mac.
  3. Connect your iPhone via USB or Wi-Fi.
  4. Select your device from the run destination dropdown.
  5. Under **Signing & Capabilities**, select your personal Apple ID team.
  6. Press **Cmd + R** to run directly on your iPhone.

### 🌐 Web / PWA Variant
1. Unzip `climacast-web-pwa-*.zip`.
2. Upload the contents to any static web hosting provider (GitHub Pages, Netlify, Cloudflare Pages, S3).
3. Ensure SPA routing directs requests to `index.html`.
4. Users visiting in Chrome, Safari, or Edge can tap **Add to Home Screen** to install the PWA.

### 🖥️ Full-Stack Server & Docker Variant
**Node.js**:
```bash
tar -xzf climacast-fullstack-server-*.tar.gz
npm install --omit=dev
npm start
# Server listens on port 3000
```

**Docker**:
```bash
tar -xzf climacast-fullstack-server-*.tar.gz
docker build -t climacast:latest .
docker run -d -p 3000:3000 --name climacast climacast:latest
```

### 📲 Capacitor Mobile Source (Manual Studio Build)
```bash
unzip climacast-capacitor-mobile-*.zip
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap sync
npx cap open android   # Launches Android Studio
npx cap open ios       # Launches Xcode
```
