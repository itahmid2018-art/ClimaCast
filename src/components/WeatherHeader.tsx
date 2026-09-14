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
import { GeoLocation, TemperatureUnit, ThemeMode, ProcessedWeather, SavedLocationNotificationSettings } from '../types';
import { searchLocations } from '../services/weatherApi';
import { resolvePostalLocation } from '../services/userProfileApi';
import { calculateMoonPhase } from '../utils/astronomy';
import { MoonPhaseIcon } from './MoonPhaseIcon';
import { ExportReport } from './ExportReport';
import { getWeatherEmoji } from '../utils/weatherCodes';
import { SavedLocationsModal } from './SavedLocationsModal';

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
  onOpenEarthModal?: () => void;
  notificationSettings?: SavedLocationNotificationSettings;
  onUpdateNotificationSettings?: (settings: SavedLocationNotificationSettings) => void;
  onNotificationDispatched?: (title: string, body: string, type: 'alarming_weather' | 'morning_tip') => void;
  onOpenPostalModal?: () => void;
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
  onOpenEarthModal,
  notificationSettings = {
    enabled: true,
    morningTipEnabled: true,
    severeAlertsOnly: true,
  },
  onUpdateNotificationSettings,
  onNotificationDispatched,
  onOpenPostalModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);
  const [postalResult, setPostalResult] = useState<{ location: GeoLocation; source: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showMoonDetails, setShowMoonDetails] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moonPopoverRef = useRef<HTMLDivElement>(null);

  const moonPhase = calculateMoonPhase(date || new Date());
  const weatherEmoji = weather ? getWeatherEmoji(weather.current.weatherCode, weather.current.isDay) : '☀️';

  const isFav = favorites.some((f) => f.id === currentLocation.id || (Math.abs(f.latitude - currentLocation.latitude) < 0.05 && Math.abs(f.longitude - currentLocation.longitude) < 0.05));

  // Scroll detection to collapse header to logo + search bar with hysteresis & requestAnimationFrame
  const isScrolledRef = useRef(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const offset = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
          // Hysteresis buffer:
          // To collapse: Must scroll down past 40px
          // To expand: Must scroll back up near top (< 15px)
          const shouldCollapse = isScrolledRef.current ? offset > 15 : offset > 40;
          
          if (shouldCollapse !== isScrolledRef.current) {
            isScrolledRef.current = shouldCollapse;
            setIsScrolled(shouldCollapse);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Search debounce with Postal PIN / ZIP resolution
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setPostalResult(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const trimmed = searchQuery.trim();
      const isLikelyPostal = /^[0-9A-Za-z\s-]{3,10}$/.test(trimmed) && /\d/.test(trimmed);

      try {
        const [normalResults, postalGeo] = await Promise.all([
          searchLocations(trimmed),
          isLikelyPostal
            ? resolvePostalLocation(trimmed).catch(() => null)
            : Promise.resolve(null),
        ]);

        setSearchResults(normalResults);
        setPostalResult(postalGeo);
      } catch (err) {
        console.warn('Search error', err);
      } finally {
        setIsSearching(false);
        setIsDropdownOpen(true);
      }
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

  const renderSearchBar = (isCompact = false) => (
    <div ref={dropdownRef} className={`relative w-full ${isCompact ? 'max-w-2xl' : 'max-w-2xl mx-auto'}`}>
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
          className="h-10 md:h-11 w-full rounded-2xl border border-slate-200 bg-white/90 pl-10 pr-24 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-800 transition"
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
              Searching global locations & postal codes...
            </div>
          ) : (postalResult || searchResults.length > 0) ? (
            <div className="max-h-80 overflow-y-auto py-1">
              {/* High-Precision WTTR / Postal PIN Result */}
              {postalResult && (
                <button
                  type="button"
                  onClick={() => handlePickLocation(postalResult.location)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm bg-blue-50/80 hover:bg-blue-100/90 dark:bg-blue-950/50 dark:hover:bg-blue-900/70 border-b border-blue-100 dark:border-blue-900/50 transition group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                      <Compass className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {postalResult.location.name}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded">
                          Postal / WTTR
                        </span>
                      </div>
                      <span className="text-xs text-blue-700 dark:text-blue-300">
                        {[postalResult.location.admin1, postalResult.location.country].filter(Boolean).join(', ')} • Precise {postalResult.source} match
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {postalResult.location.latitude.toFixed(2)}°, {postalResult.location.longitude.toFixed(2)}°
                  </span>
                </button>
              )}

              {/* Standard Locations List */}
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
  );

  return (
    <div className="w-full">
      {/* Sticky Top Navigation Header - Always transparent matching the page, zero rectangular background */}
      <header
        id="top-nav-header"
        className="sticky top-0 z-50 w-full px-4 md:px-6 py-2.5 bg-transparent border-transparent shadow-none transition-all duration-200"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 md:gap-4 w-full">
          {/* Logo on the left */}
          <button
            id="header-logo-btn"
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 shrink-0 text-left group transition hover:opacity-90 cursor-pointer"
            title="ClimaCast - Scroll to top"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <Sun className="h-5 w-5 animate-spin-slow text-amber-300" />
            </div>
            <span className="font-semibold tracking-tight text-slate-900 dark:text-white text-base md:text-lg whitespace-nowrap">
              ClimaCast
            </span>
          </button>

          {/* Search Bar - ALWAYS directly next to Logo, never jumps or remounts */}
          <div className="flex-1 min-w-0">
            {renderSearchBar(true)}
          </div>

          {/* Action Controls - Visible in full view, smoothly collapses on scroll so strictly Logo and Search Bar stay pinned */}
          <div
            id="header-action-controls"
            className={`flex items-center gap-1.5 md:gap-2 shrink-0 transition-all duration-300 ease-in-out ${
              isScrolled
                ? 'opacity-0 max-w-0 pointer-events-none overflow-hidden scale-95'
                : 'opacity-100 max-w-3xl scale-100'
            }`}
          >
            {/* View Mode Selector (Web, Mobile App, Chrome Extension Popup) */}
            <div className="hidden lg:flex items-center rounded-xl bg-slate-200/70 p-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
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
              <div className="hidden xl:block">
                <ExportReport weather={weather} unit={unit} />
              </div>
            )}

            {/* 3D Earth & Google Street View / Maps Exploration */}
            {onOpenEarthModal && (
              <button
                id="earth-3d-header-btn"
                type="button"
                onClick={onOpenEarthModal}
                className="hidden sm:flex h-9 items-center gap-1.5 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/90 to-sky-50/90 px-2.5 text-xs font-semibold text-blue-900 shadow-xs backdrop-blur-xs transition-all hover:scale-[1.02] hover:border-blue-400 hover:shadow-sm active:scale-[0.98] dark:border-blue-800/80 dark:bg-gradient-to-r dark:from-blue-950/60 dark:via-indigo-950/60 dark:to-sky-950/60 dark:text-blue-200"
                title="Explore 3D Earth & Google Street View"
              >
                <div className="relative flex items-center justify-center">
                  <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin-slow" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <span className="hidden md:inline font-bold">3D Earth</span>
                {weather && (
                  <span className="flex items-center gap-1 rounded-md bg-white/80 dark:bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:text-slate-300">
                    <span>{weatherEmoji}</span>
                    <span>{weather.current.temperature}°</span>
                  </span>
                )}
              </button>
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

            {/* WTTR.in Postal Weather Predictor button */}
            {onOpenPostalModal && (
              <button
                id="postal-weather-btn"
                type="button"
                onClick={onOpenPostalModal}
                className="hidden sm:flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 px-2.5 text-xs font-semibold text-blue-700 shadow-xs transition hover:from-blue-100 hover:to-indigo-100 dark:from-blue-950/60 dark:to-indigo-950/40 dark:text-blue-300 dark:hover:from-blue-900/80 dark:hover:to-indigo-900/60 border border-blue-200/60 dark:border-blue-800/60"
                title="WTTR.in Postal Prediction: Lookup weather by PIN / ZIP code with regional user-db.json"
              >
                <Compass className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="hidden md:inline font-bold">ZIP / PIN</span>
              </button>
            )}

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
                className={`hidden xl:flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold shadow-xs transition ${
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
                <span className="text-[11px]">
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
      </header>

      {/* Sub-bar: Moon Phase & Quick Navigation Menu (scrolls off naturally with page, or fades when scrolled) */}
      <div
        id="header-sub-menu"
        className={`px-4 md:px-6 pb-2 transition-all duration-300 ${
          isScrolled ? 'opacity-0 max-h-0 overflow-hidden pointer-events-none' : 'opacity-100 max-h-24'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between flex-wrap gap-2 pt-1">
          {/* Left: Moon Phase & Provider badge */}
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-100/80 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              Open-Meteo
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
              PWA • Multi-Platform
            </span>

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

          {/* Right: Quick Navigation Menu */}
          <div className="flex items-center justify-center flex-wrap gap-1.5">
            <button onClick={() => document.getElementById('current-weather-hero')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase rounded-full bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50">Current</button>
            <button onClick={() => document.getElementById('hourly-forecast-card')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase rounded-full bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50">Hourly</button>
            <button onClick={() => document.getElementById('daily-forecast-card')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase rounded-full bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50">10-Day</button>
            <button onClick={() => document.getElementById('weather-details-grid')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase rounded-full bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50">AQI & Details</button>
            <button onClick={() => document.getElementById('weather-map-section')?.scrollIntoView({ behavior: 'smooth' })} className="px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase rounded-full bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50">Radar Map</button>
          </div>
        </div>
      </div>

      {/* Saved Locations & Smart Notifications Modal */}
      <SavedLocationsModal
        isOpen={showFavoritesModal}
        onClose={() => setShowFavoritesModal(false)}
        favorites={favorites}
        onSelectLocation={(loc) => {
          onSelectLocation(loc);
          setShowFavoritesModal(false);
        }}
        onToggleFavorite={onToggleFavorite}
        notificationSettings={notificationSettings}
        onUpdateNotificationSettings={onUpdateNotificationSettings || (() => {})}
        onNotificationDispatched={onNotificationDispatched}
      />
    </div>
  );
};
