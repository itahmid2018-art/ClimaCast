import React, { useState, useEffect } from 'react';
import { WEATHER_BACKGROUNDS, DEFAULT_BACKGROUND, isDataSaverActive } from '../utils/weatherBackgrounds';

interface WeatherBackgroundProps {
  category: string;
}

export const WeatherBackground: React.FC<WeatherBackgroundProps> = ({ category }) => {
  const [dataSaver, setDataSaver] = useState<boolean>(() => isDataSaverActive());
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentLoadedCategory, setCurrentLoadedCategory] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  // Sync with data saver preference changes
  useEffect(() => {
    const handleStorageChange = () => {
      setDataSaver(isDataSaverActive());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('climacast_bg_mode_changed', handleStorageChange);

    // Also listen to connection change if available
    const nav = navigator as any;
    if (nav.connection && typeof nav.connection.addEventListener === 'function') {
      nav.connection.addEventListener('change', handleStorageChange);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('climacast_bg_mode_changed', handleStorageChange);
      if (nav.connection && typeof nav.connection.removeEventListener === 'function') {
        nav.connection.removeEventListener('change', handleStorageChange);
      }
    };
  }, []);

  // When weather category changes, reset image loading states for smooth cross-fade
  useEffect(() => {
    setImageLoaded(false);
    setHasError(false);
  }, [category]);

  const bgConfig = WEATHER_BACKGROUNDS[category] || DEFAULT_BACKGROUND;

  return (
    <div
      id="weather-ambient-background"
      className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none select-none transition-colors duration-1000 ease-in-out"
      aria-hidden="true"
    >
      {/* 1. Baseline Atmospheric Gradient Layer (Instant render with zero network delay) */}
      <div
        id="weather-gradient-layer"
        className={`absolute inset-0 bg-gradient-to-br transition-all duration-1000 ease-in-out ${bgConfig.gradientClasses}`}
      />

      {/* 2. Responsive Photographic Layer (Lazy loaded, bandwidth-adaptive) */}
      {!dataSaver && !hasError && (
        <picture className="absolute inset-0 w-full h-full block">
          {/* Mobile breakpoint (<= 640px) consumes ~25-40KB compressed image */}
          <source
            media="(max-width: 640px)"
            srcSet={bgConfig.mobile}
            type="image/jpeg"
          />
          {/* Tablet breakpoint (<= 1024px) consumes ~60-85KB compressed image */}
          <source
            media="(max-width: 1024px)"
            srcSet={bgConfig.tablet}
            type="image/jpeg"
          />
          {/* Desktop & Ultra-wide breakpoint with responsive srcSet */}
          <img
            id={`weather-bg-image-${category}`}
            src={bgConfig.desktop}
            srcSet={bgConfig.srcSet}
            sizes={bgConfig.sizes}
            alt={bgConfig.alt}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            onLoad={() => {
              setImageLoaded(true);
              setCurrentLoadedCategory(category);
            }}
            onError={() => {
              setHasError(true);
            }}
            className={`w-full h-full object-cover object-center transition-all duration-1000 ease-out transform scale-105 filter blur-xs ${
              bgConfig.overlayClass
            } ${imageLoaded && currentLoadedCategory === category ? 'opacity-100' : 'opacity-0'}`}
          />
        </picture>
      )}

      {/* 3. Text Legibility & Contrast Veil (Ensures WCAG AA contrast over light/dark weather scenes) */}
      <div
        id="weather-contrast-veil"
        className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/30 dark:from-slate-950/40 dark:via-slate-900/30 dark:to-slate-950/60 pointer-events-none"
      />
    </div>
  );
};

