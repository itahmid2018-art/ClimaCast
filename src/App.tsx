/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  GeoLocation,
  ProcessedWeather,
  TemperatureUnit,
  ThemeMode,
} from './types';
import { fetchWeather, reverseGeocode } from './services/weatherApi';
import { WeatherHeader } from './components/WeatherHeader';
import { CurrentWeatherHero } from './components/CurrentWeatherHero';
import { HourlyForecastRibbon } from './components/HourlyForecastRibbon';
import { DailyForecastList } from './components/DailyForecastList';
import { WeatherDetailsGrid } from './components/WeatherDetailsGrid';
import { CrossPlatformGuideModal } from './components/CrossPlatformGuideModal';
import { WeatherAlertsBanner } from './components/WeatherAlertsBanner';
import { WeatherInsightsSection } from './components/WeatherInsightsSection';
import { InteractiveWeatherMap } from './components/InteractiveWeatherMap';
import { BackgroundSyncModal } from './components/BackgroundSyncModal';
import { useBackgroundSync } from './hooks/useBackgroundSync';
import { getSimulatedSevereStormAlert } from './utils/alertDetector';
import {
  AlertCircle,
  RefreshCw,
  FileText,
  BookOpen,
  WifiOff,
  CloudSun,
  Smartphone,
  Download,
  CloudCheck,
} from 'lucide-react';

const DEFAULT_LOCATION: GeoLocation = {
  id: 2988507,
  name: 'Paris',
  country: 'France',
  country_code: 'FR',
  latitude: 48.8534,
  longitude: 2.3488,
  timezone: 'Europe/Paris',
};

