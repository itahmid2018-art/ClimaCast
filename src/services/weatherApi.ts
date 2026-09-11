/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AirQualityData,
  CurrentWeatherData,
  DailyForecastItem,
  GeoLocation,
  HourlyForecastItem,
  ProcessedWeather,
  TemperatureUnit,
  WeatherUnits,
} from '../types';
import { evaluateAQI } from '../utils/weatherCodes';
import { detectWeatherAlerts } from '../utils/alertDetector';

const FORECAST_API = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const AIR_QUALITY_API = 'https://air-quality-api.open-meteo.com/v1/air-quality';

export async function searchLocations(query: string): Promise<GeoLocation[]> {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `${GEOCODING_API}?name=${encodeURIComponent(query.trim())}&count=8&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding HTTP error: ${res.status}`);
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error('Failed to search locations:', error);
    return [];
  }
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeoLocation> {
  // Approximate reverse geocode using nearest major city or fallback coordinates
  try {
    // Open-Meteo doesn't have a direct reverse geocode, but we can search or create standard GeoLocation
    const res = await fetch(`${GEOCODING_API}?name=${lat.toFixed(2)},${lon.toFixed(2)}&count=1&language=en&format=json`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results[0];
      }
    }
  } catch {
    // ignore
  }

  // Fallback location representation
  return {
    id: Math.round(lat * 1000 + lon),
    name: 'Current Location',
    latitude: lat,
    longitude: lon,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  };
}

