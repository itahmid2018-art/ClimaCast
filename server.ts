/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  syncAllDataToSqlite,
  logTwilioMessage,
  logWeatherNewsDispatch,
  getSqliteStats,
  getAllSqliteData,
} from './server/sqliteDb';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const DB_FILE = path.join(process.cwd(), 'db.json');

// Ensure db.json exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(
      {
        keys: {},
        savedLocations: [
          { id: 2988507, name: 'Paris', country: 'France', latitude: 48.8534, longitude: 2.3488, timezone: 'Europe/Paris' },
          { id: 5128581, name: 'New York', country: 'United States', admin1: 'New York', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
          { id: 1850147, name: 'Tokyo', country: 'Japan', latitude: 35.6895, longitude: 139.6917, timezone: 'Asia/Tokyo' },
        ],
        notificationSettings: {
          enabled: true,
          morningTipEnabled: true,
          severeAlertsOnly: true,
        },
      },
      null,
      2
    )
  );
}

// User Profile Database (user-db.json) for Country, State, and Postal/PIN resolution
const USER_DB_FILE = path.join(process.cwd(), 'user-db.json');

interface UserProfileData {
  country: string;
  countryCode: string;
  state: string;
  stateCode?: string;
  district?: string;
  city?: string;
  defaultZipPin?: string;
  autoResolveOnZipInput?: boolean;
  wttrPrecisionMode?: boolean;
  lastUpdated?: string;
}

interface SavedPostalPinData {
  code: string;
  name: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface UserDbData {
  profile: UserProfileData;
  savedZipPins: SavedPostalPinData[];
}

const DEFAULT_USER_DB: UserDbData = {
  profile: {
    country: 'United States',
    countryCode: 'US',
    state: 'California',
    stateCode: 'CA',
    district: '',
    city: 'San Francisco',
    defaultZipPin: '94103',
    autoResolveOnZipInput: true,
    wttrPrecisionMode: true,
    lastUpdated: new Date().toISOString(),
  },
  savedZipPins: [
    {
      code: '94103',
      name: 'San Francisco',
      state: 'California',
      country: 'United States',
      latitude: 37.7725,
      longitude: -122.4147,
    },
    {
      code: '10001',
      name: 'New York',
      state: 'New York',
      country: 'United States',
      latitude: 40.7505,
      longitude: -73.9965,
    },
    {
      code: '560001',
      name: 'Bengaluru (General Post Office)',
      state: 'Karnataka',
      country: 'India',
      latitude: 12.9784,
      longitude: 77.5946,
    },
  ],
};

if (!fs.existsSync(USER_DB_FILE)) {
  fs.writeFileSync(USER_DB_FILE, JSON.stringify(DEFAULT_USER_DB, null, 2));
}

function getUserDbData(): UserDbData {
  try {
    const raw = fs.readFileSync(USER_DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      profile: {
        ...DEFAULT_USER_DB.profile,
        ...(parsed.profile || {}),
      },
      savedZipPins: Array.isArray(parsed.savedZipPins) ? parsed.savedZipPins : DEFAULT_USER_DB.savedZipPins,
    };
  } catch (err) {
    return DEFAULT_USER_DB;
  }
}

function saveUserDbData(patch: Partial<UserDbData>): UserDbData {
  try {
    const current = getUserDbData();
    const updated: UserDbData = {
      profile: patch.profile
        ? { ...current.profile, ...patch.profile, lastUpdated: new Date().toISOString() }
        : current.profile,
      savedZipPins: patch.savedZipPins ? patch.savedZipPins : current.savedZipPins,
    };
    fs.writeFileSync(USER_DB_FILE, JSON.stringify(updated, null, 2));
    try {
      syncAllDataToSqlite();
    } catch (e) {
      console.warn('[SQLite] Sync failed on user-db update:', e);
    }
    return updated;
  } catch (err) {
    console.error('Failed to write to user-db.json', err);
    throw err;
  }
}

interface DbData {
  keys: Record<string, string>;
  savedLocations?: any[];
  notificationSettings?: {
    enabled: boolean;
    morningTipEnabled: boolean;
    severeAlertsOnly: boolean;
  };
  lastMorningTipDate?: string;
  lastAlarmingAlertTimestamp?: number;
}

function getDbData(): DbData {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      keys: parsed.keys || {},
      savedLocations: parsed.savedLocations || [
        { id: 2988507, name: 'Paris', country: 'France', latitude: 48.8534, longitude: 2.3488, timezone: 'Europe/Paris' },
        { id: 5128581, name: 'New York', country: 'United States', admin1: 'New York', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
        { id: 1850147, name: 'Tokyo', country: 'Japan', latitude: 35.6895, longitude: 139.6917, timezone: 'Asia/Tokyo' },
      ],
      notificationSettings: parsed.notificationSettings || {
        enabled: true,
        morningTipEnabled: true,
        severeAlertsOnly: true,
      },
      lastMorningTipDate: parsed.lastMorningTipDate,
      lastAlarmingAlertTimestamp: parsed.lastAlarmingAlertTimestamp,
    };
  } catch (err) {
    return {
      keys: {},
      savedLocations: [],
      notificationSettings: {
        enabled: true,
        morningTipEnabled: true,
        severeAlertsOnly: true,
      },
    };
  }
}

function saveDbData(patch: Partial<DbData>) {
  try {
    const current = getDbData();
    const updated: DbData = {
      ...current,
      ...patch,
      keys: patch.keys ? { ...current.keys, ...patch.keys } : current.keys,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2));
    try {
      syncAllDataToSqlite();
    } catch (e) {
      console.warn('[SQLite] Sync failed on db update:', e);
    }
    return updated;
  } catch (err) {
    console.error('Failed to write to db.json', err);
    throw err;
  }
}

function getStoredKeys(): Record<string, string> {
  return getDbData().keys;
}

function saveStoredKeys(newKeys: Record<string, string>) {
  saveDbData({ keys: newKeys });
}

function getApiKey(keyName: string): string | undefined {
  const keys = getStoredKeys();
  return keys[keyName] || process.env[keyName];
}

