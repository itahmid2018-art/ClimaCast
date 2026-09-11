import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { WeatherInsightData, ProcessedWeather } from '../types';
import { getWeatherCondition } from '../utils/weatherCodes';

interface TipOfTheDayBannerProps {
  insights: WeatherInsightData | null;
  weather: ProcessedWeather;
  isTipClosed: boolean;
  setIsTipClosed: (val: boolean) => void;
}

export const TipOfTheDayBanner: React.FC<TipOfTheDayBannerProps> = ({
  insights,
  weather,
  isTipClosed,
  setIsTipClosed,
}) => {
  if (!insights || !insights.tipOfTheDay || isTipClosed) return null;

  const conditionInfo = getWeatherCondition(weather.current.weatherCode, weather.current.isDay);

  const getTipColors = () => {
    switch (conditionInfo.backgroundCategory) {
      case 'clear-day': return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/95 dark:text-amber-100 dark:border-amber-700';
      case 'clear-night': return 'bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-900/95 dark:text-indigo-100 dark:border-indigo-700';
      case 'cloudy': return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/95 dark:text-slate-200 dark:border-slate-600';
      case 'rain': return 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/95 dark:text-blue-100 dark:border-blue-700';
      case 'thunderstorm': return 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/95 dark:text-purple-100 dark:border-purple-700';
      case 'snow': return 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-900/95 dark:text-sky-100 dark:border-sky-700';
      case 'fog': return 'bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-800/95 dark:text-zinc-200 dark:border-zinc-600';
      default: return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/95 dark:text-amber-100 dark:border-amber-700';
    }
  };

  return (
    <div className={`w-full rounded-2xl p-4 mb-4 border shadow-sm backdrop-blur-md animate-in fade-in duration-500 flex items-start gap-3 relative ${getTipColors()}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/10 dark:bg-white/10 shadow-inner">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex-1 pr-6">
        <h4 className="text-sm font-bold opacity-90">Tip of the Day</h4>
        <p className="mt-1 text-xs md:text-sm font-medium leading-relaxed opacity-95">
          {insights.tipOfTheDay}
        </p>
      </div>
      <button 
        onClick={() => setIsTipClosed(true)} 
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label="Close Tip"
      >
        <X className="h-4 w-4 opacity-70" />
      </button>
    </div>
  );
};
