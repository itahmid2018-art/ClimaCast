/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Compass,
  Sun,
  Moon,
  Bookmark,
  BookmarkCheck,
  Smartphone,
  Layers,
  Globe,
  Loader2,
  X,
  RefreshCw,
  CloudCheck,
  Settings,
} from 'lucide-react';
import { GeoLocation, TemperatureUnit, ThemeMode, ProcessedWeather } from '../types';
import { searchLocations } from '../services/weatherApi';
import { calculateMoonPhase } from '../utils/astronomy';
import { MoonPhaseIcon } from './MoonPhaseIcon';
import { ExportReport } from './ExportReport';

interface WeatherHeaderProps {
  currentLocation: GeoLocation;
  onSelectLocation: (loc: GeoLocation) => void;
  onUseCurrentLocation: () => void;
  isLocating: boolean;
  unit: TemperatureUnit;
  onToggleUnit: (u: TemperatureUnit) => void;
  theme: ThemeMode;
  onToggleTheme: (t: ThemeMode) => void;
  favorites: GeoLocation[];
  onToggleFavorite: (loc: GeoLocation) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  platformView: 'web' | 'mobile' | 'extension';
  onSelectPlatformView: (v: 'web' | 'mobile' | 'extension') => void;
  date?: Date | string;
  onOpenSyncModal?: () => void;
  isOffline?: boolean;
  isSyncing?: boolean;
  onOpenSettings: () => void;
  weather?: ProcessedWeather;
}

