# ClimaCast GitHub Release CI/CD Guide

This guide details the automated Continuous Integration and Continuous Deployment (CI/CD) release pipeline configured in `.github/workflows/release.yml`.

---

## ⚡ Overview & Workflow

Every time changes are committed and pushed to the `main` or `master` branch on GitHub (or when a version tag like `v1.1.0` is pushed), GitHub Actions automatically:
1. **Lints & Validates**: Verifies TypeScript types (`npm run lint`).
2. **Compiles**: Generates the production static web bundle and the CommonJS Node.js server bundle (`npm run build`).
3. **Packages All Variants**: Executes `scripts/package-variants.js` to assemble and compress all 4 platform distributions.
4. **Calculates Integrity Checksums**: Computes cryptographic SHA-256 hashes for every downloadable archive and writes `checksums.txt`.
5. **Tags Git Commit**: Automatically creates an annotated Git release tag (e.g., `v1.0.0-build.12`).
6. **Publishes Public GitHub Release**: Creates a public release on your repository's **Releases** tab and uploads all assets for the world to download.
7. **Deploys Live Web PWA**: Automatically updates the public web instance via GitHub Pages.

---

## 📦 Downloadable Public Variants

Every release includes the following public download artifacts:

| Variant | Filename Format | Target Audience & Usage |
| :--- | :--- | :--- |
| **🌐 Web App & PWA** | `climacast-web-pwa-*.zip` | Static web bundle with Service Worker, offline cache, and PWA manifest. Ready to deploy to Netlify, Vercel, Firebase Hosting, Cloudflare Pages, or static Nginx servers. |
| **🧩 Chrome Extension** | `climacast-chrome-extension-*.zip` | Complete Google Chrome Manifest V3 extension popup. Can be loaded directly unpacked via `chrome://extensions` or uploaded to the Chrome Web Store. |
| **🖥️ Full-Stack Server** | `climacast-fullstack-server-*.tar.gz` and `.zip` | Standalone Node.js server (`dist/server.cjs`), static files, `package.json`, `Dockerfile`, and `db.json`. Ready for instant deployment on Google Cloud Run, AWS, VPS, or Docker container. |
| **📱 Capacitor Mobile** | `climacast-capacitor-mobile-*.zip` | Native Android & iOS project scaffold with `capacitor.config.json` and web dist. Ready to open in Android Studio (`npx cap open android`) or Xcode. |
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

### Web / PWA Variant
1. Unzip `climacast-web-pwa-v1.0.0.zip`.
2. Upload the contents to any static web hosting provider (GitHub Pages, Netlify, Cloudflare, S3).
3. Ensure SPA routing directs requests to `index.html`.

### Chrome Extension Variant
1. Extract `climacast-chrome-extension-v1.0.0.zip`.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** toggle in the top right corner.
4. Click **Load unpacked** and select the extracted folder.
5. Pin the weather icon in your browser toolbar!

### Full-Stack Server & Docker Variant
**Node.js**:
```bash
tar -xzf climacast-fullstack-server-v1.0.0.tar.gz
npm install --omit=dev
npm start
# Server listens on port 3000
```

**Docker**:
```bash
tar -xzf climacast-fullstack-server-v1.0.0.tar.gz
docker build -t climacast:latest .
docker run -d -p 3000:3000 --name climacast climacast:latest
```

### Capacitor Mobile (Android & iOS)
```bash
unzip climacast-capacitor-mobile-v1.0.0.zip
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android
npx cap open android
```
