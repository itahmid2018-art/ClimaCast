# Product Requirements Specification (PRS)
## Project: ClimaCast Weather App (Open-Meteo Engine)
**Version:** 1.0.0  
**Document Status:** Approved & Baseline Implemented  
**Target Architectures:** Web PWA, Android (Capacitor), iOS (Capacitor), Google Chrome Add-on (Manifest V3)  
**API Engine:** Open-Meteo Public Weather & Geocoding API (`https://open-meteo.com/`, `https://github.com/open-meteo/open-meteo`)

---

## 1. Executive Summary & Vision

### 1.1 Vision Statement
The goal is to deliver a reference-grade, ClimaCast weather application combining the visual clarity, spatial discipline, and fluid hierarchy of modern design standards with the open-source, high-resolution meteorological models of Open-Meteo. The application delivers instantaneous client-side responsiveness, and runs seamlessly across the Web, Android, iOS, and Google Chrome as a browser extension.

### 1.2 Core Product Tenets
1. **Material 3 & Atmospheric Fidelity:** Uncluttered layouts, high-contrast typography, dynamic atmospheric color palettes that react to local daylight and weather conditions, and intuitive information density.
2. **First-Class Cross-Platform Parity:** A unified single TypeScript/React codebase compiled without code duplication into:
   - Modern Web Application & Progressive Web App (PWA)
   - Native Android Application (via Capacitor)
   - Native iOS Application (via Capacitor)
   - Google Chrome Extension / Add-on (via Manifest V3 popup architecture)
3. **Zero-Friction Weather Intelligence:** Real-time geolocation, global search with Open-Meteo geocoding, 24-hour hourly ribbons, 10-day daily spans, and deep atmospheric cards (Multi-Source Air Quality US AQI, UV Index, Wind Compass, Solar daylight arc, Dew Point, Pressure).
4. **Privacy-First & Offline-Tolerant:** User coordinates and preferences never leave the client; cached forecasts provide instant offline visual continuity.

---

## 2. System Architecture & Platform Support Matrix

```
                          ┌────────────────────────┐
                          │   Core Data APIs       │
                          │ • Open-Meteo Forecast  │
                          │                        │
                          │ • PurpleAir AQI        │
                          └───────────┬────────────┘
                                      │ HTTPS JSON (REST)
                                      ▼
                      ┌─────────────────────────────────┐
                      │    Core TypeScript App Layer    │
                      │  • React 19 + Tailwind CSS      │
                      │  • State & Offline Cache Engine │
                      │  • ClimaCast UI Design          │
                      └───────────────┬─────────────────┘
                                      │
        ┌─────────────────────────────┼──────────────────────────────┐
```        ▼                             ▼                              ▼
┌───────────────┐           ┌───────────────────┐          ┌───────────────────┐
│ Web App / PWA │           │ Mobile (Capacitor)│          │  Chrome Extension │
│ • Responsive  │           │ • Android Studio  │          │ • Manifest V3     │
│ • Service Wkr │           │ • iOS / Xcode     │          │ • Browser Popup   │
│ • Manifest    │           │ • Native Sensors  │          │ • Host Privileges │
└───────────────┘           └───────────────────┘          └───────────────────┘
```

| Target Platform | Runtime / Distribution | Configuration File | Target Form Factor |
| :--- | :--- | :--- | :--- |
| **Modern Web & PWA** | Static HTML5 / Vite Bundle served via CDN | `public/manifest.json` | Desktop, Tablet, Mobile Browsers |
| **Android Native** | Capacitor 6+ Native Shell -> APK / AAB | `capacitor.config.json` | Android 8.0+ Phones & Tablets |
| **iOS Native** | Capacitor 6+ Native Shell -> Xcode Project | `capacitor.config.json` | iOS 14.0+ iPhone & iPad |
| **Google Chrome Addon** | Chrome Extension Manifest V3 Popup | `public/chrome-extension/manifest.json` | Google Chrome, Edge, Brave, Chromium |

---

## 3. API Specifications & Integration Contracts

The application communicates directly with Open-Meteo endpoints without proprietary middleware:

### 3.1 Weather Forecast API
- **Endpoint:** `https://api.open-meteo.com/v1/forecast`
- **Method:** `GET`
- **Key Parameters:**
  - `latitude`, `longitude`: Decimal coordinates (e.g. `48.8534`, `2.3488`)
  - `current`: `temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m`
  - `hourly`: `temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,surface_pressure,visibility,wind_speed_10m,wind_direction_10m,uv_index,is_day`
  - `daily`: `weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant`
  - `temperature_unit`: `celsius` | `fahrenheit`
  - `wind_speed_unit`: `kmh` | `ms` | `mph` | `kn`
  - `precipitation_unit`: `mm` | `inch`
  - `timezone`: Local IANA identifier (e.g., `Europe/Paris`) or `auto`

