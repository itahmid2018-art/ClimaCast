/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ProcessedWeather,
  TemperatureUnit,
} from '../types';
import { getWindDirectionName } from '../utils/weatherCodes';
import { useAQI } from '../hooks/useAQI';
import {
  Wind,
  Compass,
  Sunrise,
  Sunset,
  Droplets,
  Sun,
  Eye,
  Gauge,
  CloudRain,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface WeatherDetailsGridProps {
  weather: ProcessedWeather;
  unit: TemperatureUnit;
}

export const WeatherDetailsGrid: React.FC<WeatherDetailsGridProps> = ({ weather, unit }) => {
  const { current, daily, airQuality: defaultAirQuality, location } = weather;
  const today = daily[0];

  const { source: aqiSource, setSource: setAqiSource, data: airQuality, isLoading: isAqiLoading, error: aqiError } = useAQI(location.latitude, location.longitude, defaultAirQuality);

  const windSpeedUnit = unit === 'celsius' ? 'km/h' : 'mph';
  const windDirName = getWindDirectionName(current.windDirection);

  // UV risk description
  const uvValue = current.uvIndex ?? (today ? today.uvIndexMax : 2);
  const getUVRating = (uv: number) => {
    if (uv <= 2) return { text: 'Low', color: 'text-emerald-500', advice: 'No protection needed' };
    if (uv <= 5) return { text: 'Moderate', color: 'text-amber-500', advice: 'Wear sunglasses & SPF 30+' };
    if (uv <= 7) return { text: 'High', color: 'text-orange-500', advice: 'Seek shade during midday' };
    if (uv <= 10) return { text: 'Very High', color: 'text-rose-500', advice: 'Extra protection required' };
    return { text: 'Extreme', color: 'text-purple-600', advice: 'Avoid outdoor sun exposure' };
  };
  const uvRating = getUVRating(uvValue);

  // Approximate dew point: T - ((100 - RH)/5)
  const dewPoint = Math.round(current.temperature - (100 - current.relativeHumidity) / 5);

  return (
    <div id="weather-details-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Air Quality Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 flex flex-col justify-between">
        <div className="flex flex-col gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Air Quality (AQI)
            </span>
            {airQuality && !isAqiLoading && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${airQuality.qualityColor} bg-slate-100 dark:bg-slate-800`}>
                {airQuality.qualityLevel}
              </span>
            )}
          </div>
          
          {/* AQI Source Toggle */}
          <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg w-full max-w-[150px]">
            <button 
              className={`flex-1 text-[10px] py-1 rounded-md transition-all font-semibold ${aqiSource === 'hyperlocal' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => setAqiSource('hyperlocal')}
            >
              HyperLocal
            </button>
            <button 
              className={`flex-1 text-[10px] py-1 rounded-md transition-all font-semibold ${aqiSource === 'openmeteo' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              onClick={() => setAqiSource('openmeteo')}
            >
              Default
            </button>
          </div>
        </div>

        {isAqiLoading ? (
          <div className="py-6 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
            <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Fetching real-time data...
          </div>
        ) : aqiError ? (
           <div className="py-6 text-center text-xs text-red-500 font-medium">
             {aqiError}
           </div>
        ) : airQuality ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                {airQuality.aqiUs}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">US AQI scale</span>
            </div>

            {/* AQI Progress bar */}
            <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 via-rose-500 to-purple-600"
                style={{ width: `${Math.min(100, (airQuality.aqiUs / 300) * 100)}%` }}
              />
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {airQuality.advice}
            </p>

            {/* Pollutants breakdown */}
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-400">PM2.5</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{airQuality.pm2_5} µg/m³</p>
              </div>
              <div>
                <span className="text-slate-400">PM10</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{airQuality.pm10} µg/m³</p>
              </div>
              <div>
                <span className="text-slate-400">Ozone</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{airQuality.ozone} µg/m³</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            Air quality data unavailable for this coordinate.
          </div>
        )}
      </div>

      {/* 2. UV Index Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sun className="h-4 w-4 text-amber-500" />
            UV Index
          </span>
          <span className={`text-xs font-bold ${uvRating.color}`}>
            {uvRating.text}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
              {uvValue}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Peak: {today ? today.uvIndexMax : uvValue}
            </span>
          </div>

          {/* UV Scale Meter */}
          <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-500 via-amber-400 via-orange-500 to-purple-600"
              style={{ width: `${Math.min(100, (uvValue / 12) * 100)}%` }}
            />
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {uvRating.advice}. Sun protection is recommended between 10:00 AM and 4:00 PM.
          </p>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
            0-2: Low • 3-5: Mod • 6-7: High • 8-10: Very High • 11+: Ext
          </div>
        </div>
      </div>

      {/* 3. Wind & Gusts Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Wind className="h-4 w-4 text-teal-500" />
            Wind & Direction
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {windDirName} ({current.windDirection}°)
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                {current.windSpeed}
              </span>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {windSpeedUnit}
              </span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Gusts up to {current.windGusts} {windSpeedUnit}
            </span>
          </div>

          {/* Compass Dial Graphic */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
            <span className="absolute top-1 text-[9px] font-bold text-slate-400">N</span>
            <span className="absolute bottom-1 text-[9px] font-bold text-slate-400">S</span>
            <span className="absolute left-1.5 text-[9px] font-bold text-slate-400">W</span>
            <span className="absolute right-1.5 text-[9px] font-bold text-slate-400">E</span>
            <div
              style={{ transform: `rotate(${current.windDirection}deg)` }}
              className="transition-transform duration-500 ease-out"
            >
              <Compass className="h-8 w-8 text-teal-500 fill-teal-500/20" />
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          Max daily gusts: {today ? today.windGustsMax : current.windGusts} {windSpeedUnit}
        </div>
      </div>

      {/* 4. Sunrise & Sunset Card (Daylight Solar Arc) */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sunrise className="h-4 w-4 text-amber-500" />
            Sunrise & Sunset
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {current.isDay ? 'Daytime' : 'Nighttime'}
          </span>
        </div>

        {today ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-2xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <Sunrise className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Sunrise</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {today.sunrise}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="rounded-2xl bg-orange-50 p-2 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                  <Sunset className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Sunset</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {today.sunset}
                  </p>
                </div>
              </div>
            </div>

            {/* Solar visual arc bar */}
            <div className="relative mt-2">
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 via-orange-400 to-indigo-600"
                  style={{ width: current.isDay ? '65%' : '10%' }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              Solar timezone: {location.timezone}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">No solar data available</div>
        )}
      </div>

      {/* 5. Humidity & Dew Point Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Droplets className="h-4 w-4 text-blue-500" />
            Humidity & Comfort
          </span>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Dew point {dewPoint}°
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
              {current.relativeHumidity}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {current.relativeHumidity < 30
                ? 'Dry'
                : current.relativeHumidity < 60
                ? 'Comfortable'
                : 'Humid'}
            </span>
          </div>

          <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-300 via-blue-500 to-indigo-700"
              style={{ width: `${current.relativeHumidity}%` }}
            />
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300">
            The dew point is {dewPoint}°. {current.relativeHumidity > 70 ? 'High humidity may make it feel warmer.' : 'Atmospheric moisture is at a comfortable level.'}
          </p>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
            Apparent temperature: {current.apparentTemperature}°
          </div>
        </div>
      </div>

      {/* 6. Pressure, Visibility & Precipitation Volume */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-violet-500" />
            Pressure & Visibility
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Barometric</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Pressure</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {current.surfacePressure} <span className="text-xs font-normal text-slate-400">hPa</span>
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {current.surfacePressure > 1013 ? 'High pressure' : 'Low pressure'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Visibility</span>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {current.visibility ?? 10} <span className="text-xs font-normal text-slate-400">km</span>
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {(current.visibility ?? 10) >= 10 ? 'Clear view' : 'Restricted view'}
            </span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <CloudRain className="h-3.5 w-3.5 text-blue-500" />
            24h Precipitation:
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {today ? today.precipitationSum : 0} {unit === 'celsius' ? 'mm' : 'in'}
          </span>
        </div>
      </div>
    </div>
  );
};