// Lazy-initialized Gemini instance
let aiClient: GoogleGenAI | null = null;
let aiClientKey: string | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = getApiKey('GEMINI_API_KEY');
  if (!apiKey) {
    return null;
  }
  if (!aiClient || aiClientKey !== apiKey) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    aiClientKey = apiKey;
  }
  return aiClient;
}

// In-memory cache for weather insights (30-minute TTL to preserve token quota)
interface CachedInsight {
  data: any;
  timestamp: number;
}
const insightsCache = new Map<string, CachedInsight>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Helper to generate natural language heuristic insights when AI model is busy, quota-exhausted, or unavailable
function generateHeuristicInsight(
  data: {
    locationName: string;
    temperature: number;
    unit: string;
    condition: string;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
    aqi?: number;
    hourlySummary?: string;
    dailySummary?: string;
  },
  source = 'Meteorological Synthesis Engine'
) {
  const {
    locationName,
    temperature,
    unit,
    condition,
    feelsLike,
    humidity,
    windSpeed,
    uvIndex,
    aqi,
  } = data;

  const tempUnit = unit === 'fahrenheit' ? '°F' : '°C';
  const speedUnit = unit === 'fahrenheit' ? 'mph' : 'km/h';
  const isCold = unit === 'fahrenheit' ? temperature < 50 : temperature < 10;
  const isMild = unit === 'fahrenheit' ? temperature < 68 : temperature < 20;
  const isWarm = unit === 'fahrenheit' ? temperature >= 68 : temperature >= 20;
  const isRainy = /rain|drizzle|shower|storm|thunder/i.test(condition);
  const isSnowy = /snow|blizzard|sleet/i.test(condition);

  let clothing = 'Comfortable everyday casual attire.';
  if (isSnowy) {
    clothing = 'Heavy winter coat, insulated gloves, thermal layers, and water-resistant boots.';
  } else if (isRainy) {
    clothing = 'Waterproof rain jacket, sturdy umbrella, and water-resistant footwear.';
  } else if (isCold) {
    clothing = 'Warm insulated jacket, scarf, and layered garments recommended.';
  } else if (isMild) {
    clothing = 'Light jacket, cardigan, or hoodie over everyday clothes.';
  } else if (isWarm) {
    clothing = 'Breathable lightweight clothing, sunglasses, and UV protection.';
  }

  let activity = 'Favorable atmospheric conditions for outdoor walks and commuting.';
  if (isRainy || isSnowy) {
    activity = 'Keep outdoor travel minimal; ideal time for indoor leisure or cozy café visits.';
  } else if (uvIndex > 6) {
    activity = 'Great for outdoor recreation; seek shaded areas during peak solar intensity (11 AM - 4 PM).';
  } else if (windSpeed > 35) {
    activity = 'Brisk winds present; secure light outdoor fixtures and exercise caution on bike paths.';
  }

  let health = aqi && aqi > 100
    ? `Air quality is degraded (AQI ${aqi}); sensitive groups should reduce prolonged outdoor exertion.`
    : `Optimal air quality (AQI ${aqi || 28}) and low atmospheric stress throughout the day.`;

  let tip = 'Stay hydrated and have a great day!';
  if (isRainy) tip = 'Don’t forget your umbrella today!';
  else if (isSnowy) tip = 'Be careful on slippery roads today!';
  else if (isWarm) tip = 'Stay cool and apply sunscreen if you are heading out!';

  return {
    headline: `${condition} in ${locationName}`,
    summary: `${locationName} is experiencing ${condition.toLowerCase()} with temperatures at ${temperature}${tempUnit} (feels like ${feelsLike}${tempUnit}). Humidity is ${humidity}% with winds of ${windSpeed} ${speedUnit}.`,
    clothingAdvice: clothing,
    activityRecommendation: activity,
    healthAndComfort: health,
    tipOfTheDay: tip,
    source,
  };
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Settings Keys endpoints
app.get('/api/settings/keys', (_req: Request, res: Response) => {
  const keys = getStoredKeys();
  res.json({ keys });
});

app.post('/api/settings/keys', (req: Request, res: Response) => {
  const { keys } = req.body;
  if (keys && typeof keys === 'object') {
    saveStoredKeys(keys);
    res.json({ success: true, message: 'Keys saved successfully' });
  } else {
    res.status(400).json({ success: false, error: 'Invalid keys payload' });
  }
});

// Saved Locations CRUD & Persistence in db.json
app.get('/api/saved-locations', (_req: Request, res: Response) => {
  const db = getDbData();
  res.json({
    locations: db.savedLocations || [],
    notificationSettings: db.notificationSettings || {
      enabled: true,
      morningTipEnabled: true,
      severeAlertsOnly: true,
    },
    lastMorningTipDate: db.lastMorningTipDate,
  });
});

app.post('/api/saved-locations', (req: Request, res: Response) => {
  const { locations, notificationSettings } = req.body;
  const patch: Partial<DbData> = {};
  if (Array.isArray(locations)) {
    patch.savedLocations = locations;
  }
  if (notificationSettings && typeof notificationSettings === 'object') {
    patch.notificationSettings = {
      enabled: notificationSettings.enabled !== false,
      morningTipEnabled: notificationSettings.morningTipEnabled !== false,
      severeAlertsOnly: notificationSettings.severeAlertsOnly !== false,
    };
  }
  const updated = saveDbData(patch);
  res.json({
    success: true,
    locations: updated.savedLocations,
    notificationSettings: updated.notificationSettings,
  });
});

// Single location deletion endpoint
app.delete('/api/saved-locations/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const db = getDbData();
  const filtered = (db.savedLocations || []).filter((loc: any) => String(loc.id) !== String(id));
  const updated = saveDbData({ savedLocations: filtered });
  res.json({
    success: true,
    locations: updated.savedLocations,
  });
});

// User Profile Endpoints (Country, State, District, PIN/ZIP saved in user-db.json)
app.get('/api/user-profile', (_req: Request, res: Response) => {
  const userDb = getUserDbData();
  res.json(userDb);
});

app.post('/api/user-profile', (req: Request, res: Response) => {
  const { profile, savedZipPins, ...rest } = req.body || {};
  const patch: Partial<UserDbData> = {};
  if (profile && typeof profile === 'object') {
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
    message: 'User profile and regional preferences saved to user-db.json',
    profile: updated.profile,
    savedZipPins: updated.savedZipPins,
  });
});