### 3.2 Geocoding Search API
- **Endpoint:** `https://geocoding-api.open-meteo.com/v1/search`
- **Method:** `GET`
- **Key Parameters:** `name` (query string), `count=8`, `language=en`, `format=json`
- **Payload Response:** Array of matching regions with `name`, `latitude`, `longitude`, `country`, `admin1`, `timezone`.

### 3.3 Air Quality API
- **Endpoint:** `https://air-quality-api.open-meteo.com/v1/air-quality`
- **Method:** `GET`
- **Key Parameters:** `latitude`, `longitude`, `current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide`

### 3.4 WMO Weather Interpretation Code Mapping
All Open-Meteo `weather_code` integer values map to WMO standard conditions:
- `0`: Clear Sky (Day / Night icons)
- `1, 2, 3`: Mainly clear, partly cloudy, overcast
- `45, 48`: Fog and depositing rime fog
- `51, 53, 55`: Drizzle (light, moderate, dense)
- `61, 63, 65`: Rain (slight, moderate, heavy)
- `71, 73, 75, 77`: Snow fall & grains
- `80, 81, 82`: Rain showers
- `95, 96, 99`: Thunderstorm with optional hail

---

## 4. UI/UX Design & Google Standards Specification

### 4.1 Visual Hierarchy & Material 3 Principles
- **Atmospheric Theming:** Card background dynamic gradients match both current conditions and day/night cycle:
  - *Daytime Clear:* Sky blue (`#38bdf8`) to royal blue (`#3b82f6`)
  - *Nighttime Clear:* Deep slate (`#0f172a`) to indigo navy (`#1e1b4e`)
  - *Precipitation / Overcast:* Cool slate-mist (`#475569`) with subtle cyan highlights
  - *Thunderstorm:* Deep violet-slate (`#3b0764` to `#0f172a`)
- **Typography:** Display typography pairs crisp modern sans (`Plus Jakarta Sans` / `Roboto`) with distinct visual weight steps (800 for Hero Temp, 600 for card headers, 500 for secondary metrics).
- **Spatial Grid:** 16px to 24px consistent boundary gutters with 24px-32px rounded pill containers.

### 4.2 Light and Dark Modes
- **Light Theme:** Clean off-white surface canvas (`#f8fafc`), crisp elevated cards with 1px border contrast (`#e2e8f0`), deep slate text (`#0f172a`).
- **Dark Theme:** Low-glare dark surface (`#020617`), subtle elevated container fills (`#0f172a` and `#1e293b`), crisp light-slate text (`#f8fafc`).
- **Persistence:** System preference auto-detection + persistent toggle in `localStorage`.

---

## 5. Functional Requirements (FR)

### FR-1: Location Discovery & GPS Geolocation
- System shall query user's current GPS position via `navigator.geolocation` or native Capacitor Geolocation plugin.
- Search input shall debouncing queries (300ms) against Open-Meteo Geocoding API and display top 8 global matches.
- System shall allow saving/pinning favorite locations with persistent storage.

### FR-1.1: Sticky Navigation Header
- The main navigation header (containing Search, Settings, Export, and GPS controls) shall be sticky and permanently pinned to the top of the viewport.
- Applies a backdrop-blur glassmorphism effect for visual hierarchy when the user scrolls down through the weather feed.

### FR-1.2: Astronomical Moon Phase Indicator
- Synodic lunar calculation engine (`calculateMoonPhase`) computing lunar cycle age (0–29.53 days), illumination percentage (0–100%), and 8-phase astronomical classification (New Moon, Waxing Crescent, First Quarter, Waxing Gibbous, Full Moon, Waning Gibbous, Last Quarter, Waning Crescent).
- Compact astronomical badge (`#header-moon-phase-badge`) displayed within the global `WeatherHeader` with an optical vector SVG glyph and illumination percentage pill.
- Interactive popover drawer (`#moon-phase-popover`) revealing waxing/waning trajectory status, visual illumination bar, lunar cycle day, days until next primary phase, and astronomical skywatching description.

