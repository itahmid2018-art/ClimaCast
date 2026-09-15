# ClimaCast (Open-Meteo Edition)

A reference-grade web application built to **ClimaCast design standards**, powered by the free and open-source meteorological models of **[Open-Meteo](https://open-meteo.com/)**. Designed from the ground up to be hosted as a modern responsive web app (PWA), compiled into native **Android** and **iOS** mobile apps using Capacitor, and packaged as a **Google Chrome Extension (Manifest V3)**.

---

## ✨ Features

- **Dynamic Weather Backgrounds & Responsive Lazy Loading:** Immersive responsive photographic weather backdrops paired with instant CSS atmospheric gradients. Uses `<picture>` with responsive `srcset` and media queries (640w mobile, 1080w tablet, 1920w desktop) with native `loading="lazy"`, asynchronous decoding (`decoding="async"`), and low fetch priority to maximize initial page load performance and conserve bandwidth. Includes Service Worker Cache-First offline caching and an "Atmospheric Gradients Only (Ultra Data Saver)" toggle in Settings for metered connections.
- **Precise Postal / PIN Code Weather (WTTR.in Engine & `user-db.json`):** Configure country, state, district, and default postal/PIN codes persisted securely in `user-db.json`. Look up micro-climate weather forecasts for any ZIP / PIN code across the world with multi-source fallback geocoding (Zippopotam, WTTR.in, Nominatim, Open-Meteo) and view both structured weather cards and raw terminal-style WTTR.in ASCII weather forecasts.
- **Multi-Source Air Quality (AQI):** Switch between real-time AQI providers instantly. Includes Official AQI via , HyperLocal AQI via PurpleAir's real-time community sensor network, and the Default Open-Meteo model.
- **ClimaCast Aesthetics:** Material 3 inspired layout with clean typography, generous spacing, dynamic atmospheric gradients matching real-time weather and daylight, and a **Sticky Navigation Header** that keeps essential controls and search persistently accessible while scrolling.
- **Weather Insights (Powered by Gemini AI):** Natural language meteorological intelligence generating concise, conversational summaries, "What to Wear" dressing advice, outdoor activity guidance, health/comfort ratings, and a prominent **"Tip of the Day"** header banner using the server-side `@google/genai` SDK (`gemini-3.8-flash`).
- **Export & Share Forecasts:** One-click generation of weather reports, supporting copying readable text snippets to the clipboard, downloading structured JSON datasets, and exporting CSV spreadsheets.
- **Secure API Key Management:** Robust backend server integration that securely stores custom API keys (Gemini, OpenAI, Anthropic, PurpleAir, Radar) in a local `db.json` with `.env` file fallbacks, fully synchronized with the frontend settings UI.
- **Severe Weather Alerts & Storm Warnings:** High-visibility emergency warning banners positioned prominently above the current weather card, evaluating Open-Meteo convective models for severe thunderstorms, hail, high winds, flash floods, winter storms, extreme heat, and air quality advisories with expandable protective safety actions and live simulation mode.
- **Light & Dark Theme Parity:** Seamless toggle between Google light surface and dark mode with system preference synchronization.
- **Real-Time Open-Meteo Integration:** Free, high-precision weather forecasts, global geocoding city search, and air quality models.
- **Interactive 24-Hour Ribbon:** Horizontal scrollable hourly forecast with tab filters for **Temperature**, **Precipitation Probability**, and **Wind Direction**.
- **10-Day Extended Forecast:** Daily rows featuring ClimaCast's signature visual min/max temperature range bar and expandable solar/wind detail cards.
- **Interactive Weather Radar & Cloud Map:** Geospatial Leaflet map featuring real-time Doppler precipitation radar and infrared satellite cloud cover layers, radar loop animation player, time scrubber, opacity controls, fullscreen toggle, and theme-adaptive base styling (CartoDB Positron / Dark Matter).
- **Atmospheric Bento-Grid:**
  - **Air Quality (US AQI):** Numerical index, quality tier, health advisories, and PM2.5 / PM10 / Ozone metrics.
  - **UV Index:** Real-time rating, peak time indicator, and sun protection guidance.
  - **Wind & Gusts:** Animated rotating compass dial, direction in degrees and cardinal notation, and peak daily gusts.
  - **Solar Arc:** Sunrise and sunset tracking with a visual daylight progress arc.
  - **Humidity & Dew Point:** Relative humidity percentage, comfort rating, and dew point calculation.
  - **Pressure & Visibility:** Barometric pressure in hPa and optical visibility in kilometers.
- **Astronomical Moon Phase:** Live synodic lunar calculation displaying current moon phase (New Moon, Crescents, Quarters, Gibbous, Full Moon), illumination percentage, and an interactive popover with lunar cycle timeline and days to next primary phase.
- **Pre-Sunrise Dawn UI Pulse & Silent Notifications:** Dynamic golden dawn breathing aura (`animate-dawn-pulse`) illuminating the hero card shortly before sunrise, with silent local Web Notifications (`silent: true`), in-app dawn status badges, and interactive simulation mode.
- **Native & PWA Alarm Integration:** Deep integration with native Android Clock alarms (`android.intent.action.SET_ALARM`), native iOS Calendar/Reminders alarms (`.ics` with `VALARM`), Apple Shortcuts, and background PWA Service Worker alerts.
- **Service Worker Background Sync & Offline Cache:** Automatically updates cached Open-Meteo weather data in `CacheStorage` via the Web Background Sync API (`weather-data-sync`) when the device regains network connectivity, guaranteeing the freshest data is ready offline.
- **Location Search & GPS:** Instant global autocomplete via Open-Meteo Geocoding, one-tap GPS current location, and a saved favorites drawer.
- **Units Toggle:** One-click conversion between metric (°C, km/h, mm) and imperial (°F, mph, in).
- **Offline Resilience:** Automatic client-side caching of the latest forecast with offline network status indicators.

---

## 🛠 Tech Stack

- **Framework:** React 19 + TypeScript
- **Bundler & Tooling:** Vite 6
- **Styling:** Tailwind CSS v4
- **Icons:** Lucide React
- **Animations:** Motion (Framer Motion)
- **Data Source:** [Open-Meteo](https://open-meteo.com/) (Forecast, Geocoding, Air Quality APIs)
- **Cross-Platform:** Capacitor 6 (Android & iOS) + Chrome Extension (Manifest V3)

---

## 🚀 Quick Start (Web Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

### 3. Build Production Bundle
```bash
npm run build
```
The compiled, production-ready static assets are written to `dist/`.

---

## 📍 Precise Postal / PIN Code Weather & Regional Profiles (WTTR.in Integration)

ClimaCast features a dedicated regional profile system and postal code weather engine inspired by **[WTTR.in](https://wttr.in)**:

### 1. Dual-Tier Persistence Architecture
- **`db.json`**: Preserves application settings, saved favorite cities, notification rules, and custom API keys.
- **`user-db.json`**: Specifically stores the user's demographic location profile:
  - **Country**: Selected country name and ISO alpha-2 code (e.g., `US`, `IN`, `GB`, `CA`, `DE`, `FR`, `AU`, `JP`).
  - **State / Province**: Regional administrative area (e.g., `California`, `Karnataka`, `Bavaria`).
  - **District / County**: Sub-regional municipal or county identifier.
  - **Default ZIP / PIN**: User's preferred primary postal code for automatic startup resolution.
  - **Saved PIN Codes**: Collection of bookmarked PIN/ZIP codes with resolved coordinates and custom labels.

### 2. Multi-Source Postal Geocoding Chain
When a user enters a PIN or ZIP code (e.g., `94103`, `560001`, `SW1A 1AA`, `75001`), ClimaCast resolves geographic coordinates through an automated fallback cascade:
1. **Zippopotam API (`api.zippopotam.us`)**: Micro-postal database with official postal boundaries.
2. **WTTR.in Location Engine (`wttr.in/<postal>?format=j1`)**: Resolves postal queries through curl-compliant meteorological endpoints.
3. **OpenStreetMap Nominatim (`nominatim.openstreetmap.org/search`)**: Structured address search bounded by the user's selected country.
4. **Open-Meteo Geocoding (`geocoding-api.open-meteo.com`)**: General administrative search.

### 3. WTTR.in Weather Engine & Terminal ASCII Predictions
- **Curated Visual Cards**: 3-day morning, noon, evening, and night breakdown with temperature, precipitation probability, humidity, UV index, wind speed, and barometric pressure.
- **Raw WTTR.in Terminal View**: Live ASCII weather report mimicking `curl wttr.in/<location>` with full ANSI art rendering, wind arrows, and meteorological tables.
- **Direct Application Integration**: One-click **"Apply as Active Location"** button seamlessly updates the primary dashboard, hourly ribbon, 10-day forecast, and geospatial radar maps.

### 4. REST API Endpoints
- `GET /api/user-profile`: Retrieve the current user profile, country, state, district, and saved PIN codes.
- `POST /api/user-profile`: Update country, state, district, or default ZIP/PIN code in `user-db.json`.
- `POST /api/user-profile/pins`: Save a new bookmarked postal PIN code.
- `DELETE /api/user-profile/pins/:id`: Remove a saved postal PIN code.
- `GET /api/geocode/postal?code=<postal>&country=<code>`: Resolve postal code to latitude, longitude, and place name.
- `GET /api/weather/wttr?location=<query>&format=<json|raw>`: Proxy weather request to WTTR.in with `curl/7.88.1` user agent headers.

---

## 📲 Progressive Web App (PWA) & "Add to Home Screen"

ClimaCast is fully compliant with modern Progressive Web App (PWA) specifications:
- **`BeforeInstallPromptEvent` Listener:** Captures the browser's install event to display a custom, branded **"Add to Home Screen"** button in the app's `CrossPlatformGuideModal` and footer actions.
- **Standalone Mode Detection:** Automatically detects if the app is already installed or launched from the home screen (`display-mode: standalone`).
- **Device-Specific Installation Guides:** Step-by-step interactive instructions for iOS Safari (`Share` &rarr; `Add to Home Screen`) and Android / Desktop Chrome.
- **Web App Manifest (`public/manifest.json`):** Registered with `id`, `start_url`, `scope`, standalone display, and standard 192x192 / 512x512 icon assets.
- **High-Fidelity Mobile Splash Screen:** Seamless standalone opening experience on mobile devices with branded `#1a73e8` background color, theme color status bar, maskable adaptive icons, and pre-hydration splash screen preventing blank white flashes.

---

## 📱 Compiling into Native Android (Capacitor)

The repository includes a pre-configured `capacitor.config.json` targeting the `dist/` web output.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Android Studio](https://developer.android.com/studio) installed with Android SDK 33+

### Step-by-Step Android Compilation
```bash
# 1. Install Capacitor dependencies
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Build the production web bundle
npm run build

# 3. Add Android platform (run once)
npx cap add android

# 4. Sync web assets and plugins to Android
npx cap sync android

# 5. Open project in Android Studio
npx cap open android
```
In Android Studio, click **Build > Generate Signed Bundle / APK** to create release packages for Google Play.

---

## 🍏 Compiling into Native iOS (Capacitor)

### Prerequisites
- macOS with [Xcode](https://developer.apple.com/xcode/) 15+ installed
- CocoaPods (`sudo gem install cocoapods`)

### Step-by-Step iOS Compilation
```bash
# 1. Install Capacitor iOS dependencies
npm install @capacitor/core @capacitor/cli @capacitor/ios

# 2. Build the production web bundle
npm run build

# 3. Add iOS platform (run once)
npx cap add ios

# 4. Sync web assets and plugins to iOS
npx cap sync ios

# 5. Open in Xcode
npx cap open ios
```
In Xcode, select your target simulator or connected iOS device and press **Cmd + R** to run.

---

## 🧩 Installing as a Google Chrome Add-on (Manifest V3)

The project includes an official Manifest V3 configuration in `public/chrome-extension/manifest.json`.

### Testing in Google Chrome:
1. Run `npm run build` to compile the application into `dist/`.
2. Copy `public/chrome-extension/manifest.json` into `dist/manifest.json`:
   ```bash
   cp public/chrome-extension/manifest.json dist/manifest.json
   ```
3. Open Google Chrome and navigate to `chrome://extensions`.
4. Turn ON **Developer mode** in the upper-right corner.
5. Click **Load unpacked** and select the `dist/` directory.
6. Click the Extensions puzzle icon in the Chrome toolbar and pin **ClimaCast**. Click the icon to view the popup!

*Note: You can also preview the extension popup layout anytime in the web app by clicking the **"Extension"** toggle in the top header.*

---

## 🌐 Deploying as a Web App / PWA

Because the application is a client-side SPA with zero server dependencies:
- **Cloud Run / Docker:** Pre-configured container configuration with static file serving.
- **Vercel / Netlify / Firebase Hosting:** Connect your repository and set build command to `npm run build` and publish directory to `dist`.
- **PWA Installation:** Users visiting in Chrome, Edge, or Safari on iOS will see the native **"Install App"** prompt enabled by `public/manifest.json`.

---

## 📂 Project Structure

```
├── capacitor.config.json           # Native Capacitor mobile configuration
├── Product-Requirements-Specification.md # Formal product and architecture spec
├── Readme.md                       # Comprehensive guide and documentation
├── index.html                      # HTML entry with Google fonts & meta tags
├── metadata.json                   # Applet permissions and metadata
├── package.json                    # Project dependencies and build scripts
├── public/
│   ├── chrome-extension/
│   │   └── manifest.json           # Chrome Extension Manifest V3 config
│   ├── manifest.json               # Progressive Web App (PWA) manifest
│   └── weather-icon.svg            # Vector weather emblem
├── src/
│   ├── App.tsx                     # Core state management & responsive shell
│   ├── main.tsx                    # React entry point
│   ├── index.css                   # Tailwind CSS styling and utilities
│   ├── types.ts                    # TypeScript definitions for Open-Meteo
│   ├── components/
│   │   ├── CurrentWeatherHero.tsx  # Dynamic atmospheric hero card
│   │   ├── HourlyForecastRibbon.tsx# 24-hour horizontal forecast ribbon
│   │   ├── DailyForecastList.tsx   # 10-day forecast with temperature bars
│   │   ├── WeatherDetailsGrid.tsx  # Bento grid: AQI, UV, Wind, Solar Arc
│   │   ├── WeatherHeader.tsx       # Search, GPS, units, theme, & view mode
│   │   ├── WeatherIcon.tsx         # Lucide weather icon mapper
│   │   └── CrossPlatformGuideModal.tsx # In-app deployment documentation modal
│   ├── services/
│   │   └── weatherApi.ts           # Open-Meteo REST API client & transformers
│   └── utils/
│       └── weatherCodes.ts         # WMO code mapping & AQI evaluators
└── vite.config.ts                  # Vite configuration
```

---

## 🚀 Automated Multi-Platform Release CI/CD (GitHub Actions)

ClimaCast features an enterprise-grade, parallel multi-job Continuous Integration & Continuous Delivery (CI/CD) pipeline implemented in **GitHub Actions** (`.github/workflows/release.yml`).

Every push to `main` or semantic release tag (`v*`) automatically executes automated builds, cross-platform compilation, and packaging across **Android**, **Apple iOS**, **Google Chrome**, and **Web/Docker**:

```
                              ┌────────────────────────────────────────┐
                              │ Git Push to main / Tag Push (e.g. v1.1)│
                              └───────────────────┬────────────────────┘
                                                  │
                                      [determine-version]
                                                  │
               ┌──────────────────────────────────┼──────────────────────────────────┐
               │                                  │                                  │
               ▼                                  ▼                                  ▼
   ┌───────────────────────┐          ┌───────────────────────┐          ┌───────────────────────┐
   │build-web-and-extension│          │   build-android-apk   │          │     build-ios-app     │
   │    (ubuntu-latest)    │          │    (ubuntu-latest)    │          │      (macos-14)       │
   ├───────────────────────┤          ├───────────────────────┤          ├───────────────────────┤
   │• TypeScript Linting   │          │• Java 21 JDK          │          │• Node 20 & Xcode      │
   │• Vite & Server Build  │          │• Android SDK Tools    │          │• npx cap sync ios     │
   │• Web PWA Package      │          │• npx cap sync android │          │• xcodebuild           │
   │• Chrome Extension Zip │          │• ./gradlew            │          │• iOS Simulator Bundle │
   │• Full-Stack Docker Tar│          │  assembleDebug        │          │• Ready Xcode Project  │
   └───────────┬───────────┘          └───────────┬───────────┘          └───────────┬───────────┘
               │                                  │                                  │
               └──────────────────────────────────┼──────────────────────────────────┘
                                                  │
                                                  ▼
                                      ┌───────────────────────┐
                                      │    publish-release    │
                                      │    (ubuntu-latest)    │
                                      ├───────────────────────┤
                                      │• Gather all binaries  │
                                      │• SHA-256 Checksums    │
                                      │• Tag Git Release      │
                                      │• Attach Assets to GH  │
                                      └───────────────────────┘
```

### 📦 Published Release Binaries & Artifacts

| Platform / Binary | Downloadable Artifact | Direct End-User Experience |
| :--- | :--- | :--- |
| **🤖 Android Phone** | `climacast-android-*.apk` | **Direct Mobile Installer**: Download on any Android phone, tap to install ("Install Unknown Apps"), and run with full hardware acceleration. |
| **🧩 Google Chrome** | `climacast-chrome-extension-*.zip` | **Chrome Extension**: Extract and load unpacked into `chrome://extensions/` (Developer mode) or submit directly to the Chrome Web Store. |
| **🍎 Apple iOS (Simulator)** | `climacast-ios-simulator-*.zip` | **iOS Simulator Package**: Drag and drop `App.app` directly into Xcode Simulator for testing without Apple Developer certificates. |
| **📱 Apple iOS (Xcode Project)** | `climacast-ios-xcode-project-*.zip` | **Pre-configured Xcode Workspace**: Open in Xcode on macOS, connect a physical iPhone via USB or Wi-Fi, and click **Run**. |
| **🌐 Web App & PWA** | `climacast-web-pwa-*.zip` | **Static Web & PWA**: Deploy to Netlify, Vercel, Firebase Hosting, Cloudflare Pages, or static Nginx servers. |
| **🖥️ Full-Stack Server** | `climacast-fullstack-server-*.tar.gz` / `.zip` | **Standalone Server & Docker**: Pre-compiled Node.js server (`dist/server.cjs`), static assets, `package.json`, and `Dockerfile`. |
| **📲 Capacitor Source** | `climacast-capacitor-mobile-*.zip` | Complete multi-platform mobile project scaffold with Capacitor configuration. |
| **🔒 SHA-256 Checksums** | `checksums.txt` | Cryptographic hashes for all published files to verify file integrity. |

### Local Packaging & Build Verification
Developers can assemble and verify all distribution variants locally at any time:
```bash
# 1. Compile production frontend & backend server
npm run build

# 2. Package all platform variants with SHA-256 integrity hashes
npm run package:all -- v1.0.0

# 3. View generated archives in /release-artifacts
ls -lh release-artifacts/
```

For complete documentation on the automated CI/CD pipeline, see [`docs/ci-cd-release-guide.md`](docs/ci-cd-release-guide.md) and the comprehensive deployment manual in [`docs/UserGuide.md`](docs/UserGuide.md).

---

## ⚖️ Attribution & License

- Weather forecasts, geocoding, and air quality models provided by **[Open-Meteo](https://open-meteo.com/)** under Attribution 4.0 International (CC BY 4.0).
- Open-Meteo source repository: [github.com/open-meteo/open-meteo](https://github.com/open-meteo/open-meteo).
