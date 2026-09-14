/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserDbState, UserProfile, SavedPostalPin, GeoLocation, WttrWeatherReport } from '../types';

const LOCAL_STORAGE_KEY = 'climacast_user_db_profile';

const DEFAULT_PROFILE: UserProfile = {
  country: 'United States',
  countryCode: 'US',
  state: 'California',
  stateCode: 'CA',
  district: '',
  city: 'San Francisco',
  defaultZipPin: '94103',
  autoResolveOnZipInput: true,
  wttrPrecisionMode: true,
  lastUpdated: new Date().toISOString(),
};

const DEFAULT_PINS: SavedPostalPin[] = [
  {
    code: '94103',
    name: 'San Francisco (SoMa)',
    state: 'California',
    country: 'United States',
    latitude: 37.7725,
    longitude: -122.4147,
  },
  {
    code: '10001',
    name: 'New York (Midtown)',
    state: 'New York',
    country: 'United States',
    latitude: 40.7505,
    longitude: -73.9965,
  },
  {
    code: '560001',
    name: 'Bengaluru (General Post Office)',
    state: 'Karnataka',
    country: 'India',
    latitude: 12.9784,
    longitude: 77.5946,
  },
];

/**
 * Loads the user profile and saved postal pins from user-db.json via backend API
 */
export async function fetchUserProfile(): Promise<UserDbState> {
  try {
    const res = await fetch('/api/user-profile', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const state: UserDbState = {
        profile: { ...DEFAULT_PROFILE, ...(data.profile || {}) },
        savedZipPins: Array.isArray(data.savedZipPins) ? data.savedZipPins : DEFAULT_PINS,
      };
      // Backup to localStorage
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        // ignore storage errors
      }
      return state;
    }
  } catch (err) {
    console.warn('Could not fetch user profile from server, falling back to local cache', err);
  }

  // Local storage fallback
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) },
        savedZipPins: Array.isArray(parsed.savedZipPins) ? parsed.savedZipPins : DEFAULT_PINS,
      };
    }
  } catch (e) {
    // ignore
  }

  return { profile: DEFAULT_PROFILE, savedZipPins: DEFAULT_PINS };
}

/**
 * Saves profile updates to user-db.json
 */
export async function saveUserProfile(
  profile: Partial<UserProfile>,
  savedZipPins?: SavedPostalPin[]
): Promise<UserDbState> {
  try {
    const res = await fetch('/api/user-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, savedZipPins }),
    });
    if (res.ok) {
      const data = await res.json();
      const updatedState: UserDbState = {
        profile: data.profile,
        savedZipPins: data.savedZipPins,
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedState));
      } catch (e) {
        // ignore
      }
      return updatedState;
    }
  } catch (err) {
    console.warn('Failed to save user profile to server', err);
  }

  // Fallback locally
  const current = await fetchUserProfile();
  const fallbackState: UserDbState = {
    profile: { ...current.profile, ...profile, lastUpdated: new Date().toISOString() },
    savedZipPins: savedZipPins || current.savedZipPins,
  };
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(fallbackState));
  } catch (e) {
    // ignore
  }
  return fallbackState;
}

/**
 * Saves a postal/PIN code to user-db.json
 */
export async function savePostalPin(pin: SavedPostalPin): Promise<SavedPostalPin[]> {
  try {
    const res = await fetch('/api/user-profile/save-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.savedZipPins || [];
    }
  } catch (err) {
    console.warn('Failed to save postal pin to server', err);
  }

  const current = await fetchUserProfile();
  const existing = current.savedZipPins || [];
  const filtered = existing.filter((p) => p.code.toUpperCase() !== pin.code.toUpperCase());
  const updatedPins = [pin, ...filtered].slice(0, 25);
  await saveUserProfile({}, updatedPins);
  return updatedPins;
}

/**
 * Deletes a saved postal/PIN code from user-db.json
 */
export async function deletePostalPin(code: string): Promise<SavedPostalPin[]> {
  try {
    const res = await fetch(`/api/user-profile/save-pin/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      return data.savedZipPins || [];
    }
  } catch (err) {
    console.warn('Failed to delete postal pin on server', err);
  }

  const current = await fetchUserProfile();
  const filtered = (current.savedZipPins || []).filter((p) => p.code.toUpperCase() !== code.toUpperCase());
  await saveUserProfile({}, filtered);
  return filtered;
}

/**
 * Resolves a postal or PIN code using user-db.json Country/State context
 */
export async function resolvePostalLocation(
  code: string,
  countryOverride?: string,
  stateOverride?: string
): Promise<{ location: GeoLocation; source: string }> {
  const cleanCode = code.trim();
  const params = new URLSearchParams({ code: cleanCode });
  if (countryOverride) params.set('country', countryOverride);
  if (stateOverride) params.set('state', stateOverride);

  const res = await fetch(`/api/geocode/postal?${params.toString()}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Could not resolve PIN/ZIP code '${cleanCode}'`);
  }

  const data = await res.json();
  return {
    location: data.location,
    source: data.source || 'postal-geocoder',
  };
}

/**
 * Fetches WTTR.in live weather forecast report
 */
export async function fetchWttrWeather(query: string): Promise<WttrWeatherReport> {
  const res = await fetch(`/api/weather/wttr?query=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `WTTR.in prediction unavailable for '${query}'`);
  }
  const data = await res.json();
  return data.report;
}
