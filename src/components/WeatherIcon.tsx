/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sun,
  SunMedium,
  Moon,
  MoonStar,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  Snowflake,
  CloudLightning,
  CloudFog,
  CloudRainWind,
} from 'lucide-react';
import { getWeatherCondition } from '../utils/weatherCodes';

interface WeatherIconProps {
  code: number;
  isDay?: boolean;
  className?: string;
  size?: number;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  code,
  isDay = true,
  className = 'w-6 h-6',
  size,
}) => {
  const info = getWeatherCondition(code, isDay);
  const iconProps = {
    className,
    size,
    strokeWidth: 2,
  };

  switch (info.iconName) {
    case 'Sun':
      return <Sun {...iconProps} className={`${className} text-amber-500`} />;
    case 'SunMedium':
      return <SunMedium {...iconProps} className={`${className} text-amber-400`} />;
    case 'Moon':
      return <Moon {...iconProps} className={`${className} text-indigo-300`} />;
    case 'MoonStar':
      return <MoonStar {...iconProps} className={`${className} text-indigo-300`} />;
    case 'CloudSun':
      return <CloudSun {...iconProps} className={`${className} text-amber-400`} />;
    case 'CloudMoon':
      return <CloudMoon {...iconProps} className={`${className} text-indigo-300`} />;
    case 'Cloud':
      return <Cloud {...iconProps} className={`${className} text-slate-400`} />;
    case 'CloudFog':
      return <CloudFog {...iconProps} className={`${className} text-slate-400`} />;
    case 'CloudDrizzle':
      return <CloudDrizzle {...iconProps} className={`${className} text-sky-400`} />;
    case 'CloudRain':
      return <CloudRain {...iconProps} className={`${className} text-blue-500`} />;
    case 'CloudRainWind':
      return <CloudRainWind {...iconProps} className={`${className} text-blue-600`} />;
    case 'CloudSnow':
      return <CloudSnow {...iconProps} className={`${className} text-cyan-200`} />;
    case 'Snowflake':
      return <Snowflake {...iconProps} className={`${className} text-cyan-300`} />;
    case 'CloudLightning':
      return <CloudLightning {...iconProps} className={`${className} text-amber-500`} />;
    default:
      return <Sun {...iconProps} className={`${className} text-amber-500`} />;
  }
};
