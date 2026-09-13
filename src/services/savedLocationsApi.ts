/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeoLocation, SavedLocationNotificationSettings } from '../types';

export interface EvaluateNotificationsResult {
  notifications: Array<{
    id: string;
    type: 'alarming_weather' | 'morning_tip';
    title: string;
    body: string;
    locationName: string;
    severity?: 'emergency' | 'warning' | 'watch' | 'info';
    tag: string;
  }>;
  evaluatedCount: number;
  lastMorningTipDate?: string;
  reason?: string;
}

export async function fetchSavedLocations(): Promise<{
  locations: GeoLocation[];
  notificationSettings: SavedLocationNotificationSettings;
  lastMorningTipDate?: string;
}> {
  try {
    const res = await fetch('/api/saved-locations');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      locations: data.locations || [],
      notificationSettings: data.notificationSettings || {
        enabled: true,
        morningTipEnabled: true,
        severeAlertsOnly: true,
      },
      lastMorningTipDate: data.lastMorningTipDate,
    };
  } catch (err) {
    console.warn('Failed to fetch saved locations from db.json API, using localStorage fallback', err);
    const local = localStorage.getItem('gw_favorites');
    const locations = local ? JSON.parse(local) : [];
    return {
      locations,
      notificationSettings: {
        enabled: true,
        morningTipEnabled: true,
        severeAlertsOnly: true,
      },
    };
  }
}

export async function saveLocationsToDb(
  locations: GeoLocation[],
  notificationSettings?: SavedLocationNotificationSettings
): Promise<boolean> {
  // Always update localStorage first for instantaneous optimistic responsiveness
  try {
    localStorage.setItem('gw_favorites', JSON.stringify(locations));
    if (notificationSettings) {
      localStorage.setItem('gw_saved_location_notifs', JSON.stringify(notificationSettings));
    }
  } catch {
    // ignore
  }

  try {
    const res = await fetch('/api/saved-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations,
        notificationSettings,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Could not sync saved locations to server db.json:', err);
    return false;
  }
}

export async function deleteLocationFromDb(id: number | string): Promise<boolean> {
  try {
    const res = await fetch(`/api/saved-locations/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete location from db.json:', err);
    return false;
  }
}

export async function evaluateSavedLocationNotifications(options?: {
  forceMorningTip?: boolean;
  forceAlarmCheck?: boolean;
}): Promise<EvaluateNotificationsResult> {
  try {
    const res = await fetch('/api/saved-locations/evaluate-notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientTime: new Date().toISOString(),
        forceMorningTip: options?.forceMorningTip ?? false,
        forceAlarmCheck: options?.forceAlarmCheck ?? false,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to evaluate saved location notifications:', err);
    return { notifications: [], evaluatedCount: 0, reason: String(err) };
  }
}

/**
 * Triggers a web notification or Service Worker notification for alarming weather or morning tip.
 */
export async function dispatchWeatherNotification(
  title: string,
  body: string,
  tag = 'weather-notification',
  silent = false
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    try {
      permission = await Notification.requestPermission();
    } catch {
      // ignore
    }
  }

  if (permission !== 'granted') {
    return false;
  }

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          silent,
          tag,
        });
        return true;
      }
    }

    new Notification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      silent,
      tag,
    });
    return true;
  } catch (err) {
    console.warn('Failed to trigger notification:', err);
    return false;
  }
}
