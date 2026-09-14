/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Globe,
  Compass,
  Terminal,
  Search,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Trash2,
  BookmarkPlus,
  RefreshCw,
  Loader2,
  Sliders,
  Wind,
  Droplets,
  Gauge,
  Sun,
  Umbrella,
} from 'lucide-react';
import { GeoLocation, UserProfile, SavedPostalPin, WttrWeatherReport } from '../types';
import {
  fetchUserProfile,
  saveUserProfile,
  savePostalPin,
  deletePostalPin,
  resolvePostalLocation,
  fetchWttrWeather,
} from '../services/userProfileApi';

interface PostalWeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocation: (loc: GeoLocation) => void;
  onOpenSettings?: () => void;
}

export const PostalWeatherModal: React.FC<PostalWeatherModalProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  onOpenSettings,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [savedPins, setSavedPins] = useState<SavedPostalPin[]>([]);
  const [pinCode, setPinCode] = useState('');
  const [countryOverride, setCountryOverride] = useState('');
  const [stateOverride, setStateOverride] = useState('');
  const [showOverrides, setShowOverrides] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState<GeoLocation | null>(null);
  const [resolvedSource, setResolvedSource] = useState<string>('');
  const [wttrReport, setWttrReport] = useState<WttrWeatherReport | null>(null);
  const [activeView, setActiveView] = useState<'cards' | 'ascii'>('cards');
  const [isSavedInDb, setIsSavedInDb] = useState(false);

  // Load user-db.json profile on open
  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      const data = await fetchUserProfile();
      setProfile(data.profile);
      setSavedPins(data.savedZipPins || []);
      if (!pinCode && data.profile.defaultZipPin) {
        setPinCode(data.profile.defaultZipPin);
      }
      setCountryOverride(data.profile.country || 'United States');
      setStateOverride(data.profile.state || 'California');
    } catch (err) {
      console.warn('Failed to load user-db.json profile', err);
    }
  };

  const handleLookup = async (codeToLookup?: string) => {
    const code = (codeToLookup || pinCode).trim();
    if (!code) {
      setError('Please enter a valid ZIP or PIN code');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResolvedLocation(null);
    setWttrReport(null);
    setIsSavedInDb(false);

    try {
      // 1. Resolve exact coordinates via our multi-tier postal geocoder
      const activeCountry = countryOverride || profile?.country || 'United States';
      const activeState = stateOverride || profile?.state || '';

      const geoResult = await resolvePostalLocation(code, activeCountry, activeState);
      setResolvedLocation(geoResult.location);
      setResolvedSource(geoResult.source);

      // Check if already in savedPins
      const exists = savedPins.some((p) => p.code.toUpperCase() === code.toUpperCase());
      setIsSavedInDb(exists);

      // 2. Fetch live WTTR.in format=j1 prediction report
      try {
        const wttrData = await fetchWttrWeather(code);
        setWttrReport(wttrData);
      } catch (wttrErr) {
        console.warn('WTTR.in report warning:', wttrErr);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to resolve postal code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePinToDb = async () => {
    if (!resolvedLocation) return;
    const pin: SavedPostalPin = {
      code: pinCode.trim(),
      name: resolvedLocation.name,
      state: resolvedLocation.admin1 || stateOverride || profile?.state || '',
      country: resolvedLocation.country || countryOverride || profile?.country || '',
      latitude: resolvedLocation.latitude,
      longitude: resolvedLocation.longitude,
    };

    try {
      const updated = await savePostalPin(pin);
      setSavedPins(updated);
      setIsSavedInDb(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePinFromDb = async (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await deletePostalPin(code);
      setSavedPins(updated);
      if (pinCode.toUpperCase() === code.toUpperCase()) {
        setIsSavedInDb(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyToDashboard = () => {
    if (resolvedLocation) {
      onSelectLocation(resolvedLocation);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="postal-weather-modal"
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  WTTR.in Precise Postal Predictor
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                  user-db.json
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Accurate local weather predictions for PIN & ZIP codes with regional context
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Active user-db.json Region Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                Region: <strong>{profile?.country || 'United States'}</strong>
                {profile?.state ? ` • ${profile.state}` : ''}
                {profile?.city ? ` • ${profile.city}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOverrides(!showOverrides)}
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                <Sliders className="w-3 h-3" />
                {showOverrides ? 'Hide overrides' : 'Adjust country/state'}
              </button>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 transition"
                >
                  Configure Profile
                </button>
              )}
            </div>
          </div>

          {/* Collapsible Overrides */}
          {showOverrides && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs animate-in fade-in duration-150">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Country for this search
                </label>
                <input
                  type="text"
                  value={countryOverride}
                  onChange={(e) => setCountryOverride(e.target.value)}
                  placeholder="e.g. United States, India, UK..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  State / Province for this search
                </label>
                <input
                  type="text"
                  value={stateOverride}
                  onChange={(e) => setStateOverride(e.target.value)}
                  placeholder="e.g. California, Karnataka, Ontario..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          )}

          {/* Postal / PIN Input Bar */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Enter Postal Code or PIN Code
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  placeholder="e.g. 94103, 560001, 10001, SW1A 1AA..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono text-slate-800 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
                />
              </div>
              <button
                type="button"
                onClick={() => handleLookup()}
                disabled={isLoading || !pinCode.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-2xl shadow-xs transition"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Predict</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400">Quick examples:</span>
              {[
                { label: '94103 (SF)', code: '94103' },
                { label: '560001 (Bengaluru)', code: '560001' },
                { label: '10001 (NYC)', code: '10001' },
                { label: '90210 (Beverly Hills)', code: '90210' },
                { label: 'SW1A 1AA (London)', code: 'SW1A 1AA' },
                { label: '75001 (Paris)', code: '75001' },
              ].map((ex) => (
                <button
                  key={ex.code}
                  type="button"
                  onClick={() => {
                    setPinCode(ex.code);
                    handleLookup(ex.code);
                  }}
                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-[11px] font-mono text-slate-600 dark:text-slate-300 transition"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Prediction Results */}
          {resolvedLocation && (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
              {/* Resolved Location Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {resolvedLocation.name}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md">
                      {resolvedSource}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {resolvedLocation.admin1 ? `${resolvedLocation.admin1}, ` : ''}
                    {resolvedLocation.country} • Coordinates: {resolvedLocation.latitude.toFixed(4)}°N,{' '}
                    {resolvedLocation.longitude.toFixed(4)}°W
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSavePinToDb}
                    disabled={isSavedInDb}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                      isSavedInDb
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 cursor-default'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isSavedInDb ? <CheckCircle2 className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                    <span>{isSavedInDb ? 'Saved in user-db' : 'Save to user-db'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyToDashboard}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                  >
                    <span>Load Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* View Switcher: Precision Weather vs. Terminal ASCII */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Meteorological Prediction
                </span>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setActiveView('cards')}
                    className={`px-3 py-1 rounded-lg transition ${
                      activeView === 'cards'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    Precision Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('ascii')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg transition ${
                      activeView === 'ascii'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                    }`}
                  >
                    <Terminal className="w-3 h-3" />
                    <span>WTTR.in ASCII</span>
                  </button>
                </div>
              </div>

              {/* Card 1: Precision Grid */}
              {activeView === 'cards' && wttrReport && (
                <div className="space-y-4">
                  {/* Current conditions banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent dark:from-blue-900/20 dark:via-slate-800 dark:to-transparent rounded-2xl border border-blue-100 dark:border-slate-800">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Current Temp</span>
                      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {wttrReport.current.tempC}°C{' '}
                        <span className="text-sm font-normal text-slate-500">
                          ({wttrReport.current.tempF}°F)
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Feels like {wttrReport.current.feelsLikeC}°C
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Condition</span>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate mt-1">
                        {wttrReport.current.weatherDesc}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
                        <Droplets className="w-3 h-3" />
                        <span>{wttrReport.current.humidity}% Humidity</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Wind & Pressure</span>
                      <div className="flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
                        <Wind className="w-3.5 h-3.5 text-cyan-600" />
                        <span>
                          {wttrReport.current.windSpeedKmph} km/h {wttrReport.current.windDir}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {wttrReport.current.pressure} hPa
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">UV Index & Rain</span>
                      <div className="flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>UV {wttrReport.current.uvIndex}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Umbrella className="w-3 h-3" />
                        <span>{wttrReport.current.precipMM} mm</span>
                      </div>
                    </div>
                  </div>

                  {/* 3-Day Forecast Cards */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      3-Day Prediction Breakdown
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {wttrReport.weatherDays.map((day, idx) => (
                        <div
                          key={day.date}
                          className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-1.5 mb-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : day.date}
                            </span>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                              {day.maxtempC}° / {day.mintempC}°C
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {day.hourly.slice(2, 6).map((h) => {
                              const hourLabel =
                                h.time === '600'
                                  ? 'Morning'
                                  : h.time === '1200'
                                  ? 'Noon'
                                  : h.time === '1800'
                                  ? 'Evening'
                                  : 'Night';
                              return (
                                <div
                                  key={h.time}
                                  className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300"
                                >
                                  <span className="text-slate-400">{hourLabel}</span>
                                  <span className="truncate max-w-[90px]">{h.weatherDesc}</span>
                                  <span className="font-semibold">{h.tempC}°C</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Card 2: Terminal ASCII View */}
              {activeView === 'ascii' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>CLI Terminal Output (wttr.in/{pinCode})</span>
                    <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      curl wttr.in/{pinCode}
                    </span>
                  </div>
                  <pre className="p-4 bg-slate-950 text-emerald-400 rounded-2xl overflow-x-auto text-xs font-mono border border-slate-800 leading-relaxed select-all">
                    {wttrReport?.asciiTable ||
                      `Weather report: ${pinCode}\n                Cloudy\n       .--.     ${wttrReport?.current.tempC || 18} °C\n    .-(    ).   ↗ ${wttrReport?.current.windSpeedKmph || 8} km/h\n   (___.__)__)  10 km\n                0.0 mm`}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Saved PINs in user-db.json */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Saved PIN Codes in user-db.json ({savedPins.length})
              </span>
            </div>

            {savedPins.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No PIN codes saved in user-db.json yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedPins.map((pin) => (
                  <div
                    key={pin.code}
                    onClick={() => {
                      setPinCode(pin.code);
                      handleLookup(pin.code);
                    }}
                    className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 rounded-xl cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold rounded-md shrink-0">
                        {pin.code}
                      </span>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                        {pin.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      title="Remove from user-db.json"
                      onClick={(e) => handleDeletePinFromDb(pin.code, e)}
                      className="p-1 text-slate-400 hover:text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500">
          <span>Data synchronized with server-side <code>user-db.json</code></span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
