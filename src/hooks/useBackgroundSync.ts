/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback } from 'react';
import {
  isBackgroundSyncSupported,
  isPeriodicBackgroundSyncSupported,
  getLastSyncTime,
  recordSyncSuccess,
  registerWeatherBackgroundSync,
  triggerManualBackgroundSync,
  onBackgroundSyncCompleted,
} from '../utils/backgroundSync';
import { GeoLocation, TemperatureUnit } from '../types';

interface UseBackgroundSyncOptions {
  currentLocation: GeoLocation;
  unit: TemperatureUnit;
  onAutoSyncCompleted: () => void;
}

export interface UseBackgroundSyncResult {
  isSupported: boolean;
  isPeriodicSupported: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncNotification: string | null;
  dismissSyncNotification: () => void;
  triggerSync: () => Promise<void>;
}

export function useBackgroundSync({
  currentLocation,
  unit,
  onAutoSyncCompleted,
}: UseBackgroundSyncOptions): UseBackgroundSyncResult {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isPeriodicSupported, setIsPeriodicSupported] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(getLastSyncTime());
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  // Check support on mount
  useEffect(() => {
    setIsSupported(isBackgroundSyncSupported());
    setIsPeriodicSupported(isPeriodicBackgroundSyncSupported());
  }, []);

  // Compute standard Open-Meteo URL corresponding to the current query
  const buildForecastUrl = useCallback(() => {
    const params = new URLSearchParams({
      latitude: currentLocation.latitude.toString(),
      longitude: currentLocation.longitude.toString(),
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'is_day',
        'precipitation',
        'weather_code',
        'surface_pressure',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
      ].join(','),
      hourly: [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'precipitation_probability',
        'precipitation',
        'weather_code',
        'surface_pressure',
        'visibility',
        'wind_speed_10m',
        'wind_direction_10m',
        'uv_index',
        'is_day',
      ].join(','),
      daily: [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'apparent_temperature_max',
        'apparent_temperature_min',
        'sunrise',
        'sunset',
        'uv_index_max',
        'precipitation_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'wind_gusts_10m_max',
        'wind_direction_10m_dominant',
      ].join(','),
      temperature_unit: unit,
      wind_speed_unit: unit === 'celsius' ? 'kmh' : 'mph',
      precipitation_unit: unit === 'celsius' ? 'mm' : 'inch',
      timezone: currentLocation.timezone || 'auto',
    });

    return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  }, [currentLocation, unit]);

  // Register or update Background Sync target whenever location or unit changes
  useEffect(() => {
    const targetUrl = buildForecastUrl();
    registerWeatherBackgroundSync(targetUrl);
  }, [buildForecastUrl]);

  // Handle messages from the Service Worker when Background Sync completes
  useEffect(() => {
    const cleanup = onBackgroundSyncCompleted((data) => {
      console.log('[useBackgroundSync] Service Worker completed background sync:', data);
      const syncDate = recordSyncSuccess();
      setLastSyncTime(syncDate);
      setIsSyncing(false);
      setSyncNotification(
        `Weather updated in background (${syncDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}) • Fresh data cached for offline use.`
      );

      // Trigger app re-render with fresh data
      onAutoSyncCompleted();
    });

    return cleanup;
  }, [onAutoSyncCompleted]);

  // Online listener: when the device regains network connectivity, automatically sync!
  useEffect(() => {
    const handleOnline = async () => {
      console.log('[useBackgroundSync] Device regains network connectivity. Initiating auto-sync...');
      setIsSyncing(true);

      const targetUrl = buildForecastUrl();
      await registerWeatherBackgroundSync(targetUrl);

      // Trigger sync
      await triggerManualBackgroundSync();

      // Immediately refresh the application data so user sees fresh forecast
      onAutoSyncCompleted();

      const syncDate = recordSyncSuccess();
      setLastSyncTime(syncDate);
      setIsSyncing(false);
      setSyncNotification(
        `Network restored. Background sync updated your cached weather forecast (${syncDate.toLocaleTimeString(
          [],
          { hour: '2-digit', minute: '2-digit' }
        )}).`
      );
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [buildForecastUrl, onAutoSyncCompleted]);

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    const targetUrl = buildForecastUrl();
    await registerWeatherBackgroundSync(targetUrl);
    const success = await triggerManualBackgroundSync();

    // Call callback to refresh
    onAutoSyncCompleted();

    const syncDate = recordSyncSuccess();
    setLastSyncTime(syncDate);
    setIsSyncing(false);

    setSyncNotification(
      success
        ? `Background sync executed. Cached weather data is up to date.`
        : `Synced via network fetch. Cache updated for offline use.`
    );
  }, [buildForecastUrl, onAutoSyncCompleted]);

  const dismissSyncNotification = useCallback(() => {
    setSyncNotification(null);
  }, []);

  return {
    isSupported,
    isPeriodicSupported,
    isSyncing,
    lastSyncTime,
    syncNotification,
    dismissSyncNotification,
    triggerSync,
  };
}
