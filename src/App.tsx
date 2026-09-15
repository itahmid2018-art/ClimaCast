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
  WeatherInsightData,
  SavedLocationNotificationSettings,
  WeatherWidgetId,
} from './types';
import { fetchWeather, reverseGeocode } from './services/weatherApi';
import {
  fetchSavedLocations,
  saveLocationsToDb,
  evaluateSavedLocationNotifications,
  dispatchWeatherNotification,
} from './services/savedLocationsApi';
import { WeatherHeader } from './components/WeatherHeader';
import { CurrentWeatherHero } from './components/CurrentWeatherHero';
import { HourlyForecastRibbon } from './components/HourlyForecastRibbon';
import { DailyForecastList } from './components/DailyForecastList';
import { WeatherDetailsGrid } from './components/WeatherDetailsGrid';
import { PinnedWidgetsSection } from './components/PinnedWidgetsSection';
import {
  CustomizeWidgetsModal,
  DEFAULT_PINNED_WIDGETS,
  AVAILABLE_WIDGETS,
} from './components/CustomizeWidgetsModal';
import { CrossPlatformGuideModal } from './components/CrossPlatformGuideModal';
import { WeatherAlertsBanner } from './components/WeatherAlertsBanner';
import { WeatherInsightsSection } from './components/WeatherInsightsSection';
import { TipOfTheDayBanner } from './components/TipOfTheDayBanner';
import { InteractiveWeatherMap } from './components/InteractiveWeatherMap';
import { BackgroundSyncModal } from './components/BackgroundSyncModal';
import { SettingsModal } from './components/SettingsModal';
import { PostalWeatherModal } from './components/PostalWeatherModal';
import { fetchUserProfile, resolvePostalLocation } from './services/userProfileApi';
import { Earth3DModal } from './components/Earth3DModal';
import { NewsReportShareModal } from './components/NewsReportShareModal';
import { WeatherBackground } from './components/WeatherBackground';
import { ExportReport } from './components/ExportReport';
import { getWeatherCondition } from './utils/weatherCodes';
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
  Home,
  Code2,
  Info,
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

  const [notificationSettings, setNotificationSettings] = useState<SavedLocationNotificationSettings>(() => {
    try {
      const saved = localStorage.getItem('gw_saved_location_notifs');
      return saved
        ? JSON.parse(saved)
        : {
            enabled: true,
            morningTipEnabled: true,
            severeAlertsOnly: true,
          };
    } catch {
      return {
        enabled: true,
        morningTipEnabled: true,
        severeAlertsOnly: true,
      };
    }
  });

  const [notificationToast, setNotificationToast] = useState<{ title: string; body: string; type: string } | null>(null);

  // Load persistent saved locations and settings from server db.json on mount
  useEffect(() => {
    let mounted = true;
    fetchSavedLocations().then((res) => {
      if (mounted && res.locations && res.locations.length > 0) {
        setFavorites(res.locations);
        if (res.notificationSettings) {
          setNotificationSettings(res.notificationSettings);
        }
      }
    });

    // Check user-db.json for default ZIP / PIN code preference
    fetchUserProfile().then((userDb) => {
      if (!mounted) return;
      if (userDb.profile.defaultZipPin && !localStorage.getItem('gw_last_location')) {
        resolvePostalLocation(userDb.profile.defaultZipPin, userDb.profile.country).then((res) => {
          if (mounted && res?.location) {
            setCurrentLocation(res.location);
          }
        }).catch(() => {});
      }
    }).catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // Periodic Smart Notification Evaluator:
  // "enable notifications only when there is an alarming or odd weather condition, if not just send one notification in the mornig with the tip of the day"
  useEffect(() => {
    if (!notificationSettings.enabled || favorites.length === 0) return;

    const runNotificationCheck = async () => {
      try {
        const result = await evaluateSavedLocationNotifications();
        if (result.notifications && result.notifications.length > 0) {
          for (const notif of result.notifications) {
            await dispatchWeatherNotification(notif.title, notif.body, notif.tag, false);
            setNotificationToast({
              title: notif.title,
              body: notif.body,
              type: notif.type,
            });
            setTimeout(() => setNotificationToast(null), 10000);
          }
        }
      } catch (err) {
        console.warn('Smart notification evaluation failed:', err);
      }
    };

    // Run initial evaluation shortly after startup (3 seconds in)
    const initialTimer = setTimeout(runNotificationCheck, 3000);

    // Periodically re-evaluate every 15 minutes
    const interval = setInterval(runNotificationCheck, 15 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [favorites, notificationSettings]);

  const [platformView, setPlatformView] = useState<'web' | 'mobile' | 'extension'>('web');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPostalModal, setShowPostalModal] = useState(false);
  const [showEarthModal, setShowEarthModal] = useState(false);
  const [showNewsShareModal, setShowNewsShareModal] = useState(false);
  const [isSimulatedAlertActive, setIsSimulatedAlertActive] = useState(false);
  
  const [insights, setInsights] = useState<WeatherInsightData | null>(null);
  const [isTipClosed, setIsTipClosed] = useState(false);

  // Pinned Weather Widgets State
  const [pinnedWidgets, setPinnedWidgets] = useState<WeatherWidgetId[]>(() => {
    try {
      const saved = localStorage.getItem('gw_pinned_widgets');
      return saved ? JSON.parse(saved) : DEFAULT_PINNED_WIDGETS;
    } catch {
      return DEFAULT_PINNED_WIDGETS;
    }
  });
  const [showWidgetModal, setShowWidgetModal] = useState(false);

  // Android hardware/gesture back button handler to dismiss open modals smoothly
  useEffect(() => {
    const handleBackButton = (e: Event) => {
      if (showSettingsModal) {
        e.preventDefault();
        setShowSettingsModal(false);
      } else if (showPostalModal) {
        e.preventDefault();
        setShowPostalModal(false);
      } else if (showGuideModal) {
        e.preventDefault();
        setShowGuideModal(false);
      } else if (showSyncModal) {
        e.preventDefault();
        setShowSyncModal(false);
      } else if (showEarthModal) {
        e.preventDefault();
        setShowEarthModal(false);
      } else if (showNewsShareModal) {
        e.preventDefault();
        setShowNewsShareModal(false);
      } else if (showWidgetModal) {
        e.preventDefault();
        setShowWidgetModal(false);
      }
    };

    document.addEventListener('backbutton', handleBackButton);
    return () => {
      document.removeEventListener('backbutton', handleBackButton);
    };
  }, [
    showSettingsModal,
    showPostalModal,
    showGuideModal,
    showSyncModal,
    showEarthModal,
    showNewsShareModal,
    showWidgetModal,
  ]);

  const handleTogglePin = useCallback((id: WeatherWidgetId) => {
    setPinnedWidgets((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('gw_pinned_widgets', JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save pinned widgets', err);
      }
      return next;
    });
  }, []);

  const handleResetDefaultWidgets = useCallback(() => {
    setPinnedWidgets(DEFAULT_PINNED_WIDGETS);
    try {
      localStorage.setItem('gw_pinned_widgets', JSON.stringify(DEFAULT_PINNED_WIDGETS));
    } catch (err) {
      console.warn(err);
    }
  }, []);

  const handlePinAllWidgets = useCallback(() => {
    const allIds = AVAILABLE_WIDGETS.map((w) => w.id);
    setPinnedWidgets(allIds);
    try {
      localStorage.setItem('gw_pinned_widgets', JSON.stringify(allIds));
    } catch (err) {
      console.warn(err);
    }
  }, []);

  const handleClearAllWidgets = useCallback(() => {
    setPinnedWidgets([]);
    try {
      localStorage.setItem('gw_pinned_widgets', JSON.stringify([]));
    } catch (err) {
      console.warn(err);
    }
  }, []);

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

  // Toggle favorite location and synchronize with db.json
  const handleToggleFavorite = (loc: GeoLocation) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === loc.id || (Math.abs(f.latitude - loc.latitude) < 0.05 && Math.abs(f.longitude - loc.longitude) < 0.05));
      const next = exists ? prev.filter((f) => f.id !== loc.id) : [...prev, loc];
      // Save directly to db.json via API and backup to localStorage
      saveLocationsToDb(next, notificationSettings);
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

  const backgroundCategory = weather 
    ? getWeatherCondition(weather.current.weatherCode, weather.current.isDay).backgroundCategory 
    : 'clear-day';

  return (
    <div className="min-h-screen text-slate-900 transition-colors duration-500 ease-in-out dark:text-slate-100 flex flex-col justify-between selection:bg-blue-500/20 relative">
      <WeatherBackground category={backgroundCategory} />
      
      {/* Platform view frame container */}
      <div
        className={`w-full mx-auto transition-all duration-300 relative z-10 ${
          platformView === 'mobile'
            ? 'max-w-[420px] my-6 rounded-[44px] border-[10px] border-slate-800 dark:border-slate-700 shadow-2xl overflow-hidden min-h-[840px] bg-white/20 dark:bg-slate-950/20 backdrop-blur-3xl'
            : platformView === 'extension'
            ? 'max-w-[390px] my-6 rounded-3xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl overflow-hidden bg-white/20 dark:bg-slate-950/20 backdrop-blur-3xl'
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
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenPostalModal={() => setShowPostalModal(true)}
          weather={weather || undefined}
          onOpenEarthModal={() => setShowEarthModal(true)}
          onOpenNewsShareModal={() => setShowNewsShareModal(true)}
          notificationSettings={notificationSettings}
          onUpdateNotificationSettings={(newSettings) => {
            setNotificationSettings(newSettings);
            saveLocationsToDb(favorites, newSettings);
          }}
          onNotificationDispatched={(title, body, type) => {
            setNotificationToast({ title, body, type });
            setTimeout(() => setNotificationToast(null), 10000);
          }}
        />

        {/* Smart Weather Notification Dispatch Toast */}
        {notificationToast && (
          <div
            id="smart-weather-notification-toast"
            className={`mx-4 md:mx-6 mt-3 flex items-start justify-between gap-3 rounded-2xl border p-3.5 text-xs md:text-sm shadow-md animate-in fade-in slide-in-from-top-2 duration-300 ${
              notificationToast.type === 'alarming_weather'
                ? 'border-rose-300 bg-rose-50/95 text-rose-900 dark:border-rose-800 dark:bg-rose-950/80 dark:text-rose-100'
                : 'border-amber-300 bg-amber-50/95 text-amber-900 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-100'
            }`}
          >
            <div>
              <p className="font-bold">{notificationToast.title}</p>
              <p className="mt-0.5 text-xs opacity-90 leading-relaxed">{notificationToast.body}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotificationToast(null)}
              className="shrink-0 font-semibold underline opacity-80 hover:opacity-100 ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

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
              {/* Tip of the Day Banner */}
              <TipOfTheDayBanner 
                insights={insights} 
                weather={weather} 
                isTipClosed={isTipClosed} 
                setIsTipClosed={setIsTipClosed} 
              />
              
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
              <CurrentWeatherHero
                weather={weather}
                unit={unit}
                onOpenNewsShare={() => setShowNewsShareModal(true)}
              />

              {/* Pinned Widgets Section (Quick Access) */}
              <PinnedWidgetsSection
                weather={weather}
                unit={unit}
                pinnedWidgets={pinnedWidgets}
                onTogglePin={handleTogglePin}
                onOpenCustomize={() => setShowWidgetModal(true)}
              />

              {/* Gemini-Powered Weather Insights Section */}
              <WeatherInsightsSection 
                weather={weather} 
                unit={unit} 
                onInsightsLoaded={(data) => {
                  setInsights(data);
                  setIsTipClosed(false);
                }} 
              />

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
              <WeatherDetailsGrid
                weather={weather}
                unit={unit}
                pinnedWidgets={pinnedWidgets}
                onTogglePin={handleTogglePin}
              />
            </>
          ) : null}
        </main>
      </div>

      {/* Global Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white/70 py-5 px-4 text-center text-xs text-slate-500 backdrop-blur-xs transition-colors dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-400">
            <CloudSun className="h-4 w-4 text-blue-500" />
            <span>ClimaCast Weather Intelligence</span>
          </div>

          {/* Action links */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs">
            <button
              id="footer-install-pwa-btn"
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
            >
              <Home className="h-3.5 w-3.5 text-blue-500" />
              <span>Add to Home</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <button
              id="footer-developers-btn"
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
            >
              <Code2 className="h-3.5 w-3.5 text-indigo-500" />
              <span>Developers</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <a
              id="footer-about-link"
              href="/about.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
            >
              <Info className="h-3.5 w-3.5 text-emerald-500" />
              <span>About</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Cross Platform Guide Modal */}
      <CrossPlatformGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          onClose={() => setShowSettingsModal(false)}
          unit={unit}
          onToggleUnit={handleToggleUnit}
          theme={theme}
          onToggleTheme={(t) => setTheme(t)}
          platformView={platformView}
          onSelectPlatformView={(v) => setPlatformView(v)}
          onSelectLocation={(loc) => setCurrentLocation(loc)}
        />
      )}

      {/* WTTR.in Precision Postal & PIN Code Weather Modal */}
      <PostalWeatherModal
        isOpen={showPostalModal}
        onClose={() => setShowPostalModal(false)}
        onSelectLocation={(loc) => setCurrentLocation(loc)}
        onOpenSettings={() => setShowSettingsModal(true)}
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

      {/* 3D Earth & Google Street View / Maps Exploration Modal */}
      <Earth3DModal
        isOpen={showEarthModal}
        onClose={() => setShowEarthModal(false)}
        location={currentLocation}
        weather={weather || undefined}
        unit={unit}
      />

      {/* Customize Widgets Modal */}
      <CustomizeWidgetsModal
        isOpen={showWidgetModal}
        onClose={() => setShowWidgetModal(false)}
        pinnedWidgets={pinnedWidgets}
        onToggleWidget={handleTogglePin}
        onResetDefaults={handleResetDefaultWidgets}
        onPinAll={handlePinAllWidgets}
        onClearAll={handleClearAllWidgets}
      />

      {/* News Report Sharing Modal (WhatsApp, Twilio, Email, SMS, Web Share) */}
      {weather && (
        <NewsReportShareModal
          isOpen={showNewsShareModal}
          onClose={() => setShowNewsShareModal(false)}
          weather={weather}
          unit={unit}
        />
      )}
    </div>
  );
}