### FR-1.5: Weather Warnings & Severe Storm Alerts Banner
- Render high-priority warning banners immediately above the current weather hero card.
- Evaluates real-time and 12-hour predictive data from Open-Meteo for:
  - Severe Thunderstorm & Convective Hazards (WMO codes 95, 96, 99 and wind gusts > 65 km/h).
  - High Wind / Gale Warnings (sustained winds > 50 km/h or gusts > 85 km/h).
  - Torrential Rain & Flash Flood Watches (WMO codes 65, 82, precipitation rates > 12 mm/hr, or daily sums > 40 mm).
  - Winter Storms & Ice Storm Warnings (freezing rain WMO 66/67, heavy snow WMO 75/86).
  - Excessive Heat Warnings (temperatures >= 38°C / 100°F or heat index >= 41°C / 106°F).
  - Air Quality Alerts (US AQI >= 150).
- Displays severity level pill (`warning`, `watch`, `advisory`, `emergency`), urgency, active time, and expiry timestamp.
- Expandable drawer reveals detailed meteorological metrics (peak gusts, rain rate, AQI) and actionable protective safety instructions.
- Includes a live simulation toggle to test and preview severe storm warning rendering under any weather conditions.

### FR-1.6: Export Weather Report
- Render a dedicated "Export" dropdown embedded in the primary Sticky Navigation Header.
- Generate and format live meteorological conditions on the fly:
  - **Copy to Clipboard:** Generates a human-readable text summary of temperature, humidity, wind, cloud cover, and daily forecast ranges.
  - **Download JSON:** Outputs deeply structured, raw application state payload.
  - **Download CSV:** Downloads a properly delimited tabular spreadsheet format of the current readings.

### FR-2: Current Weather Hero Section
- Display large temperature readout with prominent Apparent Temperature ("Feels Like") glassmorphism badge (`#hero-apparent-temperature-badge`) including delta differentials (`+2° warmer` / `-3° cooler`).
- Contextual meteorological explanation (`#hero-feels-like-context`) explaining perceptual factors (humidity heat index vs. wind chill factor vs. thermometer parity).
- Dedicated Apparent Temperature / Feels Like quick stat chip (`#hero-feels-like-chip`) alongside precipitation chance, wind speed, relative humidity, and UV index.
- Display today's high and low extremes with directional indicators.
- Display current condition title and high-resolution weather glyph.
- **Animated SVG Solar Sun Arc:** Subtle mathematical semi-elliptical celestial trajectory tracking the live position of the sun between sunrise and sunset, featuring a golden traveled-path gradient stroke, a pulsing radiant sun node, dawn/dusk endpoints, and live daylight countdown metrics (with night-mode transition).

### FR-2.2: Pre-Sunrise Dawn UI Pulse, Silent Local Notification & Native/PWA Alarm Integration
- **Pre-Sunrise Dawn UI Pulse Effect:**
  - Automatically evaluates upcoming astronomical sunrise from Open-Meteo daily forecast data (`calculateUpcomingSunrise`).
  - Activates when current time enters the pre-sunrise dawn window (configurable 10–30 min lead, default 20m):
    - `CurrentWeatherHero` card is illuminated with an animated golden dawn breathing halo (`animate-dawn-pulse`) and radiating sunrise light rays (`animate-dawn-aura`).
    - Prominent Pre-Sunrise Dawn Glow banner (`#hero-dawn-pulse-badge`) displaying live countdown to first light, sunrise time, and quick action controls.
    - Interactive simulation button to preview and test the visual dawn pulse aura and silent notification on demand.
- **Silent Local Notification:**
  - Dispatches non-intrusive local device notification via the Web Notifications API and Service Worker with `silent: true`.
  - Accompanied by an in-app visual dawn toast notification banner (`#hero-silent-notification-toast`) with zero intrusive sound chimes.
- **Native Device Alarm Integration (Android & iOS):**
  - **Android Native App:** Dispatches system Clock alarm intent via deep link `android.intent.action.SET_ALARM` (`intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.HOUR=...;end`) to launch and configure the native Android Clock application.
  - **iOS Native App:** Generates standard RFC 5545 iCalendar (`.ics`) file containing an audio/display `VALARM` scheduled for pre-sunrise dawn time, triggering iOS Calendar and Reminders alarms, with Apple Shortcuts URL scheme integration.
- **PWA Integration:**
  - Fully supports Android Clock Intent directly within Android PWA standalone mode.
  - Supports iCalendar alarm files and Apple Shortcuts directly within iOS PWA standalone mode.
  - Includes registered Service Worker (`/sw.js`) supporting background notification handling and offline caching.