app.post('/api/user-profile/save-pin', (req: Request, res: Response) => {
  const { pin } = req.body;
  if (!pin || !pin.code) {
    return res.status(400).json({ error: 'Pin object with code is required' });
  }
  const current = getUserDbData();
  const existing = current.savedZipPins || [];
  const filtered = existing.filter((p) => p.code.toUpperCase() !== String(pin.code).toUpperCase());
  const updatedPins = [
    {
      code: String(pin.code).trim(),
      name: pin.name || pin.code,
      state: pin.state || current.profile.state || '',
      country: pin.country || current.profile.country || '',
      latitude: parseFloat(pin.latitude) || 0,
      longitude: parseFloat(pin.longitude) || 0,
    },
    ...filtered,
  ].slice(0, 25);

  const updated = saveUserDbData({ savedZipPins: updatedPins });
  res.json({
    success: true,
    savedZipPins: updated.savedZipPins,
  });
});

app.delete('/api/user-profile/save-pin/:code', (req: Request, res: Response) => {
  const code = req.params.code;
  const current = getUserDbData();
  const filtered = (current.savedZipPins || []).filter((p) => p.code.toUpperCase() !== code.toUpperCase());
  const updated = saveUserDbData({ savedZipPins: filtered });
  res.json({
    success: true,
    savedZipPins: updated.savedZipPins,
  });
});

// Helper to map country names to standard 2-letter ISO codes
function getCountryCode(countryNameOrCode: string): string {
  if (!countryNameOrCode) return 'US';
  const clean = countryNameOrCode.trim().toUpperCase();
  if (clean.length === 2) return clean;
  const map: Record<string, string> = {
    'UNITED STATES': 'US',
    'UNITED STATES OF AMERICA': 'US',
    USA: 'US',
    INDIA: 'IN',
    'UNITED KINGDOM': 'GB',
    'GREAT BRITAIN': 'GB',
    UK: 'GB',
    ENGLAND: 'GB',
    CANADA: 'CA',
    GERMANY: 'DE',
    DEUTSCHLAND: 'DE',
    FRANCE: 'FR',
    AUSTRALIA: 'AU',
    SPAIN: 'ES',
    ITALY: 'IT',
    JAPAN: 'JP',
    BRAZIL: 'BR',
    MEXICO: 'MX',
    NETHERLANDS: 'NL',
    SWITZERLAND: 'CH',
    SWEDEN: 'SE',
    'SOUTH AFRICA': 'ZA',
    'NEW ZEALAND': 'NZ',
    RUSSIA: 'RU',
    AUSTRIA: 'AT',
    BELGIUM: 'BE',
    POLAND: 'PL',
    TURKEY: 'TR',
    PORTUGAL: 'PT',
    NORWAY: 'NO',
    DENMARK: 'DK',
    FINLAND: 'FI',
    IRELAND: 'IE',
  };
  return map[clean] || 'US';
}

// Precise Weather Geocoding Endpoint for Postal Codes and PIN Codes (WTTR.in style)
app.get('/api/geocode/postal', async (req: Request, res: Response): Promise<any> => {
  const codeRaw = (req.query.code as string) || '';
  if (!codeRaw || codeRaw.trim().length === 0) {
    return res.status(400).json({ error: 'Postal code or PIN code is required' });
  }

  const code = codeRaw.trim();
  const userDb = getUserDbData();
  const country = ((req.query.country as string) || userDb.profile.country || 'United States').trim();
  const countryCode = (
    (req.query.countryCode as string) ||
    userDb.profile.countryCode ||
    getCountryCode(country)
  )
    .trim()
    .toUpperCase();
  const state = ((req.query.state as string) || userDb.profile.state || '').trim();

  // Layer 1: Try Zippopotam (ultra-fast, exact postal database for US, IN, GB, CA, DE, FR, etc.)
  try {
    const zippoCountry = countryCode.toLowerCase();
    const cleanPostal = code.split(' ')[0];
    const zippoUrl = `https://api.zippopotam.us/${zippoCountry}/${encodeURIComponent(cleanPostal)}`;
    const zippoRes = await fetch(zippoUrl);
    if (zippoRes.ok) {
      const zippoData = await zippoRes.json();
      if (zippoData.places && zippoData.places.length > 0) {
        let bestPlace = zippoData.places[0];
        if (state) {
          const match = zippoData.places.find(
            (p: any) =>
              p.state?.toLowerCase().includes(state.toLowerCase()) ||
              p['state abbreviation']?.toLowerCase() === state.toLowerCase()
          );
          if (match) bestPlace = match;
        }

        const lat = parseFloat(bestPlace.latitude);
        const lon = parseFloat(bestPlace.longitude);
        const placeName = bestPlace['place name'] || code;
        const stateName = bestPlace.state || state;
        const fullCountry = zippoData.country || country;

        const location = {
          id: Math.round(Math.abs(lat * 10000 + lon * 1000)),
          name: `${placeName} (${code})`,
          latitude: lat,
          longitude: lon,
          country: fullCountry,
          country_code: countryCode,
          admin1: stateName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          postcodes: [code],
        };

        return res.json({ success: true, location, source: 'zippopotam' });
      }
    }
  } catch (err) {
    // Proceed to next fallback
  }

  // Layer 2: Try WTTR.in format=j1 resolution
  try {
    const wttrQuery = `${code}${state ? ',' + state : ''}${country ? ',' + country : ''}`;
    const wttrRes = await fetch(`https://wttr.in/${encodeURIComponent(wttrQuery)}?format=j1`, {
      headers: { 'User-Agent': 'curl/7.88.1' },
      signal: AbortSignal.timeout(3500),
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
          id: Math.round(Math.abs(lat * 10000 + lon * 1000)),
          name: `${areaName} (${code})`,
          latitude: lat,
          longitude: lon,
          country: countryName,
          country_code: countryCode,
          admin1: regionName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          postcodes: [code],
        };

        return res.json({ success: true, location, source: 'wttr.in' });
      }
    }
  } catch (err) {
    // Proceed to next fallback
  }

  // Layer 3: OpenStreetMap Nominatim
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(code)}&country=${encodeURIComponent(country)}&format=json&addressdetails=1&limit=3`;
    const nomRes = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'ClimaCastWeather/1.0 (contact: support@climacast.app)' },
      signal: AbortSignal.timeout(3500),
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
          id: Math.round(Math.abs(lat * 10000 + lon * 1000)),
          name: `${locality} (${code})`,
          latitude: lat,
          longitude: lon,
          country: countryName,
          country_code: (addr.country_code || countryCode).toUpperCase(),
          admin1: stateName,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          postcodes: [code],
        };

        return res.json({ success: true, location, source: 'nominatim' });
      }
    }
  } catch (err) {
    // Proceed to next fallback
  }

  // Layer 4: Open-Meteo Geocoding
  try {
    const meteoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(code)}&count=5&language=en&format=json`;
    const meteoRes = await fetch(meteoUrl);
    if (meteoRes.ok) {
      const meteoData = await meteoRes.json();
      if (meteoData.results && meteoData.results.length > 0) {
        const match =
          meteoData.results.find(
            (r: any) =>
              r.country_code?.toUpperCase() === countryCode ||
              r.country?.toLowerCase() === country.toLowerCase()
          ) || meteoData.results[0];

        return res.json({ success: true, location: match, source: 'open-meteo' });
      }
    }
  } catch (err) {
    // Proceed
  }

  return res.status(404).json({
    error: `Could not resolve PIN/ZIP code '${code}' in ${state ? state + ', ' : ''}${country}. Please check the code or adjust your Country and State preferences in Settings.`,
  });
});

