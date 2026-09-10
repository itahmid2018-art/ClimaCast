/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DailyForecastItem } from '../types';

export interface SunriseAlarmCalculation {
  sunriseDate: Date;
  alarmDate: Date; // e.g. 20 minutes before sunrise
  formattedSunrise: string;
  timeUntilSunriseMs: number;
  minutesUntilSunrise: number;
  isPreSunriseWindow: boolean; // currently within lead window (e.g. within 30 min before sunrise)
  isDawnActive: boolean; // within 30 min before to 15 min after sunrise
  isTomorrow: boolean;
  leadMinutes: number;
}


export interface DevicePlatformContext {
  isAndroid: boolean;
  isIOS: boolean;
  isStandalone: boolean; // PWA installed / standalone display mode
  isNativeApp: boolean; // Installed standalone PWA or native container
  platformName: 'android' | 'ios' | 'desktop' | 'other';
  hasNotificationSupport: boolean;
  notificationPermission: NotificationPermission | 'unsupported';
}

/**
 * Detects current device environment and native/PWA status.
 */
export function detectDevicePlatform(): DevicePlatformContext {
  if (typeof window === 'undefined') {
    return {
      isAndroid: false,
      isIOS: false,
      isStandalone: false,
      isNativeApp: false,
      platformName: 'other',
      hasNotificationSupport: false,
      notificationPermission: 'unsupported',
    };
  }

  const ua = window.navigator.userAgent.toLowerCase();
  const isAndroid = /android/.test(ua);
  const isIOS = /iphone|ipad|ipod/.test(ua);

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://');

  const hasNotificationSupport = 'Notification' in window;
  const notificationPermission: NotificationPermission | 'unsupported' = hasNotificationSupport
    ? Notification.permission
    : 'unsupported';

  let platformName: 'android' | 'ios' | 'desktop' | 'other' = 'desktop';
  if (isAndroid) platformName = 'android';
  else if (isIOS) platformName = 'ios';

  return {
    isAndroid,
    isIOS,
    isStandalone,
    isNativeApp: isStandalone,
    platformName,
    hasNotificationSupport,
    notificationPermission,
  };
}

/**
 * Parses raw or formatted sunrise from Open-Meteo daily forecast data.
 */
export function calculateUpcomingSunrise(
  daily: DailyForecastItem[],
  leadMinutes = 20,
  referenceDate = new Date()
): SunriseAlarmCalculation | null {
  if (!daily || daily.length === 0) return null;

  const nowMs = referenceDate.getTime();
  const today = daily[0];
  const tomorrow = daily[1] || daily[0];

  const parseSunrise = (item: DailyForecastItem, isTomorrowHint = false): Date | null => {
    if (item.rawSunrise) {
      const d = new Date(item.rawSunrise);
      if (!isNaN(d.getTime())) return d;
    }

    // Fallback parser for formatted string "HH:MM AM/PM"
    const match = item.sunrise.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;

    const d = new Date(referenceDate);
    if (isTomorrowHint) {
      d.setDate(d.getDate() + 1);
    }
    d.setHours(h, m, 0, 0);
    return d;
  };

  const todaySunrise = parseSunrise(today, false);
  let chosenSunrise = todaySunrise;
  let isTomorrow = false;

  // If today's sunrise has already passed (e.g. after sunrise + 15 min), look to tomorrow's sunrise
  if (todaySunrise && nowMs > todaySunrise.getTime() + 15 * 60 * 1000) {
    const tomorrowSunrise = parseSunrise(tomorrow, true);
    if (tomorrowSunrise) {
      chosenSunrise = tomorrowSunrise;
      isTomorrow = true;
    }
  }

  if (!chosenSunrise) return null;

  const timeUntilSunriseMs = chosenSunrise.getTime() - nowMs;
  const minutesUntilSunrise = Math.round(timeUntilSunriseMs / (60 * 1000));

  // Lead alarm time: e.g. 20 minutes before sunrise
  const alarmDate = new Date(chosenSunrise.getTime() - leadMinutes * 60 * 1000);

  // Pre-sunrise window: within leadMinutes + 10m before sunrise
  const isPreSunriseWindow =
    timeUntilSunriseMs > 0 && timeUntilSunriseMs <= (leadMinutes + 10) * 60 * 1000;

  // Dawn glow active: from 30 minutes before sunrise to 15 minutes after sunrise
  const isDawnActive =
    timeUntilSunriseMs <= 30 * 60 * 1000 && timeUntilSunriseMs >= -15 * 60 * 1000;

  const formattedSunrise = chosenSunrise.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    sunriseDate: chosenSunrise,
    alarmDate,
    formattedSunrise,
    timeUntilSunriseMs,
    minutesUntilSunrise,
    isPreSunriseWindow,
    isDawnActive,
    isTomorrow,
    leadMinutes,
  };
}

