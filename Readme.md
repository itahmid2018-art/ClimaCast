# ClimaCast (Open-Meteo Edition)

A reference-grade web application built to **Google Weather design standards**, powered by the free and open-source meteorological models of **[Open-Meteo](https://open-meteo.com/)**. Designed from the ground up to be hosted as a modern responsive web app (PWA), compiled into native **Android** and **iOS** mobile apps using Capacitor, and packaged as a **Google Chrome Extension (Manifest V3)**.

---

## ✨ Features

- **Google Weather Aesthetics:** Material 3 inspired layout with clean typography, generous spacing, and dynamic atmospheric gradients matching real-time weather and daylight.
- **Weather Insights (Powered by Gemini AI):** Natural language meteorological intelligence generating concise, conversational summaries, "What to Wear" dressing advice, outdoor activity guidance, and health/comfort ratings using the server-side `@google/genai` SDK (`gemini-3.8-flash`).
- **Severe Weather Alerts & Storm Warnings:** High-visibility emergency warning banners positioned prominently above the current weather card, evaluating Open-Meteo convective models for severe thunderstorms, hail, high winds, flash floods, winter storms, extreme heat, and air quality advisories with expandable protective safety actions and live simulation mode.
- **Light & Dark Theme Parity:** Seamless toggle between Google light surface and dark mode with system preference synchronization.
- **Real-Time Open-Meteo Integration:** Free, high-precision weather forecasts, global geocoding city search, and air quality models with zero proprietary API keys required.
- **Interactive 24-Hour Ribbon:** Horizontal scrollable hourly forecast with tab filters for **Temperature**, **Precipitation Probability**, and **Wind Direction**.
- **10-Day Extended Forecast:** Daily rows featuring Google Weather's signature visual min/max temperature range bar and expandable solar/wind detail cards.
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

## 📲 Progressive Web App (PWA) & "Add to Home Screen"

Google Weather is fully compliant with modern Progressive Web App (PWA) specifications:
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
6. Click the Extensions puzzle icon in the Chrome toolbar and pin **Google Weather**. Click the icon to view the popup!

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

## ⚖️ Attribution & License

- Weather forecasts, geocoding, and air quality models provided by **[Open-Meteo](https://open-meteo.com/)** under Attribution 4.0 International (CC BY 4.0).
- Open-Meteo source repository: [github.com/open-meteo/open-meteo](https://github.com/open-meteo/open-meteo).