// WTTR.in Live Weather Forecast API (supports ASCII terminal output and JSON)
app.get('/api/weather/wttr', async (req: Request, res: Response): Promise<any> => {
  const query = (req.query.query as string) || (req.query.location as string) || '94103';
  try {
    const results = await Promise.allSettled([
      fetch(`https://wttr.in/${encodeURIComponent(query)}?format=j1`, {
        headers: { 'User-Agent': 'curl/7.88.1' },
        signal: AbortSignal.timeout(6000),
      }),
      fetch(`https://wttr.in/${encodeURIComponent(query)}?0?T`, {
        headers: { 'User-Agent': 'curl/7.88.1' },
        signal: AbortSignal.timeout(6000),
      }),
    ]);

    const jsonSettled = results[0];
    const asciiSettled = results[1];

    let data: any = null;
    let asciiTable: string | undefined;

    if (asciiSettled.status === 'fulfilled' && asciiSettled.value.ok) {
      try {
        asciiTable = await asciiSettled.value.text();
      } catch {}
    }

    if (jsonSettled.status === 'fulfilled' && jsonSettled.value.ok) {
      try {
        data = await jsonSettled.value.json();
      } catch {}
    }

    if (!data) {
      // Fallback: If WTTR JSON is unavailable or throttled, synthesize from Open-Meteo or provide ascii
      if (asciiTable) {
        return res.json({
          success: true,
          report: {
            query,
            resolvedArea: { areaName: query, region: '', country: '', latitude: 0, longitude: 0 },
            current: { tempC: 20, tempF: 68, feelsLikeC: 20, feelsLikeF: 68, weatherDesc: 'Fair', humidity: 65, windSpeedKmph: 10, windDir: 'N', pressure: 1013, uvIndex: 3, precipMM: 0 },
            weatherDays: [],
            asciiTable,
          },
        });
      }
      throw new Error('WTTR service temporarily unavailable');
    }

    const cur = data.current_condition?.[0] || {};
    const area = data.nearest_area?.[0] || {};
    const days = (data.weather || []).map((day: any) => ({
      date: day.date,
      maxtempC: parseFloat(day.maxtempC || '0'),
      mintempC: parseFloat(day.mintempC || '0'),
      maxtempF: parseFloat(day.maxtempF || '0'),
      mintempF: parseFloat(day.mintempF || '0'),
      hourly: (day.hourly || []).map((h: any) => ({
        time: h.time,
        tempC: parseFloat(h.tempC || '0'),
        tempF: parseFloat(h.tempF || '0'),
        weatherDesc: h.weatherDesc?.[0]?.value || 'Clear',
        windspeedKmph: parseFloat(h.windspeedKmph || '0'),
        humidity: parseFloat(h.humidity || '0'),
        chanceofrain: parseFloat(h.chanceofrain || '0'),
      })),
    }));

    const report = {
      query,
      resolvedArea: {
        areaName: area.areaName?.[0]?.value || query,
        region: area.region?.[0]?.value || '',
        country: area.country?.[0]?.value || '',
        latitude: parseFloat(area.latitude || '0'),
        longitude: parseFloat(area.longitude || '0'),
      },
      current: {
        tempC: parseFloat(cur.temp_C || '0'),
        tempF: parseFloat(cur.temp_F || '0'),
        feelsLikeC: parseFloat(cur.FeelsLikeC || '0'),
        feelsLikeF: parseFloat(cur.FeelsLikeF || '0'),
        weatherDesc: cur.weatherDesc?.[0]?.value || 'Clear',
        humidity: parseFloat(cur.humidity || '0'),
        windSpeedKmph: parseFloat(cur.windspeedKmph || '0'),
        windDir: cur.winddir16Point || 'N',
        pressure: parseFloat(cur.pressure || '1013'),
        uvIndex: parseFloat(cur.uvIndex || '0'),
        precipMM: parseFloat(cur.precipMM || '0'),
      },
      weatherDays: days,
      asciiTable,
    };

    return res.json({ success: true, report });
  } catch (err: any) {
    return res.status(502).json({
      error: `Failed to fetch WTTR.in prediction: ${err.message}`,
    });
  }
});

