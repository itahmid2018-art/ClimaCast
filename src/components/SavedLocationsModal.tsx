/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  MapPin,
  X,
  Plus,
  Trash2,
  Bell,
  BellRing,
  Sparkles,
  Search,
  Loader2,
  Check,
  AlertTriangle,
  Info,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { GeoLocation, SavedLocationNotificationSettings } from '../types';
import { searchLocations } from '../services/weatherApi';
import {
  saveLocationsToDb,
  deleteLocationFromDb,
  evaluateSavedLocationNotifications,
  dispatchWeatherNotification,
} from '../services/savedLocationsApi';

interface SavedLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: GeoLocation[];
  onSelectLocation: (loc: GeoLocation) => void;
  onToggleFavorite: (loc: GeoLocation) => void;
  notificationSettings: SavedLocationNotificationSettings;
  onUpdateNotificationSettings: (settings: SavedLocationNotificationSettings) => void;
  onNotificationDispatched?: (title: string, body: string, type: 'alarming_weather' | 'morning_tip') => void;
}

export const SavedLocationsModal: React.FC<SavedLocationsModalProps> = ({
  isOpen,
  onClose,
  favorites,
  onSelectLocation,
  onToggleFavorite,
  notificationSettings,
  onUpdateNotificationSettings,
  onNotificationDispatched,
}) => {
  const [activeTab, setActiveTab] = useState<'locations' | 'notifications'>('locations');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [testNotificationFeedback, setTestNotificationFeedback] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    } else {
      setBrowserPermission('unsupported');
    }
  }, [isOpen]);

  // Debounced search for adding new preferred locations
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocations(searchQuery);
        // Exclude ones already saved
        const existingIds = new Set(favorites.map((f) => f.id));
        setSearchResults(results.filter((r) => !existingIds.has(r.id)));
      } catch (err) {
        console.error('Search error in saved locations:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, favorites]);

  if (!isOpen) return null;

  const handleAddLocation = async (loc: GeoLocation) => {
    onToggleFavorite(loc); // Adds to state
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveLocation = async (loc: GeoLocation) => {
    onToggleFavorite(loc); // Toggles/removes
    await deleteLocationFromDb(loc.id);
  };

  const handleRequestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setBrowserPermission(perm);
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const handleTestMorningTip = async () => {
    setIsEvaluating(true);
    setTestNotificationFeedback(null);
    try {
      const res = await evaluateSavedLocationNotifications({ forceMorningTip: true });
      if (res.notifications.length > 0) {
        const notif = res.notifications[0];
        await dispatchWeatherNotification(notif.title, notif.body, notif.tag, false);
        if (onNotificationDispatched) {
          onNotificationDispatched(notif.title, notif.body, 'morning_tip');
        }
        setTestNotificationFeedback(`Dispatched morning tip for ${notif.locationName}!`);
      } else {
        setTestNotificationFeedback('No notification needed or permissions blocked.');
      }
    } catch (e) {
      setTestNotificationFeedback('Failed to test notification.');
    } finally {
      setIsEvaluating(false);
      setTimeout(() => setTestNotificationFeedback(null), 5000);
    }
  };

  const handleTestAlarmingAlert = async () => {
    setIsEvaluating(true);
    setTestNotificationFeedback(null);
    try {
      const res = await evaluateSavedLocationNotifications({ forceAlarmCheck: true });
      if (res.notifications.length > 0) {
        const notif = res.notifications[0];
        await dispatchWeatherNotification(notif.title, notif.body, notif.tag, false);
        if (onNotificationDispatched) {
          onNotificationDispatched(notif.title, notif.body, 'alarming_weather');
        }
        setTestNotificationFeedback(`Triggered simulated severe condition alert for ${notif.locationName}!`);
      } else {
        setTestNotificationFeedback('Evaluation complete: Atmospheric status nominal.');
      }
    } catch (e) {
      setTestNotificationFeedback('Failed to trigger alert test.');
    } finally {
      setIsEvaluating(false);
      setTimeout(() => setTestNotificationFeedback(null), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">
              <Bookmark className="h-4 w-4 fill-current" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                Saved Locations & Notifications
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Synced with server <code className="font-mono text-blue-600 dark:text-blue-400">db.json</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pt-3 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('locations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'locations'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Preferred Locations ({favorites.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'notifications'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Smart Notifications</span>
            {notificationSettings.enabled && (
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Tab 1: Locations List + Add Search */}
        {activeTab === 'locations' && (
          <div className="mt-4 flex-1 flex flex-col overflow-hidden">
            {/* Add Location Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city to add to preferred locations..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/80 dark:text-white dark:focus:border-blue-500"
              />
              {isSearching ? (
                <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-blue-500" />
              ) : searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}

              {/* Search Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      onClick={() => handleAddLocation(res)}
                      className="flex w-full items-center justify-between rounded-lg p-2 text-left text-xs hover:bg-blue-50 dark:hover:bg-slate-700 transition"
                    >
                      <div className="truncate">
                        <span className="font-semibold text-slate-800 dark:text-white">
                          {res.name}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 ml-1">
                          {[res.admin1, res.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                        <Plus className="h-3 w-3" /> Add
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Locations List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {favorites.length === 0 ? (
                <div className="py-12 text-center">
                  <Bookmark className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 stroke-1" />
                  <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    No preferred locations yet
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Use the search bar above to add cities, or bookmark them on the main forecast.
                  </p>
                </div>
              ) : (
                favorites.map((fav, index) => (
                  <div
                    key={fav.id || `${fav.latitude}-${fav.longitude}-${index}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition hover:border-slate-200 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectLocation(fav);
                        onClose();
                      }}
                      className="flex items-center gap-2.5 text-left truncate flex-1 mr-2"
                      title="Load forecast for this location"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                          {fav.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {[fav.admin1, fav.country].filter(Boolean).join(', ')} •{' '}
                          <span className="font-mono text-[10px]">
                            {fav.latitude.toFixed(2)}°, {fav.longitude.toFixed(2)}°
                          </span>
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectLocation(fav);
                          onClose();
                        }}
                        className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 shadow-2xs hover:bg-blue-50 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700 transition"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveLocation(fav)}
                        className="rounded-lg p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition"
                        title="Remove location"
                        aria-label={`Remove ${fav.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Odd/Alarming Condition and Morning Tip Notifications */}
        {activeTab === 'notifications' && (
          <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-slate-600 dark:text-slate-300">
            {/* Policy Banner matching User Prompt strictly */}
            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 p-3.5 dark:border-blue-900/60 dark:bg-blue-950/30">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 text-xs">
                    Smart Notification Protocol
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
                    Notifications are enabled strictly for <strong>alarming or odd weather conditions</strong> across your saved locations (severe thunderstorms, squalls, flash downpours, extreme heat/freeze, high wind gusts). If no alarming events exist, a single gentle notification is dispatched in the morning with the <strong>Tip of the Day</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Permission Check */}
            {browserPermission !== 'granted' && (
              <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-amber-800 dark:text-amber-300 font-medium">
                    Browser notification permission is required
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shrink-0"
                >
                  Enable
                </button>
              </div>
            )}

            {/* Toggles */}
            <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">
                    Saved Locations Weather Monitoring
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Periodically evaluates atmospheric instability for all preferred cities
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={notificationSettings.enabled}
                    onChange={(e) => {
                      const updated = { ...notificationSettings, enabled: e.target.checked };
                      onUpdateNotificationSettings(updated);
                      saveLocationsToDb(favorites, updated);
                    }}
                    className="peer sr-only"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-slate-700" />
                </label>
              </div>

              <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">
                    Alarming & Odd Weather Thresholds
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Severe storms, freezing rain, gusts &gt; 65km/h, extreme temperature anomalies
                  </p>
                </div>
                <span className="rounded-md bg-rose-100 px-2 py-0.5 font-semibold text-[10px] text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  Always Active
                </span>
              </div>

              <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">
                    Morning Tip of the Day
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Single dawn/morning notification when weather is calm and normal
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={notificationSettings.morningTipEnabled}
                    onChange={(e) => {
                      const updated = { ...notificationSettings, morningTipEnabled: e.target.checked };
                      onUpdateNotificationSettings(updated);
                      saveLocationsToDb(favorites, updated);
                    }}
                    className="peer sr-only"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full dark:bg-slate-700" />
                </label>
              </div>
            </div>

            {/* Test Simulation Controls */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50 space-y-2.5">
              <h5 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                <BellRing className="h-3.5 w-3.5 text-blue-500" />
                Instant Notification Dispatchers (Simulations)
              </h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Trigger an instantaneous test to verify system notifications on your browser or device:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestMorningTip}
                  disabled={isEvaluating}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200 transition disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Send Morning Tip Now</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestAlarmingAlert}
                  disabled={isEvaluating}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 font-semibold text-rose-800 hover:bg-rose-100 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-200 transition disabled:opacity-50"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  <span>Simulate Alarming Condition</span>
                </button>
              </div>

              {testNotificationFeedback && (
                <div className="mt-2 rounded-lg bg-blue-100/70 p-2 text-[11px] font-medium text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 animate-in fade-in">
                  {testNotificationFeedback}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{favorites.length} saved location{favorites.length === 1 ? '' : 's'}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
