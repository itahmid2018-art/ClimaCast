/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Sunrise,
  Bell,
  Clock,
  Smartphone,
  Check,
  ExternalLink,
  Sparkles,
  AlertCircle,
  VolumeX,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  SunriseAlarmCalculation,
  detectDevicePlatform,
  triggerAndroidSystemAlarm,
  triggerIOSAlarmOrCalendar,
  triggerSilentSunriseNotification,
} from '../utils/sunriseAlarm';

interface SunriseAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: SunriseAlarmCalculation | null;
  locationName: string;
  isSimulatingDawn: boolean;
  onToggleSimulation: () => void;
  leadMinutes: number;
  onChangeLeadMinutes: (mins: number) => void;
  onNotificationSent?: () => void;
}

export const SunriseAlarmModal: React.FC<SunriseAlarmModalProps> = ({
  isOpen,
  onClose,
  calculation,
  locationName,
  isSimulatingDawn,
  onToggleSimulation,
  leadMinutes,
  onChangeLeadMinutes,
  onNotificationSent,
}) => {
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [alarmFeedback, setAlarmFeedback] = useState<string | null>(null);
  const [isRequestingNotif, setIsRequestingNotif] = useState(false);

  const platform = detectDevicePlatform();

  if (!isOpen) return null;

  const handleSetAndroidAlarm = () => {
    if (!calculation) return;
    const res = triggerAndroidSystemAlarm(
      calculation.alarmDate,
      `Sunrise Alarm (${locationName} at ${calculation.formattedSunrise})`
    );
    if (res.success) {
      setAlarmFeedback(
        `Dispatched Android Clock Alarm intent for ${calculation.alarmDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}. Confirm in your Clock app.`
      );
    } else {
      setAlarmFeedback('Opening Android Clock. If not supported in browser, install PWA or native app.');
    }
  };

  const handleSetIOSAlarm = () => {
    if (!calculation) return;
    const { icsBlobUrl, shortcutsUrl } = triggerIOSAlarmOrCalendar(
      calculation.alarmDate,
      calculation.sunriseDate,
      locationName,
      calculation.formattedSunrise
    );

    // Download the .ics alarm file which launches iOS Calendar/Reminders with an audio VALARM
    const a = document.createElement('a');
    a.href = icsBlobUrl;
    a.download = `sunrise-alarm-${locationName.toLowerCase().replace(/\s+/g, '-')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setAlarmFeedback(
      `Generated iOS Calendar Alarm event (.ics) set for ${calculation.alarmDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}. Tap to add to Calendar / Reminders.`
    );
  };

  const handleTriggerSilentNotification = async () => {
    if (!calculation) return;
    setIsRequestingNotif(true);
    setAlarmFeedback(null);

    const title = `🌅 Dawn Approaching • Sunrise in ${calculation.minutesUntilSunrise > 0 ? calculation.minutesUntilSunrise : leadMinutes} min`;
    const body = `Sunrise in ${locationName} is at ${calculation.formattedSunrise}. Pre-dawn light has begun.`;

    const res = await triggerSilentSunriseNotification(title, body, { force: true });
    setIsRequestingNotif(false);

    if (res.sent) {
      setAlarmFeedback('Silent local notification dispatched to your system.');
      if (onNotificationSent) onNotificationSent();
    } else {
      setAlarmFeedback(`Notification notice: ${res.reason || 'Permission needed or preview frame mode'}`);
    }
  };

  return (
    <div
      id="sunrise-alarm-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="sunrise-alarm-modal-card"
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 shadow-inner">
              <Sunrise className="h-5 w-5 animate-pulse text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Sunrise Dawn Alarm & UI Pulse
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calculated dynamically from Open-Meteo solar data
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Astronomical Sunrise Overview */}
        {calculation ? (
          <div className="mt-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-4 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {calculation.isTomorrow ? 'Tomorrow’s Sunrise' : 'Today’s Sunrise'}
                </span>
                <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {calculation.formattedSunrise}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {locationName} •{' '}
                  {calculation.minutesUntilSunrise > 0
                    ? `in ~${Math.floor(calculation.minutesUntilSunrise / 60)}h ${calculation.minutesUntilSunrise % 60}m`
                    : 'Sun has risen today'}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Alarm Time ({leadMinutes}m lead)
                </span>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {calculation.alarmDate.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="text-[10px] text-slate-400">
                  Triggers silent alert & dawn pulse
                </div>
              </div>
            </div>

            {/* Lead Time Selector */}
            <div className="mt-3 flex items-center justify-between border-t border-amber-500/20 pt-3 text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Pre-sunrise Alert Lead:
              </span>
              <div className="flex items-center gap-1.5">
                {[10, 15, 20, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onChangeLeadMinutes(mins)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      leadMinutes === mins
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Feedback Message */}
        {alarmFeedback && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
            <Sparkles className="h-4 w-4 shrink-0 text-blue-500" />
            <span>{alarmFeedback}</span>
          </div>
        )}

        {/* Action Group 1: Silent Local Notification & UI Pulse Simulator */}
        <div className="mt-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pre-Sunrise UI Pulse & Silent Notification
          </h4>

          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* UI Pulse Test Toggle */}
            <button
              id="btn-toggle-dawn-simulation"
              type="button"
              onClick={onToggleSimulation}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition shadow-xs ${
                isSimulatingDawn
                  ? 'border-amber-400 bg-amber-400/20 text-amber-700 dark:text-amber-200 ring-2 ring-amber-400/30'
                  : 'border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <Sparkles className={`h-4 w-4 ${isSimulatingDawn ? 'text-amber-500 animate-spin-slow' : 'text-slate-500'}`} />
              <span>{isSimulatingDawn ? 'Stop Dawn Pulse Simulation' : 'Preview Dawn Pulse Effect'}</span>
            </button>

            {/* Silent Notification Trigger */}
            <button
              id="btn-test-silent-notification"
              type="button"
              disabled={isRequestingNotif}
              onClick={handleTriggerSilentNotification}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 transition disabled:opacity-50"
            >
              <VolumeX className="h-4 w-4" />
              <span>{isRequestingNotif ? 'Sending...' : 'Test Silent Notification'}</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            Silent local notifications use the standard Web Notifications API with <code className="text-amber-600 dark:text-amber-400 font-mono">silent: true</code>, ensuring zero intrusive chimes while visual badges and dawn glowing pulses activate in the hero card.
          </p>
        </div>

        {/* Action Group 2: Native App Device Alarm Integration */}
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Native Device Alarm Integration
            </h4>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {platform.isAndroid ? 'Android Detected' : platform.isIOS ? 'iOS Detected' : 'All Platforms'}
            </span>
          </div>

          <div className="space-y-2">
            {/* Android System Alarm Button */}
            <button
              id="btn-set-android-alarm"
              type="button"
              onClick={handleSetAndroidAlarm}
              className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-left text-xs hover:border-blue-400 hover:bg-blue-50/40 transition dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-blue-500"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Set Android Clock Alarm
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dispatches <span className="font-mono">android.intent.action.SET_ALARM</span>
                  </div>
                </div>
              </div>
              <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
                Clock App
              </span>
            </button>

            {/* iOS System Calendar / Reminders Alarm Button */}
            <button
              id="btn-set-ios-alarm"
              type="button"
              onClick={handleSetIOSAlarm}
              className="w-full flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 text-left text-xs hover:border-blue-400 hover:bg-blue-50/40 transition dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-blue-500"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Set iOS System Alarm (.ics)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Adds RFC 5545 VALARM to Calendar & Reminders
                  </div>
                </div>
              </div>
              <span className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                Apple Calendar
              </span>
            </button>
          </div>
        </div>

        {/* Action Group 3: PWA Integration Status & Compatibility */}
        <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 text-xs dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
            <Layers className="h-4 w-4 text-blue-500" />
            <span>PWA Integration Compatibility</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong>Can this integrate on PWA?</strong> Yes!
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] text-slate-500 dark:text-slate-400 list-disc list-inside">
            <li>
              <strong>Android PWA:</strong> The Android Clock Alarm intent triggers seamlessly from within the installed standalone PWA.
            </li>
            <li>
              <strong>iOS PWA:</strong> iOS standalone web apps download the native Calendar <code className="font-mono">.ics</code> alarm trigger directly into the iOS Calendar.
            </li>
            <li>
              <strong>Background PWA Sync:</strong> The registered Service Worker handles silent notifications and offline caching.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
