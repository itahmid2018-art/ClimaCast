/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DailyForecastItem, TemperatureUnit } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { getWeatherCondition } from '../utils/weatherCodes';
import {
  CalendarDays,
  Droplets,
  ChevronDown,
  Sunrise,
  Sunset,
  Wind,
  Sun,
} from 'lucide-react';

interface DailyForecastListProps {
  daily: DailyForecastItem[];
  unit: TemperatureUnit;
}

export const DailyForecastList: React.FC<DailyForecastListProps> = ({ daily, unit }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!daily || daily.length === 0) return null;

  // Calculate overall min & max temp across all 10 days for proportional bar ranges
  const allMins = daily.map((d) => d.tempMin);
  const allMaxs = daily.map((d) => d.tempMax);
  const globalMin = Math.min(...allMins);
  const globalMax = Math.max(...allMaxs);
  const globalSpan = Math.max(1, globalMax - globalMin);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <div
      id="daily-forecast-card"
      className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs transition-colors dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-white text-sm md:text-base flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          10-Day Forecast
        </h3>
        <span className="text-xs text-slate-400">Tap day for details</span>
      </div>

      <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/80">
        {daily.map((item, index) => {
          const condition = getWeatherCondition(item.weatherCode, true);
          const isExpanded = expandedIndex === index;

          // Bar offset and width percentages relative to 10-day bounds
          const leftPercent = ((item.tempMin - globalMin) / globalSpan) * 100;
          const widthPercent = Math.max(8, ((item.tempMax - item.tempMin) / globalSpan) * 100);

          return (
            <div key={item.date} className="py-2.5 transition-colors">
              <button
                type="button"
                onClick={() => toggleExpand(index)}
                className="w-full flex items-center justify-between gap-2 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/50 p-1.5 rounded-xl transition"
              >
                {/* Day name & date */}
                <div className="w-24 shrink-0 flex flex-col">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.formattedDay}
                  </span>
                  <span className="text-[11px] text-slate-400">{item.formattedDate}</span>
                </div>

                {/* Weather icon & rain probability */}
                <div className="flex items-center gap-2 w-28 shrink-0">
                  <WeatherIcon code={item.weatherCode} isDay={true} className="h-5 w-5" />
                  <div className="flex items-center gap-1 text-xs">
                    {item.precipitationProbabilityMax > 15 ? (
                      <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-semibold text-[11px]">
                        <Droplets className="h-3 w-3" />
                        {item.precipitationProbabilityMax}%
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 truncate max-w-[80px]">
                        {condition.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Visual Temperature Bar Span */}
                <div className="flex-1 flex items-center gap-2 max-w-[200px] sm:max-w-none">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 w-7 text-right">
                    {item.tempMin}°
                  </span>

                  <div className="relative h-2 flex-1 rounded-full bg-slate-200/80 dark:bg-slate-800">
                    <div
                      className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-blue-400 via-amber-400 to-rose-400"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                    />
                  </div>

                  <span className="text-xs font-bold text-slate-900 dark:text-white w-7">
                    {item.tempMax}°
                  </span>
                </div>

                {/* Expand arrow */}
                <div className="text-slate-400 pl-1">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-blue-500' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Collapsible Details Drawer */}
              {isExpanded && (
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Sunrise className="h-4 w-4 text-amber-500" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Sunrise</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.sunrise}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Sunset className="h-4 w-4 text-orange-500" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Sunset</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.sunset}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Wind className="h-4 w-4 text-emerald-500" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Max Wind</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.windSpeedMax} {unit === 'celsius' ? 'km/h' : 'mph'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-400" />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">UV Max</div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.uvIndexMax}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
