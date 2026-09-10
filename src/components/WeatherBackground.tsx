import React from 'react';

interface WeatherBackgroundProps {
  category: string;
}

export const WeatherBackground: React.FC<WeatherBackgroundProps> = ({ category }) => {
  const getGradientClasses = () => {
    switch (category) {
      case 'clear-day':
        return 'from-sky-300 via-blue-200 to-blue-50 dark:from-sky-900 dark:via-slate-800 dark:to-slate-900';
      case 'clear-night':
        return 'from-indigo-950 via-slate-900 to-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800';
      case 'cloudy':
        return 'from-slate-300 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900';
      case 'fog':
        return 'from-slate-300 via-gray-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-800';
      case 'rain':
        return 'from-slate-500 via-slate-400 to-slate-300 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950';
      case 'snow':
        return 'from-indigo-200 via-slate-100 to-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-900';
      case 'thunderstorm':
        return 'from-slate-800 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900';
      default:
        return 'from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950';
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[-1] bg-gradient-to-br transition-all duration-1000 ease-in-out ${getGradientClasses()}`}
      aria-hidden="true"
    />
  );
};