### FR-2.3: Background Sync Service Worker & Automatic Offline Cache Synchronization
- **Web Background Sync API Integration (`weather-data-sync`):**
  - Service Worker registers `sync` event handler (`self.addEventListener('sync', ...)`), listening for `'weather-data-sync'` and `'sync-weather-data'`.
  - Also supports Periodic Background Sync API (`periodicsync` event: `'weather-periodic-sync'`) for installed PWAs.
- **Dedicated Weather API Cache Storage (`google-weather-api-cache-v1`):**
  - Intercepts Open-Meteo weather forecast requests (`https://api.open-meteo.com/v1/forecast`) using a Network-First with Cache Fallback strategy.
  - Automatically persists fresh API responses in Cache Storage under both the requested URL and the canonical fallback URL (`https://api.open-meteo.com/v1/forecast/latest`), along with sync metadata (`_meta`).
  - When network is unavailable or offline, the Service Worker immediately serves the cached forecast without network timeouts or failure screens.
- **Automatic Reconnection Synchronization:**
  - When the device regains network connectivity (`online` event or browser sync scheduler), the Service Worker automatically fetches the freshest forecast data from Open-Meteo in the background.
  - Updates the offline cache with the fresh forecast and broadcasts a `WEATHER_SYNC_COMPLETED` message to all connected client tabs.
  - The client application automatically reloads the updated forecast data and presents an in-app toast notification (`#bg-sync-toast-notification`) confirming the cached weather has been refreshed.
- **User Controls & Health Inspector:**
  - Dedicated Background Sync modal (`#background-sync-modal-card`) with live network state (Online/Offline), sync engine status (SyncManager / Auto-Sync on reconnect), last sync timestamp, and an on-demand "Test Background Sync" trigger.
  - Header status indicator (`#background-sync-header-btn`) displaying current sync state (`Auto-Sync`, `Syncing...`, or `Offline Cache`).
  - Offline banner (`#offline-banner-sync-info-btn`) with one-click access to background sync auto-update details.

### FR-2.5: Weather Insights (Gemini AI Intelligence) & API Key Management
- **API Key Engine:** Secure full-stack server endpoint (`/api/settings/keys`) persisting custom API keys (Gemini, OpenAI, Anthropic, OpenRouter, PurpleAir, Radar) inside a local `db.json` database, seamlessly cascading to `.env` fallbacks if missing. Settings UI automatically syncs client inputs back to the server securely.
- Secure full-stack server endpoint (`POST /api/weather-insights`) utilizing the `@google/genai` TypeScript SDK and `gemini-3.8-flash` model.
- Analyzes current conditions, hourly outlook, air quality index, and UV index to synthesize:
  - **Tip of the Day:** Highly actionable recommendation extracted and rendered at the absolute top of the viewport (below header) for prime visibility.
  - **Punchy Headline:** 4-8 word conversational summary of the day's meteorological narrative.
  - **Natural Language Overview:** 2-sentence conversational briefing of current weather and imminent changes.
  - **What to Wear Card:** Practical, temperature- and precipitation-aware clothing advice, footwear, and accessory recommendations.
  - **Outdoor Activities Card:** Guidance on optimal times for recreation, outdoor fitness, and commuting.
  - **Health & Comfort Card:** Air quality impact, UV safety considerations, and ambient comfort levels.
- Shimmer loading state with manual one-click regenerate action and graceful heuristic fallback if keys are unconfigured.

### FR-3: Hourly 24-Hour Forecast Ribbon
- Horizontal scrollable ribbon displaying continuous next 24 to 36 hours.
- Interactive mode tabs:
  - **Temperature:** Numerical temperature and proportional vertical level indicator.
  - **Precipitation:** Rain probability percentage and volume in mm/inches.
  - **Wind:** Speed and directional navigation compass arrow.

### FR-4: 10-Day Extended Daily Forecast
- Row layout representing 10 forecast days with localized day/date formatting.
- Weather condition icon and precipitation probability tag.
- ClimaCast signature horizontal temperature range bar showing relative temperature span across the 10-day envelope.
- Expandable daily accordion card displaying sunrise, sunset, maximum daily wind gust, and maximum UV index.

### FR-4.5: Interactive Weather Radar & Cloud Map (Leaflet)
- High-performance interactive geospatial stage utilizing Leaflet with CartoDB Positron / Dark Matter basemaps matching the active theme mode.
- Automatic centering and smooth flyTo animations centered on the current user coordinates.
- Multi-layer support:
  - **Live Precipitation (Doppler Radar):** Dynamic time-sequenced radar frames with color gradient scale (light rain, moderate, heavy, hail/storms).
  - **Satellite Cloud Cover:** Infrared cloud cover tiles depicting cloud thickness and frontal movements.
  - **Combined Mode:** Simultaneous rendering with alpha-blended opacity controls.
