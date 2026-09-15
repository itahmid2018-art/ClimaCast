# ClimaCast Comprehensive Developer & Deployment Guide

Welcome to the definitive engineering and operations guide for **ClimaCast** — a modern, reference-grade, multi-platform atmospheric intelligence application built with React, TypeScript, Tailwind CSS, Express, and Progressive Web App (PWA) technologies.

This document serves as an exhaustive technical manual covering local development, build testing, automated testing and CI/CD, external API integrations, architectural options, and production deployment across major cloud providers (GCP, AWS, Azure, Vercel, Netlify), Virtual Private Clouds (VPS/VPC), and shared hosting environments.

---

## Table of Contents

1. [Developer Support & Environment Setup](#1-developer-support--environment-setup)
2. [Local Testing & Development Workflows](#2-local-testing--development-workflows)
3. [Build Testing & Multi-Platform Packaging](#3-build-testing--multi-platform-packaging)
4. [Test Automation & CI/CD Pipeline](#4-test-automation--cicd-pipeline)
5. [API Integrations & Atmospheric Data Engines](#5-api-integrations--atmospheric-data-engines)
6. [Deployment Options & Architectural Modes](#6-deployment-options--architectural-modes)
7. [Cloud Provider Deployment Guides](#7-cloud-provider-deployment-guides)
   - [Google Cloud Platform (GCP Cloud Run)](#google-cloud-platform-gcp)
   - [Amazon Web Services (AWS App Runner & S3 + CloudFront)](#amazon-web-services-aws)
   - [Microsoft Azure (Azure Container Apps & Static Web Apps)](#microsoft-azure)
   - [Vercel](#vercel)
   - [Netlify](#netlify)
   - [Virtual Private Cloud / VPS (Ubuntu + Nginx + PM2)](#virtual-private-cloud--vps)
   - [Shared Hosting (cPanel / Apache)](#shared-hosting-cpanel--apache)
8. [Comprehensive Comparison Matrix](#8-comprehensive-comparison-matrix)
9. [Troubleshooting & Common Pitfalls](#9-troubleshooting--common-pitfalls)

---

## 1. Developer Support & Environment Setup

### 1.1 Prerequisites
Before starting development, ensure your local workstation meets the following requirements:
- **Node.js**: Version `20.x` or `22.x` LTS. (Check with `node -v`).
- **NPM**: Version `9.x` or higher (`npm -v`).
- **Python**: Version `3.8+` (used for automated universal archive packaging via `python3 -m zipfile`).
- **Docker** *(Optional, for containerized builds)*: Version `24.x+`.
- **Operating System**: Linux, macOS, or Windows (via WSL2 recommended).

### 1.2 Repository Structure
```
climacast/
├── .github/workflows/      # Automated GitHub Actions CI/CD release workflows
├── docs/                   # Engineering manuals, dev history, and user guides
├── public/                 # Static assets, Web App Manifest, Service Worker, Chrome Extension
│   ├── chrome-extension/   # Manifest V3 configuration for Chrome Add-on
│   ├── favicon.svg         # Crisp vector application icon
│   ├── manifest.json       # PWA Web App Manifest
│   └── sw.js               # Service Worker with background sync & caching
├── scripts/                # Packaging engines and asset generators
│   ├── generate-pwa-assets.js
│   └── package-variants.js
├── src/                    # Client-side React 18+ application
│   ├── components/         # Modular UI, radar views, pinned widgets, diagnostic cards
│   ├── services/           # Open-Meteo, PurpleAir, Gemini AI, and weather state managers
│   ├── types.ts            # Central TypeScript domain interfaces
│   ├── App.tsx             # Root dashboard controller & state orchestration
│   └── main.tsx            # React DOM hydration entry point
├── Dockerfile              # Multi-stage production container definition
├── capacitor.config.json   # Native iOS & Android bridge configuration
├── db.json                 # Server-side persistent storage for saved locations
├── server.ts               # Full-stack Express server with Vite middleware integration
└── vite.config.ts          # Vite build config with Tailwind CSS integration
```

### 1.3 Local Quickstart
```bash
# 1. Clone the repository
git clone https://github.com/your-org/climacast.git
cd climacast

# 2. Install dependencies
npm install

# 3. Initialize environment variables
cp .env.example .env

# 4. Launch development server
npm run dev
```
The application will launch at `http://localhost:3000` with hot-module reloading and real-time backend API endpoints.

---

## 2. Local Testing & Development Workflows

### 2.1 Testing the Development Server
When running `npm run dev`, `server.ts` boots Express on port 3000 and mounts Vite in middleware mode. This provides instant module updates while serving live backend endpoints:
- `GET /api/health` — Health check status.
- `GET /api/saved-locations` — Retrieves bookmarked locations.
- `POST /api/saved-locations` — Persists a new location.
- `DELETE /api/saved-locations/:id` — Removes a location.

### 2.2 Testing Progressive Web App (PWA) Features
PWA capabilities (Service Worker caching, offline support, install prompts) are best tested on production-like builds:
1. Build the web distribution:
   ```bash
   npm run build
   ```
2. Preview using the production server:
   ```bash
   npm start
   ```
3. Open Google Chrome DevTools (`F12`):
   - **Application tab > Service Workers**: Verify `sw.js` is registered and activated.
   - **Application tab > Manifest**: Verify icons, standalone display mode, and start URL.
   - **Network tab**: Toggle **Offline** mode to verify cached offline fallbacks and heuristic forecasts.

### 2.3 Testing Google Chrome Extension Mode
1. Ensure the bundle is compiled:
   ```bash
   npm run build
   ```
2. Assemble the extension folder or package:
   ```bash
   npm run package:all
   ```
3. In Chrome, navigate to `chrome://extensions/`.
4. Enable **Developer mode** (toggle in upper right).
5. Click **Load unpacked** and select `release-artifacts/climacast-chrome-extension-v1.0.0` (or unzip the extension archive).
6. Click the extension icon in your browser toolbar to verify popup behavior in the compact 380px frame.

---

## 3. Build Testing & Multi-Platform Packaging

### 3.1 Single-Command Verification
To ensure all TypeScript typings and server bundles compile without errors:
```bash
# Type check and lint
npm run lint

# Production build (Frontend Vite + Backend CommonJS Server)
npm run build
```

### 3.2 Packaging All Distribution Variants
ClimaCast includes a built-in packaging automation script (`scripts/package-variants.js`):
```bash
npm run package:all -- v1.0.0
```
This builds and outputs:
1. `climacast-android-v1.0.0.apk`: Compiled native Android installation package (when built in CI/CD or with `./gradlew assembleDebug`).
2. `climacast-chrome-extension-v1.0.0.zip`: Manifest V3 browser extension for Chrome/Edge/Brave/Arc.
3. `climacast-web-pwa-v1.0.0.zip`: Static Single Page App with Service Worker for web hosts.
4. `climacast-ios-simulator-v1.0.0.zip`: iOS Simulator bundle (compiled in macOS GitHub Actions runner).
5. `climacast-ios-xcode-project-v1.0.0.zip`: Pre-configured native Xcode workspace ready for physical iPhone deployment.
6. `climacast-fullstack-server-v1.0.0.tar.gz` and `.zip`: Self-contained Node.js Express server bundle with `dist/server.cjs`, `package.json`, and `Dockerfile`.
7. `climacast-capacitor-mobile-v1.0.0.zip`: Capacitor native bridge project ready for Android Studio and Xcode.
8. `checksums.txt`: SHA-256 cryptographic hashes for integrity verification across all artifacts.

---

## 4. Test Automation & CI/CD Pipeline

### 4.1 GitHub Actions Release Workflow (`.github/workflows/release.yml`)
The repository includes a parallel multi-job CI/CD pipeline triggered on every commit to `main` or semantic release tag (`v*`):
- **Job 1: `determine-version`**:
  - Dynamically calculates version tags (`v1.0.0-build.X` or milestone tag `v1.1.0`).
- **Job 2: `build-web-and-extension`**:
  - Sets up Node.js 20 on Ubuntu.
  - Executes strict TypeScript type validation (`npm run lint`).
  - Executes `npm run build` for frontend Vite and CommonJS Express backend.
  - Bundles the **Google Chrome Extension** (Manifest V3) ready for the Chrome Web Store.
  - Packages the Web PWA and Docker Full-Stack bundles.
- **Job 3: `build-android-apk` (Automated Native Android Compilation)**:
  - Boots an Ubuntu runner with Java 21 JDK and Android SDK.
  - Syncs the production web assets into Capacitor Android (`npx cap sync android`).
  - Invokes Gradle wrapper (`./gradlew assembleDebug`).
  - Produces a direct, ready-to-install Android APK: `climacast-android-*.apk`.
- **Job 4: `build-ios-app` (Automated Apple iOS Compilation)**:
  - Boots a macOS 14 (Apple Silicon) runner with Xcode.
  - Syncs the web assets into Capacitor iOS (`npx cap sync ios`).
  - Compiles an iOS Simulator package (`climacast-ios-simulator-*.zip`) without requiring developer certificates.
  - Packages the pre-configured Xcode project (`climacast-ios-xcode-project-*.zip`) ready to open, sign, and run on physical iPhones.
- **Job 5: `publish-release`**:
  - Gathers all compiled binaries (.apk, .zip, .tar.gz).
  - Generates unified SHA-256 checksums in `checksums.txt`.
  - Tags the Git commit.
  - Creates a public GitHub Release with direct binary download attachments.
- **Job 6: `deploy-github-pages`**:
  - Deploys the static Web PWA build to GitHub Pages.

---

## 5. API Integrations & Atmospheric Data Engines

ClimaCast is engineered to operate resiliently across multiple external meteorological services:

### 5.1 Open-Meteo API (Primary Forecast & Radar Engine)
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Data Provided**: Real-time temperature, apparent temperature, relative humidity, barometric pressure, wind speed, wind direction, wind gusts, UV index, cloud cover, and precipitation probability.
- **Licensing & Limits**: Free for non-commercial use (up to 10,000 daily calls) under CC BY 4.0. No API key required for standard tiers.
- **Resilience**: Built-in timeout and exponential backoff retry.

### 5.2 PurpleAir Hyper-Local Sensor Network
- **Endpoint**: `https://api.purpleair.com/v1/sensors`
- **Data Provided**: Real-time laser optical particle counter readings (PM2.5, PM10, AQI).
- **Configuration**: Optional `VITE_PURPLEAIR_API_KEY` in `.env`. If unconfigured, automatically falls back to Open-Meteo European Air Quality (CAMS) grid data.

### 5.3 Gemini AI Meteorological Intelligence
- **Data Provided**: Personalized natural-language activity recommendations (running, commuting, outdoor dining) and morning/evening briefings.
- **Configuration**: `GEMINI_API_KEY` (server-side only; never exposed to client).
- **Fallback Engine**: If the Gemini API key is not present or rate-limited, an integrated heuristic engine generates instant rule-based atmospheric advice.

### 5.4 Geocoding & City Search (Nominatim / Open-Meteo Geocoding)
- **Endpoint**: `https://geocoding-api.open-meteo.com/v1/search`
- **Capabilities**: Sub-string autocompletion, latitude/longitude mapping, country codes, and timezone resolution.

### 5.5 WTTR.in Weather & Regional Profiles (`user-db.json`)
- **Endpoints**:
  - `GET /api/user-profile` & `POST /api/user-profile`: Persistent demographic region management (country, state, district, default ZIP/PIN code) saved in `user-db.json`.
  - `GET /api/geocode/postal`: Multi-tier postal code resolution (Zippopotam &rarr; WTTR.in &rarr; Nominatim &rarr; Open-Meteo).
  - `GET /api/weather/wttr`: Meteorological proxy to `wttr.in/<location>` returning curated multi-day JSON predictions and raw terminal ANSI ASCII forecasts.
- **Header Requirement**: Backend Express server attaches `User-Agent: curl/7.88.1` to ensure WTTR.in responds with structured JSON or terminal ASCII rather than HTML.

---

## 6. Deployment Options & Architectural Modes

ClimaCast can be operated in two distinct runtime modes:

| Mode | Architecture | Target Hosting | Features |
| :--- | :--- | :--- | :--- |
| **Full-Stack (Recommended)** | Node.js Express server + React SPA | GCP Cloud Run, AWS App Runner, Azure Container Apps, VPS (Ubuntu/Nginx), Docker | Full API proxying, Gemini server-side AI key protection, server-persisted saved locations (`db.json`). |
| **Static SPA / PWA** | Pure Client-Side Static Assets | Vercel, Netlify, GitHub Pages, Cloudflare Pages, AWS S3 + CloudFront | Instant global CDN delivery, zero server maintenance, offline PWA cache, local storage persistence. |

---

## 7. Cloud Provider Deployment Guides

### Google Cloud Platform (GCP)

#### Method A: GCP Cloud Run (Full-Stack Container - Recommended)
1. **Build and push container image to Google Artifact Registry**:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/climacast:latest
   ```
2. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy climacast \
     --image gcr.io/YOUR_PROJECT_ID/climacast:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 3000 \
     --set-env-vars NODE_ENV=production,GEMINI_API_KEY="your-gemini-key"
   ```
- **Pros**: Scales to zero (low cost when idle), automatic HTTPS, built-in DDoS protection, supports custom domains, handles both Express backend and frontend assets seamlessly.
- **Cons**: Cold starts (~2–4 seconds) on free scale-to-zero instances if no min-instances configured.
- **Issues to Expect**: Ephemeral filesystem. If you rely on `db.json` for saved locations, instance restarts will revert edits unless you mount Google Cloud Storage via gcsfuse or connect to Firestore.

#### Method B: Google Cloud Storage + Cloud CDN (Static PWA)
1. Build the static assets: `npm run build`
2. Upload `dist/` to a public GCS bucket.
3. Configure `MainPageSuffix` as `index.html` and `NotFoundPage` as `index.html` for SPA routing.
4. Enable Cloud CDN and link to an HTTPS Load Balancer.

---

### Amazon Web Services (AWS)

#### Method A: AWS App Runner (Full-Stack Container)
1. **Push Docker image to Amazon ECR**:
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
   docker tag climacast:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/climacast:latest
   docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/climacast:latest
   ```
2. **Create App Runner Service**:
   - Source: Container registry (ECR).
   - Port: `3000`.
   - Environment variables: `NODE_ENV=production`, `PORT=3000`.
- **Pros**: Fully managed, auto-scaling, integrated SSL, low operational overhead.
- **Cons**: Minimum active instance cost (~$5–$15/month).

#### Method B: AWS S3 + CloudFront (Static PWA)
1. Build static assets: `npm run build`.
2. Sync to S3:
   ```bash
   aws s3 sync dist/ s3://your-climacast-bucket --delete
   ```
3. In CloudFront Distribution:
   - Origin: S3 bucket.
   - **Custom Error Response**: Map HTTP Error `403` and `404` to Response Page `/index.html` with HTTP Status `200` (vital for client-side routing).
- **Pros**: Extremely low cost, blazing fast global edge delivery, 99.99% availability.
- **Cons**: Client-side only; backend Express API routes must be hosted separately or omitted.

---

### Microsoft Azure

#### Method A: Azure Container Apps (Full-Stack)
1. **Deploy using Azure CLI**:
   ```bash
   az containerapp up \
     --name climacast-app \
     --resource-group climacast-rg \
     --location eastus \
     --environment climacast-env \
     --source . \
     --target-port 3000 \
     --ingress external
   ```
- **Pros**: Built on Kubernetes (KEDA), supports scale-to-zero, micro-billing per vCPU-second.
- **Cons**: Setup complexity with virtual networks and environment groups.

#### Method B: Azure Static Web Apps (Static PWA)
1. Install Azure Static Web Apps CLI:
   ```bash
   npm install -g @azure/static-web-apps-cli
   ```
2. Deploy `dist/` directly or connect your GitHub repository to generate an automated Azure deployment workflow.
- **Pros**: Free tier available, built-in custom domain SSL, native GitHub integration.

---

### Vercel

#### Deployment Procedure (Static SPA / PWA)
1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Deploy to production:
   ```bash
   vercel --prod
   ```
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add a `vercel.json` rewrite file in project root if client-side sub-routes are used:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```
- **Pros**: Zero configuration, instant preview branches on pull requests, global edge network, automatic HTTPS.
- **Cons**: Vercel is optimized for static and serverless architectures; running long-lived background tasks or persistent filesystem writes (`db.json`) is not supported.

---

### Netlify

#### Deployment Procedure (Static SPA / PWA)
1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```
2. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```
3. Ensure SPA redirection by placing a `_redirects` file in `public/`:
   ```
   /*    /index.html   200
   ```
- **Pros**: Free starter tier, atomic deploys with instant rollbacks, integrated forms and analytics.
- **Cons**: No native custom long-running Node.js backend.

---

### Virtual Private Cloud / VPS (Ubuntu + Nginx + PM2)

Ideal for dedicated cloud virtual machines (DigitalOcean Droplets, Hetzner Cloud, Linode, AWS EC2, GCP Compute Engine).

#### Step 1: Server Preparation
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS and Nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git certbot python3-certbot-nginx

# Install PM2 process manager globally
sudo npm install -g pm2
```

#### Step 2: Deploy Code & Build
```bash
# Clone repository
git clone https://github.com/your-org/climacast.git /var/www/climacast
cd /var/www/climacast

# Install dependencies and build
npm install
npm run build

# Start server using PM2
pm2 start dist/server.cjs --name "climacast" --env production
pm2 startup
pm2 save
```

#### Step 3: Configure Nginx Reverse Proxy
Edit `/etc/nginx/sites-available/climacast`:
```nginx
server {
    listen 80;
    server_name weather.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable the site and obtain a free SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/climacast /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d weather.yourdomain.com
```
- **Pros**: Total control over hardware, zero vendor lock-in, persistent disk for `db.json`, extremely cost-effective for high steady-state traffic ($4–$6/month).
- **Cons**: Requires manual OS patching, security updates, firewall management (UFW), and backup configuration.

---

### Shared Hosting (cPanel / Apache / LiteSpeed)

For traditional shared hosting plans (Hostinger, Namecheap, Bluehost, GoDaddy).

#### Method: Static Web Export
1. Run `npm run build` on your workstation.
2. Open cPanel > **File Manager**.
3. Navigate to `public_html` (or your subdomain directory).
4. Upload all contents of the `dist/` folder.
5. Create or edit `.htaccess` in `public_html` to enable SPA routing and gzip compression:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>

   # Gzip & Caching
   <IfModule mod_deflate.c>
     AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json image/svg+xml
   </IfModule>
   ```
- **Pros**: Extremely low cost ($1–$3/mo), works with existing shared hosting accounts, simple FTP/file upload.
- **Cons**: No Node.js Express backend (cannot run `server.ts` unless the host provides a cPanel "Setup Node.js App" feature with Passenger). `db.json` persistence not available; uses browser `localStorage`.

---

## 8. Comprehensive Comparison Matrix

| Platform / Host | Hosting Type | Complexity | Est. Monthly Cost | Scalability | Offline PWA Support | Full-Stack Server | Recommended For |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **GCP Cloud Run** | Serverless Container | Low | $0 – $10 | ★★★★★ | Yes | Yes | Production enterprise & autoscaling |
| **AWS App Runner** | Managed Container | Low-Med | $5 – $25 | ★★★★★ | Yes | Yes | Production AWS infrastructure |
| **AWS S3 + CloudFront** | Static Edge CDN | Medium | $0 – $2 | ★★★★★ | Yes | No (Client-only) | Global high-traffic static PWA |
| **Azure Container Apps** | Managed Kubernetes | Med | $0 – $15 | ★★★★★ | Yes | Yes | Azure enterprise environments |
| **Vercel** | Edge PaaS | Low | $0 – $20 | ★★★★★ | Yes | No (Client-only) | Rapid staging, Jamstack, frontend teams |
| **Netlify** | Edge PaaS | Low | $0 – $19 | ★★★★★ | Yes | No (Client-only) | Simple static deployment & Git integration |
| **VPS (Ubuntu + Nginx)** | Self-Hosted VM | High | $4 – $12 | ★★★☆☆ | Yes | Yes | Maximum control, custom configurations |
| **Shared Hosting (cPanel)**| Apache Shared | Low | $1 – $5 | ★★☆☆☆ | Yes | Limited | Low-budget personal projects |

---

## 9. Troubleshooting & Common Pitfalls

### Issue 1: "404 Not Found" on Direct Route Navigation
- **Cause**: In Single Page Applications, routes like `/about` or `/radar` do not exist as physical files on disk. If the server does not route unknown requests back to `index.html`, a 404 error is thrown.
- **Fix**:
  - **Nginx**: Ensure `try_files $uri $uri/ /index.html;` is present.
  - **Apache**: Add the `.htaccess` rewrite rule shown in the Shared Hosting section.
  - **AWS CloudFront**: Set Custom Error Responses for 403 and 404 to return `/index.html` with status 200.
  - **Express**: Handled natively in `server.ts` via `app.get('*', ...)`.

### Issue 2: Service Worker Not Updating in Production
- **Cause**: Browser aggressive caching of `sw.js`.
- **Fix**: Ensure your web server serves `sw.js` with `Cache-Control: no-cache, no-store, must-revalidate`. ClimaCast's Service Worker registers an automatic skipWaiting cycle upon new version detection.

### Issue 3: Mixed Content Warning (HTTP vs HTTPS)
- **Cause**: Serving ClimaCast over HTTP or calling external APIs over unencrypted protocols.
- **Fix**: Open-Meteo, PurpleAir, and Nominatim endpoints must always use `https://`. Always enforce HTTPS on your domain using Let's Encrypt or your cloud provider's managed certificates.

### Issue 4: Ephemeral Storage Resetting Saved Locations
- **Cause**: On container platforms like GCP Cloud Run or AWS App Runner, files written to disk (`db.json`) are erased when instances scale to zero or restart.
- **Fix**: For cloud multi-instance deployments, either use browser local storage (default client mode), or mount a managed cloud storage bucket/database (e.g. Firestore, PostgreSQL, Cloud SQL) via an API adapter.

---

## 10. Google Play Store Android Deployment & Pre-Publishing Audit

ClimaCast is packaged with complete Capacitor Android native project infrastructure pre-configured for the Google Play Store.

### 10.1 Automated Compliance Audit
Before building or submitting, execute the built-in audit script to verify all 19 Google Play policy requirements:
```bash
npm run test:android
```
This tests for Target SDK 34+ compliance (API 36 configured), absence of `ACCESS_BACKGROUND_LOCATION`, in-app privacy policy accessibility, adaptive icon density sets, and Android App Bundle release configurations. For in-depth analysis, refer to [`docs/android_tests.md`](android_tests.md).

### 10.2 Compiling the Production Android App Bundle (.aab)
Google Play Console requires the `.aab` format:
```bash
# 1. Build production web bundle
npm run build

# 2. Synchronize web assets into Android project
npx cap sync android

# 3. Compile release AAB and debug APK
cd android
./gradlew bundleRelease assembleDebug
cd ..
```
The output bundle will be located at:
`android/app/build/outputs/bundle/release/app-release.aab`

### 10.3 Signing the Release Bundle
For production publishing, sign the AAB with your release keystore:
```bash
# Generate a release keystore (if you don't already have one)
keytool -genkey -v -keystore climacast-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias climacast

# Sign the Android App Bundle
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore climacast-release-key.jks android/app/build/outputs/bundle/release/app-release.aab climacast
```

### 10.4 Google Play Console Submission
1. In Google Play Console, create an app titled **ClimaCast** (App, Free).
2. Set Privacy Policy URL to `https://<your-domain>/privacy-policy.html`.
3. In Data Safety, declare that location data is collected in the foreground for weather lookups, never shared with third parties, and can be cleared via in-app data deletion controls.
4. Upload `app-release.aab` to Production or Internal Testing.
