/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Shirt,
  Compass,
  HeartPulse,
  RefreshCw,
  Info,
  CheckCircle2,
  X
} from 'lucide-react';
import { ProcessedWeather, TemperatureUnit, WeatherInsightData } from '../types';
import { fetchWeatherInsights } from '../services/weatherApi';
import { getWeatherCondition } from '../utils/weatherCodes';

interface WeatherInsightsSectionProps {
  weather: ProcessedWeather;
  unit: TemperatureUnit;
  onInsightsLoaded?: (insights: WeatherInsightData | null) => void;
}

export const WeatherInsightsSection: React.FC<WeatherInsightsSectionProps> = ({
  weather,
  unit,
  onInsightsLoaded,
}) => {
  const [insights, setInsights] = useState<WeatherInsightData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const conditionInfo = getWeatherCondition(weather.current.weatherCode, weather.current.isDay);

  const loadInsights = async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await fetchWeatherInsights(weather, unit, conditionInfo.description);
      setInsights(data);
      if (onInsightsLoaded) onInsightsLoaded(data);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [weather.location.id, weather.location.latitude, weather.location.longitude, unit]);

  return (
    <div
      id="weather-insights-section"
      className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/85 backdrop-blur-md p-5 shadow-xs transition-all dark:border-slate-800/80 dark:bg-slate-900/85"
    >
      {/* Subtle Background Accent Gradient */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl dark:bg-blue-600/10" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-500/30 dark:bg-blue-500">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Weather Insights
              </h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                Gemini AI
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Natural language intelligence for {weather.location.name}
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          id="refresh-insights-btn"
          type="button"
          onClick={() => loadInsights(true)}
          disabled={isLoading || isRefreshing}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          title="Regenerate Gemini Weather Insights"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-blue-600 dark:text-blue-400 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
          <span>{isRefreshing ? 'Analyzing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse py-2">
          <div className="h-6 w-3/4 rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-14 w-full rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      ) : insights ? (
        <div className="space-y-4">
          {/* Main Headline & Summary */}
          <div className="rounded-2xl bg-white/90 p-4 border border-slate-200/80 shadow-2xs dark:bg-slate-800/90 dark:border-slate-700/80">
            <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {insights.headline}
            </h3>
            <p className="mt-1.5 text-xs md:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {insights.summary}
            </p>
          </div>

          {/* 3 Lifestyle Guidance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Clothing Advice */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs transition hover:shadow-xs dark:border-slate-700/80 dark:bg-slate-800/90">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <Shirt className="h-3.5 w-3.5" />
                  </span>
                  <span>What to Wear</span>
                </div>
                <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {insights.clothingAdvice}
                </p>
              </div>
            </div>

            {/* Outdoors & Activities */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs transition hover:shadow-xs dark:border-slate-700/80 dark:bg-slate-800/90">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
                    <Compass className="h-3.5 w-3.5" />
                  </span>
                  <span>Outdoor Activities</span>
                </div>
                <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {insights.activityRecommendation}
                </p>
              </div>
            </div>

            {/* Health & Comfort */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-2xs transition hover:shadow-xs dark:border-slate-700/80 dark:bg-slate-800/90">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <HeartPulse className="h-3.5 w-3.5" />
                  </span>
                  <span>Health & Comfort</span>
                </div>
                <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {insights.healthAndComfort}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Attribution Tag */}
          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 dark:text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Synthesized from live Open-Meteo forecasts</span>
            </div>

            {insights.source && (
              <span className="truncate max-w-[200px] text-right font-medium">
                {insights.source}
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
