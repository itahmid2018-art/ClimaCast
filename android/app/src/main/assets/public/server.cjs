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
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");

// server/sqliteDb.ts
var import_node_sqlite = require("node:sqlite");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var dbInstance = null;
var activeDbPath = "";
function getSqliteDb(customPath) {
  if (dbInstance) {
    return dbInstance;
  }
  const resolvedPath = customPath || process.env.SQLITE_DB_PATH || import_path.default.join(process.cwd(), "climacast.sqlite");
  activeDbPath = resolvedPath;
  const dir = import_path.default.dirname(resolvedPath);
  if (!import_fs.default.existsSync(dir)) {
    import_fs.default.mkdirSync(dir, { recursive: true });
  }
  dbInstance = new import_node_sqlite.DatabaseSync(resolvedPath);
  initializeSchema(dbInstance);
  return dbInstance;
}
function initializeSchema(db) {
  db.exec(`
    -- 1. Machine Nodes & Hardware/Container Registry
    CREATE TABLE IF NOT EXISTS machine_nodes (
      machine_id TEXT PRIMARY KEY,
      app_url TEXT,
      port INTEGER DEFAULT 3000,
      node_env TEXT,
      sqlite_db_path TEXT,
      last_heartbeat TEXT
    );

    -- 2. System Configuration & Default Fallbacks
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      category TEXT,
      updated_at TEXT
    );

    -- 3. Users & Identity Registry
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      machine_id TEXT,
      name TEXT,
      email TEXT,
      phone TEXT,
      country TEXT,
      country_code TEXT,
      state TEXT,
      state_code TEXT,
      district TEXT,
      city TEXT,
      default_zip_pin TEXT,
      auto_resolve INTEGER DEFAULT 1,
      wttr_precision INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );

    -- 4. Saved Locations
    CREATE TABLE IF NOT EXISTS saved_locations (
      id INTEGER PRIMARY KEY,
      name TEXT,
      country TEXT,
      admin1 TEXT,
      latitude REAL,
      longitude REAL,
      timezone TEXT,
      created_at TEXT
    );

    -- 5. Saved Postal / PIN Codes
    CREATE TABLE IF NOT EXISTS saved_postal_pins (
      code TEXT PRIMARY KEY,
      name TEXT,
      state TEXT,
      country TEXT,
      latitude REAL,
      longitude REAL,
      created_at TEXT
    );

    -- 6. Notification Settings
    CREATE TABLE IF NOT EXISTS notification_settings (
      id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 1,
      morning_tip_enabled INTEGER DEFAULT 1,
      severe_alerts_only INTEGER DEFAULT 1,
      last_morning_tip_date TEXT,
      updated_at TEXT
    );

    -- 7. Twilio SMS & WhatsApp Log Registry
    CREATE TABLE IF NOT EXISTS twilio_messages_log (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      to_phone TEXT,
      from_phone TEXT,
      message_body TEXT,
      status TEXT,
      error_code INTEGER,
      error_message TEXT,
      sid TEXT,
      raw_response TEXT
    );

    -- 8. Weather News Dispatches
    CREATE TABLE IF NOT EXISTS weather_news_dispatches (
      id TEXT PRIMARY KEY,
      timestamp TEXT,
      location_name TEXT,
      condition TEXT,
      temperature REAL,
      unit TEXT,
      channel TEXT,
      recipient TEXT,
      anchor_name TEXT,
      headline TEXT,
      report_text TEXT
    );
  `);
}
function syncAllDataToSqlite() {
  const db = getSqliteDb();
  const machineId = process.env.MACHINE_ID || "climacast-dev-srv-asia-southeast1";
  const uniqueUserId = process.env.UNIQUE_USER_ID || "usr_itahmid_8197845321";
  const appUrl = process.env.APP_URL || "https://ais-dev-2j5vkz47k6lszvoh3n7nws-1038819846954.asia-southeast1.run.app";
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const upsertMachine = db.prepare(`
    INSERT INTO machine_nodes (machine_id, app_url, port, node_env, sqlite_db_path, last_heartbeat)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(machine_id) DO UPDATE SET
      app_url=excluded.app_url,
      port=excluded.port,
      node_env=excluded.node_env,
      sqlite_db_path=excluded.sqlite_db_path,
      last_heartbeat=excluded.last_heartbeat;
  `);
  upsertMachine.run(
    machineId,
    appUrl,
    parseInt(process.env.PORT || "3000", 10),
    process.env.NODE_ENV || "development",
    activeDbPath,
    now
  );
  const upsertConfig = db.prepare(`
    INSERT INTO system_config (key, value, category, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value=excluded.value,
      category=excluded.category,
      updated_at=excluded.updated_at;
  `);
  const configsToSave = [
    { key: "PORT", value: process.env.PORT || "3000", category: "server" },
    { key: "NODE_ENV", value: process.env.NODE_ENV || "production", category: "server" },
    { key: "APP_URL", value: appUrl, category: "network" },
    { key: "MACHINE_ID", value: machineId, category: "identity" },
    { key: "UNIQUE_USER_ID", value: uniqueUserId, category: "identity" },
    { key: "AUTHORIZED_USER_PHONE", value: process.env.AUTHORIZED_USER_PHONE || "+918197845321", category: "user" },
    { key: "AUTHORIZED_USER_EMAIL", value: process.env.AUTHORIZED_USER_EMAIL || "itahmid2018@gmail.com", category: "user" },
    { key: "AUTHORIZED_USER_NAME", value: process.env.AUTHORIZED_USER_NAME || "Tahmid", category: "user" },
    { key: "TWILIO_PHONE_NUMBER", value: process.env.TWILIO_PHONE_NUMBER || "8197845321", category: "twilio" },
    { key: "TWILIO_ACCOUNT_SID_SET", value: process.env.TWILIO_ACCOUNT_SID ? "true" : "false", category: "twilio" },
    { key: "GEMINI_API_KEY_SET", value: process.env.GEMINI_API_KEY ? "true" : "false", category: "ai" },
    { key: "SQLITE_DB_PATH", value: activeDbPath, category: "database" }
  ];
  for (const c of configsToSave) {
    upsertConfig.run(c.key, c.value, c.category, now);
  }
  const userDbFile = import_path.default.join(process.cwd(), "user-db.json");
  if (import_fs.default.existsSync(userDbFile)) {
    try {
      const userDb = JSON.parse(import_fs.default.readFileSync(userDbFile, "utf-8"));
      const profile = userDb.profile || {};
      const authUser = userDb.authorizedUser || {};
      const upsertUser = db.prepare(`
        INSERT INTO users (id, machine_id, name, email, phone, country, country_code, state, state_code, district, city, default_zip_pin, auto_resolve, wttr_precision, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          machine_id=excluded.machine_id,
          name=excluded.name,
          email=excluded.email,
          phone=excluded.phone,
          country=excluded.country,
          country_code=excluded.country_code,
          state=excluded.state,
          state_code=excluded.state_code,
          district=excluded.district,
          city=excluded.city,
          default_zip_pin=excluded.default_zip_pin,
          auto_resolve=excluded.auto_resolve,
          wttr_precision=excluded.wttr_precision,
          updated_at=excluded.updated_at;
      `);
      upsertUser.run(
        authUser.userId || uniqueUserId,
        authUser.machineId || machineId,
        authUser.name || profile.name || "Tahmid",
        authUser.email || profile.email || "itahmid2018@gmail.com",
        authUser.phone || profile.phone || "+918197845321",
        profile.country || "India",
        profile.countryCode || "IN",
        profile.state || "Karnataka",
        profile.stateCode || "KA",
        profile.district || "Bengaluru Urban",
        profile.city || "Bengaluru",
        profile.defaultZipPin || "560001",
        profile.autoResolveOnZipInput ? 1 : 0,
        profile.wttrPrecisionMode ? 1 : 0,
        authUser.registeredAt || now,
        profile.lastUpdated || now
      );
      if (Array.isArray(userDb.savedZipPins)) {
        const upsertPin = db.prepare(`
          INSERT INTO saved_postal_pins (code, name, state, country, latitude, longitude, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(code) DO UPDATE SET
            name=excluded.name,
            state=excluded.state,
            country=excluded.country,
            latitude=excluded.latitude,
            longitude=excluded.longitude;
        `);
        for (const pin of userDb.savedZipPins) {
          upsertPin.run(
            pin.code,
            pin.name || pin.code,
            pin.state || "",
            pin.country || "",
            typeof pin.latitude === "number" ? pin.latitude : parseFloat(pin.latitude) || 0,
            typeof pin.longitude === "number" ? pin.longitude : parseFloat(pin.longitude) || 0,
            now
          );
        }
      }
    } catch (e) {
      console.warn("Could not sync user-db.json to SQLite:", e);
    }
  }
  const dbFile = import_path.default.join(process.cwd(), "db.json");
  if (import_fs.default.existsSync(dbFile)) {
    try {
      const mainDb = JSON.parse(import_fs.default.readFileSync(dbFile, "utf-8"));
      if (Array.isArray(mainDb.savedLocations)) {
        const upsertLocation = db.prepare(`
          INSERT INTO saved_locations (id, name, country, admin1, latitude, longitude, timezone, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            country=excluded.country,
            admin1=excluded.admin1,
            latitude=excluded.latitude,
            longitude=excluded.longitude,
            timezone=excluded.timezone;
        `);
        for (const loc of mainDb.savedLocations) {
          upsertLocation.run(
            loc.id,
            loc.name,
            loc.country || "",
            loc.admin1 || "",
            loc.latitude,
            loc.longitude,
            loc.timezone || "UTC",
            now
          );
        }
      }
      const notif = mainDb.notificationSettings || {};
      const upsertNotif = db.prepare(`
        INSERT INTO notification_settings (id, enabled, morning_tip_enabled, severe_alerts_only, last_morning_tip_date, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          enabled=excluded.enabled,
          morning_tip_enabled=excluded.morning_tip_enabled,
          severe_alerts_only=excluded.severe_alerts_only,
          last_morning_tip_date=excluded.last_morning_tip_date,
          updated_at=excluded.updated_at;
      `);
      upsertNotif.run(
        "global_settings",
        notif.enabled !== false ? 1 : 0,
        notif.morningTipEnabled !== false ? 1 : 0,
        notif.severeAlertsOnly !== false ? 1 : 0,
        mainDb.lastMorningTipDate || null,
        now
      );
      if (mainDb.twilioIntegration) {
        const ti = mainDb.twilioIntegration;
        logTwilioMessage({
          id: `log_init_${Date.now()}`,
          timestamp: ti.lastTestedAt || now,
          to_phone: ti.authorizedRecipient || "+918197845321",
          from_phone: ti.fromPhone || "8197845321",
          message_body: ti.helloMessage || "Hello from ClimaCast Weather test.",
          status: ti.testStatus || "trial_template_restricted",
          error_code: ti.testErrorCode || 572006,
          error_message: ti.testErrorMessage || "Invalid template name. Trial accounts can only use predefined SMS templates.",
          sid: null,
          raw_response: JSON.stringify(ti)
        });
      }
    } catch (e) {
      console.warn("Could not sync db.json to SQLite:", e);
    }
  }
  return getSqliteStats();
}
function logTwilioMessage(record) {
  const db = getSqliteDb();
  const insert = db.prepare(`
    INSERT INTO twilio_messages_log (id, timestamp, to_phone, from_phone, message_body, status, error_code, error_message, sid, raw_response)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status=excluded.status,
      error_code=excluded.error_code,
      error_message=excluded.error_message,
      sid=excluded.sid,
      raw_response=excluded.raw_response;
  `);
  insert.run(
    record.id,
    record.timestamp,
    record.to_phone,
    record.from_phone,
    record.message_body,
    record.status,
    record.error_code ?? null,
    record.error_message ?? null,
    record.sid ?? null,
    record.raw_response ?? null
  );
}
function logWeatherNewsDispatch(data) {
  const db = getSqliteDb();
  const insert = db.prepare(`
    INSERT INTO weather_news_dispatches (id, timestamp, location_name, condition, temperature, unit, channel, recipient, anchor_name, headline, report_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const id = data.id || `dispatch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = data.timestamp || (/* @__PURE__ */ new Date()).toISOString();
  insert.run(
    id,
    timestamp,
    data.location_name,
    data.condition,
    data.temperature,
    data.unit,
    data.channel,
    data.recipient || "",
    data.anchor_name || "",
    data.headline || "",
    data.report_text
  );
  return id;
}
function getSqliteStats() {
  const db = getSqliteDb();
  const getCount = (tableName) => {
    try {
      const res = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
      return res ? Number(res.count) : 0;
    } catch {
      return 0;
    }
  };
  return {
    databasePath: activeDbPath,
    initialized: true,
    tables: {
      users: getCount("users"),
      machine_nodes: getCount("machine_nodes"),
      system_config: getCount("system_config"),
      saved_locations: getCount("saved_locations"),
      saved_postal_pins: getCount("saved_postal_pins"),
      notification_settings: getCount("notification_settings"),
      twilio_messages_log: getCount("twilio_messages_log"),
      weather_news_dispatches: getCount("weather_news_dispatches")
    }
  };
}
function getAllSqliteData() {
  const db = getSqliteDb();
  return {
    stats: getSqliteStats(),
    machine_nodes: db.prepare("SELECT * FROM machine_nodes").all(),
    users: db.prepare("SELECT * FROM users").all(),
    system_config: db.prepare("SELECT * FROM system_config").all(),
    saved_locations: db.prepare("SELECT * FROM saved_locations").all(),
    saved_postal_pins: db.prepare("SELECT * FROM saved_postal_pins").all(),
    notification_settings: db.prepare("SELECT * FROM notification_settings").all(),
    twilio_messages_log: db.prepare("SELECT * FROM twilio_messages_log ORDER BY timestamp DESC LIMIT 50").all(),
    weather_news_dispatches: db.prepare("SELECT * FROM weather_news_dispatches ORDER BY timestamp DESC LIMIT 50").all()
  };
}

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var DB_FILE = import_path2.default.join(process.cwd(), "db.json");
if (!import_fs2.default.existsSync(DB_FILE)) {
  import_fs2.default.writeFileSync(
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
var USER_DB_FILE = import_path2.default.join(process.cwd(), "user-db.json");
var DEFAULT_USER_DB = {
  profile: {
    country: "United States",
    countryCode: "US",
    state: "California",
    stateCode: "CA",
    district: "",
    city: "San Francisco",
    defaultZipPin: "94103",
    autoResolveOnZipInput: true,
    wttrPrecisionMode: true,
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  },
  savedZipPins: [
    {
      code: "94103",
      name: "San Francisco",
      state: "California",
      country: "United States",
      latitude: 37.7725,
      longitude: -122.4147
    },
    {
      code: "10001",
      name: "New York",
      state: "New York",
      country: "United States",
      latitude: 40.7505,
      longitude: -73.9965
    },
    {
      code: "560001",
      name: "Bengaluru (General Post Office)",
      state: "Karnataka",
      country: "India",
      latitude: 12.9784,
      longitude: 77.5946
    }
  ]
};
if (!import_fs2.default.existsSync(USER_DB_FILE)) {
  import_fs2.default.writeFileSync(USER_DB_FILE, JSON.stringify(DEFAULT_USER_DB, null, 2));
}
function getUserDbData() {
  try {
    const raw = import_fs2.default.readFileSync(USER_DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      profile: {
        ...DEFAULT_USER_DB.profile,
        ...parsed.profile || {}
      },
      savedZipPins: Array.isArray(parsed.savedZipPins) ? parsed.savedZipPins : DEFAULT_USER_DB.savedZipPins
    };
  } catch (err) {
    return DEFAULT_USER_DB;
  }
}
function saveUserDbData(patch) {
  try {
    const current = getUserDbData();
    const updated = {
      profile: patch.profile ? { ...current.profile, ...patch.profile, lastUpdated: (/* @__PURE__ */ new Date()).toISOString() } : current.profile,
      savedZipPins: patch.savedZipPins ? patch.savedZipPins : current.savedZipPins
    };
    import_fs2.default.writeFileSync(USER_DB_FILE, JSON.stringify(updated, null, 2));
    try {
      syncAllDataToSqlite();
    } catch (e) {
      console.warn("[SQLite] Sync failed on user-db update:", e);
    }
    return updated;
  } catch (err) {
    console.error("Failed to write to user-db.json", err);
    throw err;
  }
}
function getDbData() {
  try {
    const raw = import_fs2.default.readFileSync(DB_FILE, "utf-8");
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
    import_fs2.default.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2));
    try {
      syncAllDataToSqlite();
    } catch (e) {
      console.warn("[SQLite] Sync failed on db update:", e);
    }
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
app.get("/api/user-profile", (_req, res) => {
  const userDb = getUserDbData();
  res.json(userDb);
});
app.post("/api/user-profile", (req, res) => {
  const { profile, savedZipPins, ...rest } = req.body || {};
  const patch = {};
  if (profile && typeof profile === "object") {
    patch.profile = profile;
  } else if (Object.keys(rest).length > 0) {
    const current = getUserDbData().profile || {};
    patch.profile = { ...current, ...rest };
  }
  if (Array.isArray(savedZipPins)) {
    patch.savedZipPins = savedZipPins;
  }
  const updated = saveUserDbData(patch);
  res.json({
    success: true,
    message: "User profile and regional preferences saved to user-db.json",
    profile: updated.profile,
    savedZipPins: updated.savedZipPins
  });
});
app.post("/api/user-profile/save-pin", (req, res) => {
  const { pin } = req.body;
  if (!pin || !pin.code) {
    return res.status(400).json({ error: "Pin object with code is required" });
  }
  const current = getUserDbData();
  const existing = current.savedZipPins || [];
  const filtered = existing.filter((p) => p.code.toUpperCase() !== String(pin.code).toUpperCase());
  const updatedPins = [
    {
      code: String(pin.code).trim(),
      name: pin.name || pin.code,
      state: pin.state || current.profile.state || "",
      country: pin.country || current.profile.country || "",
      latitude: parseFloat(pin.latitude) || 0,
      longitude: parseFloat(pin.longitude) || 0
    },
    ...filtered
  ].slice(0, 25);
  const updated = saveUserDbData({ savedZipPins: updatedPins });
  res.json({
    success: true,
    savedZipPins: updated.savedZipPins
  });
});
app.delete("/api/user-profile/save-pin/:code", (req, res) => {
  const code = req.params.code;
  const current = getUserDbData();
  const filtered = (current.savedZipPins || []).filter((p) => p.code.toUpperCase() !== code.toUpperCase());
  const updated = saveUserDbData({ savedZipPins: filtered });
  res.json({
    success: true,
    savedZipPins: updated.savedZipPins
  });
});
function getCountryCode(countryNameOrCode) {
  if (!countryNameOrCode) return "US";
  const clean = countryNameOrCode.trim().toUpperCase();
  if (clean.length === 2) return clean;
  const map = {
    "UNITED STATES": "US",
    "UNITED STATES OF AMERICA": "US",
    USA: "US",
    INDIA: "IN",
    "UNITED KINGDOM": "GB",
    "GREAT BRITAIN": "GB",
    UK: "GB",
    ENGLAND: "GB",
    CANADA: "CA",
    GERMANY: "DE",
    DEUTSCHLAND: "DE",
    FRANCE: "FR",
    AUSTRALIA: "AU",
    SPAIN: "ES",
    ITALY: "IT",
    JAPAN: "JP",
    BRAZIL: "BR",
    MEXICO: "MX",
    NETHERLANDS: "NL",
    SWITZERLAND: "CH",
    SWEDEN: "SE",
    "SOUTH AFRICA": "ZA",
    "NEW ZEALAND": "NZ",
    RUSSIA: "RU",
    AUSTRIA: "AT",
    BELGIUM: "BE",
    POLAND: "PL",
    TURKEY: "TR",
    PORTUGAL: "PT",
    NORWAY: "NO",
    DENMARK: "DK",
    FINLAND: "FI",
    IRELAND: "IE"
  };
  return map[clean] || "US";
}
app.get("/api/geocode/postal", async (req, res) => {
  const codeRaw = req.query.code || "";
  if (!codeRaw || codeRaw.trim().length === 0) {
    return res.status(400).json({ error: "Postal code or PIN code is required" });
  }
  const code = codeRaw.trim();
  const userDb = getUserDbData();
  const country = (req.query.country || userDb.profile.country || "United States").trim();
  const countryCode = (req.query.countryCode || userDb.profile.countryCode || getCountryCode(country)).trim().toUpperCase();
  const state = (req.query.state || userDb.profile.state || "").trim();
  try {
    const zippoCountry = countryCode.toLowerCase();
    const cleanPostal = code.split(" ")[0];
    const zippoUrl = `https://api.zippopotam.us/${zippoCountry}/${encodeURIComponent(cleanPostal)}`;
    const zippoRes = await fetch(zippoUrl);
    if (zippoRes.ok) {
      const zippoData = await zippoRes.json();
      if (zippoData.places && zippoData.places.length > 0) {
        let bestPlace = zippoData.places[0];
        if (state) {
          const match = zippoData.places.find(
            (p) => p.state?.toLowerCase().includes(state.toLowerCase()) || p["state abbreviation"]?.toLowerCase() === state.toLowerCase()
          );
          if (match) bestPlace = match;
        }
        const lat = parseFloat(bestPlace.latitude);
        const lon = parseFloat(bestPlace.longitude);
        const placeName = bestPlace["place name"] || code;
        const stateName = bestPlace.state || state;
        const fullCountry = zippoData.country || country;
        const location = {
          id: Math.round(Math.abs(lat * 1e4 + lon * 1e3)),
          name: `${placeName} (${code})`,
          latitude: lat,
          longitude: lon,
          country: fullCountry,
          country_code: countryCode,
          admin1: stateName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          postcodes: [code]
        };
        return res.json({ success: true, location, source: "zippopotam" });
      }
    }
  } catch (err) {
  }
  try {
    const wttrQuery = `${code}${state ? "," + state : ""}${country ? "," + country : ""}`;
    const wttrRes = await fetch(`https://wttr.in/${encodeURIComponent(wttrQuery)}?format=j1`, {
      headers: { "User-Agent": "curl/7.88.1" },
      signal: AbortSignal.timeout(3500)
    });
    if (wttrRes.ok) {
      const wttrData = await wttrRes.json();
      const area = wttrData.nearest_area?.[0];
      if (area && area.latitude && area.longitude) {
        const lat = parseFloat(area.latitude);
        const lon = parseFloat(area.longitude);
        const areaName = area.areaName?.[0]?.value || code;
        const regionName = area.region?.[0]?.value || state;
        const countryName = area.country?.[0]?.value || country;
        const location = {
          id: Math.round(Math.abs(lat * 1e4 + lon * 1e3)),
          name: `${areaName} (${code})`,
          latitude: lat,
          longitude: lon,
          country: countryName,
          country_code: countryCode,
          admin1: regionName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          postcodes: [code]
        };
        return res.json({ success: true, location, source: "wttr.in" });
      }
    }
  } catch (err) {
  }
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(code)}&country=${encodeURIComponent(country)}&format=json&addressdetails=1&limit=3`;
    const nomRes = await fetch(nominatimUrl, {
      headers: { "User-Agent": "ClimaCastWeather/1.0 (contact: support@climacast.app)" },
      signal: AbortSignal.timeout(3500)
    });
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (Array.isArray(nomData) && nomData.length > 0) {
        const item = nomData[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const addr = item.address || {};
        const locality = addr.city || addr.town || addr.village || addr.suburb || addr.county || code;
        const stateName = addr.state || state;
        const countryName = addr.country || country;
        const location = {
          id: Math.round(Math.abs(lat * 1e4 + lon * 1e3)),
          name: `${locality} (${code})`,
          latitude: lat,
          longitude: lon,
          country: countryName,
          country_code: (addr.country_code || countryCode).toUpperCase(),
          admin1: stateName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          postcodes: [code]
        };
        return res.json({ success: true, location, source: "nominatim" });
      }
    }
  } catch (err) {
  }
  try {
    const meteoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(code)}&count=5&language=en&format=json`;
    const meteoRes = await fetch(meteoUrl);
    if (meteoRes.ok) {
      const meteoData = await meteoRes.json();
      if (meteoData.results && meteoData.results.length > 0) {
        const match = meteoData.results.find(
          (r) => r.country_code?.toUpperCase() === countryCode || r.country?.toLowerCase() === country.toLowerCase()
        ) || meteoData.results[0];
        return res.json({ success: true, location: match, source: "open-meteo" });
      }
    }
  } catch (err) {
  }
  return res.status(404).json({
    error: `Could not resolve PIN/ZIP code '${code}' in ${state ? state + ", " : ""}${country}. Please check the code or adjust your Country and State preferences in Settings.`
  });
});
app.get("/api/weather/wttr", async (req, res) => {
  const query = req.query.query || req.query.location || "94103";
  try {
    const results = await Promise.allSettled([
      fetch(`https://wttr.in/${encodeURIComponent(query)}?format=j1`, {
        headers: { "User-Agent": "curl/7.88.1" },
        signal: AbortSignal.timeout(6e3)
      }),
      fetch(`https://wttr.in/${encodeURIComponent(query)}?0?T`, {
        headers: { "User-Agent": "curl/7.88.1" },
        signal: AbortSignal.timeout(6e3)
      })
    ]);
    const jsonSettled = results[0];
    const asciiSettled = results[1];
    let data = null;
    let asciiTable;
    if (asciiSettled.status === "fulfilled" && asciiSettled.value.ok) {
      try {
        asciiTable = await asciiSettled.value.text();
      } catch {
      }
    }
    if (jsonSettled.status === "fulfilled" && jsonSettled.value.ok) {
      try {
        data = await jsonSettled.value.json();
      } catch {
      }
    }
    if (!data) {
      if (asciiTable) {
        return res.json({
          success: true,
          report: {
            query,
            resolvedArea: { areaName: query, region: "", country: "", latitude: 0, longitude: 0 },
            current: { tempC: 20, tempF: 68, feelsLikeC: 20, feelsLikeF: 68, weatherDesc: "Fair", humidity: 65, windSpeedKmph: 10, windDir: "N", pressure: 1013, uvIndex: 3, precipMM: 0 },
            weatherDays: [],
            asciiTable
          }
        });
      }
      throw new Error("WTTR service temporarily unavailable");
    }
    const cur = data.current_condition?.[0] || {};
    const area = data.nearest_area?.[0] || {};
    const days = (data.weather || []).map((day) => ({
      date: day.date,
      maxtempC: parseFloat(day.maxtempC || "0"),
      mintempC: parseFloat(day.mintempC || "0"),
      maxtempF: parseFloat(day.maxtempF || "0"),
      mintempF: parseFloat(day.mintempF || "0"),
      hourly: (day.hourly || []).map((h) => ({
        time: h.time,
        tempC: parseFloat(h.tempC || "0"),
        tempF: parseFloat(h.tempF || "0"),
        weatherDesc: h.weatherDesc?.[0]?.value || "Clear",
        windspeedKmph: parseFloat(h.windspeedKmph || "0"),
        humidity: parseFloat(h.humidity || "0"),
        chanceofrain: parseFloat(h.chanceofrain || "0")
      }))
    }));
    const report = {
      query,
      resolvedArea: {
        areaName: area.areaName?.[0]?.value || query,
        region: area.region?.[0]?.value || "",
        country: area.country?.[0]?.value || "",
        latitude: parseFloat(area.latitude || "0"),
        longitude: parseFloat(area.longitude || "0")
      },
      current: {
        tempC: parseFloat(cur.temp_C || "0"),
        tempF: parseFloat(cur.temp_F || "0"),
        feelsLikeC: parseFloat(cur.FeelsLikeC || "0"),
        feelsLikeF: parseFloat(cur.FeelsLikeF || "0"),
        weatherDesc: cur.weatherDesc?.[0]?.value || "Clear",
        humidity: parseFloat(cur.humidity || "0"),
        windSpeedKmph: parseFloat(cur.windspeedKmph || "0"),
        windDir: cur.winddir16Point || "N",
        pressure: parseFloat(cur.pressure || "1013"),
        uvIndex: parseFloat(cur.uvIndex || "0"),
        precipMM: parseFloat(cur.precipMM || "0")
      },
      weatherDays: days,
      asciiTable
    };
    return res.json({ success: true, report });
  } catch (err) {
    return res.status(502).json({
      error: `Failed to fetch WTTR.in prediction: ${err.message}`
    });
  }
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
app.get("/api/share/status", (_req, res) => {
  const twilioSid = getApiKey("TWILIO_ACCOUNT_SID") || process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = getApiKey("TWILIO_AUTH_TOKEN") || process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = getApiKey("TWILIO_PHONE_NUMBER") || process.env.TWILIO_PHONE_NUMBER;
  const twilioConfigured = Boolean(twilioSid && twilioToken && twilioPhone);
  res.json({
    twilioConfigured,
    fromPhoneMasked: twilioPhone ? `${twilioPhone.slice(0, 3)}***${twilioPhone.slice(-4)}` : null,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});
app.post("/api/share/twilio", async (req, res) => {
  const { to, message, headline, location } = req.body;
  if (!to || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: "to" (phone number) and "message" (news report text) are required.'
    });
  }
  const accountSid = getApiKey("TWILIO_ACCOUNT_SID") || process.env.TWILIO_ACCOUNT_SID;
  const authToken = getApiKey("TWILIO_AUTH_TOKEN") || process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = getApiKey("TWILIO_PHONE_NUMBER") || process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromPhone) {
    return res.status(200).json({
      success: false,
      configured: false,
      error: "Twilio SMS service is not configured in environment variables.",
      hint: "Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your environment, or choose WhatsApp / Native SMS sharing."
    });
  }
  const cleanTo = to.trim();
  try {
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const formParams = new URLSearchParams();
    formParams.append("To", cleanTo);
    formParams.append("From", fromPhone);
    formParams.append("Body", message);
    const twilioRes = await fetch(twilioEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formParams.toString()
    });
    const data = await twilioRes.json();
    logTwilioMessage({
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      to_phone: cleanTo,
      from_phone: fromPhone,
      message_body: message,
      status: twilioRes.ok ? "sent" : "failed",
      error_code: data.code || null,
      error_message: data.message || null,
      sid: data.sid || null,
      raw_response: JSON.stringify(data)
    });
    if (twilioRes.ok) {
      logWeatherNewsDispatch({
        location_name: location || "Current Location",
        condition: "Weather News Report",
        temperature: 0,
        unit: "C",
        channel: "twilio_sms",
        recipient: cleanTo,
        headline: headline || "Weather Report Broadcast",
        report_text: message
      });
    }
    if (!twilioRes.ok) {
      return res.status(400).json({
        success: false,
        configured: true,
        error: data.message || "Twilio SMS dispatch failed.",
        code: data.code
      });
    }
    return res.json({
      success: true,
      configured: true,
      sid: data.sid,
      status: data.status,
      to: data.to,
      dateCreated: data.date_created
    });
  } catch (err) {
    console.error("[Twilio Dispatch Error]", err);
    logTwilioMessage({
      id: `err_${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      to_phone: cleanTo,
      from_phone: fromPhone,
      message_body: message,
      status: "error",
      error_message: err.message
    });
    return res.status(500).json({
      success: false,
      configured: true,
      error: err.message || "Internal error while dispatching SMS via Twilio."
    });
  }
});
app.post("/api/twilio/test-hello", async (req, res) => {
  const authorizedPhone = process.env.AUTHORIZED_USER_PHONE || "+918197845321";
  const targetPhone = req.body.to || authorizedPhone;
  const machineId = process.env.MACHINE_ID || "climacast-dev-srv-asia-southeast1";
  const uniqueUserId = process.env.UNIQUE_USER_ID || "usr_itahmid_8197845321";
  const customGreeting = req.body.message || `Hello Tahmid! ClimaCast Weather service verification test from node ${machineId}. Local time: ${(/* @__PURE__ */ new Date()).toISOString()}`;
  const accountSid = getApiKey("TWILIO_ACCOUNT_SID") || process.env.TWILIO_ACCOUNT_SID;
  const authToken = getApiKey("TWILIO_AUTH_TOKEN") || process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = getApiKey("TWILIO_PHONE_NUMBER") || process.env.TWILIO_PHONE_NUMBER || "8197845321";
  if (!accountSid || !authToken || !fromPhone) {
    return res.status(400).json({
      success: false,
      configured: false,
      error: "Twilio credentials not configured in environment or database.",
      authorizedUser: { phone: authorizedPhone, email: process.env.AUTHORIZED_USER_EMAIL || "itahmid2018@gmail.com" }
    });
  }
  const cleanTo = targetPhone.trim().startsWith("+") ? targetPhone.trim() : `+91${targetPhone.trim().replace(/^0+/, "")}`;
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const formParams = new URLSearchParams();
    formParams.append("To", cleanTo);
    formParams.append("From", fromPhone);
    formParams.append("Body", customGreeting);
    const twilioRes = await fetch(twilioEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: formParams.toString()
    });
    const data = await twilioRes.json();
    const isSuccess = twilioRes.ok;
    let statusDescription = isSuccess ? "sent" : "failed";
    if (data.code === 572006) {
      statusDescription = "trial_template_restricted";
    }
    logTwilioMessage({
      id: `test_${Date.now()}`,
      timestamp,
      to_phone: cleanTo,
      from_phone: fromPhone,
      message_body: customGreeting,
      status: statusDescription,
      error_code: data.code || null,
      error_message: data.message || null,
      sid: data.sid || null,
      raw_response: JSON.stringify(data)
    });
    saveDbData({
      ...getDbData(),
      ...{
        machineId,
        uniqueUserId,
        authorizedUser: {
          name: process.env.AUTHORIZED_USER_NAME || "Tahmid",
          email: process.env.AUTHORIZED_USER_EMAIL || "itahmid2018@gmail.com",
          phone: cleanTo,
          rawPhone: "8197845321",
          status: "authorized"
        },
        twilioIntegration: {
          configured: true,
          accountSidMasked: `${accountSid.slice(0, 6)}...${accountSid.slice(-4)}`,
          fromPhone,
          authorizedRecipient: cleanTo,
          lastTestedAt: timestamp,
          testStatus: statusDescription,
          testErrorCode: data.code || null,
          testErrorMessage: data.message || (isSuccess ? "Message dispatched successfully" : "SMS dispatch returned status code"),
          helloMessage: customGreeting,
          note: data.code === 572006 ? "Twilio trial accounts enforce predefined SMS template restrictions on custom message bodies until upgraded." : isSuccess ? "SMS successfully submitted to Twilio message queue." : "SMS dispatch error."
        }
      }
    });
    return res.json({
      success: isSuccess,
      attempted: true,
      statusCode: twilioRes.status,
      to: cleanTo,
      from: fromPhone,
      sid: data.sid || null,
      status: statusDescription,
      code: data.code || null,
      message: data.message || (isSuccess ? "Hello message successfully dispatched via Twilio!" : "Twilio dispatch completed with trial response."),
      sqliteLogged: true,
      dbUpdated: true,
      authorizedUser: {
        name: process.env.AUTHORIZED_USER_NAME || "Tahmid",
        phone: cleanTo,
        email: process.env.AUTHORIZED_USER_EMAIL || "itahmid2018@gmail.com",
        userId: uniqueUserId,
        machineId
      },
      hint: data.code === 572006 ? "Twilio trial account active: custom outbound SMS requires predefined templates or upgraded account. WhatsApp & native share remain active." : void 0
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      attempted: true,
      error: err.message
    });
  }
});
app.get("/api/sqlite/status", (req, res) => {
  try {
    const platform = req.query.platform || req.headers["x-platform-view"] || "web";
    if (platform !== "web") {
      return res.json({
        success: true,
        webExclusive: true,
        active: false,
        platform,
        message: `SQLite database persistence is exclusive to the Web version. Platform '${platform}' operates with local client cache.`
      });
    }
    const stats = getSqliteStats();
    return res.json({
      success: true,
      webExclusive: true,
      active: true,
      platform: "web",
      stats
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/api/sqlite/dump", (req, res) => {
  try {
    const platform = req.query.platform || req.headers["x-platform-view"] || "web";
    if (platform !== "web") {
      return res.json({
        success: true,
        webExclusive: true,
        active: false,
        platform,
        data: null,
        message: "SQLite complete data dump is exclusive to the Web version."
      });
    }
    const all = getAllSqliteData();
    return res.json({
      success: true,
      webExclusive: true,
      active: true,
      platform: "web",
      data: all
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/sqlite/sync", (req, res) => {
  try {
    const platform = req.query.platform || req.body?.platform || req.headers["x-platform-view"] || "web";
    if (platform !== "web") {
      return res.json({
        success: true,
        webExclusive: true,
        active: false,
        platform,
        message: `SQLite sync bypassed: SQLite database is exclusive to the Web version. Platform '${platform}' operates with local storage.`
      });
    }
    const stats = syncAllDataToSqlite();
    return res.json({
      success: true,
      webExclusive: true,
      active: true,
      platform: "web",
      message: "All JSON and configuration data synchronized to SQLite (Web exclusive)",
      stats
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/api/share/ai-news-script", async (req, res) => {
  const { locationName, condition, temperature, unit, style, anchorName, customNote, recipientName } = req.body;
  const ai = getGenAI();
  if (!ai) {
    return res.json({
      success: true,
      source: "Meteorological Synthesis Engine",
      script: `This is ${anchorName || "Chief Meteorologist"} reporting live from the ClimaCast Desk. In ${locationName || "your area"}, conditions are currently ${condition || "clear"} with temperatures at ${temperature}\xB0${unit || "C"}.${customNote ? ` Note: "${customNote}".` : ""}`
    });
  }
  try {
    const prompt = `You are a charismatic, professional television/radio news weather anchor broadcasting a weather news dispatch.
Location: ${locationName}
Condition: ${condition}
Current Temperature: ${temperature}\xB0${unit}
Broadcast Style: ${style || "TV News Anchor"}
Anchor Name: ${anchorName || "Meteorologist"}
${recipientName ? `Addressed to recipient: ${recipientName}` : ""}
${customNote ? `Special dispatch note: "${customNote}"` : ""}

Draft an engaging, professional 3-paragraph news report script that the user can share to their friends or colleagues via WhatsApp, SMS, or Email. Include a breaking news headline, anchor lead-in, and weather advice.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are ClimaCast Newsroom Desk. Produce punchy, crisp, engaging broadcast scripts."
      }
    });
    return res.json({
      success: true,
      source: "Gemini AI Newsroom",
      script: response.text || ""
    });
  } catch (err) {
    return res.json({
      success: true,
      source: "Meteorological Synthesis Fallback",
      script: `ClimaCast Weather News Desk: Current telemetry for ${locationName} indicates ${condition} at ${temperature}\xB0${unit}. Stay weather-aware!`
    });
  }
});
async function startServer() {
  app.get("/about.html", (_req, res) => {
    const pubPath = import_path2.default.join(process.cwd(), "public", "about.html");
    if (import_fs2.default.existsSync(pubPath)) {
      return res.sendFile(pubPath);
    }
    const distAbout = import_path2.default.join(process.cwd(), "dist", "about.html");
    if (import_fs2.default.existsSync(distAbout)) {
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
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  try {
    const stats = syncAllDataToSqlite();
    console.log("[SQLite DB] Initialized and synchronized:", stats.tables);
  } catch (err) {
    console.error("[SQLite DB] Initial sync warning:", err);
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
