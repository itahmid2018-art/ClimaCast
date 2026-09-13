/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Pin,
  PinOff,
  SlidersHorizontal,
  Plus,
  ShieldCheck,
  Sunrise,
  Sunset,
  Sun,
  Wind,
  Droplets,
  Gauge,
  Moon,
  CloudRain,
  Compass,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { ProcessedWeather, TemperatureUnit, WeatherWidgetId } from '../types';
import { useAQI } from '../hooks/useAQI';
import { getWindDirectionName } from '../utils/weatherCodes';
import { SolarSunArc } from './SolarSunArc';
import { calculateMoonPhase } from '../utils/astronomy';
import { AVAILABLE_WIDGETS } from './CustomizeWidgetsModal';

interface PinnedWidgetsSectionProps {
  weather: ProcessedWeather;
  unit: TemperatureUnit;
  pinnedWidgets: WeatherWidgetId[];
  onTogglePin: (id: WeatherWidgetId) => void;
  onOpenCustomize: () => void;
}

export const PinnedWidgetsSection: React.FC<PinnedWidgetsSectionProps> = ({
  weather,
  unit,
  pinnedWidgets,
  onTogglePin,
  onOpenCustomize,
}) => {
  const { current, daily, airQuality: defaultAirQuality, location } = weather;
  const today = daily[0];
  const { source: aqiSource, setSource: setAqiSource, data: airQuality, isLoading: isAqiLoading } = useAQI(
    location.latitude,
    location.longitude,
    defaultAirQuality
  );

  const windSpeedUnit = unit === 'celsius' ? 'km/h' : 'mph';
  const windDirName = getWindDirectionName(current.windDirection);

  // UV risk calculation
  const uvValue = current.uvIndex ?? (today ? today.uvIndexMax : 2);
  const getUVRating = (uv: number) => {
    if (uv <= 2) return { text: 'Low', color: 'text-emerald-500', advice: 'No protection needed' };
    if (uv <= 5) return { text: 'Moderate', color: 'text-amber-500', advice: 'Wear sunglasses & SPF 30+' };
    if (uv <= 7) return { text: 'High', color: 'text-orange-500', advice: 'Seek shade during midday' };
    if (uv <= 10) return { text: 'Very High', color: 'text-rose-500', advice: 'Extra protection required' };
    return { text: 'Extreme', color: 'text-purple-600', advice: 'Avoid outdoor sun exposure' };
  };
  const uvRating = getUVRating(uvValue);

  // Dew point
  const dewPoint = Math.round(current.temperature - (100 - current.relativeHumidity) / 5);

  // Moon phase calculation
  const moonPhase = calculateMoonPhase(new Date());

  // Precipitation probability peak for upcoming hours
  const upcomingRainMax = Math.max(
    ...(weather.hourly?.slice(0, 12).map((h) => h.precipitationProbability) || [0])
  );

  return (
    <section
      id="pinned-widgets-section"
      aria-label="Pinned Weather Widgets"
      className="flex flex-col gap-3.5"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400">
            <Pin className="h-4 w-4 fill-current transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Pinned Widgets
              </h2>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                Quick Access
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your personalized atmospheric dashboard
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCustomize}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs backdrop-blur-xs transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-blue-500" />
            <span>Customize</span>
            <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {pinnedWidgets.length}
            </span>
          </button>
        </div>
      </div>

      {/* Grid or Empty State */}
      {pinnedWidgets.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/40 p-8 text-center backdrop-blur-xs dark:border-slate-700 dark:bg-slate-900/40"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 mb-3">
            <Pin className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No widgets currently pinned
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            Pin real-time weather metrics like <strong>Air Quality</strong>, <strong>Solar Arc</strong>, or <strong>UV Index</strong> for instant access.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => onTogglePin('air-quality')}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition dark:bg-emerald-950/50 dark:text-emerald-300"
            >
              <Plus className="h-3.5 w-3.5" />
              Pin Air Quality
            </button>
            <button
              type="button"
              onClick={() => onTogglePin('solar-arc')}
              className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition dark:bg-amber-950/50 dark:text-amber-300"
            >
              <Plus className="h-3.5 w-3.5" />
              Pin Solar Arc
            </button>
            <button
              type="button"
              onClick={onOpenCustomize}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              View All Widgets
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {pinnedWidgets.map((widgetId) => {
              switch (widgetId) {
                // 1. AIR QUALITY WIDGET
                case 'air-quality':
                  return (
                    <motion.div
                      key="widget-air-quality"
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="flex flex-col gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            Air Quality (AQI)
                          </span>
                          <div className="flex items-center gap-2">
                            {airQuality && !isAqiLoading && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${airQuality.qualityColor} bg-slate-100 dark:bg-slate-800`}>
                                {airQuality.qualityLevel}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => onTogglePin('air-quality')}
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition"
                              title="Unpin from Quick Access"
                              aria-label="Unpin Air Quality"
                            >
                              <PinOff className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Source selector */}
                        <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg w-full max-w-[150px]">
                          <button
                            type="button"
                            className={`flex-1 text-[10px] py-1 rounded-md transition-all font-semibold ${
                              aqiSource === 'hyperlocal'
                                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                            onClick={() => setAqiSource('hyperlocal')}
                          >
                            HyperLocal
                          </button>
                          <button
                            type="button"
                            className={`flex-1 text-[10px] py-1 rounded-md transition-all font-semibold ${
                              aqiSource === 'openmeteo'
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-xs'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                            onClick={() => setAqiSource('openmeteo')}
                          >
                            Default
                          </button>
                        </div>
                      </div>

                      {isAqiLoading ? (
                        <div className="py-6 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                          <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <span>Fetching AQI...</span>
                        </div>
                      ) : airQuality ? (
                        <div className="mt-3 flex flex-col gap-3">
                          <div className="flex items-baseline gap-3">
                            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                              {airQuality.aqiUs}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              US AQI scale
                            </span>
                          </div>

                          {/* Meter */}
                          <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 via-rose-500 to-purple-600"
                              style={{ width: `${Math.min(100, (airQuality.aqiUs / 300) * 100)}%` }}
                            />
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                            {airQuality.advice}
                          </p>

                          {/* Pollutants */}
                          <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                            <div>
                              <span className="text-slate-400">PM2.5</span>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {airQuality.pm2_5} µg/m³
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-400">PM10</span>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {airQuality.pm10} µg/m³
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-400">Ozone</span>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">
                                {airQuality.ozone} µg/m³
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-400">
                          AQI unavailable
                        </div>
                      )}
                    </motion.div>
                  );

                // 2. SOLAR ARC WIDGET
                case 'solar-arc':
                  return (
                    <motion.div
                      key="widget-solar-arc"
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Sunrise className="h-4 w-4 text-amber-500" />
                          Solar Arc
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                            {current.isDay ? 'Daylight' : 'Nighttime'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onTogglePin('solar-arc')}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition"
                            title="Unpin from Quick Access"
                            aria-label="Unpin Solar Arc"
                          >
                            <PinOff className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {today ? (
                        <div className="mt-2 flex flex-col gap-2.5">
                          {/* Interactive Sun Arc Path */}
                          <div className="overflow-hidden rounded-2xl bg-slate-900/5 dark:bg-slate-950/40 p-2 border border-slate-200/60 dark:border-slate-800">
                            <SolarSunArc
                              rawSunrise={today.sunrise}
                              rawSunset={today.sunset}
                              formattedSunrise={today.sunrise}
                              formattedSunset={today.sunset}
                              isDay={current.isDay}
                              timezone={location.timezone}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                            <div className="flex items-center gap-2">
                              <Sunrise className="h-4 w-4 text-amber-500" />
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase">Sunrise</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {today.sunrise}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Sunset className="h-4 w-4 text-orange-500" />
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase">Sunset</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {today.sunset}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-400">
                          Solar data unavailable
                        </div>
                      )}
                    </motion.div>
                  );

                // 3. UV INDEX WIDGET
                case 'uv-index':
                  return (
                    <motion.div
                      key="widget-uv-index"
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Sun className="h-4 w-4 text-orange-500" />
                          UV Index
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${uvRating.color}`}>
                            {uvRating.text}
                          </span>
                          <button
                            type="button"
                            onClick={() => onTogglePin('uv-index')}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition"
                            title="Unpin from Quick Access"
                            aria-label="Unpin UV Index"
                          >
                            <PinOff className="h-3.5 w-3.5" />
                          </button>
                        </div>
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

                        {/* UV Meter */}
                        <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-green-500 via-amber-400 via-orange-500 to-purple-600"
                            style={{ width: `${Math.min(100, (uvValue / 12) * 100)}%` }}
                          />
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {uvRating.advice}
                        </p>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                          Sun protection recommended 10 AM – 4 PM
                        </div>
                      </div>
                    </motion.div>
                  );

                // 4. WIND & COMPASS WIDGET
                case 'wind':
                  return (
                    <motion.div
                      key="widget-wind"
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Wind className="h-4 w-4 text-teal-500" />
                          Wind & Direction
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {windDirName}
                          </span>
                          <button
                            type="button"
                            onClick={() => onTogglePin('wind')}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition"
                            title="Unpin from Quick Access"
                            aria-label="Unpin Wind"
                          >
                            <PinOff className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
                            Gusts: {current.windGusts} {windSpeedUnit}
                          </span>
                        </div>

                        {/* Dial */}
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                          <span className="absolute top-1 text-[8px] font-bold text-slate-400">N</span>
                          <span className="absolute bottom-1 text-[8px] font-bold text-slate-400">S</span>
                          <span className="absolute left-1 text-[8px] font-bold text-slate-400">W</span>
                          <span className="absolute right-1 text-[8px] font-bold text-slate-400">E</span>
                          <div
                            style={{ transform: `rotate(${current.windDirection}deg)` }}
                            className="transition-transform duration-500 ease-out"
                          >
                            <Compass className="h-6 w-6 text-teal-500 fill-teal-500/20" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                        Max daily gusts: {today ? today.windGustsMax : current.windGusts} {windSpeedUnit}
                      </div>
                    </motion.div>
                  );

                // 5. HUMIDITY & DEW POINT WIDGET
                case 'humidity':
                  return (
                    <motion.div
                      key="widget-humidity"
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Droplets className="h-4 w-4 text-blue-500" />
                          Humidity & Comfort
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Dew pt {dewPoint}°
                          </span>
                          <button
                            type="button"
                            onClick={() => onTogglePin('humidity')}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition"
                            title="Unpin from Quick Access"
                            aria-label="Unpin Humidity"
                          >
                            <PinOff className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col gap-3">
                        <div className="flex items-baseline gap-3">
                          <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                            {current.relativeHumidity}%
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {current.relativeHumidity < 30 ? 'Dry' : current.relativeHumidity < 60 ? 'Comfortable' : 'Humid'}
                          </span>
                        </div>

                        {/* Bar */}
                        <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-300 via-blue-500 to-indigo-700"
                            style={{ width: `${current.relativeHumidity}%` }}
                          />
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {current.relativeHumidity > 70 ? 'High moisture may make it feel warmer.' : 'Atmospheric moisture is at a comfortable level.'}
                        </p>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
                          Feels like {current.apparentTemperature}° • Dew point {dewPoint}°
                        </div>
                      </div>
                    </motion.div>
                  );

                // 6. PRESSURE & VISIBILITY WIDGET
                case 'pressure':
                  return (
                    <motion.div
                      key="widget-pressure"
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Gauge className="h-4 w-4 text-violet-500" />
                          Pressure & Visibility
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Barometric
                          </span>
                          <button
                            type="button"
                            onClick={() => onTogglePin('pressure')}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition"
                            title="Unpin from Quick Access"
                            aria-label="Unpin Pressure"
                          >
                            <PinOff className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
                          24h Rain:
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {today ? today.precipitationSum : 0} {unit === 'celsius' ? 'mm' : 'in'}
                        </span>
                      </div>
                    </motion.div>
                  );

                // 7. MOON PHASE WIDGET
                case 'moon-phase':
                  return (
                    <motion.div
                      key="widget-moon-phase"
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Moon className="h-4 w-4 text-indigo-400" />
                          Moon Phase & Sky
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">
                            {moonPhase.illumination}% lit
                          </span>
                          <button
                            type="button"
                            onClick={() => onTogglePin('moon-phase')}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition"
                            title="Unpin from Quick Access"
                            aria-label="Unpin Moon Phase"
                          >
                            <PinOff className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                            {moonPhase.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {moonPhase.isWaxing ? 'Waxing' : 'Waning'} • Day {Math.round(moonPhase.ageDays)} of 29.5
                          </p>
                        </div>

                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-950/80 text-amber-200 shadow-inner border border-indigo-800/40">
                          <Moon className="h-7 w-7 fill-amber-200/80 text-amber-200" />
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Next: {moonPhase.nextMajorPhase.name}</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-300">
                          in {moonPhase.nextMajorPhase.daysRemaining} days
                        </span>
                      </div>
                    </motion.div>
                  );

                // 8. PRECIPITATION RISK WIDGET
                case 'precipitation':
                  return (
                    <motion.div
                      key="widget-precipitation"
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <CloudRain className="h-4 w-4 text-cyan-500" />
                          Precipitation Risk
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                            {upcomingRainMax}% peak
                          </span>
                          <button
                            type="button"
                            onClick={() => onTogglePin('precipitation')}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition"
                            title="Unpin from Quick Access"
                            aria-label="Unpin Precipitation"
                          >
                            <PinOff className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col gap-3">
                        <div className="flex items-baseline gap-3">
                          <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                            {today ? today.precipitationSum : 0}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {unit === 'celsius' ? 'mm 24h total' : 'in 24h total'}
                          </span>
                        </div>

                        {/* Rain Probability Meter */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span>Peak rain risk next 12 hours</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {upcomingRainMax}%
                            </span>
                          </div>
                          <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
                              style={{ width: `${upcomingRainMax}%` }}
                            />
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                          {upcomingRainMax > 50
                            ? 'High probability of rain. An umbrella is strongly recommended.'
                            : upcomingRainMax > 20
                            ? 'Scattered chance of passing showers.'
                            : 'Minimal to zero precipitation risk expected.'}
                        </div>
                      </div>
                    </motion.div>
                  );

                default:
                  return null;
              }
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};
