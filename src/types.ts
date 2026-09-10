/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type WindSpeedUnit = 'kmh' | 'ms' | 'mph' | 'kn';
export type PrecipitationUnit = 'mm' | 'inch';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface WeatherUnits {
  temperature: TemperatureUnit;
  windSpeed: WindSpeedUnit;
  precipitation: PrecipitationUnit;
}

export interface GeoLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  feature_code?: string;
  country_code?: string;
  country?: string;
  country_id?: number;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  timezone: string;
  population?: number;
  postcodes?: string[];
}

export interface CurrentWeatherData {
  time: string;
  temperature: number;
  apparentTemperature: number;
  isDay: boolean;
  weatherCode: number;
  relativeHumidity: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  surfacePressure: number;
  precipitation: number;
  cloudCover: number;
  uvIndex?: number;
  visibility?: number;
}

export interface HourlyForecastItem {
  time: string; // ISO string
  timestamp: number; // ms
  formattedHour: string; // e.g. "12 PM"
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  precipitationProbability: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  relativeHumidity: number;
  uvIndex: number;
  isDay: boolean;
}

export interface DailyForecastItem {
  date: string; // "2026-09-10"
  formattedDay: string; // "Today", "Tomorrow", "Fri", etc.
  formattedDate: string; // "Sep 10"
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  apparentTempMax: number;
  apparentTempMin: number;
  sunrise: string;
  sunset: string;
  rawSunrise?: string;
  rawSunset?: string;
  uvIndexMax: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  dominantWindDirection: number;
}

export interface AirQualityData {
  aqiUs: number;
  pm2_5: number;
  pm10: number;
  nitrogenDioxide: number;
  ozone: number;
  sulphurDioxide: number;
  carbonMonoxide: number;
  qualityLevel: 'Good' | 'Moderate' | 'Unhealthy for Sensitive' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
  qualityColor: string;
  advice: string;
}

export type AlertSeverity = 'advisory' | 'watch' | 'warning' | 'emergency';

export interface WeatherAlert {
  id: string;
  headline: string;
  severity: AlertSeverity;
  event: string;
  urgency: 'Immediate' | 'Expected';
  effectiveTime: string;
  expiresTime: string;
  description: string;
  instruction: string;
  source: string;
  colorClass: string;
  badgeBg: string;
  metrics?: {
    windGusts?: number;
    rainRate?: number;
    tempExtreme?: number;
    weatherCode?: number;
    aqi?: number;
  };
}

export interface ProcessedWeather {
  location: GeoLocation;
  current: CurrentWeatherData;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  airQuality?: AirQualityData;
  alerts: WeatherAlert[];
  timezone: string;
  updatedAt: Date;
}

export interface WeatherConditionInfo {
  code: number;
  description: string;
  iconName: string;
  backgroundCategory: 'clear-day' | 'clear-night' | 'cloudy' | 'rain' | 'thunderstorm' | 'snow' | 'fog';
}

export interface WeatherInsightData {
  headline: string;
  summary: string;
  clothingAdvice: string;
  activityRecommendation: string;
  healthAndComfort: string;
  tipOfTheDay: string;
  source?: string;
}

export type MoonPhaseCode =
  | 'new_moon'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full_moon'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

export interface MoonPhaseInfo {
  code: MoonPhaseCode;
  name: string;
  ageDays: number;
  illumination: number;
  fraction: number;
  isWaxing: boolean;
  nextMajorPhase: {
    name: string;
    daysRemaining: number;
  };
  description: string;
}

