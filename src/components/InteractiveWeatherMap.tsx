/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import {
  Layers,
  CloudRain,
  Cloud,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Navigation,
  Eye,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { GeoLocation, ProcessedWeather, TemperatureUnit } from '../types';

interface InteractiveWeatherMapProps {
  location: GeoLocation;
  weather: ProcessedWeather;
  unit: TemperatureUnit;
  isDark?: boolean;
}

interface RainViewerData {
  host: string;
  radar: {
    past: Array<{ time: number; path: string }>;
    nowcast: Array<{ time: number; path: string }>;
  };
  satellite: {
    infrared: Array<{ time: number; path: string }>;
  };
}

export const InteractiveWeatherMap: React.FC<InteractiveWeatherMapProps> = ({
  location,
  weather,
  unit,
  isDark = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const radarTileLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteTileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [activeLayer, setActiveLayer] = useState<'precipitation' | 'clouds' | 'both'>('precipitation');
  const [opacity, setOpacity] = useState<number>(0.8);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [radarFrames, setRadarFrames] = useState<Array<{ time: number; path: string }>>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [satelliteFrames, setSatelliteFrames] = useState<Array<{ time: number; path: string }>>([]);
  const [apiHost, setApiHost] = useState<string>('https://tilecache.rainviewer.com');
  const [isLoadingFrames, setIsLoadingFrames] = useState<boolean>(true);

  // 1. Fetch RainViewer public API frames for real-time radar and satellite clouds
  useEffect(() => {
    let isMounted = true;
    const fetchRadarMetadata = async () => {
      try {
        setIsLoadingFrames(true);
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        if (!res.ok) throw new Error('RainViewer API error');
        const data: RainViewerData = await res.json();
        if (!isMounted) return;

        setApiHost(data.host || 'https://tilecache.rainviewer.com');
        const pastRadar = data.radar?.past || [];
        const nowcastRadar = data.radar?.nowcast || [];
        const allRadar = [...pastRadar, ...nowcastRadar];

        setRadarFrames(allRadar);
        setSatelliteFrames(data.satellite?.infrared || []);
        if (allRadar.length > 0) {
          // Set to the latest past frame (current real-time)
          const latestPastIdx = Math.max(0, pastRadar.length - 1);
          setCurrentFrameIndex(latestPastIdx);
        }
      } catch (err) {
        console.warn('RainViewer API unavailable, using fallback timestamp:', err);
        const fallbackTime = Math.floor(Date.now() / 600000) * 600; // 10-min rounded timestamp
        setRadarFrames([{ time: fallbackTime, path: `/v2/radar/${fallbackTime}` }]);
      } finally {
        if (isMounted) setIsLoadingFrames(false);
      }
    };

    fetchRadarMetadata();
    const interval = setInterval(fetchRadarMetadata, 10 * 60 * 1000); // refresh every 10 mins
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [location.latitude, location.longitude],
        zoom: 8,
        minZoom: 3,
        maxZoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Attribution
      L.control
        .attribution({ position: 'bottomright', prefix: false })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, <a href="https://www.rainviewer.com/">RainViewer</a>')
        .addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 3. Update Base Map Tiles (Light vs Dark mode)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    const baseTileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const baseLayer = L.tileLayer(baseTileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    });

    baseLayer.addTo(map);
    baseLayer.bringToBack();
    baseTileLayerRef.current = baseLayer;
  }, [isDark]);

  // 4. Update Marker & Pan on location change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.flyTo([location.latitude, location.longitude], 8, {
      duration: 1.2,
      easeLinearity: 0.25,
    });

    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    const tempUnit = unit === 'fahrenheit' ? '°F' : '°C';
    const markerHtml = `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
        <span class="absolute h-10 w-10 animate-ping rounded-full bg-blue-500/40"></span>
        <div class="relative flex items-center gap-1.5 rounded-full border-2 border-white bg-blue-600 px-2.5 py-1 text-xs font-bold text-white shadow-lg dark:border-slate-800">
          <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span>${location.name}</span>
          <span class="rounded bg-blue-700/80 px-1 py-0.2 text-[10px]">${weather.current.temperature}${tempUnit}</span>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: markerHtml,
      className: 'custom-weather-marker',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    const marker = L.marker([location.latitude, location.longitude], { icon: customIcon }).addTo(map);
    markerRef.current = marker;

    // Invalidate map size to handle container resize
    setTimeout(() => map.invalidateSize(), 200);
  }, [location.latitude, location.longitude, location.name, weather.current.temperature, unit]);

  // 5. Update Weather Overlay Tile Layers (Radar & Clouds)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing overlays
    if (radarTileLayerRef.current) {
      map.removeLayer(radarTileLayerRef.current);
      radarTileLayerRef.current = null;
    }
    if (satelliteTileLayerRef.current) {
      map.removeLayer(satelliteTileLayerRef.current);
      satelliteTileLayerRef.current = null;
    }

    // Add Cloud/Satellite Layer
    if ((activeLayer === 'clouds' || activeLayer === 'both') && satelliteFrames.length > 0) {
      const latestSat = satelliteFrames[satelliteFrames.length - 1];
      const satUrl = `${apiHost}${latestSat.path}/512/{z}/{x}/{y}/0/0_0.png`;
      const satLayer = L.tileLayer(satUrl, {
        tileSize: 512,
        opacity: activeLayer === 'both' ? opacity * 0.75 : opacity,
        zIndex: 5,
      }).addTo(map);
      satelliteTileLayerRef.current = satLayer;
    }

    // Add Precipitation Radar Layer
    if ((activeLayer === 'precipitation' || activeLayer === 'both') && radarFrames.length > 0) {
      const currentFrame = radarFrames[currentFrameIndex] || radarFrames[radarFrames.length - 1];
      // color scheme 2 (Universal Blue-Green-Yellow-Red colorbar), smooth 1, snow 1
      const radarUrl = `${apiHost}${currentFrame.path}/512/{z}/{x}/{y}/2/1_1.png`;
      const radarLayer = L.tileLayer(radarUrl, {
        tileSize: 512,
        opacity: opacity,
        zIndex: 10,
      }).addTo(map);
      radarTileLayerRef.current = radarLayer;
    }
  }, [activeLayer, opacity, currentFrameIndex, radarFrames, satelliteFrames, apiHost]);

  // 6. Handle Frame Animation (Play/Pause radar timeline)
  useEffect(() => {
    if (!isPlaying || radarFrames.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % radarFrames.length);
    }, 700);

    return () => clearInterval(timer);
  }, [isPlaying, radarFrames.length]);

  // Handle Fullscreen resize
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 300);
  };

  // Recenter map on location
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([location.latitude, location.longitude], 9, {
        duration: 0.8,
      });
    }
  };

  // Current frame time label
  const currentFrameObj = radarFrames[currentFrameIndex];
  const frameTimeStr = currentFrameObj
    ? new Date(currentFrameObj.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Live';

  return (
    <div
      id="weather-map-section"
      className={`relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900 ${
        isFullscreen
          ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl md:inset-8'
          : 'w-full'
      }`}
    >
      {/* Map Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 p-4 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Interactive Weather Radar & Cloud Map
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live Doppler radar precipitation and satellite clouds for {location.name}
            </p>
          </div>
        </div>

        {/* Layer Selector Chips */}
        <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveLayer('precipitation')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              activeLayer === 'precipitation'
                ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <CloudRain className="h-3.5 w-3.5" />
            <span>Precipitation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveLayer('clouds')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              activeLayer === 'clouds'
                ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Cloud className="h-3.5 w-3.5" />
            <span>Cloud Cover</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveLayer('both')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              activeLayer === 'both'
                ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Combined</span>
          </button>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className={`w-full bg-slate-100 dark:bg-slate-950 transition-all ${
            isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-80 sm:h-96 md:h-[420px]'
          }`}
        />

        {/* Floating Quick Navigation & Tool Controls */}
        <div className="absolute left-4 top-4 z-[400] flex flex-col gap-2">
          {/* Recenter button */}
          <button
            type="button"
            onClick={handleRecenter}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Recenter on current location"
          >
            <Navigation className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </button>

          {/* Fullscreen button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Bottom Floating Timeline Player & Color Legend Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
            {/* Play/Pause and Timeline Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                disabled={radarFrames.length <= 1}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                title={isPlaying ? 'Pause radar animation' : 'Play radar loop'}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
              </button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span>{frameTimeStr}</span>
                  </span>
                  {currentFrameIndex === radarFrames.length - 1 && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      LIVE
                    </span>
                  )}
                </div>

                {/* Scrubber slider */}
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, radarFrames.length - 1)}
                  value={currentFrameIndex}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setCurrentFrameIndex(parseInt(e.target.value, 10));
                  }}
                  className="mt-1 h-1.5 w-32 sm:w-48 cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            {/* Radar Intensity / Cloud Legend */}
            <div className="flex items-center gap-3">
              {activeLayer !== 'clouds' ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rain Intensity
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Light</span>
                    <div className="h-2.5 w-24 sm:w-32 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 via-amber-400 to-rose-600 shadow-2xs" />
                    <span className="text-[10px] text-slate-500">Heavy</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Cloud Density
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">Thin</span>
                    <div className="h-2.5 w-24 sm:w-32 rounded-full bg-gradient-to-r from-slate-300 to-slate-800 shadow-2xs dark:from-slate-600 dark:to-white" />
                    <span className="text-[10px] text-slate-500">Dense</span>
                  </div>
                </div>
              )}

              {/* Opacity Selector */}
              <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-200 pl-3 dark:border-slate-700">
                <span className="text-[10px] font-semibold text-slate-500">Opacity</span>
                <input
                  type="range"
                  min={0.3}
                  max={1}
                  step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="h-1.5 w-16 cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