- **Radar Animation Player:** Play / Pause loop controller with interactive timeline scrubber and live timestamp badge.
- **Map Tools:** Fullscreen expansion mode, zoom controls, one-tap recenter button, and customized pulsing location pin with temperature badge.

### FR-5: Atmospheric Bento-Grid Cards
- **Multi-Source Air Quality (US AQI):** Switchable APIs including HyperLocal (PurpleAir), and Default (Open-Meteo). Displays numerical AQI score, categorical indicator (Good, Moderate, Unhealthy), progress bar, health advice, and pollutant breakdown (PM2.5, PM10, Ozone).
- **UV Index:** Current index, peak time forecast, and protection guidance scale.
- **Wind & Direction:** Animated directional compass dial, degree angle, cardinal name (e.g. ENE), and gusts.
- **Sunrise & Sunset:** Daylight solar arc diagram indicating time elapsed and remaining daylight.
- **Humidity & Comfort:** Relative humidity percentage and dew point calculation.
- **Pressure & Visibility:** Barometric pressure in hPa with trend and optical visibility range in km.

### FR-6: Units & Localization
- Instant toggle between Celsius (°C, km/h, mm) and Fahrenheit (°F, mph, in).
- Time displays formatted according to the targeted location's IANA timezone.

---

## 6. Non-Functional Requirements (NFR)

1. **Performance & Web Vitals:** First Contentful Paint (FCP) < 1.0s, Cumulative Layout Shift (CLS) = 0.
2. **Offline Continuity:** Cached JSON stored in client `localStorage` with offline connectivity warning banner.
3. **Accessibility (a11y):** WCAG 2.1 AA compliant contrast ratios, full keyboard tab order, and descriptive icon titles.
4. **Zero Proprietary SDK Overhead:** No tracking scripts, zero bloat, pure direct HTTPS calls.

---

## 7. Multi-Platform Compilation Specification

### 7.1 Progressive Web App (PWA)
- Linked with `public/manifest.json` featuring standard `id`, `scope`, `start_url`, and high-resolution icons (192x192, 512x512, maskable & any).
- High-fidelity standalone mobile splash screen configured via `background_color: "#1a73e8"`, `theme_color: "#1a73e8"`, `screenshots`, and pixel-perfect raster icons.
- Instant pre-hydration DOM splash screen bridging mobile OS launch to client hydration with zero blank/white flicker.
- Registered mobile viewport meta tags with `viewport-fit=cover`, `mobile-web-app-capable`, and `apple-mobile-web-app-capable`.
- Dedicated `usePWAInstall` hook listening to `BeforeInstallPromptEvent` and `appinstalled` lifecycle events.
- Custom branded 'Add to Home Screen' action button and interactive installation card integrated inside `CrossPlatformGuideModal` and global footer.
- Comprehensive fallback installation guide for iOS Safari (`Share` -> `Add to Home Screen`) and desktop Chrome/Edge.

### 7.2 Native Android / iOS via Capacitor
- `capacitor.config.json` configured with application ID `com.googleweather.openmeteo`.
- Targets `dist` folder generated by `npm run build`.
- Android permissions: `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `INTERNET`.
- iOS Info.plist: `NSLocationWhenInUseUsageDescription`.

### 7.3 Google Chrome Extension (Manifest V3)
- Manifest file: `public/chrome-extension/manifest.json`.
- Action popup loads `index.html` within a 380px fixed width viewport.
- Required permissions: `["geolocation", "storage"]`.
- Host permissions: `["https://api.open-meteo.com/*", "https://geocoding-api.open-meteo.com/*", "https://air-quality-api.open-meteo.com/*"]`.

---

## 8. Verification & Acceptance Criteria
- [x] Baseline UI accurately reflects ClimaCast aesthetics.
- [x] Dynamic condition-based atmospheric gradients operational.
- [x] Both Light and Dark mode themes render with WCAG AA contrast.
- [x] Geolocation and city search return live Open-Meteo data.
- [x] 24-hour hourly ribbon supports Temp, Rain, and Wind view switching.
- [x] 10-day forecast displays proportional temperature range bars and expandable cards.
- [x] Bento grid presents Air Quality, UV, Wind compass, Solar arc, and Humidity.
- [x] Cross-platform configs (`capacitor.config.json`, `manifest.json`, extension manifest) validated.
