/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Calendar,
  Thermometer,
  CloudRain,
  Wind,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { TemperatureUnit } from '../types';
import { getWeatherEmoji } from '../utils/weatherCodes';

interface PastTrendsViewProps {
  latitude: number;
  longitude: number;
  locationName: string;
  unit: TemperatureUnit;
}

interface HistoricalDailyItem {
  date: string;
  displayDate: string;
  fullDate: string;
  tempMax: number;
  tempMin: number;
  tempMean: number;
  precipitation: number;
  windSpeedMax: number;
  weatherCode: number;
  emoji: string;
}

type RangeOption = 7 | 14 | 30;
type MetricView = 'temperature' | 'precipitation' | 'wind';

export const PastTrendsView: React.FC<PastTrendsViewProps> = ({
  latitude,
  longitude,
  locationName,
  unit,
}) => {
  const [range, setRange] = useState<RangeOption>(14);
  const [metricView, setMetricView] = useState<MetricView>('temperature');
  const [data, setData] = useState<HistoricalDailyItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const tempSymbol = unit === 'celsius' ? '°C' : '°F';
  const rainSymbol = unit === 'celsius' ? 'mm' : 'in';
  const windSymbol = unit === 'celsius' ? 'km/h' : 'mph';

  const fetchTrends = async (days: RangeOption) => {
    setIsLoading(true);
    setError(null);

    try {
      const unitParams =
        unit === 'fahrenheit'
          ? '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch'
          : '';

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&past_days=${days}&forecast_days=0&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code${unitParams}&timezone=auto`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load historical data (${res.status})`);
      }

      const json = await res.json();
      if (!json.daily || !json.daily.time || json.daily.time.length === 0) {
        throw new Error('No historical weather observations available for this coordinate.');
      }

      const times: string[] = json.daily.time;
      const tempMaxArr: number[] = json.daily.temperature_2m_max || [];
      const tempMinArr: number[] = json.daily.temperature_2m_min || [];
      const precipArr: number[] = json.daily.precipitation_sum || [];
      const windArr: number[] = json.daily.wind_speed_10m_max || [];
      const codes: number[] = json.daily.weather_code || [];

      const items: HistoricalDailyItem[] = times.map((t, idx) => {
        const d = new Date(t + 'T12:00:00');
        const displayDate = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        const fullDate = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const tMax = Math.round((tempMaxArr[idx] ?? 0) * 10) / 10;
        const tMin = Math.round((tempMinArr[idx] ?? 0) * 10) / 10;
        const precip = Math.round((precipArr[idx] ?? 0) * 100) / 100;
        const wind = Math.round((windArr[idx] ?? 0) * 10) / 10;
        const code = codes[idx] ?? 0;

        return {
          date: t,
          displayDate,
          fullDate,
          tempMax: tMax,
          tempMin: tMin,
          tempMean: Math.round(((tMax + tMin) / 2) * 10) / 10,
          precipitation: precip,
          windSpeedMax: wind,
          weatherCode: code,
          emoji: getWeatherEmoji(code, true),
        };
      });

      setData(items);
    } catch (err: any) {
      console.error('Error fetching historical trends:', err);
      setError(err.message || 'Unable to retrieve historical trend telemetry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends(range);
  }, [latitude, longitude, range, unit]);

  // Derived KPI statistics
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    let totalRain = 0;
    let rainyDays = 0;
    let sumHigh = 0;
    let sumLow = 0;
    let peakWind = -Infinity;
    let peakWindDate = '';
    let maxTemp = -Infinity;
    let maxTempDate = '';
    let minTemp = Infinity;
    let minTempDate = '';

    data.forEach((item) => {
      totalRain += item.precipitation;
      if (item.precipitation > 0.1) rainyDays++;
      sumHigh += item.tempMax;
      sumLow += item.tempMin;

      if (item.windSpeedMax > peakWind) {
        peakWind = item.windSpeedMax;
        peakWindDate = item.displayDate;
      }
      if (item.tempMax > maxTemp) {
        maxTemp = item.tempMax;
        maxTempDate = item.displayDate;
      }
      if (item.tempMin < minTemp) {
        minTemp = item.tempMin;
        minTempDate = item.displayDate;
      }
    });

    const count = data.length;
    return {
      avgHigh: Math.round((sumHigh / count) * 10) / 10,
      avgLow: Math.round((sumLow / count) * 10) / 10,
      totalRain: Math.round(totalRain * 100) / 100,
      rainyDays,
      peakWind,
      peakWindDate,
      maxTemp,
      maxTempDate,
      minTemp,
      minTempDate,
    };
  }, [data]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item: HistoricalDailyItem = payload[0].payload;
      return (
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3.5 text-xs text-white shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2 mb-2">
            <span className="font-semibold text-slate-300">{item.fullDate}</span>
            <span className="text-base" title="Observed weather">
              {item.emoji}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 font-mono">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-amber-400">
                <ArrowUpRight className="h-3.5 w-3.5" /> High:
              </span>
              <span className="font-bold text-white">
                {item.tempMax}
                {tempSymbol}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-sky-400">
                <ArrowDownRight className="h-3.5 w-3.5" /> Low:
              </span>
              <span className="font-bold text-white">
                {item.tempMin}
                {tempSymbol}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
              <span className="flex items-center gap-1.5 text-blue-400">
                <CloudRain className="h-3.5 w-3.5" /> Rainfall:
              </span>
              <span className="font-bold text-white">
                {item.precipitation} {rainSymbol}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-teal-400">
                <Wind className="h-3.5 w-3.5" /> Max Wind:
              </span>
              <span className="font-bold text-white">
                {item.windSpeedMax} {windSymbol}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="past-trends-container"
      className="flex flex-col gap-5 rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-xs backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/80"
    >
      {/* Header & Sub-Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">
                Historical Weather Trends
              </h3>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                Past {range} Days
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Observed meteorological history for {locationName}
            </p>
          </div>
        </div>

        {/* Range & Metric Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Day Range Toggle */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
            {([7, 14, 30] as RangeOption[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setRange(d)}
                className={`rounded-lg px-2.5 py-1 transition ${
                  range === d
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          {/* Metric View Selector */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMetricView('temperature')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition ${
                metricView === 'temperature'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Thermometer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Temp</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricView('precipitation')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition ${
                metricView === 'precipitation'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CloudRain className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Precip</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricView('wind')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition ${
                metricView === 'wind'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Wind className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Wind</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchTrends(range)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Refresh historical trends"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      {stats && !isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/50 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5 text-amber-500" /> Avg Range
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {stats.avgHigh}{tempSymbol}
              </span>
              <span className="text-xs text-slate-400">/ {stats.avgLow}{tempSymbol}</span>
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              Peak: {stats.maxTemp}{tempSymbol} ({stats.maxTempDate})
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/50 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <CloudRain className="h-3.5 w-3.5 text-blue-500" /> Total Rainfall
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {stats.totalRain}
              </span>
              <span className="text-xs text-slate-400">{rainSymbol}</span>
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              Across {stats.rainyDays} rainy {stats.rainyDays === 1 ? 'day' : 'days'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/50 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Wind className="h-3.5 w-3.5 text-teal-500" /> Peak Gust
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {stats.peakWind}
              </span>
              <span className="text-xs text-slate-400">{windSymbol}</span>
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              Recorded on {stats.peakWindDate}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/50 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" /> Lowest Night
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {stats.minTemp}{tempSymbol}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              Chilliest on {stats.minTempDate}
            </p>
          </div>
        </div>
      )}

      {/* Main Chart Area */}
      <div className="h-72 w-full pt-2">
        {isLoading ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-slate-400">
            <div className="h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>Fetching historical climate telemetry...</span>
          </div>
        ) : error ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="h-8 w-8 text-rose-500" />
            <p className="text-xs font-semibold text-rose-500">{error}</p>
            <button
              type="button"
              onClick={() => fetchTrends(range)}
              className="rounded-xl bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {metricView === 'temperature' ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempMaxGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="tempMinGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  unit={tempSymbol}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="tempMax"
                  name={`Max Temp (${tempSymbol})`}
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#tempMaxGradient)"
                  dot={{ r: 3, fill: '#f59e0b', strokeWidth: 1, stroke: '#ffffff' }}
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="tempMin"
                  name={`Min Temp (${tempSymbol})`}
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#tempMinGradient)"
                  dot={{ r: 3, fill: '#38bdf8', strokeWidth: 1, stroke: '#ffffff' }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            ) : metricView === 'precipitation' ? (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  unit={` ${rainSymbol}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="precipitation"
                  name={`Rainfall (${rainSymbol})`}
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  unit={` ${windSymbol}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="windSpeedMax"
                  name={`Max Wind (${windSymbol})`}
                  stroke="#14b8a6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#14b8a6', strokeWidth: 1, stroke: '#ffffff' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Legend / Guide */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          {metricView === 'temperature' ? (
            <>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span>Daily Maximum High</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                <span>Daily Minimum Low</span>
              </span>
            </>
          ) : metricView === 'precipitation' ? (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-blue-600" />
              <span>Daily Precipitation Accumulation</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
              <span>Peak 10m Wind Speed</span>
            </span>
          )}
        </div>

        <span className="text-[10px] text-slate-400">
          Source: Open-Meteo Planetary Climate Archive
        </span>
      </div>
    </div>
  );
};