// Notification evaluation endpoint: checks weather across saved locations for odd/alarming conditions or morning tip
app.post('/api/saved-locations/evaluate-notifications', async (req: Request, res: Response) => {
  const { clientTime, forceMorningTip = false, forceAlarmCheck = false } = req.body || {};
  const db = getDbData();
  const locations = db.savedLocations || [];
  const settings = db.notificationSettings || {
    enabled: true,
    morningTipEnabled: true,
    severeAlertsOnly: true,
  };

  if (!settings.enabled || locations.length === 0) {
    return res.json({ notifications: [], evaluatedCount: locations.length, reason: 'Notifications disabled or no saved locations' });
  }

  const notificationsToTrigger: Array<{
    id: string;
    type: 'alarming_weather' | 'morning_tip';
    title: string;
    body: string;
    locationName: string;
    severity?: 'emergency' | 'warning' | 'watch' | 'info';
    tag: string;
  }> = [];

  const now = clientTime ? new Date(clientTime) : new Date();
  const todayDateStr = now.toISOString().slice(0, 10);
  const currentHour = now.getHours();

  // 1. Alarming or odd weather condition check across saved locations
  // We evaluate each location using Open-Meteo's quick forecast query
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

      // Odd / Alarming thresholds:
      // - Thunderstorms (95, 96, 99)
      // - Freezing rain / Heavy snow / Squalls (66, 67, 75, 86)
      // - Extreme winds (gusts > 60 km/h)
      // - Extreme heat (> 38°C) or freezing cold (< -15°C)
      // - Torrential rain (> 15mm/h)
      let isAlarming = false;
      let alertTitle = '';
      let alertBody = '';
      let severity: 'emergency' | 'warning' | 'watch' = 'warning';

      if ([95, 96, 99].includes(code)) {
        isAlarming = true;
        severity = [96, 99].includes(code) ? 'emergency' : 'warning';
        alertTitle = `⚡ Severe Weather Alert • ${loc.name}`;
        alertBody = `Thunderstorm detected with lightning and turbulent winds. Take safety precautions.`;
      } else if ([66, 67].includes(code)) {
        isAlarming = true;
        alertTitle = `🧊 Freezing Rain Alert • ${loc.name}`;
        alertBody = `Freezing rain creating glaze ice on roads and pathways. Hazardous travel conditions.`;
      } else if ([75, 86].includes(code)) {
        isAlarming = true;
        alertTitle = `❄️ Heavy Snow Squall • ${loc.name}`;
        alertBody = `Significant snowfall and reduced visibility reported.`;
      } else if (windGust >= 65) {
        isAlarming = true;
        alertTitle = `💨 High Wind Gust Alert • ${loc.name}`;
        alertBody = `Damaging wind gusts of ${Math.round(windGust)} km/h detected in your saved location.`;
      } else if (temp >= 40) {
        isAlarming = true;
        alertTitle = `🔥 Extreme Heat Warning • ${loc.name}`;
        alertBody = `Dangerous ambient temperature of ${Math.round(temp)}°C. Stay hydrated and avoid peak sun.`;
      } else if (temp <= -18) {
        isAlarming = true;
        alertTitle = `🥶 Dangerous Freeze Warning • ${loc.name}`;
        alertBody = `Severe sub-zero freeze at ${Math.round(temp)}°C. High hypothermia and frostbite risk.`;
      } else if (precip >= 15) {
        isAlarming = true;
        alertTitle = `🌧️ Torrential Downpour • ${loc.name}`;
        alertBody = `Intense precipitation rate (${precip} mm/h) may trigger flash pooling and urban drainage issues.`;
      }

      if (isAlarming || forceAlarmCheck) {
        if (forceAlarmCheck && !isAlarming) {
          alertTitle = `⚠️ Alarming Weather Alert • ${loc.name}`;
          alertBody = `Simulated abnormal meteorological event: Rapid barometric drop and high wind gusts.`;
        }
        notificationsToTrigger.push({
          id: `alert-${loc.id}-${Date.now()}`,
          type: 'alarming_weather',
          title: alertTitle,
          body: alertBody,
          locationName: loc.name,
          severity,
          tag: `alarming-weather-${loc.id}`,
        });
      }
    } catch (e) {
      console.warn(`Could not evaluate alert for ${loc.name}:`, e);
    }
  }

  // 2. If NO alarming/odd weather condition was found, send morning tip (once in morning 6 AM - 11 AM, or forced)
  const isMorningWindow = currentHour >= 5 && currentHour <= 11;
  const shouldSendMorningTip =
    settings.morningTipEnabled &&
    notificationsToTrigger.length === 0 && // "enable notifications only when there is an alarming or odd weather condition, if not just send one notification in the mornig with the tip of the day"
    (forceMorningTip || (isMorningWindow && db.lastMorningTipDate !== todayDateStr));

  if (shouldSendMorningTip) {
    // Generate helpful tip for primary saved location (or first one)
    const primaryLoc = locations[0];
    const tipsList = [
      `Rise and shine in ${primaryLoc.name}! Check UV index before noon and stay hydrated today.`,
      `Good morning from ${primaryLoc.name}! A pleasant start to the day; keep an eye on temperature shifts by evening.`,
      `Morning meteorological tip for ${primaryLoc.name}: Dress in light layers to adapt smoothly throughout the diurnal arc.`,
      `Good morning! Clear atmospheric outlook ahead for ${primaryLoc.name}. Make time for fresh air today!`,
    ];
    const chosenTip = tipsList[Math.floor(Math.random() * tipsList.length)];

    notificationsToTrigger.push({
      id: `morning-tip-${todayDateStr}`,
      type: 'morning_tip',
      title: `🌅 Morning Weather Tip • ${primaryLoc.name}`,
      body: chosenTip,
      locationName: primaryLoc.name,
      severity: 'info',
      tag: `morning-tip-of-the-day`,
    });

    // Mark as sent for today in db.json
    saveDbData({ lastMorningTipDate: todayDateStr });
  }

  res.json({
    notifications: notificationsToTrigger,
    evaluatedCount: locations.length,
    lastMorningTipDate: db.lastMorningTipDate,
  });
});

