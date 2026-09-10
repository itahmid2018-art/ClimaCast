/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BackgroundSyncStatus {
  isSupported: boolean;
  isPeriodicSupported: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  registrationState: 'unregistered' | 'registered' | 'active' | 'unsupported';
}

const STORAGE_KEY_LAST_SYNC = 'gw_last_bg_sync_time';

/**
 * Checks if the Web Background Sync API (SyncManager) is supported in current browser.
 */
export function isBackgroundSyncSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Checks if Periodic Background Sync API is supported.
 */
export function isPeriodicBackgroundSyncSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'periodicSync' in ServiceWorkerRegistration.prototype
  );
}

/**
 * Retrieves the timestamp of the last successful background sync.
 */
export function getLastSyncTime(): Date | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
    return raw ? new Date(parseInt(raw, 10)) : null;
  } catch {
    return null;
  }
}

/**
 * Persists the timestamp of a successful sync.
 */
export function recordSyncSuccess(): Date {
  const now = new Date();
  try {
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, now.getTime().toString());
  } catch {
    // ignore
  }
  return now;
}

/**
 * Informs the Service Worker of the target Weather API forecast URL
 * and registers Background Sync so that whenever connection is restored,
 * the Service Worker fetches fresh data in the background.
 */
export async function registerWeatherBackgroundSync(forecastUrl?: string): Promise<{
  success: boolean;
  supported: boolean;
  method: 'background-sync' | 'online-event-fallback' | 'unsupported';
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { success: false, supported: false, method: 'unsupported' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Send target URL to Service Worker
    if (forecastUrl && registration.active) {
      registration.active.postMessage({
        type: 'SET_WEATHER_SYNC_TARGET',
        url: forecastUrl,
      });
    }

    // Attempt Background Sync registration via SyncManager
    const anyReg = registration as unknown as {
      sync?: { register: (tag: string) => Promise<void> };
      periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
    };

    if (anyReg.sync && typeof anyReg.sync.register === 'function') {
      await anyReg.sync.register('weather-data-sync');
      console.log('[BackgroundSync] Successfully registered "weather-data-sync" with Service Worker.');

      // Also attempt Periodic Sync if available (for PWAs on desktop/Android)
      if (anyReg.periodicSync && typeof anyReg.periodicSync.register === 'function') {
        try {
          await anyReg.periodicSync.register('weather-periodic-sync', {
            minInterval: 60 * 60 * 1000, // min 1 hour interval
          });
          console.log('[BackgroundSync] Periodic background sync registered.');
        } catch {
          // Periodic sync may require PWA installation or specific permission
        }
      }

      return { success: true, supported: true, method: 'background-sync' };
    }

    // Graceful fallback: online event listener will perform sync
    return { success: true, supported: false, method: 'online-event-fallback' };
  } catch (err) {
    console.warn('[BackgroundSync] Registration error:', err);
    return { success: false, supported: false, method: 'online-event-fallback' };
  }
}

/**
 * Triggers an immediate background sync check or test.
 */
export async function triggerManualBackgroundSync(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    const anyReg = registration as unknown as {
      sync?: { register: (tag: string) => Promise<void> };
    };

    if (anyReg.sync && typeof anyReg.sync.register === 'function') {
      await anyReg.sync.register('weather-data-sync');
      return true;
    }

    // Direct message fallback to SW
    if (registration.active) {
      registration.active.postMessage({ type: 'TRIGGER_WEATHER_SYNC' });
      return true;
    }

    return false;
  } catch (e) {
    console.warn('[BackgroundSync] Trigger error:', e);
    return false;
  }
}

/**
 * Attaches a listener for background sync completion messages sent by the Service Worker.
 */
export function onBackgroundSyncCompleted(callback: (data: { timestamp: number; url?: string; reason?: string }) => void): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'WEATHER_SYNC_COMPLETED') {
      recordSyncSuccess();
      callback(event.data);
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}