export async function fetchAirQuality(lat: number, lon: number): Promise<AirQualityData | undefined> {
  try {
    const url = `${AIR_QUALITY_API}?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const data = await res.json();
    const cur = data.current;
    if (!cur) return undefined;

    const aqi = Math.round(cur.us_aqi ?? 28);
    const evalData = evaluateAQI(aqi);

    return {
      aqiUs: aqi,
      pm2_5: Math.round(cur.pm2_5 ?? 0),
      pm10: Math.round(cur.pm10 ?? 0),
      nitrogenDioxide: Math.round(cur.nitrogen_dioxide ?? 0),
      ozone: Math.round(cur.ozone ?? 0),
      sulphurDioxide: Math.round(cur.sulphur_dioxide ?? 0),
      carbonMonoxide: Math.round(cur.carbon_monoxide ?? 0),
      qualityLevel: evalData.level,
      qualityColor: evalData.color,
      advice: evalData.advice,
    };
  } catch (e) {
    console.warn('Air quality unavailable:', e);
    return undefined;
  }
}

export async function fetchWeather(
  location: GeoLocation,
  units: WeatherUnits = { temperature: 'celsius', windSpeed: 'kmh', precipitation: 'mm' }
): Promise<ProcessedWeather> {
  const params = new URLSearchParams({
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'surface_pressure',
      'visibility',
      'wind_speed_10m',
      'wind_direction_10m',
      'uv_index',
      'is_day',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant',
    ].join(','),
    temperature_unit: units.temperature,
    wind_speed_unit: units.windSpeed,
    precipitation_unit: units.precipitation,
    timezone: location.timezone || 'auto',
  });

  const [forecastRes, airQuality] = await Promise.all([
    fetch(`${FORECAST_API}?${params.toString()}`),
    fetchAirQuality(location.latitude, location.longitude),
  ]);

  if (!forecastRes.ok) {
    throw new Error(`Open-Meteo forecast failed with status ${forecastRes.status}`);
  }

  const raw = await forecastRes.json();

  // Process current
  const rawCurrent = raw.current;
  const current: CurrentWeatherData = {
    time: rawCurrent.time,
    temperature: Math.round(rawCurrent.temperature_2m * 10) / 10,
    apparentTemperature: Math.round(rawCurrent.apparent_temperature * 10) / 10,
    isDay: rawCurrent.is_day === 1,
    weatherCode: rawCurrent.weather_code,
    relativeHumidity: Math.round(rawCurrent.relative_humidity_2m),
    windSpeed: Math.round(rawCurrent.wind_speed_10m),
    windDirection: Math.round(rawCurrent.wind_direction_10m),
    windGusts: Math.round(rawCurrent.wind_gusts_10m || rawCurrent.wind_speed_10m),
    surfacePressure: Math.round(rawCurrent.surface_pressure),
    precipitation: rawCurrent.precipitation,
    cloudCover: 0,
    uvIndex: 0,
  };

  // Find current hourly index to attach uvIndex and visibility to current
  const rawHourly = raw.hourly;
  const now = new Date();
  let currentHourIdx = 0;

  if (rawHourly && rawHourly.time) {
    const currentIsoPrefix = rawCurrent.time ? rawCurrent.time.slice(0, 13) : '';
    const foundIdx = rawHourly.time.findIndex((t: string) => t.startsWith(currentIsoPrefix));
    if (foundIdx >= 0) {
      currentHourIdx = foundIdx;
      current.uvIndex = rawHourly.uv_index ? Math.round(rawHourly.uv_index[foundIdx] * 10) / 10 : 0;
      current.visibility = rawHourly.visibility ? Math.round(rawHourly.visibility[foundIdx] / 1000) : 10;
    }
  }

  // Process hourly (next 24-48 hours starting from now)
  const hourly: HourlyForecastItem[] = [];
  if (rawHourly && rawHourly.time) {
    const startIdx = Math.max(0, currentHourIdx);
    const endIdx = Math.min(rawHourly.time.length, startIdx + 36);

    for (let i = startIdx; i < endIdx; i++) {
      const timeStr = rawHourly.time[i];
      const itemDate = new Date(timeStr);
      const hourNumber = itemDate.getHours();
      const isNow = i === startIdx;
      const formattedHour = isNow
        ? 'Now'
        : itemDate.toLocaleTimeString([], { hour: 'numeric', hour12: true });

      hourly.push({
        time: timeStr,
        timestamp: itemDate.getTime(),
        formattedHour,
        temperature: Math.round(rawHourly.temperature_2m[i]),
        apparentTemperature: Math.round(rawHourly.apparent_temperature[i]),
        weatherCode: rawHourly.weather_code[i],
        precipitationProbability: Math.round(rawHourly.precipitation_probability[i] || 0),
        precipitation: rawHourly.precipitation[i] || 0,
        windSpeed: Math.round(rawHourly.wind_speed_10m[i]),
        windDirection: Math.round(rawHourly.wind_direction_10m[i]),
        relativeHumidity: Math.round(rawHourly.relative_humidity_2m[i]),
        uvIndex: Math.round((rawHourly.uv_index[i] || 0) * 10) / 10,
        isDay: rawHourly.is_day ? rawHourly.is_day[i] === 1 : true,
      });
    }
  }

  // Process daily (next 10 days)
  const rawDaily = raw.daily;
  const daily: DailyForecastItem[] = [];
  if (rawDaily && rawDaily.time) {
    for (let i = 0; i < rawDaily.time.length; i++) {
      const dateStr = rawDaily.time[i];
      const d = new Date(dateStr + 'T12:00:00');
      const isToday = i === 0;
      const isTomorrow = i === 1;

      const formattedDay = isToday
        ? 'Today'
        : isTomorrow
        ? 'Tomorrow'
        : d.toLocaleDateString([], { weekday: 'short' });

      const formattedDate = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

      daily.push({
        date: dateStr,
        formattedDay,
        formattedDate,
        weatherCode: rawDaily.weather_code[i],
        tempMax: Math.round(rawDaily.temperature_2m_max[i]),
        tempMin: Math.round(rawDaily.temperature_2m_min[i]),
        apparentTempMax: Math.round(rawDaily.apparent_temperature_max[i]),
        apparentTempMin: Math.round(rawDaily.apparent_temperature_min[i]),
        sunrise: rawDaily.sunrise[i] ? new Date(rawDaily.sunrise[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
        sunset: rawDaily.sunset[i] ? new Date(rawDaily.sunset[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
        rawSunrise: rawDaily.sunrise[i] || '',
        rawSunset: rawDaily.sunset[i] || '',
        uvIndexMax: Math.round((rawDaily.uv_index_max[i] || 0) * 10) / 10,
        precipitationSum: Math.round((rawDaily.precipitation_sum[i] || 0) * 10) / 10,
        precipitationProbabilityMax: Math.round(rawDaily.precipitation_probability_max[i] || 0),
        windSpeedMax: Math.round(rawDaily.wind_speed_10m_max[i] || 0),
        windGustsMax: Math.round(rawDaily.wind_gusts_10m_max[i] || 0),
        dominantWindDirection: Math.round(rawDaily.wind_direction_10m_dominant[i] || 0),
      });
    }
  }

  const alerts = detectWeatherAlerts(current, hourly, daily, airQuality, units);

  return {
    location,
    current,
    hourly,
    daily,
    airQuality,
    alerts,
    timezone: raw.timezone || location.timezone,
    updatedAt: now,
  };
}

export async function fetchWeatherInsights(
  weather: ProcessedWeather,
  unit: TemperatureUnit,
  conditionText: string
) {
  try {
    const hourlySummary = weather.hourly.slice(0, 8).map((h) => `${h.formattedHour}: ${h.temperature}° (${h.precipitationProbability}% rain)`).join(', ');
    const today = weather.daily[0];
    const dailySummary = today ? `High: ${today.tempMax}°, Low: ${today.tempMin}°, Rain prob: ${today.precipitationProbabilityMax}%` : '';

    const provider = localStorage.getItem('gw_ai_provider') || 'gemini';
    const openaiKey = localStorage.getItem('gw_openai_key') || '';
    const anthropicKey = localStorage.getItem('gw_anthropic_key') || '';
    const openrouterKey = localStorage.getItem('gw_openrouter_key') || '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-AI-Provider': provider,
    };

    if (provider === 'openai' && openaiKey) headers['X-OpenAI-Key'] = openaiKey;
    if (provider === 'anthropic' && anthropicKey) headers['X-Anthropic-Key'] = anthropicKey;
    if (provider === 'openrouter' && openrouterKey) headers['X-OpenRouter-Key'] = openrouterKey;

    const res = await fetch('/api/weather-insights', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        locationName: `${weather.location.name}, ${weather.location.country || ''}`,
        temperature: weather.current.temperature,
        unit,
        condition: conditionText,
        feelsLike: weather.current.apparentTemperature,
        humidity: weather.current.relativeHumidity,
        windSpeed: weather.current.windSpeed,
        uvIndex: weather.current.uvIndex || 0,
        aqi: weather.airQuality?.aqiUs,
        hourlySummary,
        dailySummary,
      }),
    });

    if (!res.ok) {
      throw new Error(`Insights server returned status: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.warn('Weather insights fetch error (using fallback):', error);
    const tempUnit = unit === 'fahrenheit' ? '°F' : '°C';
    return {
      headline: `${conditionText} in ${weather.location.name}`,
      summary: `${weather.location.name} is currently ${weather.current.temperature}${tempUnit} with ${conditionText.toLowerCase()}. Feels like ${weather.current.apparentTemperature}${tempUnit} with ${weather.current.relativeHumidity}% humidity.`,
      clothingAdvice: weather.current.temperature < 15 ? 'Wear layers or a jacket.' : 'Comfortable casual attire is suitable.',
      activityRecommendation: 'Ideal conditions for standard daily routines and outdoor commutes.',
      healthAndComfort: weather.airQuality ? `Air quality is ${weather.airQuality.qualityLevel} (${weather.airQuality.aqiUs} AQI).` : 'Atmospheric conditions are stable.',
      source: 'Local Weather Summary',
    };
  }
}

