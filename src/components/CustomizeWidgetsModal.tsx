/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Pin,
  Check,
  ShieldCheck,
  Sunrise,
  Sun,
  Wind,
  Droplets,
  Gauge,
  Moon,
  CloudRain,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { WeatherWidgetId } from '../types';

export interface WidgetOption {
  id: WeatherWidgetId;
  name: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge: string;
}

export const AVAILABLE_WIDGETS: WidgetOption[] = [
  {
    id: 'air-quality',
    name: 'Air Quality (AQI)',
    category: 'Health & Atmosphere',
    description: 'Real-time US AQI index, particulate breakdown (PM2.5, PM10, Ozone) & health recommendations.',
    icon: ShieldCheck,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    badge: 'Popular',
  },
  {
    id: 'solar-arc',
    name: 'Solar Arc',
    category: 'Celestial & Daylight',
    description: 'Dynamic daylight progression arc, live sun altitude, sunrise & sunset countdowns.',
    icon: Sunrise,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    badge: 'Popular',
  },
  {
    id: 'uv-index',
    name: 'UV Index',
    category: 'Solar Protection',
    description: 'Solar radiation intensity, peak exposure times, and sun safety advisory.',
    icon: Sun,
    color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
    badge: 'Essential',
  },
  {
    id: 'wind',
    name: 'Wind & Direction',
    category: 'Atmospheric Dynamics',
    description: 'Live wind velocity, directional compass dial, and peak daily gust telemetry.',
    icon: Wind,
    color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    badge: 'Dynamic',
  },
  {
    id: 'humidity',
    name: 'Humidity & Dew Point',
    category: 'Moisture & Comfort',
    description: 'Relative humidity, dew point temperature, and moisture comfort index.',
    icon: Droplets,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    badge: 'Comfort',
  },
  {
    id: 'pressure',
    name: 'Pressure & Visibility',
    category: 'Barometric Telemetry',
    description: 'Barometric surface pressure, clear visual horizon distance, and 24h rain accumulation.',
    icon: Gauge,
    color: 'text-violet-500 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800',
    badge: 'Aviation',
  },
  {
    id: 'moon-phase',
    name: 'Moon Phase & Sky',
    category: 'Astronomy',
    description: 'Current lunar stage, illumination percentage, and days remaining until full moon.',
    icon: Moon,
    color: 'text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    badge: 'Night Sky',
  },
  {
    id: 'precipitation',
    name: 'Precipitation Risk',
    category: 'Rain & Moisture',
    description: '24-hour total precipitation sum, hourly rain probability, and accumulation forecast.',
    icon: CloudRain,
    color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800',
    badge: 'Hydrology',
  },
];

export const DEFAULT_PINNED_WIDGETS: WeatherWidgetId[] = ['air-quality', 'solar-arc'];

interface CustomizeWidgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedWidgets: WeatherWidgetId[];
  onToggleWidget: (id: WeatherWidgetId) => void;
  onResetDefaults: () => void;
  onPinAll: () => void;
  onClearAll: () => void;
}

export const CustomizeWidgetsModal: React.FC<CustomizeWidgetsModalProps> = ({
  isOpen,
  onClose,
  pinnedWidgets,
  onToggleWidget,
  onResetDefaults,
  onPinAll,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Pin className="h-5 w-5 fill-current" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Customize Pinned Widgets
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    {pinnedWidgets.length} of {AVAILABLE_WIDGETS.length} pinned
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select key weather metrics to pin right below the current forecast for quick access.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 text-xs border-b border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Quick shortcuts:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onResetDefaults}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700 font-semibold transition"
                title="Reset to recommended Air Quality & Solar Arc"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Default (AQI & Solar Arc)</span>
              </button>
              <button
                type="button"
                onClick={onPinAll}
                className="px-2.5 py-1 rounded-lg text-blue-600 hover:bg-white dark:text-blue-400 dark:hover:bg-slate-700 font-semibold transition"
              >
                Pin All
              </button>
              <button
                type="button"
                onClick={onClearAll}
                className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-white dark:text-rose-400 dark:hover:bg-slate-700 font-semibold transition"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Widget List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {AVAILABLE_WIDGETS.map((widget) => {
              const isPinned = pinnedWidgets.includes(widget.id);
              const Icon = widget.icon;

              return (
                <div
                  key={widget.id}
                  onClick={() => onToggleWidget(widget.id)}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    isPinned
                      ? 'border-blue-500/40 bg-blue-50/30 dark:border-blue-500/30 dark:bg-blue-950/20 shadow-xs'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${widget.color} transition-transform ${
                      isPinned ? 'scale-105' : 'opacity-80'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {widget.name}
                      </h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {widget.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {widget.description}
                    </p>
                  </div>

                  {/* Toggle Checkbox */}
                  <div className="shrink-0 pt-1">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-lg border transition-all ${
                        isPinned
                          ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                          : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800'
                      }`}
                    >
                      {isPinned && <Check className="h-4 w-4 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Widgets sync automatically to your browser cache.</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/40 transition"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