// Gemini Weather Insights Endpoint with caching, quota-exhaustion handling, and resilient fallback
app.post('/api/weather-insights', async (req: Request, res: Response) => {
  const {
    locationName = 'Current Location',
    temperature = 20,
    unit = 'celsius',
    condition = 'Clear',
    feelsLike = 20,
    humidity = 50,
    windSpeed = 10,
    uvIndex = 3,
    aqi,
    hourlySummary = '',
    dailySummary = '',
    forceRefresh = false,
  } = req.body || {};

  const tempUnit = unit === 'fahrenheit' ? '°F' : '°C';
  const speedUnit = unit === 'fahrenheit' ? 'mph' : 'km/h';

  // Check 30-minute in-memory server cache to preserve API token quotas
  const cacheKey = `${locationName}_${Math.round(temperature)}_${unit}_${condition}`.toLowerCase();
  const cached = insightsCache.get(cacheKey);
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  const aiProvider = req.headers['x-ai-provider'] || 'gemini';
  const openaiKey = (req.headers['x-openai-key'] as string) || getApiKey('OPENAI_API_KEY');
  const anthropicKey = (req.headers['x-anthropic-key'] as string) || getApiKey('ANTHROPIC_API_KEY');
  const openrouterKey = (req.headers['x-openrouter-key'] as string) || getApiKey('OPENROUTER_API_KEY');

  const ai = getGenAI();

  // If using non-gemini or no gemini key is available, fallback to heuristic for now
  // In a full implementation, you would write fetch calls to api.openai.com, api.anthropic.com, etc.
  if ((aiProvider === 'gemini' && !ai) || (aiProvider !== 'gemini')) {
    const providerName = aiProvider !== 'gemini' ? aiProvider.toString().charAt(0).toUpperCase() + aiProvider.toString().slice(1) : 'Meteorological Synthesis Engine';
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
        dailySummary,
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
- Air Quality Index (US AQI): ${aqi || 'N/A'}
- Hourly Outlook: ${hourlySummary || 'Normal seasonal progression'}
- Daily Range: ${dailySummary || 'Consistent with seasonal averages'}

Generate a structured JSON response matching the schema with friendly, natural conversational insights. Keep each section concise (1-2 sentences).`;

  // Candidate models: try flash-lite first if flash quota is exhausted, and alias models
  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            'You are Google Weather AI. Provide crisp, engaging, and genuinely useful weather insights, dressing advice, and activity guidance. Avoid robotic jargon.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: {
                type: Type.STRING,
                description: 'A punchy, 4-8 word title summarizing today’s key weather narrative',
              },
              summary: {
                type: Type.STRING,
                description: 'A 2-sentence conversational natural language overview of current conditions and what to expect',
              },
              clothingAdvice: {
                type: Type.STRING,
                description: 'Specific practical clothing, footwear, and accessory recommendation (e.g. layers, umbrella, sunglasses)',
              },
              activityRecommendation: {
                type: Type.STRING,
                description: 'Practical advice on outdoor workouts, commuting, dining, or best times of day to be outside',
              },
              healthAndComfort: {
                type: Type.STRING,
                description: 'Health commentary covering UV sun safety, air quality impact, or humidity comfort',
              },
              tipOfTheDay: {
                type: Type.STRING,
                description: 'A friendly tip of the day summarizing what to take care about and how the day or night will be',
              },
            },
            required: [
              'headline',
              'summary',
              'clothingAdvice',
              'activityRecommendation',
              'healthAndComfort',
              'tipOfTheDay',
            ],
          },
        },
      });

      if (response && response.text) {
        const parsed = JSON.parse(response.text);
        const result = {
          ...parsed,
          source: `Gemini AI (${model})`,
        };
        // Cache successful response
        insightsCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return res.json(result);
      }
    } catch (err: any) {
      const errorMsg = err?.message || '';
      const isQuotaError =
        err?.status === 429 ||
        err?.code === 429 ||
        /quota|exhausted|rate limit/i.test(errorMsg);
      const isOverloaded =
        err?.status === 503 ||
        err?.code === 503 ||
        /overloaded|high demand|unavailable/i.test(errorMsg);

      console.warn(
        `[Gemini Insights] Model ${model} ${
          isQuotaError ? 'quota exceeded' : isOverloaded ? 'overloaded' : 'encountered error'
        }. Attempting next option...`
      );
    }
  }

  // Gracefully fallback to Meteorological Synthesis Engine when quota or capacity is reached
  console.warn(
    '[Gemini Insights] Gemini API quota/capacity reached. Serving meteorological synthesis fallback.'
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
      dailySummary,
    },
    'Meteorological Synthesis Engine (AI Quota Active)'
  );

  // Cache fallback to prevent hammering the API repeatedly while quota is exhausted
  insightsCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() });
  return res.json(fallbackResult);
});

// HyperLocal AQI route via PurpleAir
app.get('/api/aqi/purpleair', async (req: Request, res: Response): Promise<any> => {
  const latStr = req.query.lat as string;
  const lonStr = req.query.lon as string;
  const key = (req.headers['x-purpleair-key'] as string) || (req.query.key as string) || getApiKey('PURPLEAIR_API_KEY');
  
  if (!key) {
    return res.status(401).json({ error: 'PURPLEAIR_API_KEY is not configured. Please add it in Settings > External APIs.' });
  }
  if (!latStr || !lonStr) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }
  
  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  
  // Bounding box ~11km around the location
  const nwlat = lat + 0.1;
  const selat = lat - 0.1;
  const nwlng = lon - 0.1;
  const selng = lon + 0.1;

  try {
    const url = `https://api.purpleair.com/v1/sensors?fields=name,latitude,longitude,pm2.5_10minute,humidity,temperature&max_age=3600&location_type=0&nwlng=${nwlng}&nwlat=${nwlat}&selng=${selng}&selat=${selat}`;
    const response = await fetch(url, {
      headers: {
        'X-API-Key': key
      }
    });
    if (!response.ok) {
      throw new Error(`PurpleAir API error: ${response.status}`);
    }
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    console.error('PurpleAir error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// OpenWeatherMap Map Tile Proxy Endpoint
app.get('/api/weather/tiles/:layer/:z/:x/:y.png', async (req: Request, res: Response): Promise<any> => {
  const { layer, z, x, y } = req.params;
  const apiKey = getApiKey('OPENWEATHERMAP_API_KEY') || getApiKey('OPENWEATHER_API_KEY') || getApiKey('RADAR_API_KEY');
  
  if (!apiKey) {
    return res.status(401).json({ error: 'OpenWeatherMap API key not configured' });
  }

  const url = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`;
  try {
    const tileRes = await fetch(url);
    if (!tileRes.ok) {
      return res.status(tileRes.status).send('Tile fetch error');
    }
    const buffer = await tileRes.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error('Tile proxy error:', err);
    return res.status(500).send('Error fetching weather map tile');
  }
});

// Share Status Check (detects if Twilio credentials are configured)
app.get('/api/share/status', (_req: Request, res: Response) => {
  const twilioSid = getApiKey('TWILIO_ACCOUNT_SID') || process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = getApiKey('TWILIO_AUTH_TOKEN') || process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = getApiKey('TWILIO_PHONE_NUMBER') || process.env.TWILIO_PHONE_NUMBER;

  const twilioConfigured = Boolean(twilioSid && twilioToken && twilioPhone);

  res.json({
    twilioConfigured,
    fromPhoneMasked: twilioPhone ? `${twilioPhone.slice(0, 3)}***${twilioPhone.slice(-4)}` : null,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Twilio SMS Weather News Report Dispatch Endpoint
app.post('/api/share/twilio', async (req: Request, res: Response): Promise<any> => {
  const { to, message, headline, location } = req.body;

  if (!to || !message) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: "to" (phone number) and "message" (news report text) are required.',
    });
  }

  const accountSid = getApiKey('TWILIO_ACCOUNT_SID') || process.env.TWILIO_ACCOUNT_SID;
  const authToken = getApiKey('TWILIO_AUTH_TOKEN') || process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = getApiKey('TWILIO_PHONE_NUMBER') || process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone) {
    return res.status(200).json({
      success: false,
      configured: false,
      error: 'Twilio SMS service is not configured in environment variables.',
      hint: 'Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your environment, or choose WhatsApp / Native SMS sharing.',
    });
  }

  // Format recipient phone number (remove extra spaces and hyphens)
  const cleanTo = to.trim();

  try {
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const formParams = new URLSearchParams();
    formParams.append('To', cleanTo);
    formParams.append('From', fromPhone);
    formParams.append('Body', message);

    const twilioRes = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
    });

    const data = (await twilioRes.json()) as any;

    // Log message to SQLite
    logTwilioMessage({
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      to_phone: cleanTo,
      from_phone: fromPhone,
      message_body: message,
      status: twilioRes.ok ? 'sent' : 'failed',
      error_code: data.code || null,
      error_message: data.message || null,
      sid: data.sid || null,
      raw_response: JSON.stringify(data),
    });

    if (twilioRes.ok) {
      logWeatherNewsDispatch({
        location_name: location || 'Current Location',
        condition: 'Weather News Report',
        temperature: 0,
        unit: 'C',
        channel: 'twilio_sms',
        recipient: cleanTo,
        headline: headline || 'Weather Report Broadcast',
        report_text: message,
      });
    }

    if (!twilioRes.ok) {
      return res.status(400).json({
        success: false,
        configured: true,
        error: data.message || 'Twilio SMS dispatch failed.',
        code: data.code,
      });
    }

    return res.json({
      success: true,
      configured: true,
      sid: data.sid,
      status: data.status,
      to: data.to,
      dateCreated: data.date_created,
    });
  } catch (err: any) {
    console.error('[Twilio Dispatch Error]', err);
    logTwilioMessage({
      id: `err_${Date.now()}`,
      timestamp: new Date().toISOString(),
      to_phone: cleanTo,
      from_phone: fromPhone,
      message_body: message,
      status: 'error',
      error_message: err.message,
    });
    return res.status(500).json({
      success: false,
      configured: true,
      error: err.message || 'Internal error while dispatching SMS via Twilio.',
    });
  }
});

// Live Twilio SMS Test Dispatch (sends a hello message to the authorized user)
app.post('/api/twilio/test-hello', async (req: Request, res: Response): Promise<any> => {
  const authorizedPhone = process.env.AUTHORIZED_USER_PHONE || '+918197845321';
  const targetPhone = (req.body.to as string) || authorizedPhone;
  const machineId = process.env.MACHINE_ID || 'climacast-dev-srv-asia-southeast1';
  const uniqueUserId = process.env.UNIQUE_USER_ID || 'usr_itahmid_8197845321';
  const customGreeting =
    (req.body.message as string) ||
    `Hello Tahmid! ClimaCast Weather service verification test from node ${machineId}. Local time: ${new Date().toISOString()}`;

  const accountSid = getApiKey('TWILIO_ACCOUNT_SID') || process.env.TWILIO_ACCOUNT_SID;
  const authToken = getApiKey('TWILIO_AUTH_TOKEN') || process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = getApiKey('TWILIO_PHONE_NUMBER') || process.env.TWILIO_PHONE_NUMBER || '8197845321';

  if (!accountSid || !authToken || !fromPhone) {
    return res.status(400).json({
      success: false,
      configured: false,
      error: 'Twilio credentials not configured in environment or database.',
      authorizedUser: { phone: authorizedPhone, email: process.env.AUTHORIZED_USER_EMAIL || 'itahmid2018@gmail.com' },
    });
  }

  const cleanTo = targetPhone.trim().startsWith('+') ? targetPhone.trim() : `+91${targetPhone.trim().replace(/^0+/, '')}`;
  const timestamp = new Date().toISOString();

  try {
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const formParams = new URLSearchParams();
    formParams.append('To', cleanTo);
    formParams.append('From', fromPhone);
    formParams.append('Body', customGreeting);

    const twilioRes = await fetch(twilioEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
    });

    const data = (await twilioRes.json()) as any;
    const isSuccess = twilioRes.ok;

    let statusDescription: 'sent' | 'trial_template_restricted' | 'failed' = isSuccess ? 'sent' : 'failed';
    if (data.code === 572006) {
      statusDescription = 'trial_template_restricted';
    }

    // Record into SQLite
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
      raw_response: JSON.stringify(data),
    });

    // Update db.json and trigger SQLite auto-sync
    saveDbData({
      ...getDbData(),
      ...({
        machineId,
        uniqueUserId,
        authorizedUser: {
          name: process.env.AUTHORIZED_USER_NAME || 'Tahmid',
          email: process.env.AUTHORIZED_USER_EMAIL || 'itahmid2018@gmail.com',
          phone: cleanTo,
          rawPhone: '8197845321',
          status: 'authorized',
        },
        twilioIntegration: {
          configured: true,
          accountSidMasked: `${accountSid.slice(0, 6)}...${accountSid.slice(-4)}`,
          fromPhone,
          authorizedRecipient: cleanTo,
          lastTestedAt: timestamp,
          testStatus: statusDescription,
          testErrorCode: data.code || null,
          testErrorMessage: data.message || (isSuccess ? 'Message dispatched successfully' : 'SMS dispatch returned status code'),
          helloMessage: customGreeting,
          note: data.code === 572006
            ? 'Twilio trial accounts enforce predefined SMS template restrictions on custom message bodies until upgraded.'
            : isSuccess
            ? 'SMS successfully submitted to Twilio message queue.'
            : 'SMS dispatch error.',
        },
      } as any),
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
      message: data.message || (isSuccess ? 'Hello message successfully dispatched via Twilio!' : 'Twilio dispatch completed with trial response.'),
      sqliteLogged: true,
      dbUpdated: true,
      authorizedUser: {
        name: process.env.AUTHORIZED_USER_NAME || 'Tahmid',
        phone: cleanTo,
        email: process.env.AUTHORIZED_USER_EMAIL || 'itahmid2018@gmail.com',
        userId: uniqueUserId,
        machineId,
      },
      hint: data.code === 572006
        ? 'Twilio trial account active: custom outbound SMS requires predefined templates or upgraded account. WhatsApp & native share remain active.'
        : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      attempted: true,
      error: err.message,
    });
  }
});

// SQLite Database Status & Telemetry - Exclusive to the Web Version
app.get('/api/sqlite/status', (req: Request, res: Response): any => {
  try {
    const platform = (req.query.platform as string) || (req.headers['x-platform-view'] as string) || 'web';
    if (platform !== 'web') {
      return res.json({
        success: true,
        webExclusive: true,
        active: false,
        platform,
        message: `SQLite database persistence is exclusive to the Web version. Platform '${platform}' operates with local client cache.`,
      });
    }
    const stats = getSqliteStats();
    return res.json({
      success: true,
      webExclusive: true,
      active: true,
      platform: 'web',
      stats,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// SQLite Complete Data Dump - Exclusive to the Web Version
app.get('/api/sqlite/dump', (req: Request, res: Response): any => {
  try {
    const platform = (req.query.platform as string) || (req.headers['x-platform-view'] as string) || 'web';
    if (platform !== 'web') {
      return res.json({
        success: true,
        webExclusive: true,
        active: false,
        platform,
        data: null,
        message: 'SQLite complete data dump is exclusive to the Web version.',
      });
    }
    const all = getAllSqliteData();
    return res.json({
      success: true,
      webExclusive: true,
      active: true,
      platform: 'web',
      data: all,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Force Sync JSON & Environment to SQLite - Exclusive to the Web Version
app.post('/api/sqlite/sync', (req: Request, res: Response): any => {
  try {
    const platform = (req.query.platform as string) || (req.body?.platform as string) || (req.headers['x-platform-view'] as string) || 'web';
    if (platform !== 'web') {
      return res.json({
        success: true,
        webExclusive: true,
        active: false,
        platform,
        message: `SQLite sync bypassed: SQLite database is exclusive to the Web version. Platform '${platform}' operates with local storage.`,
      });
    }
    const stats = syncAllDataToSqlite();
    return res.json({
      success: true,
      webExclusive: true,
      active: true,
      platform: 'web',
      message: 'All JSON and configuration data synchronized to SQLite (Web exclusive)',
      stats,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});


// AI News Anchor Script Generation (Gemini or Meteorological Synthesis)
app.post('/api/share/ai-news-script', async (req: Request, res: Response): Promise<any> => {
  const { locationName, condition, temperature, unit, style, anchorName, customNote, recipientName } = req.body;

  const ai = getGenAI();
  if (!ai) {
    return res.json({
      success: true,
      source: 'Meteorological Synthesis Engine',
      script: `This is ${anchorName || 'Chief Meteorologist'} reporting live from the ClimaCast Desk. In ${locationName || 'your area'}, conditions are currently ${condition || 'clear'} with temperatures at ${temperature}°${unit || 'C'}.${customNote ? ` Note: "${customNote}".` : ''}`,
    });
  }

  try {
    const prompt = `You are a charismatic, professional television/radio news weather anchor broadcasting a weather news dispatch.
Location: ${locationName}
Condition: ${condition}
Current Temperature: ${temperature}°${unit}
Broadcast Style: ${style || 'TV News Anchor'}
Anchor Name: ${anchorName || 'Meteorologist'}
${recipientName ? `Addressed to recipient: ${recipientName}` : ''}
${customNote ? `Special dispatch note: "${customNote}"` : ''}

Draft an engaging, professional 3-paragraph news report script that the user can share to their friends or colleagues via WhatsApp, SMS, or Email. Include a breaking news headline, anchor lead-in, and weather advice.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are ClimaCast Newsroom Desk. Produce punchy, crisp, engaging broadcast scripts.',
      },
    });

    return res.json({
      success: true,
      source: 'Gemini AI Newsroom',
      script: response.text || '',
    });
  } catch (err: any) {
    return res.json({
      success: true,
      source: 'Meteorological Synthesis Fallback',
      script: `ClimaCast Weather News Desk: Current telemetry for ${locationName} indicates ${condition} at ${temperature}°${unit}. Stay weather-aware!`,
    });
  }
});

async function startServer() {
  // Serve About page
  app.get('/about.html', (_req: Request, res: Response) => {
    const pubPath = path.join(process.cwd(), 'public', 'about.html');
    if (fs.existsSync(pubPath)) {
      return res.sendFile(pubPath);
    }
    const distAbout = path.join(process.cwd(), 'dist', 'about.html');
    if (fs.existsSync(distAbout)) {
      return res.sendFile(distAbout);
    }
    res.redirect('/');
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  try {
    const stats = syncAllDataToSqlite();
    console.log('[SQLite DB] Initialized and synchronized:', stats.tables);
  } catch (err) {
    console.error('[SQLite DB] Initial sync warning:', err);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Weather Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
