/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Sunrise, Sunset, Moon, Sparkles } from 'lucide-react';

interface SolarSunArcProps {
  rawSunrise?: string;
  rawSunset?: string;
  formattedSunrise: string;
  formattedSunset: string;
  isDay: boolean;
  timezone: string;
  className?: string;
}

export const SolarSunArc: React.FC<SolarSunArcProps> = ({
  rawSunrise,
  rawSunset,
  formattedSunrise,
  formattedSunset,
  isDay,
  timezone,
  className = '',
}) => {
  // Calculate solar progress (0.0 to 1.0 during daytime)
  const { progress, sunX, sunY, daylightDurationStr, timeUntilSunsetStr, isNight } = useMemo(() => {
    const now = new Date();

    let sunriseTime: number | null = null;
    let sunsetTime: number | null = null;

    if (rawSunrise && rawSunset) {
      const sr = new Date(rawSunrise).getTime();
      const ss = new Date(rawSunset).getTime();
      if (!isNaN(sr) && !isNaN(ss)) {
        sunriseTime = sr;
        sunsetTime = ss;
      }
    }

    // Fallback: estimate from formatted string "HH:MM AM/PM"
    if (!sunriseTime || !sunsetTime) {
      const parseHourMin = (str: string, isPMHint: boolean) => {
        const parts = str.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!parts) return null;
        let h = parseInt(parts[1], 10);
        const m = parseInt(parts[2], 10);
        const ampm = parts[3]?.toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        if (!ampm && isPMHint && h < 12) h += 12;
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d.getTime();
      };

      sunriseTime = parseHourMin(formattedSunrise, false) || (now.getTime() - 4 * 3600 * 1000);
      sunsetTime = parseHourMin(formattedSunset, true) || (now.getTime() + 6 * 3600 * 1000);
    }

    const totalDaylightMs = Math.max(1000, sunsetTime - sunriseTime);
    const nowMs = now.getTime();

    const rawProgress = (nowMs - sunriseTime) / totalDaylightMs;
    const clampedProgress = Math.max(0, Math.min(1, rawProgress));

    const night = !isDay || rawProgress < 0 || rawProgress > 1;

    // Elliptical path geometry:
    // Center at (160, 56), Rx = 135, Ry = 42
    // Angle runs from pi (sunrise at x=25) to 0 (sunset at x=295)
    const effectiveProgress = night ? (isDay ? 0.5 : 0.5) : clampedProgress;
    const t = effectiveProgress;
    const x = 160 - 135 * Math.cos(Math.PI * t);
    const y = 56 - 42 * Math.sin(Math.PI * t);

    // Daylight duration
    const totalMinutes = Math.round(totalDaylightMs / (60 * 1000));
    const dHours = Math.floor(totalMinutes / 60);
    const dMins = totalMinutes % 60;
    const daylightStr = `${dHours}h ${dMins}m daylight`;

    // Time until sunset
    let sunsetRemaining = '';
    if (!night) {
      const msLeft = Math.max(0, sunsetTime - nowMs);
      const minsLeft = Math.round(msLeft / (60 * 1000));
      const hLeft = Math.floor(minsLeft / 60);
      const mLeft = minsLeft % 60;
      sunsetRemaining = hLeft > 0 ? `${hLeft}h ${mLeft}m to sunset` : `${mLeft}m to sunset`;
    }

    return {
      progress: clampedProgress,
      sunX: Math.round(x * 10) / 10,
      sunY: Math.round(y * 10) / 10,
      daylightDurationStr: daylightStr,
      timeUntilSunsetStr: sunsetRemaining,
      isNight: night,
    };
  }, [rawSunrise, rawSunset, formattedSunrise, formattedSunset, isDay]);

  return (
    <div
      id="hero-solar-arc"
      className={`relative w-full rounded-2xl bg-black/15 p-3.5 backdrop-blur-md border border-white/10 ${className}`}
    >
      {/* Top Header Labels */}
      <div className="flex items-center justify-between text-xs pb-1">
        <div className="flex items-center gap-1.5 font-semibold text-white/90">
          {!isNight ? (
            <>
              <span className="flex h-2 w-2 rounded-full bg-amber-400 ring-4 ring-amber-400/20" />
              <span>Solar Tracker</span>
            </>
          ) : (
            <>
              <Moon className="h-3.5 w-3.5 text-indigo-300" />
              <span>Nighttime</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-white/80">
          {!isNight ? (
            <span className="rounded-full bg-white/15 px-2 py-0.5 font-medium backdrop-blur-xs">
              {timeUntilSunsetStr || daylightDurationStr}
            </span>
          ) : (
            <span className="rounded-full bg-white/15 px-2 py-0.5 font-medium backdrop-blur-xs">
              {daylightDurationStr}
            </span>
          )}
        </div>
      </div>

      {/* SVG Solar Arc Stage */}
      <div className="relative w-full h-20 overflow-visible flex items-center justify-center">
        <svg
          viewBox="0 0 320 68"
          className="w-full h-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Traveled arc golden gradient */}
            <linearGradient id="solarTraveledGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#FBBF24" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FEF08A" stopOpacity="1" />
            </linearGradient>

            {/* Glowing Sun Radial Gradient */}
            <radialGradient id="sunOuterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FDE047" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>

            {/* Night Moon Radial Gradient */}
            <radialGradient id="moonOuterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#E0E7FF" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#818CF8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
            </radialGradient>

            {/* Subtle Horizon Gradient */}
            <linearGradient id="horizonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.05" />
              <stop offset="20%" stopColor="#FFFFFF" stopOpacity="0.25" />
              <stop offset="80%" stopColor="#FFFFFF" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Horizon Base Line */}
          <line
            x1="10"
            y1="56"
            x2="310"
            y2="56"
            stroke="url(#horizonGradient)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Background Full Celestial Arc (Dashed subtle guide) */}
          <path
            d="M 25 56 A 135 42 0 0 1 295 56"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="text-white"
          />

          {/* Golden Active Daytime Arc (Traveled path up to current sun position) */}
          {!isNight && (
            <path
              d="M 25 56 A 135 42 0 0 1 295 56"
              fill="none"
              stroke="url(#solarTraveledGradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength="100"
              strokeDasharray="100"
              strokeDashoffset={100 - progress * 100}
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Sunrise Point Indicator (Left Endpoint) */}
          <circle cx="25" cy="56" r="3" fill="#F59E0B" opacity="0.8" />

          {/* Sunset Point Indicator (Right Endpoint) */}
          <circle cx="295" cy="56" r="3" fill="#F97316" opacity="0.8" />

          {/* Current Solar Node (Sun in daytime, or Moon at night) */}
          {!isNight ? (
            <g
              transform={`translate(${sunX}, ${sunY})`}
              className="transition-transform duration-700 ease-out"
            >
              {/* Outer Pulsing Solar Halo Glow */}
              <circle r="14" fill="url(#sunOuterGlow)" className="animate-pulse" />

              {/* Inner Radiant Sun Body */}
              <circle
                r="6"
                fill="#FBBF24"
                stroke="#FFFFFF"
                strokeWidth="2"
                className="drop-shadow-sm"
              />

              {/* Miniature Center Core */}
              <circle r="2.5" fill="#FFFBEB" />
            </g>
          ) : (
            /* Nighttime Moon Representation */
            <g transform="translate(160, 24)" className="transition-all duration-500">
              <circle r="14" fill="url(#moonOuterGlow)" className="animate-pulse" />
              <circle
                r="6"
                fill="#E0E7FF"
                stroke="#A5B4FC"
                strokeWidth="1.5"
                className="drop-shadow-sm"
              />
              <path
                d="M -2 -3 A 4 4 0 0 1 -2 3 A 5 5 0 0 0 -2 -3"
                fill="#4338CA"
                opacity="0.6"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Timestamps for Sunrise & Sunset */}
      <div className="flex items-center justify-between text-[11px] text-white/90 pt-0.5">
        <div className="flex items-center gap-1">
          <Sunrise className="h-3.5 w-3.5 text-amber-300" />
          <span className="font-semibold">{formattedSunrise}</span>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-white/70">
          {!isNight ? (
            <span>Daylight {Math.round(progress * 100)}%</span>
          ) : (
            <span>Sun below horizon</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Sunset className="h-3.5 w-3.5 text-orange-300" />
          <span className="font-semibold">{formattedSunset}</span>
        </div>
      </div>
    </div>
  );
};