export const WeatherHeader: React.FC<WeatherHeaderProps> = ({
  currentLocation,
  onSelectLocation,
  onUseCurrentLocation,
  isLocating,
  unit,
  onToggleUnit,
  theme,
  onToggleTheme,
  favorites,
  onToggleFavorite,
  onRefresh,
  isRefreshing,
  platformView,
  onSelectPlatformView,
  date,
  onOpenSyncModal,
  isOffline = false,
  isSyncing = false,
  onOpenSettings,
  weather,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showMoonDetails, setShowMoonDetails] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moonPopoverRef = useRef<HTMLDivElement>(null);

  const moonPhase = calculateMoonPhase(date || new Date());

  const isFav = favorites.some((f) => f.id === currentLocation.id || (Math.abs(f.latitude - currentLocation.latitude) < 0.05 && Math.abs(f.longitude - currentLocation.longitude) < 0.05));

  // Search debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
      setIsDropdownOpen(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close search dropdown or moon phase popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (moonPopoverRef.current && !moonPopoverRef.current.contains(event.target as Node)) {
        setShowMoonDetails(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePickLocation = (loc: GeoLocation) => {
    onSelectLocation(loc);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full px-4 pt-4 pb-2 md:px-6 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-transparent shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Logo / Title + Astronomical Moon Phase */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-500/30">
                <Sun className="h-5 w-5 animate-spin-slow text-amber-300" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold tracking-tight text-slate-900 dark:text-white text-base md:text-lg">
                    ClimaCast
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    Open-Meteo
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  PWA • Android/iOS • Chrome Add-on
                </span>
              </div>
            </div>

            {/* Astronomical Moon Phase Chip & Interactive Details */}
            <div ref={moonPopoverRef} className="relative">
              <button
                id="header-moon-phase-badge"
                type="button"
                onClick={() => setShowMoonDetails((prev) => !prev)}
                className="flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs backdrop-blur-xs transition hover:border-blue-400 hover:bg-white hover:text-blue-600 dark:border-slate-700/90 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:bg-slate-700"
                title={`Astronomical Data: ${moonPhase.name} (${moonPhase.illumination}% illuminated). Click for lunar breakdown.`}
              >
                <MoonPhaseIcon phase={moonPhase.code} className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold text-[11px]">{moonPhase.name}</span>
                <span className="rounded-md bg-slate-100 dark:bg-slate-700/60 px-1 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {moonPhase.illumination}%
                </span>
              </button>

              {/* Astronomical Moon Details Popover */}
              {showMoonDetails && (
                <div
                  id="moon-phase-popover"
                  className="absolute left-0 top-9 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl transition-all dark:border-slate-700 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-700/70">
                    <div className="flex items-center gap-2">
                      <MoonPhaseIcon phase={moonPhase.code} className="h-5 w-5 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {moonPhase.name}
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          Astronomical Lunar Data
                        </span>
                      </div>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                      {moonPhase.isWaxing ? 'Waxing' : 'Waning'}
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {moonPhase.description}
                  </p>

                  <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-900/50">
                    <div>
                      <div className="flex justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        <span>Illumination</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {moonPhase.illumination}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-300"
                          style={{ width: `${moonPhase.illumination}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                      <span>Lunar Cycle Age</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        Day {moonPhase.ageDays} of 29.5
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                      <span>Next Major Phase</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {moonPhase.nextMajorPhase.name} (~{moonPhase.nextMajorPhase.daysRemaining}d)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Controls: Platform Preview Mode, Favorites, Units, Refresh, Theme */}
          <div className="flex items-center gap-2">
            {/* View Mode Selector (Web, Mobile App, Chrome Extension Popup) */}
            <div className="hidden sm:flex items-center rounded-xl bg-slate-200/70 p-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              <button
                id="view-web-btn"
                type="button"
                onClick={() => onSelectPlatformView('web')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
                  platformView === 'web'
                    ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Full Web App layout"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Web</span>
              </button>
              <button
                id="view-mobile-btn"
                type="button"
                onClick={() => onSelectPlatformView('mobile')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
                  platformView === 'mobile'
                    ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Mobile Screen (Capacitor Android / iOS layout)"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Mobile</span>
              </button>
              <button
                id="view-extension-btn"
                type="button"
                onClick={() => onSelectPlatformView('extension')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 transition-all ${
                  platformView === 'extension'
                    ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Chrome Addon popup view (380px compact)"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Extension</span>
              </button>
            </div>
            
            {/* Export Report */}
            {weather && (
              <div className="hidden sm:block">
                <ExportReport weather={weather} unit={unit} />
              </div>
            )}

            {/* Favorite toggle */}
            <button
              id="favorite-btn"
              type="button"
              onClick={() => onToggleFavorite(currentLocation)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-600 shadow-xs transition hover:bg-white hover:text-amber-500 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
              title={isFav ? 'Remove from saved locations' : 'Save location'}
            >
              {isFav ? (
                <BookmarkCheck className="h-4 w-4 text-amber-500" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>

            {/* Saved list drawer button */}
            <button
              id="saved-locations-btn"
              type="button"
              onClick={() => setShowFavoritesModal(true)}
              className="relative flex h-9 items-center gap-1.5 rounded-xl bg-white/80 px-2.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-white dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
              title="View saved locations"
            >
              <MapPin className="h-3.5 w-3.5 text-blue-500" />
              <span className="hidden md:inline">Saved</span>
              {favorites.length > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Refresh button */}
            <button
              id="refresh-weather-btn"
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-600 shadow-xs transition hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
              title="Refresh weather data"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
            </button>

            {/* Settings button */}
            <button
              id="settings-btn"
              type="button"
              onClick={onOpenSettings}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-600 shadow-xs transition hover:bg-white hover:text-blue-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
              title="Settings & Preferences"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Background Sync & Offline Status */}
            {onOpenSyncModal && (
              <button
                id="background-sync-header-btn"
                type="button"
                onClick={onOpenSyncModal}
                className={`flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold shadow-xs transition ${
                  isOffline
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300'
                    : isSyncing
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-white/80 text-slate-600 hover:bg-white hover:text-blue-600 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
                title="Service Worker Background Sync: Automatically updates cached forecast when network reconnects"
              >
                <CloudCheck
                  className={`h-4 w-4 ${
                    isSyncing
                      ? 'animate-pulse text-blue-500'
                      : isOffline
                      ? 'text-amber-500'
                      : 'text-emerald-500'
                  }`}
                />
                <span className="hidden xl:inline text-[11px]">
                  {isSyncing ? 'Syncing...' : isOffline ? 'Cached' : 'Auto-Sync'}
                </span>
              </button>
            )}

            {/* Unit Toggle (°C / °F) */}
            <div className="flex items-center rounded-xl bg-slate-200/70 p-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              <button
                id="unit-celsius-btn"
                type="button"
                onClick={() => onToggleUnit('celsius')}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  unit === 'celsius'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                °C
              </button>
              <button
                id="unit-fahrenheit-btn"
                type="button"
                onClick={() => onToggleUnit('fahrenheit')}
                className={`rounded-lg px-2.5 py-1 transition-all ${
                  unit === 'fahrenheit'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                °F
              </button>
            </div>

            {/* Light / Dark Mode Toggle */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={() => onToggleTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/80 text-slate-600 shadow-xs transition hover:bg-white hover:text-blue-600 dark:bg-slate-800/80 dark:text-amber-400 dark:hover:bg-slate-700"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Google Style Search Bar */}
        <div ref={dropdownRef} className="relative w-full max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <div className="pointer-events-none absolute left-3.5 flex items-center text-slate-400">
              <Search className="h-4 w-4" />
            </div>

            <input
              id="location-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setIsDropdownOpen(true);
              }}
              placeholder="Search city, district, or airport (e.g. Tokyo, London, New York)..."
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white/90 pl-10 pr-24 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-800"
            />

            {/* Right inline search actions: Clear & GPS button */}
            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              <button
                id="gps-location-btn"
                type="button"
                onClick={onUseCurrentLocation}
                disabled={isLocating}
                className="flex items-center gap-1 rounded-xl bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-950/60 dark:text-blue-400 dark:hover:bg-blue-900/60"
                title="Use current GPS location"
              >
                {isLocating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Compass className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">GPS</span>
              </button>
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && (
            <div className="absolute left-0 top-12 z-50 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
              {isSearching ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  Searching global locations...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="max-h-72 overflow-y-auto py-1">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handlePickLocation(item)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-700/60"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                        <div className="truncate">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {item.name}
                          </span>
                          <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {[item.admin1, item.country].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] font-mono text-slate-400">
                        {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-slate-500">
                  No places found for &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Navigation Menu */}
        <div className="flex justify-center flex-wrap gap-2 mt-1">
          <button onClick={() => document.getElementById('current-weather-hero')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase rounded-full bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50">Current</button>
          <button onClick={() => document.getElementById('hourly-forecast-card')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase rounded-full bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50">Hourly</button>
          <button onClick={() => document.getElementById('daily-forecast-card')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase rounded-full bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50">10-Day</button>
          <button onClick={() => document.getElementById('weather-details-grid')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase rounded-full bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50">AQI & Details</button>
          <button onClick={() => document.getElementById('weather-map-section')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase rounded-full bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50">Radar Map</button>
        </div>
      </div>

      {/* Saved Locations Modal */}
      {showFavoritesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                  Saved Locations
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFavoritesModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
              {favorites.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No saved locations yet. Tap the bookmark icon on any city to pin it here.
                </p>
              ) : (
                favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3 transition hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectLocation(fav);
                        setShowFavoritesModal(false);
                      }}
                      className="flex items-center gap-2 text-left truncate"
                    >
                      <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                          {fav.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {[fav.admin1, fav.country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(fav)}
                      className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 p-1"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