export default function App() {
  const [currentLocation, setCurrentLocation] = useState<GeoLocation>(() => {
    try {
      const saved = localStorage.getItem('gw_last_location');
      return saved ? JSON.parse(saved) : DEFAULT_LOCATION;
    } catch {
      return DEFAULT_LOCATION;
    }
  });

  const [weather, setWeather] = useState<ProcessedWeather | null>(() => {
    try {
      const cached = localStorage.getItem('gw_weather_cache');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(!weather);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  const [unit, setUnit] = useState<TemperatureUnit>(() => {
    try {
      const saved = localStorage.getItem('gw_unit');
      return (saved as TemperatureUnit) || 'celsius';
    } catch {
      return 'celsius';
    }
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('gw_theme');
      return (saved as ThemeMode) || 'light';
    } catch {
      return 'light';
    }
  });

  const [favorites, setFavorites] = useState<GeoLocation[]>(() => {
    try {
      const saved = localStorage.getItem('gw_favorites');
      return saved
        ? JSON.parse(saved)
        : [
            { id: 2988507, name: 'Paris', country: 'France', latitude: 48.8534, longitude: 2.3488, timezone: 'Europe/Paris' },
            { id: 5128581, name: 'New York', country: 'United States', admin1: 'New York', latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' },
            { id: 1850147, name: 'Tokyo', country: 'Japan', latitude: 35.6895, longitude: 139.6917, timezone: 'Asia/Tokyo' },
          ];
    } catch {
      return [];
    }
  });

  const [platformView, setPlatformView] = useState<'web' | 'mobile' | 'extension'>('web');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isSimulatedAlertActive, setIsSimulatedAlertActive] = useState(false);

  // Sync dark class on HTML root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    localStorage.setItem('gw_theme', theme);
  }, [theme]);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch weather data
  const loadWeather = useCallback(
    async (location: GeoLocation, showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setError(null);

      try {
        const data = await fetchWeather(location, {
          temperature: unit,
          windSpeed: unit === 'celsius' ? 'kmh' : 'mph',
          precipitation: unit === 'celsius' ? 'mm' : 'inch',
        });
        setWeather(data);
        localStorage.setItem('gw_weather_cache', JSON.stringify(data));
        localStorage.setItem('gw_last_location', JSON.stringify(location));
      } catch (err) {
        console.error('Failed to load weather:', err);
        setError('Unable to reach Open-Meteo weather servers. Showing cached data if available.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [unit]
  );

  // Service Worker Background Sync integration: automatically syncs cached weather on reconnect
  const backgroundSync = useBackgroundSync({
    currentLocation,
    unit,
    onAutoSyncCompleted: () => {
      console.log('[App] Background Sync event completed. Reloading fresh weather data.');
      loadWeather(currentLocation, false);
    },
  });

  // Load weather whenever location or unit changes
  useEffect(() => {
    loadWeather(currentLocation, !weather);
  }, [currentLocation, unit]);

  // Toggle favorite location
  const handleToggleFavorite = (loc: GeoLocation) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === loc.id || (Math.abs(f.latitude - loc.latitude) < 0.05 && Math.abs(f.longitude - loc.longitude) < 0.05));
      const next = exists ? prev.filter((f) => f.id !== loc.id) : [...prev, loc];
      localStorage.setItem('gw_favorites', JSON.stringify(next));
      return next;
    });
  };

  // Unit toggle handler
  const handleToggleUnit = (newUnit: TemperatureUnit) => {
    setUnit(newUnit);
    localStorage.setItem('gw_unit', newUnit);
  };

  // GPS geolocation handler
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const loc = await reverseGeocode(lat, lon);
          setCurrentLocation(loc);
        } catch {
          setCurrentLocation({
            id: Math.round(lat * 1000 + lon),
            name: 'Local Position',
            latitude: lat,
            longitude: lon,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'auto',
          });
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location permission was denied. You can search for any city in the search bar above.');
        } else {
          setError('Unable to retrieve your current location. Please try again or search manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadWeather(currentLocation, false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 flex flex-col justify-between selection:bg-blue-500/20">
      {/* Platform view frame container */}
      <div
        className={`w-full mx-auto transition-all duration-300 ${
          platformView === 'mobile'
            ? 'max-w-[420px] my-6 rounded-[44px] border-[10px] border-slate-800 dark:border-slate-700 shadow-2xl overflow-hidden bg-white dark:bg-slate-900 min-h-[840px]'
            : platformView === 'extension'
            ? 'max-w-[390px] my-6 rounded-3xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl overflow-hidden bg-white dark:bg-slate-900'
            : 'max-w-6xl'
        }`}
      >
        {/* Offline Banner */}
        {isOffline && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-500 py-2 px-4 text-xs font-semibold text-white shadow-sm">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>You are currently offline. Displaying cached weather forecast.</span>
            </div>
            <button
              id="offline-banner-sync-info-btn"
              type="button"
              onClick={() => setShowSyncModal(true)}
              className="flex items-center gap-1.5 rounded-md bg-amber-600/80 px-2 py-1 text-[11px] text-white hover:bg-amber-700 transition"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Auto-sync enabled on reconnect</span>
            </button>
          </div>
        )}

        {/* Global Header */}
        <WeatherHeader
          currentLocation={currentLocation}
          onSelectLocation={(loc) => setCurrentLocation(loc)}
          onUseCurrentLocation={handleUseCurrentLocation}
          isLocating={isLocating}
          unit={unit}
          onToggleUnit={handleToggleUnit}
          theme={theme}
          onToggleTheme={(t) => setTheme(t)}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          platformView={platformView}
          onSelectPlatformView={(v) => setPlatformView(v)}
          date={weather?.updatedAt || new Date()}
          onOpenSyncModal={() => setShowSyncModal(true)}
          isOffline={isOffline}
          isSyncing={backgroundSync.isSyncing}
        />

        {/* Background Sync Reconnection Toast Notification */}
        {backgroundSync.syncNotification && (
          <div
            id="bg-sync-toast-notification"
            className="mx-4 md:mx-6 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs md:text-sm text-emerald-800 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <div className="flex items-center gap-2.5">
              <CloudCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">{backgroundSync.syncNotification}</span>
            </div>
            <button
              type="button"
              onClick={backgroundSync.dismissSyncNotification}
              className="shrink-0 font-bold underline hover:text-emerald-950 dark:hover:text-emerald-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="px-4 py-4 md:px-6 space-y-5">
          {/* Error Notification */}
          {error && (
            <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs md:text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="font-bold underline ml-2 shrink-0 hover:text-rose-950 dark:hover:text-rose-100"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Loading Skeleton or Weather Content */}
          {isLoading && !weather ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-36 rounded-3xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800" />
            </div>
          ) : weather ? (
            <>
              {/* Live Weather Warnings & Severe Alerts Banner (Above Current Weather Card) */}
              <WeatherAlertsBanner
                alerts={
                  isSimulatedAlertActive
                    ? [
                        getSimulatedSevereStormAlert({
                          temperature: unit,
                          windSpeed: unit === 'celsius' ? 'kmh' : 'mph',
                          precipitation: unit === 'celsius' ? 'mm' : 'inch',
                        }),
                        ...(weather.alerts || []),
                      ]
                    : weather.alerts || []
                }
                unit={unit}
                onSimulateSevereAlert={() => setIsSimulatedAlertActive((prev) => !prev)}
                isSimulatedActive={isSimulatedAlertActive}
              />

              {/* Current Hero */}
              <CurrentWeatherHero weather={weather} unit={unit} />

              {/* Gemini-Powered Weather Insights Section */}
              <WeatherInsightsSection weather={weather} unit={unit} />

              {/* Hourly Forecast Ribbon */}
              <HourlyForecastRibbon hourly={weather.hourly} unit={unit} />

              {/* 10-Day Extended Forecast */}
              <DailyForecastList daily={weather.daily} unit={unit} />

              {/* Dynamic Interactive Weather Radar & Cloud Map */}
              <InteractiveWeatherMap
                location={weather.location}
                weather={weather}
                unit={unit}
                isDark={theme === 'dark'}
              />

              {/* Bento Grid: Air Quality, UV, Wind, Solar Arc, Humidity, Pressure */}
              <WeatherDetailsGrid weather={weather} unit={unit} />
            </>
          ) : null}
        </main>
      </div>

      {/* Global Footer & Open-Meteo Attribution */}
      <footer className="w-full border-t border-slate-200/80 bg-white/70 py-6 px-4 text-center text-xs text-slate-500 backdrop-blur-xs transition-colors dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CloudSun className="h-4 w-4 text-blue-500" />
            <span>
              Weather data provided with high precision by{' '}
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                Open-Meteo
              </a>
            </span>
          </div>

          {/* Action links */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs">
            <button
              id="footer-install-pwa-btn"
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install PWA (Add to Home Screen)</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="flex items-center gap-1 font-medium text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Multi-Platform Guide</span>
            </button>
            <span>•</span>
            <span className="text-slate-400">Google Standards Design</span>
          </div>
        </div>
      </footer>

      {/* Cross Platform Guide Modal */}
      <CrossPlatformGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      {/* Service Worker Background Sync Modal */}
      <BackgroundSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        syncState={backgroundSync}
        isOffline={isOffline}
        location={currentLocation}
        onManualRefresh={handleRefresh}
      />
    </div>
  );
}