/**
 * Triggers a silent local notification via the Web Notifications API and Service Worker.
 */
export async function triggerSilentSunriseNotification(
  title: string,
  body: string,
  options?: { force?: boolean }
): Promise<{ sent: boolean; reason?: string }> {
  if (typeof window === 'undefined') {
    return { sent: false, reason: 'No window' };
  }

  if (!('Notification' in window)) {
    return { sent: false, reason: 'Notifications not supported by this browser' };
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
    return { sent: false, reason: 'Notification permission not granted' };
  }

  try {
    // Check if Service Worker is active for reliable PWA background notification
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          silent: true, // Crucial requirement: silent local notification!
          tag: 'sunrise-dawn-notification',
        });
        return { sent: true };
      }
    }

    // Direct Web Notification fallback
    new Notification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      silent: true, // Silent local notification
      tag: 'sunrise-dawn-notification',
    });

    return { sent: true };
  } catch (err) {
    console.warn('Silent local notification error:', err);
    return { sent: false, reason: String(err) };
  }
}

/**
 * Android Native Alarm Integration:
 * Triggers Android System Clock SET_ALARM Intent.
 * Compatible with Native Android App (Capacitor/Cordova/Webview) AND Android PWA (Chrome/Edge/Samsung Internet).
 */
export function triggerAndroidSystemAlarm(alarmDate: Date, label = 'Sunrise Weather Alarm'): {
  success: boolean;
  intentUrl: string;
} {
  const hour = alarmDate.getHours();
  const minutes = alarmDate.getMinutes();

  // Android standard Intent for Clock SET_ALARM
  // action=android.intent.action.SET_ALARM
  // extra HOUR, MINUTES, MESSAGE, SKIP_UI=false (allows user to confirm in Clock app)
  const intentUrl = `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.HOUR=${hour};i.android.intent.extra.MINUTES=${minutes};s.android.intent.extra.MESSAGE=${encodeURIComponent(
    label
  )};b.android.intent.extra.SKIP_UI=false;end`;

  try {
    // Try launching intent directly
    window.location.href = intentUrl;
    return { success: true, intentUrl };
  } catch (err) {
    console.warn('Failed to launch Android alarm intent:', err);
    return { success: false, intentUrl };
  }
}

/**
 * iOS Native Alarm / Reminder Integration:
 * iOS does not support arbitrary web clock intents; native apps & PWAs integrate via:
 * 1. Apple Shortcuts URL Scheme (shortcuts://run-shortcut?name=Set%20Sunrise%20Alarm)
 * 2. Downloading an iCalendar (.ics) event with native VALARM audio alert scheduled at alarmDate.
 */
export function triggerIOSAlarmOrCalendar(
  alarmDate: Date,
  sunriseDate: Date,
  locationName: string,
  formattedSunrise: string
): { icsBlobUrl: string; shortcutsUrl: string } {
  const pad = (n: number) => n.toString().padStart(2, '0');

  const formatICSDate = (d: Date) => {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
      d.getUTCHours()
    )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  };

  const startUtc = formatICSDate(alarmDate);
  const endUtc = formatICSDate(new Date(sunriseDate.getTime() + 15 * 60 * 1000));
  const nowUtc = formatICSDate(new Date());

  // RFC 5545 iCalendar with Audio/Display VALARM
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Google Weather//Pre-Sunrise Alarm//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:sunrise-alarm-${Date.now()}@googleweather.app`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:🌅 Pre-Sunrise Dawn Alarm (${locationName})`,
    `DESCRIPTION:Sunrise in ${locationName} is at ${formattedSunrise}. Pre-dawn light and solar dawn glow have begun.`,
    `LOCATION:${locationName}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER;VALUE=DATE-TIME:' + startUtc,
    'ACTION:AUDIO',
    'DESCRIPTION:Sunrise approaching soon',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const icsBlobUrl = URL.createObjectURL(blob);

  const shortcutsUrl = `shortcuts://run-shortcut?name=Sunrise%20Alarm`;

  return { icsBlobUrl, shortcutsUrl };
}
