/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Wind,
  Droplets,
  CloudRain,
  Sun,
  ArrowUp,
  ArrowDown,
  Clock,
  Thermometer,
  Sunrise,
  Sparkles,
  VolumeX,
  Bell,
} from 'lucide-react';
import { ProcessedWeather, TemperatureUnit } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { getWeatherCondition } from '../utils/weatherCodes';
import { SolarSunArc } from './SolarSunArc';
import {
  calculateUpcomingSunrise,
  triggerSilentSunriseNotification,
  SunriseAlarmCalculation,
} from '../utils/sunriseAlarm';
import { SunriseAlarmModal } from './SunriseAlarmModal';

interface CurrentWeatherHeroProps {
  weather: ProcessedWeather;
  unit: TemperatureUnit;
}

export const CurrentWeatherHero: React.FC<CurrentWeatherHeroProps> = ({ weather, unit }) => {
  const { current, location, daily } = weather;
  const today = daily[0];
  const condition = getWeatherCondition(current.weatherCode, current.isDay);

  const [leadMinutes, setLeadMinutes] = useState<number>(20);
  const [isSimulatingDawn, setIsSimulatingDawn] = useState<boolean>(false);
  const [showAlarmModal, setShowAlarmModal] = useState<boolean>(false);
  const [silentNotifToast, setSilentNotifToast] = useState<string | null>(null);

  // Calculate upcoming sunrise from Open-Meteo API daily data
  const sunriseCalc: SunriseAlarmCalculation | null = useMemo(() => {
    return calculateUpcomingSunrise(daily, leadMinutes);
  }, [daily, leadMinutes]);

  // Is UI pulse effect currently active? Either real pre-sunrise window or manual simulation
  const isDawnPulseActive = isSimulatingDawn || (sunriseCalc?.isPreSunriseWindow ?? false);

  // Automatic silent local notification trigger when entering pre-sunrise window
  useEffect(() => {
    if (!sunriseCalc || !sunriseCalc.isPreSunriseWindow) return;

    const notifKey = `gw_dawn_notified_${sunriseCalc.sunriseDate.toISOString().slice(0, 10)}`;
    const alreadySent = localStorage.getItem(notifKey);

    if (!alreadySent) {
      const title = `🌅 Dawn Approaching • Sunrise in ${sunriseCalc.minutesUntilSunrise} min`;
      const body = `Sunrise in ${location.name} is at ${sunriseCalc.formattedSunrise}. The pre-dawn solar glow has begun.`;

      triggerSilentSunriseNotification(title, body).then((res) => {
        if (res.sent) {
          localStorage.setItem(notifKey, 'true');
          setSilentNotifToast(`Silent notification dispatched: Sunrise in ${sunriseCalc.minutesUntilSunrise}m`);
          setTimeout(() => setSilentNotifToast(null), 8000);
        }
      });
    }
  }, [sunriseCalc?.isPreSunriseWindow, sunriseCalc?.sunriseDate, location.name]);

  const unitSymbol = unit === 'celsius' ? '°C' : '°F';


  // Calculate apparent temperature differential & contextual factor
  const tempDiff = Math.round(current.apparentTemperature - current.temperature);

  const getFeelsLikeContext = () => {
    if (tempDiff >= 3) return 'Significantly warmer than actual due to humidity';
    if (tempDiff >= 1) return 'Slightly warmer than actual temperature';
    if (tempDiff <= -3) return 'Significantly cooler due to wind chill';
    if (tempDiff <= -1) return 'Noticeably cooler due to wind chill';
    return 'Matches actual thermometer temperature';
  };

  // Dynamic atmospheric gradient based on weather condition & day/night
  const getAtmosphericBackground = () => {
    if (!current.isDay) {
      return 'from-slate-900 via-indigo-950 to-slate-900 border-indigo-900/40 text-slate-100 shadow-indigo-950/30';
    }
    switch (condition.backgroundCategory) {
      case 'clear-day':
        return 'from-sky-400 via-blue-500 to-indigo-500 border-blue-400/40 text-white shadow-blue-500/20';
      case 'rain':
        return 'from-slate-600 via-slate-700 to-sky-800 border-slate-500/40 text-white shadow-slate-700/30';
      case 'thunderstorm':
        return 'from-purple-900 via-slate-900 to-indigo-950 border-purple-800/40 text-white shadow-purple-950/40';
      case 'snow':
        return 'from-sky-200 via-blue-300 to-slate-400 border-sky-300/60 text-slate-800 shadow-sky-300/30';
      case 'fog':
        return 'from-slate-400 via-slate-500 to-zinc-600 border-slate-400/40 text-white shadow-slate-500/30';
      case 'cloudy':
      default:
        return 'from-blue-400 via-sky-500 to-slate-600 border-sky-400/40 text-white shadow-sky-500/20';
    }
  };

  const formattedTime = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: location.timezone,
  });

  return (
    <>
      <div
        id="current-weather-hero"
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 md:p-8 transition-all duration-500 border shadow-xl ${getAtmosphericBackground()} ${
          isDawnPulseActive
            ? 'ring-2 ring-amber-300/90 shadow-amber-500/40 border-amber-300/80 animate-dawn-pulse'
            : ''
        }`}
      >
        {/* Golden Dawn Atmosphere Ray Overlay when UI Pulse is active */}
        {isDawnPulseActive && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-amber-500/25 via-amber-400/10 to-transparent animate-dawn-aura z-0" />
        )}

        {/* Subtle backdrop decorative element */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-black/10 blur-3xl" />

        {/* In-Hero Silent Notification Banner */}
        {silentNotifToast && (
          <div
            id="hero-silent-notification-toast"
            className="relative z-20 mb-3 flex items-center justify-between gap-2 rounded-2xl bg-amber-500/25 border border-amber-300/40 px-3.5 py-2 text-xs text-white backdrop-blur-md shadow-md animate-in fade-in slide-in-from-top-2"
          >
            <div className="flex items-center gap-2">
              <VolumeX className="h-4 w-4 text-amber-300 shrink-0" />
              <span>{silentNotifToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setSilentNotifToast(null)}
              className="text-[10px] font-bold underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Pre-Sunrise Dawn Pulse Banner */}
        {isDawnPulseActive && (
          <div
            id="hero-dawn-pulse-badge"
            className="relative z-20 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-500/20 border border-amber-300/50 p-2.5 text-xs backdrop-blur-md text-amber-100 shadow-md animate-pulse"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/30 text-amber-200 shadow-xs">
                <Sunrise className="h-3.5 w-3.5 animate-bounce" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="font-bold text-amber-200">
                  Pre-Sunrise Dawn Glow Active
                </span>
                <span className="opacity-90">
                  • Sunrise at {sunriseCalc?.formattedSunrise || today?.sunrise || '--'}{' '}
                  {sunriseCalc?.minutesUntilSunrise && sunriseCalc.minutesUntilSunrise > 0
                    ? `(in ~${sunriseCalc.minutesUntilSunrise}m)`
                    : '(first light)'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-hero-dawn-alarm-settings"
                type="button"
                onClick={() => setShowAlarmModal(true)}
                className="flex items-center gap-1 rounded-lg bg-amber-500/30 border border-amber-300/40 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-500/50 transition"
              >
                <Bell className="h-3 w-3" />
                <span>Alarm Options</span>
              </button>
              {isSimulatingDawn && (
                <button
                  type="button"
                  onClick={() => setIsSimulatingDawn(false)}
                  className="rounded-lg bg-black/30 px-2 py-1 text-[11px] font-medium text-amber-200 hover:bg-black/50 transition"
                >
                  Exit Preview
                </button>
              )}
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          {/* Left: Location, Time & Main Condition */}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm font-medium opacity-90">
              <span className="font-semibold">{location.name}</span>
              {location.country && <span>• {location.country}</span>}
              <span className="flex items-center gap-1 opacity-75">
                <Clock className="h-3 w-3" />
                {formattedTime}
              </span>

              {/* Sunrise Alarm & UI Pulse Quick Pill */}
              <button
                id="hero-sunrise-alarm-trigger"
                type="button"
                onClick={() => setShowAlarmModal(true)}
                className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md border border-white/20 hover:bg-white/25 transition ml-1"
                title="Click to view Pre-Sunrise Alarm & UI Pulse settings"
              >
                <Sunrise className="h-3.5 w-3.5 text-amber-300" />
                <span>Sunrise: {sunriseCalc?.formattedSunrise || today?.sunrise || '--'}</span>
                <span className="rounded bg-amber-400/25 px-1 py-0.2 text-[10px] text-amber-200 font-medium">
                  Alarm & Pulse
                </span>
              </button>
            </div>

          <div className="mt-2 flex items-baseline gap-4 flex-wrap">
            <span className="text-6xl md:text-8xl font-black tracking-tighter leading-none">
              {Math.round(current.temperature)}°
            </span>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-xs md:text-sm font-medium opacity-85">
                <span className="flex items-center">
                  <ArrowUp className="h-3.5 w-3.5 text-red-300" />
                  {today ? today.tempMax : '--'}°
                </span>
                <span className="flex items-center ml-2">
                  <ArrowDown className="h-3.5 w-3.5 text-blue-200" />
                  {today ? today.tempMin : '--'}°
                </span>
              </div>

              {/* High-visibility Apparent Temperature / Feels Like Display */}
              <div
                id="hero-apparent-temperature-badge"
                className="inline-flex items-center gap-1.5 rounded-lg bg-black/20 px-2.5 py-1 text-xs md:text-sm font-semibold backdrop-blur-md border border-white/15"
                title={`Apparent temperature: ${Math.round(current.apparentTemperature)}°${unitSymbol} (${getFeelsLikeContext()})`}
              >
                <Thermometer className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                <span>Feels like {Math.round(current.apparentTemperature)}°</span>
                {tempDiff !== 0 && (
                  <span className="text-[11px] font-normal opacity-80">
                    ({tempDiff > 0 ? `+${tempDiff}°` : `${tempDiff}°`})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contextual meteorological explanation */}
          <div
            id="hero-feels-like-context"
            className="text-[11px] md:text-xs font-medium opacity-90 flex items-center gap-1.5 mt-0.5"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300 shrink-0" />
            <span>Apparent temperature: {getFeelsLikeContext()}</span>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <WeatherIcon
              code={current.weatherCode}
              isDay={current.isDay}
              className="h-7 w-7 md:h-8 md:w-8 drop-shadow-md"
            />
            <span className="text-lg md:text-2xl font-bold tracking-tight">
              {condition.description}
            </span>
          </div>
        </div>

        {/* Right: Quick Stat Chips (Google Weather Style) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 rounded-2xl bg-black/15 p-3 backdrop-blur-md border border-white/10 md:min-w-[420px]">
          {/* Apparent Temperature / Feels Like */}
          <div id="hero-feels-like-chip" className="flex items-center gap-2 rounded-xl bg-white/10 p-2.5">
            <Thermometer className="h-4 w-4 text-amber-200 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                Feels Like
              </span>
              <span className="text-xs md:text-sm font-semibold">
                {Math.round(current.apparentTemperature)}°{unitSymbol}
              </span>
            </div>
          </div>

          {/* Precipitation Chance */}
          <div className="flex items-center gap-2 rounded-xl bg-white/10 p-2.5">
            <CloudRain className="h-4 w-4 text-sky-200 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                Rain Chance
              </span>
              <span className="text-xs md:text-sm font-semibold">
                {today ? today.precipitationProbabilityMax : 0}%
              </span>
            </div>
          </div>

          {/* Wind */}
          <div className="flex items-center gap-2 rounded-xl bg-white/10 p-2.5">
            <Wind className="h-4 w-4 text-emerald-200 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                Wind
              </span>
              <span className="text-xs md:text-sm font-semibold">
                {current.windSpeed} {unit === 'celsius' ? 'km/h' : 'mph'}
              </span>
            </div>
          </div>

          {/* Humidity */}
          <div className="flex items-center gap-2 rounded-xl bg-white/10 p-2.5">
            <Droplets className="h-4 w-4 text-blue-200 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                Humidity
              </span>
              <span className="text-xs md:text-sm font-semibold">
                {current.relativeHumidity}%
              </span>
            </div>
          </div>

          {/* UV Index */}
          <div className="flex items-center gap-2 rounded-xl bg-white/10 p-2.5">
            <Sun className="h-4 w-4 text-amber-200 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                UV Index
              </span>
              <span className="text-xs md:text-sm font-semibold">
                {current.uvIndex ?? (today ? today.uvIndexMax : 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Animated Solar Sun Arc */}
      {today && (
        <div className="relative z-10 mt-5 pt-1">
          <SolarSunArc
            rawSunrise={today.rawSunrise}
            rawSunset={today.rawSunset}
            formattedSunrise={today.sunrise}
            formattedSunset={today.sunset}
            isDay={current.isDay}
            timezone={location.timezone}
          />
        </div>
      )}
    </div>

    {/* Sunrise Dawn Alarm & UI Pulse Modal */}
    <SunriseAlarmModal
      isOpen={showAlarmModal}
      onClose={() => setShowAlarmModal(false)}
      calculation={sunriseCalc}
      locationName={location.name}
      isSimulatingDawn={isSimulatingDawn}
      onToggleSimulation={() => setIsSimulatingDawn((prev) => !prev)}
      leadMinutes={leadMinutes}
      onChangeLeadMinutes={(mins) => setLeadMinutes(mins)}
      onNotificationSent={() => {
        setSilentNotifToast(`Silent notification test sent for ${location.name}`);
        setTimeout(() => setSilentNotifToast(null), 8000);
      }}
    />
  </>
  );
};
