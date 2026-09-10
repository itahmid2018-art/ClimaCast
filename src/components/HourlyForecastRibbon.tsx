/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HourlyForecastItem, TemperatureUnit } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { Navigation, Droplets, Wind, Thermometer } from 'lucide-react';

interface HourlyForecastRibbonProps {
  hourly: HourlyForecastItem[];
  unit: TemperatureUnit;
}

type ForecastTab = 'temp' | 'precipitation' | 'wind';

export const HourlyForecastRibbon: React.FC<HourlyForecastRibbonProps> = ({ hourly, unit }) => {
  const [activeTab, setActiveTab] = useState<ForecastTab>('temp');

  if (!hourly || hourly.length === 0) return null;

  // Compute min/max temp for visual bar normalization in hourly ribbon
  const temps = hourly.map((h) => h.temperature);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = Math.max(1, maxTemp - minTemp);

  return (
    <div
      id="hourly-forecast-card"
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition-colors dark:border-slate-800 dark:bg-slate-900/80"
    >
      {/* Header and filter tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm md:text-base flex items-center gap-1.5">
          <Thermometer className="h-4 w-4 text-blue-500" />
          Hourly Forecast (Next 24h)
        </h3>

        {/* Tab Filters */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setActiveTab('temp')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
              activeTab === 'temp'
                ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Temp
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('precipitation')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
              activeTab === 'precipitation'
                ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Precipitation
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wind')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
              activeTab === 'wind'
                ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Wind
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Ribbon */}
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar select-none">
        {hourly.slice(0, 24).map((item, idx) => {
          // Normalized relative height for temperature bar visualization
          const tempRatio = (item.temperature - minTemp) / tempRange;
          const barHeight = Math.max(10, Math.round(tempRatio * 32));

          return (
            <div
              key={item.time || idx}
              className="flex min-w-[72px] flex-col items-center justify-between rounded-2xl bg-slate-50/70 p-3 transition hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80"
            >
              {/* Hour time */}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {item.formattedHour}
              </span>

              {/* Weather Icon */}
              <div className="my-2.5">
                <WeatherIcon code={item.weatherCode} isDay={item.isDay} className="h-6 w-6" />
              </div>

              {/* Variable Display based on selected tab */}
              {activeTab === 'temp' && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    {item.temperature}°
                  </span>
                  {/* Visual temperature relative indicator pill */}
                  <div className="h-8 w-1.5 rounded-full bg-slate-200 dark:bg-slate-700 flex flex-col justify-end overflow-hidden">
                    <div
                      className="w-full rounded-full bg-blue-500"
                      style={{ height: `${barHeight}px` }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'precipitation' && (
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={`text-xs font-bold ${
                      item.precipitationProbability > 30
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.precipitationProbability}%
                  </span>
                  <Droplets className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[10px] text-slate-400">
                    {item.precipitation > 0 ? `${item.precipitation}mm` : '0'}
                  </span>
                </div>
              )}

              {activeTab === 'wind' && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    {item.windSpeed}
                  </span>
                  <div
                    style={{ transform: `rotate(${item.windDirection}deg)` }}
                    className="transition-transform duration-300"
                    title={`Wind direction: ${item.windDirection}°`}
                  >
                    <Navigation className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/30" />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {unit === 'celsius' ? 'km/h' : 'mph'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
