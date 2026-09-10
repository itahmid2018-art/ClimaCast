/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeatherConditionInfo } from '../types';

/**
 * Maps WMO weather interpretation codes from Open-Meteo
 * to user-friendly titles, categories, and icons.
 */
export function getWeatherCondition(code: number, isDay: boolean = true): WeatherConditionInfo {
  switch (code) {
    case 0:
      return {
        code,
        description: isDay ? 'Clear sky' : 'Clear night',
        iconName: isDay ? 'Sun' : 'Moon',
        backgroundCategory: isDay ? 'clear-day' : 'clear-night',
      };
    case 1:
      return {
        code,
        description: isDay ? 'Mainly sunny' : 'Mostly clear',
        iconName: isDay ? 'SunMedium' : 'MoonStar',
        backgroundCategory: isDay ? 'clear-day' : 'clear-night',
      };
    case 2:
      return {
        code,
        description: 'Partly cloudy',
        iconName: isDay ? 'CloudSun' : 'CloudMoon',
        backgroundCategory: 'cloudy',
      };
    case 3:
      return {
        code,
        description: 'Overcast',
        iconName: 'Cloud',
        backgroundCategory: 'cloudy',
      };
    case 45:
      return {
        code,
        description: 'Foggy',
        iconName: 'CloudFog',
        backgroundCategory: 'fog',
      };
    case 48:
      return {
        code,
        description: 'Depositing rime fog',
        iconName: 'CloudFog',
        backgroundCategory: 'fog',
      };
    case 51:
      return {
        code,
        description: 'Light drizzle',
        iconName: 'CloudDrizzle',
        backgroundCategory: 'rain',
      };
    case 53:
      return {
        code,
        description: 'Moderate drizzle',
        iconName: 'CloudDrizzle',
        backgroundCategory: 'rain',
      };
    case 55:
      return {
        code,
        description: 'Dense drizzle',
        iconName: 'CloudDrizzle',
        backgroundCategory: 'rain',
      };
    case 56:
    case 57:
      return {
        code,
        description: 'Freezing drizzle',
        iconName: 'CloudSnow',
        backgroundCategory: 'snow',
      };
    case 61:
      return {
        code,
        description: 'Slight rain',
        iconName: 'CloudRain',
        backgroundCategory: 'rain',
      };
    case 63:
      return {
        code,
        description: 'Moderate rain',
        iconName: 'CloudRain',
        backgroundCategory: 'rain',
      };
    case 65:
      return {
        code,
        description: 'Heavy rain',
        iconName: 'CloudRainWind',
        backgroundCategory: 'rain',
      };
    case 66:
    case 67:
      return {
        code,
        description: 'Freezing rain',
        iconName: 'CloudSnow',
        backgroundCategory: 'snow',
      };
    case 71:
      return {
        code,
        description: 'Slight snow fall',
        iconName: 'CloudSnow',
        backgroundCategory: 'snow',
      };
    case 73:
      return {
        code,
        description: 'Moderate snow fall',
        iconName: 'CloudSnow',
        backgroundCategory: 'snow',
      };
    case 75:
      return {
        code,
        description: 'Heavy snow fall',
        iconName: 'Snowflake',
        backgroundCategory: 'snow',
      };
    case 77:
      return {
        code,
        description: 'Snow grains',
        iconName: 'Snowflake',
        backgroundCategory: 'snow',
      };
    case 80:
      return {
        code,
        description: 'Slight rain showers',
        iconName: 'CloudRain',
        backgroundCategory: 'rain',
      };
    case 81:
      return {
        code,
        description: 'Moderate rain showers',
        iconName: 'CloudRain',
        backgroundCategory: 'rain',
      };
    case 82:
      return {
        code,
        description: 'Violent rain showers',
        iconName: 'CloudRainWind',
        backgroundCategory: 'rain',
      };
    case 85:
      return {
        code,
        description: 'Slight snow showers',
        iconName: 'CloudSnow',
        backgroundCategory: 'snow',
      };
    case 86:
      return {
        code,
        description: 'Heavy snow showers',
        iconName: 'CloudSnow',
        backgroundCategory: 'snow',
      };
    case 95:
      return {
        code,
        description: 'Thunderstorm',
        iconName: 'CloudLightning',
        backgroundCategory: 'thunderstorm',
      };
    case 96:
    case 99:
      return {
        code,
        description: 'Thunderstorm with hail',
        iconName: 'CloudLightning',
        backgroundCategory: 'thunderstorm',
      };
    default:
      return {
        code,
        description: isDay ? 'Sunny' : 'Clear',
        iconName: isDay ? 'Sun' : 'Moon',
        backgroundCategory: isDay ? 'clear-day' : 'clear-night',
      };
  }
}

/**
 * Cardinal direction converter from degree angle (0-360)
 */
export function getWindDirectionName(degree: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((degree %= 360) < 0 ? degree + 360 : degree) / 22.5) % 16;
  return directions[index];
}

/**
 * Evaluate US AQI levels & color / advisory text
 */
export function evaluateAQI(aqi: number) {
  if (aqi <= 50) {
    return {
      level: 'Good' as const,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/15 border-emerald-500/30',
      advice: 'Air quality is satisfactory, and air pollution poses little or no risk.',
    };
  } else if (aqi <= 100) {
    return {
      level: 'Moderate' as const,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/15 border-amber-500/30',
      advice: 'Air quality is acceptable. Sensitive individuals may experience minor symptoms.',
    };
  } else if (aqi <= 150) {
    return {
      level: 'Unhealthy for Sensitive' as const,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-500/15 border-orange-500/30',
      advice: 'Members of sensitive groups may experience health effects. General public less likely affected.',
    };
  } else if (aqi <= 200) {
    return {
      level: 'Unhealthy' as const,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-500/15 border-rose-500/30',
      advice: 'Some members of the general public may experience health effects.',
    };
  } else if (aqi <= 300) {
    return {
      level: 'Very Unhealthy' as const,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/15 border-purple-500/30',
      advice: 'Health alert: The risk of health effects is increased for everyone.',
    };
  } else {
    return {
      level: 'Hazardous' as const,
      color: 'text-red-700 dark:text-red-400',
      bgColor: 'bg-red-500/20 border-red-500/40',
      advice: 'Health warning of emergency conditions: Everyone is more likely to be affected.',
    };
  }
}
