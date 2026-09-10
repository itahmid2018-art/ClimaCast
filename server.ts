/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini instance
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
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

  return {
    headline: `${condition} in ${locationName}`,
    summary: `${locationName} is experiencing ${condition.toLowerCase()} with temperatures at ${temperature}${tempUnit} (feels like ${feelsLike}${tempUnit}). Humidity is ${humidity}% with winds of ${windSpeed} ${speedUnit}.`,
    clothingAdvice: clothing,
    activityRecommendation: activity,
    healthAndComfort: health,
    source,
  };
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
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

  const ai = getGenAI();

  // If GEMINI_API_KEY is not configured, immediately return heuristic insight
  if (!ai) {
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
      'Meteorological Synthesis Engine (API key not set)'
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
            },
            required: [
              'headline',
              'summary',
              'clothingAdvice',
              'activityRecommendation',
              'healthAndComfort',
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
  const key = process.env.PURPLEAIR_API_KEY;
  
  if (!key) {
    return res.status(500).json({ error: 'PURPLEAIR_API_KEY is not configured.' });
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

async function startServer() {
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Weather Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
