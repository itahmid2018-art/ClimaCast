import React, { useState } from 'react';
import { Download, FileText, FileJson, Copy, Check, ChevronDown, TableProperties } from 'lucide-react';
import { ProcessedWeather, TemperatureUnit } from '../types';
import { getWeatherCondition } from '../utils/weatherCodes';

interface ExportReportProps {
  weather: ProcessedWeather;
  unit: TemperatureUnit;
}

export const ExportReport: React.FC<ExportReportProps> = ({ weather, unit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const unitSymbol = unit === 'celsius' ? '°C' : '°F';
  const speedUnit = unit === 'celsius' ? 'km/h' : 'mph';
  const condition = getWeatherCondition(weather.current.weatherCode, weather.current.isDay);

  const generateTextReport = () => {
    return `WEATHER REPORT - ${weather.location.name}, ${weather.location.country || ''}
Time: ${new Date(weather.current.time).toLocaleString()}
Condition: ${condition.description}
Temperature: ${weather.current.temperature}${unitSymbol} (Feels like: ${weather.current.apparentTemperature}${unitSymbol})
Humidity: ${weather.current.relativeHumidity}%
Wind Speed: ${weather.current.windSpeed} ${speedUnit}
Cloud Cover: ${weather.current.cloudCover}%

FORECAST SUMMARY:
High: ${weather.daily[0]?.tempMax}${unitSymbol} | Low: ${weather.daily[0]?.tempMin}${unitSymbol}
Precipitation Probability: ${weather.daily[0]?.precipitationProbabilityMax}%
`;
  };

  const generateCSV = () => {
    return `Location,Time,Condition,Temperature (${unitSymbol}),Feels Like (${unitSymbol}),Humidity (%),Wind Speed (${speedUnit}),Cloud Cover (%)
"${weather.location.name}", "${new Date(weather.current.time).toLocaleString()}", "${condition.description}", ${weather.current.temperature}, ${weather.current.apparentTemperature}, ${weather.current.relativeHumidity}, ${weather.current.windSpeed}, ${weather.current.cloudCover}`;
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generateTextReport());
    setCopied(true);
    setIsOpen(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white hover:text-blue-600 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Download className="h-4 w-4" />}
        <span>{copied ? 'Copied!' : 'Export'}</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-[100] mt-2 w-48 origin-top-right rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 focus:outline-none dark:border-slate-700 dark:bg-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-1">
            <button
              onClick={handleCopyText}
              className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Copy className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
              Copy to Clipboard
            </button>
            <button
              onClick={() => downloadFile(JSON.stringify(weather, null, 2), `weather-report-${weather.location.name}.json`, 'application/json')}
              className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <FileJson className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
              Download JSON
            </button>
            <button
              onClick={() => downloadFile(generateCSV(), `weather-report-${weather.location.name}.csv`, 'text/csv')}
              className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <TableProperties className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
              Download CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
