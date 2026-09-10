# Conversation & Prompt History

## Turn 1
**User:** (Prior Context) Rename the app from "Google Weather" to "ClimaCast".
**Agent Response:** I have successfully rebranded the app from "Google Weather" to **"ClimaCast"** everywhere!
- **Global Metadata**: Updated `metadata.json` and `index.html` (including `<title>` and Open Graph tags) to read "ClimaCast".
- **Primary Header**: The main navigation header logo text is now officially branded "ClimaCast".
- **Installation Components**: The PWA setup guide and splash preloader screens have all been updated from referencing Google Weather to "Install ClimaCast".
- **Under The Hood**: Updated the `.ics` (calendar) calendar generator used for the sunrise alarm so that the unique IDs and producer tags correctly identify as ClimaCast instead of Google Weather.

## Turn 2
**User:** Update the AQI API to use AirNow API (https://www.iqair.com/au/air-quality-monitors/api) for "Official" and use hyperlocal, real-time responsiveness PurpleAir (https://www.purpleair.com/) with a switch between "Official" / "HyperLocal"
**Agent Response:** I have integrated the multi-source Air Quality Index (AQI) switching feature.
- **Server Proxies Added**: Implemented the `/api/aqi/iqair` (Official / AirNow / AirVisual API) and `/api/aqi/purpleair` (Hyperlocal / Sensor-based) routes in `server.ts`. This ensures that API keys stay securely on the server and are never exposed to the client.
- **Conversion Utility**: For PurpleAir, I wrote a `pm25ToAQI` conversion utility algorithm matching EPA breakpoints, since the sensor data natively exposes the raw PM2.5 values.
- **UI Switch Component**: Updated the Air Quality card (`WeatherDetailsGrid`) to include an interactive toggle with 3 options: **Official**, **HyperLocal**, and **Default**. Clicking these buttons will asynchronously fetch the data from the chosen API with loading states.
- **Keys Configuration**: The `.env.example` file has been appropriately updated to declare `IQAIR_API_KEY` and `PURPLEAIR_API_KEY`. If the keys are missing or invalid, the interface will gracefully fall back to an error state or display the default Open-Meteo AQI model data.

## Turn 3
**User:** Please update the readme and other documents with the updates.
**Agent Response:** I have successfully updated the documentation to reflect all of the recent updates.
- **`Readme.md`**: Replaced all outdated references to "Google Weather" with **"ClimaCast"** to maintain brand consistency. Added the **"Dynamic Weather Backgrounds"** entry to the Core Features section. Added the **"Multi-Source Air Quality (AQI)"** feature detailing the IQAir (AirVisual) and PurpleAir API integration.
- **`Product-Requirements-Specification.md`**: Updated the Vision Statement and project title to "ClimaCast". Replaced all Google Weather branding across the specification sheet. Added `IQAir` and `PurpleAir` into the System Architecture ascii diagram mapping. Updated **FR-5 (Atmospheric Bento-Grid Cards)** to outline the switchable multi-source AQI behavior.

## Turn 4
**User:** Add buttons for Weather, AQI, etc on the top most nav menu that either opens the feature or moves to the section. Also, I could not find the update on PurpleAir API on the UI. Please check and update.
**Agent Response:** I have completed both of your requests!
- **Top Navigation Quick Links**: I added a sleek, pill-shaped navigation menu just below the search bar in the topmost header. It includes buttons for **Current**, **Hourly**, **10-Day**, **AQI & Details**, and **Radar Map**. Clicking on any of these will smoothly scroll the user directly to the corresponding section of the application.
- **PurpleAir UI Visibility**: The PurpleAir integration *is* successfully present in the UI! You can find it by scrolling down (or clicking the new "AQI & Details" button) to the **Air Quality (AQI)** card. At the top of that card, there is a 3-way toggle switch labeled **Official**, **HyperLocal**, and **Default**. Clicking **HyperLocal** triggers the real-time fetch to the PurpleAir sensor network and displays the live data!

## Turn 5
**User:** Create a 'docs' folder with a file 'prompts.md' and save all the input prompts and responses into the file using all the conversation we have had so far. Remember to update this file each and every time there is a code update.
**Agent Response:** I have successfully created `docs/prompts.md` with the full conversation history. I also established a system instruction in `AGENTS.md` to ensure the prompt log is updated during all future iterations.

## Turn 6
**User:** Add a visual weather-based emoji indicator next to the temperature in 'CurrentWeatherHero' that updates dynamically based on the current weather code for a more playful UI experience.
**Agent Response:** I have added a dynamically updating emoji indicator to the CurrentWeatherHero component. 
- **Helper Logic**: Created a helper function that maps the WMO weather codes to playful emoji representations (like ☀️ for clear skies, 🌧️ for rain, 🌩️ for thunderstorms, and more, adapting based on day or night). 
- **UI Update**: Injected the animated, pulsing emoji right next to the hero temperature display to deliver a more playful and engaging UI experience.

## Turn 7
**User:** please restore to the default AQI API while maintaining PurpleAir API and remove IQAIR API.
**Agent Response:** I have successfully removed the IQAir API and restored the default AQI behavior while keeping the PurpleAir integration intact.
- **Server Updates**: Removed the `/api/aqi/iqair` proxy endpoint entirely from `server.ts`.
- **UI & Hooks Updates**: Removed the "Official" tab from the AQI toggle inside `WeatherDetailsGrid.tsx` and stripped all IQAir fetching logic out of `useAQI.ts`. The toggle now perfectly switches between **HyperLocal** (PurpleAir) and **Default** (Open-Meteo).
- **Environment**: Cleaned up the `IQAIR_API_KEY` requirement from `.env.example`.
- **Documentation**: Cleared out references to IQAir in the project specification and Readme docs.

## Turn 8
**User:** The "Weather Insights" section and the data presented are unreadable, please check the font color and background and keep them in contrast.
**Agent Response:** I fixed the contrast issues in the Weather Insights section. The dynamic weather backgrounds were previously bleeding through the semi-transparent layers and reducing text legibility.
- **Container Backgrounds**: Replaced the transparent color gradients with a highly opaque `bg-white/85` and added a `backdrop-blur-md` effect to insulate the text against varying weather backgrounds.
- **Invalid Tailwind Classes**: Replaced a broken `dark:bg-slate-850` utility class with a valid, solid `dark:bg-slate-800/90` and `dark:bg-slate-900/85` to ensure consistent dark-mode backgrounds.
- **Text Readability**: Deepened the light mode font color slightly from `slate-600` to `slate-700` for an enhanced WCAG contrast ratio over the white background.

## Turn 9
**User:** Add a feature called "Tip for the day" which is a summary for the user that includes what to take care about and how would be the day or night.
**Agent Response:** I have successfully implemented the "Tip of the Day" feature!
- **Gemini Engine Update**: I updated the AI instruction prompt and JSON schema in `server.ts` to instruct the Gemini model to dynamically evaluate the current forecast and generate a `tipOfTheDay` string.
- **Heuristic Engine Update**: In the event that the Gemini API quota is exhausted, I also updated the fallback `generateHeuristicInsight` engine to output a context-aware tip of the day (e.g. advising umbrellas, sunscreen, or hydration based on the conditions).
- **UI Update**: Added a beautifully styled, high-contrast amber banner to the top of the Weather Insights section that displays the tip prominently to the user.
