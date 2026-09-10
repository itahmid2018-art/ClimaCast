/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AirQualityData,
  CurrentWeatherData,
  DailyForecastItem,
  HourlyForecastItem,
  WeatherAlert,
  WeatherUnits,
} from '../types';

export function detectWeatherAlerts(
  current: CurrentWeatherData,
  hourly: HourlyForecastItem[],
  daily: DailyForecastItem[],
  airQuality?: AirQualityData,
  units: WeatherUnits = { temperature: 'celsius', windSpeed: 'kmh', precipitation: 'mm' }
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const windUnit = units.windSpeed === 'kmh' ? 'km/h' : 'mph';
  const tempUnit = units.temperature === 'celsius' ? '°C' : '°F';
  const now = new Date();

  const formatExpiryTime = (hoursAhead: number) => {
    const exp = new Date(now.getTime() + hoursAhead * 3600 * 1000);
    return exp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Check Thunderstorms (Current or next 12 hours)
  const isCurrentThunderstorm = [95, 96, 99].includes(current.weatherCode);
  const upcomingThunderstormHour = hourly.slice(0, 12).find((h) => [95, 96, 99].includes(h.weatherCode));

  if (isCurrentThunderstorm || upcomingThunderstormHour) {
    const isSevere = current.weatherCode === 96 || current.weatherCode === 99 || (upcomingThunderstormHour && [96, 99].includes(upcomingThunderstormHour.weatherCode));
    const maxGusts = Math.max(current.windGusts, ...(hourly.slice(0, 12).map((h) => h.windSpeed * 1.4)));

    alerts.push({
      id: 'alert-thunderstorm',
      headline: isSevere ? 'Severe Thunderstorm Warning' : 'Thunderstorm Watch',
      severity: isSevere ? 'warning' : 'watch',
      event: isSevere ? 'Severe Thunderstorm & Damaging Winds' : 'Scattered Thunderstorms',
      urgency: isCurrentThunderstorm ? 'Immediate' : 'Expected',
      effectiveTime: 'Active now',
      expiresTime: formatExpiryTime(4),
      description: isSevere
        ? `Open-Meteo convective models report severe convective activity with damaging wind gusts up to ${Math.round(maxGusts)} ${windUnit} and risk of hail.`
        : `Atmospheric instability likely to generate lightning, brief heavy precipitation, and localized wind gusts.`,
      instruction: 'Move indoors immediately into a sturdy building. Stay away from windows, electrical appliances, and open bodies of water.',
      source: 'Open-Meteo Meteorological Convective Forecast',
      colorClass: isSevere ? 'from-rose-600 to-red-700 text-white' : 'from-amber-600 to-orange-700 text-white',
      badgeBg: isSevere ? 'bg-rose-500' : 'bg-amber-500',
      metrics: {
        windGusts: Math.round(maxGusts),
        weatherCode: isCurrentThunderstorm ? current.weatherCode : upcomingThunderstormHour?.weatherCode,
      },
    });
  }

  // Check Extreme Wind / Gale Warnings (Gusts > 65 km/h or 40 mph)
  const gustThreshold = units.windSpeed === 'kmh' ? 65 : 40;
  const severeGustThreshold = units.windSpeed === 'kmh' ? 85 : 52;
  const maxGustNext12h = Math.max(current.windGusts, ...(hourly.slice(0, 12).map((h) => h.windSpeed * 1.35)));

  if (maxGustNext12h >= gustThreshold) {
    const isViolent = maxGustNext12h >= severeGustThreshold;
    alerts.push({
      id: 'alert-wind',
      headline: isViolent ? 'High Wind Warning' : 'Wind Advisory',
      severity: isViolent ? 'warning' : 'advisory',
      event: isViolent ? 'Damaging Wind Gusts' : 'Strong Elevated Winds',
      urgency: current.windGusts >= gustThreshold ? 'Immediate' : 'Expected',
      effectiveTime: 'Active now',
      expiresTime: formatExpiryTime(6),
      description: `Sustained winds and peak gusts reaching ${Math.round(maxGustNext12h)} ${windUnit}. Potential for fallen tree branches, flying debris, and localized power outages.`,
      instruction: 'Secure outdoor loose objects, patio furniture, and trash cans. Use caution if driving high-profile vehicles.',
      source: 'Open-Meteo High-Resolution Wind Model',
      colorClass: isViolent ? 'from-rose-600 to-amber-700 text-white' : 'from-amber-500 to-amber-600 text-white',
      badgeBg: isViolent ? 'bg-rose-500' : 'bg-amber-500',
      metrics: {
        windGusts: Math.round(maxGustNext12h),
      },
    });
  }

  // Check Flash Flood / Extreme Rainfall (WMO 65, 82, or hourly precip > 12mm)
  const heavyRainCode = [65, 82].includes(current.weatherCode);
  const maxPrecipHour = Math.max(...(hourly.slice(0, 12).map((h) => h.precipitation)));
  const todayDailyPrecip = daily[0]?.precipitationSum || 0;

  if (heavyRainCode || maxPrecipHour >= 12 || todayDailyPrecip >= 40) {
    alerts.push({
      id: 'alert-flood',
      headline: 'Heavy Rainfall & Flood Watch',
      severity: 'warning',
      event: 'Torrential Rain & Localized Inundation',
      urgency: heavyRainCode ? 'Immediate' : 'Expected',
      effectiveTime: 'Active now',
      expiresTime: formatExpiryTime(5),
      description: `Excessive rainfall rates may result in urban street flooding, ponding on highways, and rapid rises in small streams. Total precipitation up to ${Math.round(todayDailyPrecip)} mm expected.`,
      instruction: 'Never drive through flooded roadways: Turn around, don’t drown. Keep storm drains clear of debris.',
      source: 'Open-Meteo Precipitation Forecast Models',
      colorClass: 'from-blue-700 to-indigo-800 text-white',
      badgeBg: 'bg-blue-600',
      metrics: {
        rainRate: Math.round(maxPrecipHour * 10) / 10,
      },
    });
  }

  // Check Winter Storm & Freezing Rain (WMO 66, 67, 75, 86)
  const winterHazard = [66, 67, 75, 86].includes(current.weatherCode) || hourly.slice(0, 12).some((h) => [66, 67, 75, 86].includes(h.weatherCode));
  if (winterHazard) {
    const isIce = [66, 67].includes(current.weatherCode);
    alerts.push({
      id: 'alert-winter',
      headline: isIce ? 'Ice Storm Warning' : 'Winter Storm Warning',
      severity: 'warning',
      event: isIce ? 'Freezing Rain & Glaze Accumulation' : 'Heavy Snow & Low Visibility',
      urgency: 'Immediate',
      effectiveTime: 'Active now',
      expiresTime: formatExpiryTime(8),
      description: isIce
        ? 'Freezing rain is causing rapid ice accumulation on elevated roadways, bridges, and power lines.'
        : 'Heavy snowfall and blowing snow significantly degrading optical visibility.',
      instruction: 'Avoid non-essential travel. Keep an emergency supply kit, blankets, and flashlights in your vehicle if travel is unavoidable.',
      source: 'Open-Meteo Snow & Ice Interpretation',
      colorClass: 'from-sky-700 via-indigo-800 to-slate-800 text-white',
      badgeBg: 'bg-sky-500',
    });
  }

  // Check Extreme Heat (> 38°C / 100°F)
  const heatThreshold = units.temperature === 'celsius' ? 38 : 100;
  if (current.temperature >= heatThreshold || current.apparentTemperature >= heatThreshold + 2) {
    alerts.push({
      id: 'alert-heat',
      headline: 'Excessive Heat Warning',
      severity: 'warning',
      event: 'Dangerous Extreme Heat',
      urgency: 'Immediate',
      effectiveTime: 'Active now',
      expiresTime: formatExpiryTime(7),
      description: `Dangerously hot conditions with heat index values reaching ${Math.round(current.apparentTemperature)}${tempUnit}. Significant increase in risk for heat-related illnesses.`,
      instruction: 'Drink plenty of water, stay in air-conditioned rooms, avoid direct midday sun, and check on elderly family and neighbors.',
      source: 'Open-Meteo Biometeorological Heat Model',
      colorClass: 'from-rose-600 to-red-800 text-white',
      badgeBg: 'bg-rose-600',
      metrics: {
        tempExtreme: current.temperature,
      },
    });
  }

  // Check Air Quality Alerts (US AQI > 150)
  if (airQuality && airQuality.aqiUs >= 150) {
    const isHazardous = airQuality.aqiUs >= 200;
    alerts.push({
      id: 'alert-aqi',
      headline: isHazardous ? 'Air Quality Emergency Alert' : 'Air Quality Action Day',
      severity: isHazardous ? 'emergency' : 'advisory',
      event: 'Elevated Particulate / Ozone Pollution',
      urgency: 'Immediate',
      effectiveTime: 'Active today',
      expiresTime: '11:59 PM',
      description: `Air Quality Index is ${airQuality.aqiUs} (${airQuality.qualityLevel}). ${airQuality.advice}`,
      instruction: 'Limit prolonged outdoor exertion. Sensitive groups should remain indoors with HEPA air filtration.',
      source: 'Open-Meteo Global Air Quality API (CAMS / GFS)',
      colorClass: 'from-purple-800 to-slate-900 text-white',
      badgeBg: 'bg-purple-600',
      metrics: {
        aqi: airQuality.aqiUs,
      },
    });
  }

  return alerts;
}

/**
 * Returns realistic simulated severe weather alerts for testing
 */
export function getSimulatedSevereStormAlert(units: WeatherUnits = { temperature: 'celsius', windSpeed: 'kmh', precipitation: 'mm' }): WeatherAlert {
  const windUnit = units.windSpeed === 'kmh' ? 'km/h' : 'mph';
  const now = new Date();
  const expires = new Date(now.getTime() + 3 * 3600 * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  return {
    id: 'sim-severe-storm',
    headline: 'Severe Thunderstorm Warning',
    severity: 'warning',
    event: 'Destructive Convective Storm & Hail',
    urgency: 'Immediate',
    effectiveTime: 'Issued just now',
    expiresTime: expires,
    description: `Meteorological radar Doppler and convective models indicate a severe thunderstorm capable of producing quarter-sized hail and damaging wind gusts in excess of 95 ${windUnit}. Torrential rainfall will cause localized flash flooding.`,
    instruction: 'TAKE SHELTER NOW! Move to an interior room on the lowest floor of a sturdy building. Avoid windows. If outdoors or in a vehicle, seek substantial shelter immediately.',
    source: 'Open-Meteo Severe Convection Early Warning System',
    colorClass: 'from-rose-600 via-red-600 to-amber-700 text-white',
    badgeBg: 'bg-rose-600',
    metrics: {
      windGusts: units.windSpeed === 'kmh' ? 95 : 60,
      rainRate: 32,
      weatherCode: 99,
    },
  };
}
