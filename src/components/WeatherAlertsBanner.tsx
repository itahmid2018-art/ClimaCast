/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Zap,
  Wind,
  CloudRain,
  ShieldAlert,
  ChevronDown,
  X,
  ExternalLink,
  Flame,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { WeatherAlert, TemperatureUnit } from '../types';

interface WeatherAlertsBannerProps {
  alerts: WeatherAlert[];
  unit: TemperatureUnit;
  onSimulateSevereAlert?: () => void;
  isSimulatedActive?: boolean;
}

export const WeatherAlertsBanner: React.FC<WeatherAlertsBannerProps> = ({
  alerts,
  unit,
  onSimulateSevereAlert,
  isSimulatedActive = false,
}) => {
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  const activeAlerts = alerts.filter((a) => !dismissedAlertIds.includes(a.id));

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedAlertIds((prev) => [...prev, id]);
  };

  const getAlertIcon = (event: string, severity: string) => {
    const ev = event.toLowerCase();
    if (ev.includes('thunder') || ev.includes('lightning')) {
      return <Zap className="h-5 w-5 animate-pulse text-amber-300" />;
    }
    if (ev.includes('wind') || ev.includes('gale')) {
      return <Wind className="h-5 w-5 text-teal-200" />;
    }
    if (ev.includes('flood') || ev.includes('rain')) {
      return <CloudRain className="h-5 w-5 text-sky-200" />;
    }
    if (ev.includes('heat')) {
      return <Flame className="h-5 w-5 text-orange-300" />;
    }
    return <AlertTriangle className="h-5 w-5 text-amber-200" />;
  };

  return (
    <div id="weather-alerts-container" className="space-y-3">
      {/* Simulation / Status bar if no active alerts detected */}
      {activeAlerts.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-2.5 text-xs text-slate-600 shadow-2xs backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              No active severe weather warnings for this location
            </span>
          </div>

          {onSimulateSevereAlert && (
            <button
              id="simulate-alert-btn"
              type="button"
              onClick={onSimulateSevereAlert}
              className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1 font-semibold text-blue-600 transition hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Simulate Severe Storm Warning</span>
            </button>
          )}
        </div>
      )}

      {/* Render Active Warnings */}
      {activeAlerts.map((alert) => {
        const isExpanded = expandedAlertId === alert.id;
        const isHighSeverity = alert.severity === 'warning' || alert.severity === 'emergency';

        return (
          <div
            key={alert.id}
            className={`relative overflow-hidden rounded-3xl border shadow-lg transition-all duration-300 ${
              isHighSeverity
                ? 'border-red-500/40 bg-gradient-to-r from-red-600 via-rose-600 to-amber-700 text-white shadow-rose-900/20'
                : 'border-amber-500/40 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-amber-900/20'
            }`}
          >
            {/* Main Alert Card Header */}
            <div
              onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
              className="flex cursor-pointer flex-col gap-3 p-4 sm:p-5 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-black/25 backdrop-blur-xs">
                  {getAlertIcon(alert.event, alert.severity)}
                </div>

                <div className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
                      {alert.severity}
                    </span>
                    <span className="flex items-center gap-1 text-xs opacity-90">
                      <Clock className="h-3.5 w-3.5" />
                      {alert.effectiveTime} • Until {alert.expiresTime}
                    </span>
                    {alert.id.startsWith('sim') && (
                      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-slate-900">
                        Live Simulation
                      </span>
                    )}
                  </div>

                  <h3 className="mt-1 text-base md:text-lg font-bold tracking-tight">
                    {alert.headline}
                  </h3>

                  <p className="line-clamp-1 text-xs md:text-sm opacity-90">
                    {alert.event}: {alert.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs transition hover:bg-white/30"
                >
                  <span>{isExpanded ? 'Hide Details' : 'View Safety Actions'}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDismiss(alert.id, e)}
                  className="rounded-full p-1.5 text-white/70 hover:bg-black/20 hover:text-white transition"
                  title="Dismiss alert banner"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Expandable Safety Guidance & Meteorological Metrics */}
            {isExpanded && (
              <div className="border-t border-white/15 bg-black/20 p-4 sm:p-6 backdrop-blur-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Detailed Description & Source */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider opacity-80">
                      <Info className="h-3.5 w-3.5" />
                      Situation Assessment
                    </div>
                    <p className="text-xs md:text-sm leading-relaxed text-white/95">
                      {alert.description}
                    </p>

                    {/* Meteorological metrics chips */}
                    {alert.metrics && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {alert.metrics.windGusts && (
                          <div className="rounded-xl bg-white/15 px-3 py-1 text-xs font-semibold">
                            Peak Gusts: {alert.metrics.windGusts} {unit === 'celsius' ? 'km/h' : 'mph'}
                          </div>
                        )}
                        {alert.metrics.rainRate && (
                          <div className="rounded-xl bg-white/15 px-3 py-1 text-xs font-semibold">
                            Rain Rate: {alert.metrics.rainRate} mm/hr
                          </div>
                        )}
                        {alert.metrics.aqi && (
                          <div className="rounded-xl bg-white/15 px-3 py-1 text-xs font-semibold">
                            AQI Level: {alert.metrics.aqi}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="text-[11px] text-white/70 pt-1">
                      Source: {alert.source}
                    </div>
                  </div>

                  {/* Right: Protective Actions / Safety Advice */}
                  <div className="rounded-2xl bg-white/10 p-4 border border-white/15 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-200">
                      <ShieldAlert className="h-4 w-4" />
                      Recommended Safety Actions
                    </div>
                    <p className="text-xs md:text-sm font-medium leading-relaxed text-white">
                      {alert.instruction}
                    </p>

                    <div className="pt-2 text-[11px] text-white/80">
                      Stay tuned to local civil defense authorities, NOAA Weather Radio, or regional meteorological services for real-time siren broadcasts.
                    </div>
                  </div>
                </div>

                {onSimulateSevereAlert && alert.id.startsWith('sim') && (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={onSimulateSevereAlert}
                      className="text-xs font-semibold underline text-amber-200 hover:text-white"
                    >
                      Turn Off Storm Simulation
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
