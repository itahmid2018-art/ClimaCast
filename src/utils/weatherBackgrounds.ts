/**
 * Responsive weather-condition background image sources, srcset definitions,
 * and bandwidth conservation helpers.
 */

export interface WeatherBackgroundImageConfig {
  category: string;
  photoId: string;
  alt: string;
  mobile: string;
  tablet: string;
  desktop: string;
  ultrawide: string;
  srcSet: string;
  sizes: string;
  lowResPlaceholder: string;
  gradientClasses: string;
  overlayClass: string;
}

const UNSPLASH_BASE = 'https://images.unsplash.com';

function createResponsiveConfig(
  category: string,
  photoId: string,
  alt: string,
  gradientClasses: string,
  overlayClass = 'opacity-35 dark:opacity-20'
): WeatherBackgroundImageConfig {
  const mobile = `${UNSPLASH_BASE}/${photoId}?auto=format&fit=crop&w=640&q=70`;
  const tablet = `${UNSPLASH_BASE}/${photoId}?auto=format&fit=crop&w=1080&q=75`;
  const desktop = `${UNSPLASH_BASE}/${photoId}?auto=format&fit=crop&w=1920&q=80`;
  const ultrawide = `${UNSPLASH_BASE}/${photoId}?auto=format&fit=crop&w=2560&q=80`;
  const lowResPlaceholder = `${UNSPLASH_BASE}/${photoId}?auto=format&fit=crop&w=64&q=30&blur=20`;

  return {
    category,
    photoId,
    alt,
    mobile,
    tablet,
    desktop,
    ultrawide,
    srcSet: `${mobile} 640w, ${tablet} 1080w, ${desktop} 1920w, ${ultrawide} 2560w`,
    sizes: '100vw',
    lowResPlaceholder,
    gradientClasses,
    overlayClass,
  };
}

export const WEATHER_BACKGROUNDS: Record<string, WeatherBackgroundImageConfig> = {
  'clear-day': createResponsiveConfig(
    'clear-day',
    'photo-1601297183305-6df142704ea2',
    'Clear sunny day with radiant blue sky and soft sun rays',
    'from-sky-300 via-blue-200 to-blue-50 dark:from-sky-900 dark:via-slate-800 dark:to-slate-900',
    'opacity-35 dark:opacity-20'
  ),
  'clear-night': createResponsiveConfig(
    'clear-night',
    'photo-1506703719100-a0f3a48c0f86',
    'Deep starlit celestial night sky with stars and tranquil horizon',
    'from-indigo-950 via-slate-900 to-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800',
    'opacity-40 dark:opacity-30'
  ),
  cloudy: createResponsiveConfig(
    'cloudy',
    'photo-1534088568595-a066f410bcda',
    'Overcast atmospheric cloud blanket with soft diffuse light',
    'from-slate-300 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-900',
    'opacity-35 dark:opacity-25'
  ),
  fog: createResponsiveConfig(
    'fog',
    'photo-1487621167305-5d248087c724',
    'Atmospheric mist and rolling fog through tranquil landscapes',
    'from-slate-300 via-gray-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-800',
    'opacity-30 dark:opacity-20'
  ),
  rain: createResponsiveConfig(
    'rain',
    'photo-1519692933481-e162a57d6721',
    'Moody rainfall with raindrops reflecting cool ambient sky',
    'from-slate-500 via-slate-400 to-slate-300 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950',
    'opacity-40 dark:opacity-25'
  ),
  snow: createResponsiveConfig(
    'snow',
    'photo-1491002052546-bf38f186af56',
    'Tranquil winter snowfall over frosted landscape',
    'from-indigo-200 via-slate-100 to-white dark:from-slate-800 dark:via-slate-700 dark:to-slate-900',
    'opacity-35 dark:opacity-20'
  ),
  thunderstorm: createResponsiveConfig(
    'thunderstorm',
    'photo-1605721911519-3dfeb3be25e7',
    'Dramatic thunderstorm clouds with electric violet lightning',
    'from-slate-800 via-purple-900 to-slate-900 dark:from-slate-950 dark:via-purple-950 dark:to-slate-900',
    'opacity-45 dark:opacity-30'
  ),
};

export const DEFAULT_BACKGROUND = WEATHER_BACKGROUNDS['clear-day'];

export type BackgroundImageMode = 'responsive' | 'gradients_only';

/**
 * Checks whether data saving is preferred via browser API or user preference.
 */
export function isDataSaverActive(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check user preference stored locally
  const userPref = localStorage.getItem('climacast_bg_image_mode');
  if (userPref === 'gradients_only') return true;
  if (userPref === 'responsive') return false;

  // 2. Check navigator.connection.saveData (Save-Data HTTP header / Chrome Data Saver)
  const nav = navigator as any;
  if (nav.connection?.saveData === true) return true;

  // 3. Check effective connection type (slow-2g or 2g)
  if (nav.connection?.effectiveType === 'slow-2g' || nav.connection?.effectiveType === '2g') {
    return true;
  }

  return false;
}
