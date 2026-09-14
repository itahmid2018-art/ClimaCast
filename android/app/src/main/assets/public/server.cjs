var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var DB_FILE = import_path.default.join(process.cwd(), "db.json");
if (!import_fs.default.existsSync(DB_FILE)) {
  import_fs.default.writeFileSync(
    DB_FILE,
    JSON.stringify(
      {
        keys: {},
        savedLocations: [
          { id: 2988507, name: "Paris", country: "France", latitude: 48.8534, longitude: 2.3488, timezone: "Europe/Paris" },
          { id: 5128581, name: "New York", country: "United States", admin1: "New York", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
          { id: 1850147, name: "Tokyo", country: "Japan", latitude: 35.6895, longitude: 139.6917, timezone: "Asia/Tokyo" }
        ],
        notificationSettings: {
          enabled: true,
          morningTipEnabled: true,
          severeAlertsOnly: true
        }
      },
      null,
      2
    )
  );
}
function getDbData() {
  try {
    const raw = import_fs.default.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      keys: parsed.keys || {},
      savedLocations: parsed.savedLocations || [
        { id: 2988507, name: "Paris", country: "France", latitude: 48.8534, longitude: 2.3488, timezone: "Europe/Paris" },
        { id: 5128581, name: "New York", country: "United States", admin1: "New York", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York" },
        { id: 1850147, name: "Tokyo", country: "Japan", latitude: 35.6895, longitude: 139.6917, timezone: "Asia/Tokyo" }
      ],
      notificationSettings: parsed.notificationSettings || {
        enabled: true,
        morningTipEnabled: true,
        severeAlertsOnly: true
      },
      lastMorningTipDate: parsed.lastMorningTipDate,
      lastAlarmingAlertTimestamp: parsed.lastAlarmingAlertTimestamp
    };
  } catch (err) {
    return {
      keys: {},
      savedLocations: [],
      notificationSettings: {
        enabled: true,
        morningTipEnabled: true,
        severeAlertsOnly: true
      }
    };
  }
}
function saveDbData(patch) {
  try {
    const current = getDbData();
    const updated = {
      ...current,
      ...patch,
      keys: patch.keys ? { ...current.keys, ...patch.keys } : current.keys
    };
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2));
    return updated;
  } catch (err) {
    console.error("Failed to write to db.json", err);
    throw err;
  }
}
function getStoredKeys() {
  return getDbData().keys;
}
function saveStoredKeys(newKeys) {
  saveDbData({ keys: newKeys });
}
function getApiKey(keyName) {
  const keys = getStoredKeys();
  return keys[keyName] || process.env[keyName];
}
var aiClient = null;
var aiClientKey = null;
function getGenAI() {
  const apiKey = getApiKey("GEMINI_API_KEY");
  if (!apiKey) {
    return null;
  }
  if (!aiClient || aiClientKey !== apiKey) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    aiClientKey = apiKey;
  }
  return aiClient;
}
var insightsCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 30 * 60 * 1e3;
function generateHeuristicInsight(data, source = "Meteorological Synthesis Engine") {
  const {
    locationName,
    temperature,
    unit,
    condition,
    feelsLike,
    humidity,
    windSpeed,
    uvIndex,
    aqi
  } = data;
  const tempUnit = unit === "fahrenheit" ? "\xB0F" : "\xB0C";
  const speedUnit = unit === "fahrenheit" ? "mph" : "km/h";
  const isCold = unit === "fahrenheit" ? temperature < 50 : temperature < 10;
  const isMild = unit === "fahrenheit" ? temperature < 68 : temperature < 20;
  const isWarm = unit === "fahrenheit" ? temperature >= 68 : temperature >= 20;
  const isRainy = /rain|drizzle|shower|storm|thunder/i.test(condition);
  const isSnowy = /snow|blizzard|sleet/i.test(condition);
  let clothing = "Comfortable everyday casual attire.";
  if (isSnowy) {
    clothing = "Heavy winter coat, insulated gloves, thermal layers, and water-resistant boots.";
  } else if (isRainy) {
    clothing = "Waterproof rain jacket, sturdy umbrella, and water-resistant footwear.";
  } else if (isCold) {
    clothing = "Warm insulated jacket, scarf, and layered garments recommended.";
  } else if (isMild) {
    clothing = "Light jacket, cardigan, or hoodie over everyday clothes.";
  } else if (isWarm) {
    clothing = "Breathable lightweight clothing, sunglasses, and UV protection.";
  }
  let activity = "Favorable atmospheric conditions for outdoor walks and commuting.";
  if (isRainy || isSnowy) {
    activity = "Keep outdoor travel minimal; ideal time for indoor leisure or cozy caf\xE9 visits.";
  } else if (uvIndex > 6) {
    activity = "Great for outdoor recreation; seek shaded areas during peak solar intensity (11 AM - 4 PM).";
  } else if (windSpeed > 35) {
    activity = "Brisk winds present; secure light outdoor fixtures and exercise caution on bike paths.";
  }
  let health = aqi && aqi > 100 ? `Air quality is degraded (AQI ${aqi}); sensitive groups should reduce prolonged outdoor exertion.` : `Optimal air quality (AQI ${aqi || 28}) and low atmospheric stress throughout the day.`;
  let tip = "Stay hydrated and have a great day!";
  if (isRainy) tip = "Don\u2019t forget your umbrella today!";
  else if (isSnowy) tip = "Be careful on slippery roads today!";
  else if (isWarm) tip = "Stay cool and apply sunscreen if you are heading out!";
  return {
    headline: `${condition} in ${locationName}`,
    summary: `${locationName} is experiencing ${condition.toLowerCase()} with temperatures at ${temperature}${tempUnit} (feels like ${feelsLike}${tempUnit}). Humidity is ${humidity}% with winds of ${windSpeed} ${speedUnit}.`,
    clothingAdvice: clothing,
    activityRecommendation: activity,
    healthAndComfort: health,
    tipOfTheDay: tip,
    source
  };
}
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/settings/keys", (_req, res) => {
  const keys = getStoredKeys();
  res.json({ keys });
});
app.post("/api/settings/keys", (req, res) => {
  const { keys } = req.body;
  if (keys && typeof keys === "object") {
    saveStoredKeys(keys);
    res.json({ success: true, message: "Keys saved successfully" });
  } else {
    res.status(400).json({ success: false, error: "Invalid keys payload" });
  }
});
app.get("/api/saved-locations", (_req, res) => {
  const db = getDbData();
  res.json({
    locations: db.savedLocations || [],
    notificationSettings: db.notificationSettings || {
      enabled: true,
      morningTipEnabled: true,
      severeAlertsOnly: true
    },
    lastMorningTipDate: db.lastMorningTipDate
  });
});
app.post("/api/saved-locations", (req, res) => {
  const { locations, notificationSettings } = req.body;
  const patch = {};
  if (Array.isArray(locations)) {
    patch.savedLocations = locations;
  }
  if (notificationSettings && typeof notificationSettings === "object") {
    patch.notificationSettings = {
      enabled: notificationSettings.enabled !== false,
      morningTipEnabled: notificationSettings.morningTipEnabled !== false,
      severeAlertsOnly: notificationSettings.severeAlertsOnly !== false
    };
  }
  const updated = saveDbData(patch);
  res.json({
    success: true,
    locations: updated.savedLocations,
    notificationSettings: updated.notificationSettings
  });
});
app.delete("/api/saved-locations/:id", (req, res) => {
  const id = req.params.id;
  const db = getDbData();
  const filtered = (db.savedLocations || []).filter((loc) => String(loc.id) !== String(id));
  const updated = saveDbData({ savedLocations: filtered });
  res.json({
    success: true,
    locations: updated.savedLocations
  });
});
app.post("/api/saved-locations/evaluate-notifications", async (req, res) => {
  const { clientTime, forceMorningTip = false, forceAlarmCheck = false } = req.body || {};
  const db = getDbData();
  const locations = db.savedLocations || [];
  const settings = db.notificationSettings || {
    enabled: true,
    morningTipEnabled: true,
    severeAlertsOnly: true
  };
  if (!settings.enabled || locations.length === 0) {
    return res.json({ notifications: [], evaluatedCount: locations.length, reason: "Notifications disabled or no saved locations" });
  }
  const notificationsToTrigger = [];
  const now = clientTime ? new Date(clientTime) : /* @__PURE__ */ new Date();
  const todayDateStr = now.toISOString().slice(0, 10);
  const currentHour = now.getHours();
  for (const loc of locations.slice(0, 5)) {
    try {
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
      const fRes = await fetch(forecastUrl);
      if (!fRes.ok) continue;
      const data = await fRes.json();
      const current = data.current;
      if (!current) continue;
      const code = current.weather_code;
      const windGust = current.wind_gusts_10m || 0;
      const temp = current.temperature_2m;
      const precip = current.precipitation || 0;
      let isAlarming = false;
      let alertTitle = "";
      let alertBody = "";
      let severity = "warning";
      if ([95, 96, 99].includes(code)) {
        isAlarming = true;
        severity = [96, 99].includes(code) ? "emergency" : "warning";
        alertTitle = `\u26A1 Severe Weather Alert \u2022 ${loc.name}`;
        alertBody = `Thunderstorm detected with lightning and turbulent winds. Take safety precautions.`;
      } else if ([66, 67].includes(code)) {
        isAlarming = true;
        alertTitle = `\u{1F9CA} Freezing Rain Alert \u2022 ${loc.name}`;
        alertBody = `Freezing rain creating glaze ice on roads and pathways. Hazardous travel conditions.`;
      } else if ([75, 86].includes(code)) {
        isAlarming = true;
        alertTitle = `\u2744\uFE0F Heavy Snow Squall \u2022 ${loc.name}`;
        alertBody = `Significant snowfall and reduced visibility reported.`;
      } else if (windGust >= 65) {
        isAlarming = true;
        alertTitle = `\u{1F4A8} High Wind Gust Alert \u2022 ${loc.name}`;
        alertBody = `Damaging wind gusts of ${Math.round(windGust)} km/h detected in your saved location.`;
      } else if (temp >= 40) {
        isAlarming = true;
        alertTitle = `\u{1F525} Extreme Heat Warning \u2022 ${loc.name}`;
        alertBody = `Dangerous ambient temperature of ${Math.round(temp)}\xB0C. Stay hydrated and avoid peak sun.`;
      } else if (temp <= -18) {
        isAlarming = true;
        alertTitle = `\u{1F976} Dangerous Freeze Warning \u2022 ${loc.name}`;
        alertBody = `Severe sub-zero freeze at ${Math.round(temp)}\xB0C. High hypothermia and frostbite risk.`;
      } else if (precip >= 15) {
        isAlarming = true;
        alertTitle = `\u{1F327}\uFE0F Torrential Downpour \u2022 ${loc.name}`;
        alertBody = `Intense precipitation rate (${precip} mm/h) may trigger flash pooling and urban drainage issues.`;
      }
      if (isAlarming || forceAlarmCheck) {
        if (forceAlarmCheck && !isAlarming) {
          alertTitle = `\u26A0\uFE0F Alarming Weather Alert \u2022 ${loc.name}`;
          alertBody = `Simulated abnormal meteorological event: Rapid barometric drop and high wind gusts.`;
        }
        notificationsToTrigger.push({
          id: `alert-${loc.id}-${Date.now()}`,
          type: "alarming_weather",
          title: alertTitle,
          body: alertBody,
          locationName: loc.name,
          severity,
          tag: `alarming-weather-${loc.id}`
        });
      }
    } catch (e) {
      console.warn(`Could not evaluate alert for ${loc.name}:`, e);
    }
  }
  const isMorningWindow = currentHour >= 5 && currentHour <= 11;
  const shouldSendMorningTip = settings.morningTipEnabled && notificationsToTrigger.length === 0 && // "enable notifications only when there is an alarming or odd weather condition, if not just send one notification in the mornig with the tip of the day"
  (forceMorningTip || isMorningWindow && db.lastMorningTipDate !== todayDateStr);
  if (shouldSendMorningTip) {
    const primaryLoc = locations[0];
    const tipsList = [
      `Rise and shine in ${primaryLoc.name}! Check UV index before noon and stay hydrated today.`,
      `Good morning from ${primaryLoc.name}! A pleasant start to the day; keep an eye on temperature shifts by evening.`,
      `Morning meteorological tip for ${primaryLoc.name}: Dress in light layers to adapt smoothly throughout the diurnal arc.`,
      `Good morning! Clear atmospheric outlook ahead for ${primaryLoc.name}. Make time for fresh air today!`
    ];
    const chosenTip = tipsList[Math.floor(Math.random() * tipsList.length)];
    notificationsToTrigger.push({
      id: `morning-tip-${todayDateStr}`,
      type: "morning_tip",
      title: `\u{1F305} Morning Weather Tip \u2022 ${primaryLoc.name}`,
      body: chosenTip,
      locationName: primaryLoc.name,
      severity: "info",
      tag: `morning-tip-of-the-day`
    });
    saveDbData({ lastMorningTipDate: todayDateStr });
  }
  res.json({
    notifications: notificationsToTrigger,
    evaluatedCount: locations.length,
    lastMorningTipDate: db.lastMorningTipDate
  });
});
app.post("/api/weather-insights", async (req, res) => {
  const {
    locationName = "Current Location",
    temperature = 20,
    unit = "celsius",
    condition = "Clear",
    feelsLike = 20,
    humidity = 50,
    windSpeed = 10,
    uvIndex = 3,
    aqi,
    hourlySummary = "",
    dailySummary = "",
    forceRefresh = false
  } = req.body || {};
  const tempUnit = unit === "fahrenheit" ? "\xB0F" : "\xB0C";
  const speedUnit = unit === "fahrenheit" ? "mph" : "km/h";
  const cacheKey = `${locationName}_${Math.round(temperature)}_${unit}_${condition}`.toLowerCase();
  const cached = insightsCache.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json(cached.data);
  }
  const aiProvider = req.headers["x-ai-provider"] || "gemini";
  const openaiKey = req.headers["x-openai-key"] || getApiKey("OPENAI_API_KEY");
  const anthropicKey = req.headers["x-anthropic-key"] || getApiKey("ANTHROPIC_API_KEY");
  const openrouterKey = req.headers["x-openrouter-key"] || getApiKey("OPENROUTER_API_KEY");
  const ai = getGenAI();
  if (aiProvider === "gemini" && !ai || aiProvider !== "gemini") {
    const providerName = aiProvider !== "gemini" ? aiProvider.toString().charAt(0).toUpperCase() + aiProvider.toString().slice(1) : "Meteorological Synthesis Engine";
    const heuristicData = generateHeuristicInsight(
      {
        locationName,
        temperature,
        unit,
        condition,
        feelsLike,
        humidity,
        windSpeed,
        uvIndex,
        aqi,
        hourlySummary,
        dailySummary
      },
      `${providerName} (Heuristic Fallback)`
    );
    insightsCache.set(cacheKey, { data: heuristicData, timestamp: Date.now() });
    return res.json(heuristicData);
  }
  const prompt = `You are Google Weather's meteorologist AI assistant. Generate concise, engaging, and highly practical natural language weather insights for the user in ${locationName}.

Current Meteorological Data:
- Location: ${locationName}
- Temperature: ${temperature}${tempUnit} (Feels like: ${feelsLike}${tempUnit})
- Weather Condition: ${condition}
- Humidity: ${humidity}%
- Wind Speed: ${windSpeed} ${speedUnit}
- UV Index: ${uvIndex}
- Air Quality Index (US AQI): ${aqi || "N/A"}
- Hourly Outlook: ${hourlySummary || "Normal seasonal progression"}
- Daily Range: ${dailySummary || "Consistent with seasonal averages"}

Generate a structured JSON response matching the schema with friendly, natural conversational insights. Keep each section concise (1-2 sentences).`;
  const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: "You are Google Weather AI. Provide crisp, engaging, and genuinely useful weather insights, dressing advice, and activity guidance. Avoid robotic jargon.",
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              headline: {
                type: import_genai.Type.STRING,
                description: "A punchy, 4-8 word title summarizing today\u2019s key weather narrative"
              },
              summary: {
                type: import_genai.Type.STRING,
                description: "A 2-sentence conversational natural language overview of current conditions and what to expect"
              },
              clothingAdvice: {
                type: import_genai.Type.STRING,
                description: "Specific practical clothing, footwear, and accessory recommendation (e.g. layers, umbrella, sunglasses)"
              },
              activityRecommendation: {
                type: import_genai.Type.STRING,
                description: "Practical advice on outdoor workouts, commuting, dining, or best times of day to be outside"
              },
              healthAndComfort: {
                type: import_genai.Type.STRING,
                description: "Health commentary covering UV sun safety, air quality impact, or humidity comfort"
              },
              tipOfTheDay: {
                type: import_genai.Type.STRING,
                description: "A friendly tip of the day summarizing what to take care about and how the day or night will be"
              }
            },
            required: [
              "headline",
              "summary",
              "clothingAdvice",
              "activityRecommendation",
              "healthAndComfort",
              "tipOfTheDay"
            ]
          }
        }
      });
      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        const result = {
          ...parsed,
          source: `Gemini AI (${model})`
        };
        insightsCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return res.json(result);
      }
    } catch (err) {
      const errorMsg = err?.message || "";
      const isQuotaError = err?.status === 429 || err?.code === 429 || /quota|exhausted|rate limit/i.test(errorMsg);
      const isOverloaded = err?.status === 503 || err?.code === 503 || /overloaded|high demand|unavailable/i.test(errorMsg);
      console.warn(
        `[Gemini Insights] Model ${model} ${isQuotaError ? "quota exceeded" : isOverloaded ? "overloaded" : "encountered error"}. Attempting next option...`
      );
    }
  }
  console.warn(
    "[Gemini Insights] Gemini API quota/capacity reached. Serving meteorological synthesis fallback."
  );
  const fallbackResult = generateHeuristicInsight(
    {
      locationName,
      temperature,
      unit,
      condition,
      feelsLike,
      humidity,
      windSpeed,
      uvIndex,
      aqi,
      hourlySummary,
      dailySummary
    },
    "Meteorological Synthesis Engine (AI Quota Active)"
  );
  insightsCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() });
  return res.json(fallbackResult);
});
app.get("/api/aqi/purpleair", async (req, res) => {
  const latStr = req.query.lat;
  const lonStr = req.query.lon;
  const key = req.headers["x-purpleair-key"] || req.query.key || getApiKey("PURPLEAIR_API_KEY");
  if (!key) {
    return res.status(401).json({ error: "PURPLEAIR_API_KEY is not configured. Please add it in Settings > External APIs." });
  }
  if (!latStr || !lonStr) {
    return res.status(400).json({ error: "lat and lon are required" });
  }
  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  const nwlat = lat + 0.1;
  const selat = lat - 0.1;
  const nwlng = lon - 0.1;
  const selng = lon + 0.1;
  try {
    const url = `https://api.purpleair.com/v1/sensors?fields=name,latitude,longitude,pm2.5_10minute,humidity,temperature&max_age=3600&location_type=0&nwlng=${nwlng}&nwlat=${nwlat}&selng=${selng}&selat=${selat}`;
    const response = await fetch(url, {
      headers: {
        "X-API-Key": key
      }
    });
    if (!response.ok) {
      throw new Error(`PurpleAir API error: ${response.status}`);
    }
    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error("PurpleAir error:", err);
    return res.status(500).json({ error: err.message });
  }
});
app.get("/api/weather/tiles/:layer/:z/:x/:y.png", async (req, res) => {
  const { layer, z, x, y } = req.params;
  const apiKey = getApiKey("OPENWEATHERMAP_API_KEY") || getApiKey("OPENWEATHER_API_KEY") || getApiKey("RADAR_API_KEY");
  if (!apiKey) {
    return res.status(401).json({ error: "OpenWeatherMap API key not configured" });
  }
  const url = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`;
  try {
    const tileRes = await fetch(url);
    if (!tileRes.ok) {
      return res.status(tileRes.status).send("Tile fetch error");
    }
    const buffer = await tileRes.arrayBuffer();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Tile proxy error:", err);
    return res.status(500).send("Error fetching weather map tile");
  }
});
async function startServer() {
  app.get("/about.html", (_req, res) => {
    const pubPath = import_path.default.join(process.cwd(), "public", "about.html");
    if (import_fs.default.existsSync(pubPath)) {
      return res.sendFile(pubPath);
    }
    const distAbout = import_path.default.join(process.cwd(), "dist", "about.html");
    if (import_fs.default.existsSync(distAbout)) {
      return res.sendFile(distAbout);
    }
    res.redirect("/");
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Weather Server active on http://0.0.0.0:${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
