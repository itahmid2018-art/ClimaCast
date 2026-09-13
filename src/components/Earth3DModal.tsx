/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Globe,
  Compass,
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  MapPin,
  Cloud,
  Wind,
  Thermometer,
  Layers,
  ExternalLink,
  Navigation,
  Eye,
  Crosshair,
  Sparkles,
} from 'lucide-react';
import { GeoLocation, ProcessedWeather, TemperatureUnit } from '../types';
import { getWeatherEmoji, getWeatherCondition } from '../utils/weatherCodes';

interface Earth3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: GeoLocation;
  weather?: ProcessedWeather;
  unit: TemperatureUnit;
}

// Major continental landmass boundary outlines (simplified latitude/longitude curves for fast Canvas rendering)
const CONTINENT_POLYGONS: Array<Array<[number, number]>> = [
  // North America
  [
    [70, -165], [72, -130], [60, -85], [50, -55], [45, -65], [30, -80],
    [25, -80], [20, -100], [15, -90], [10, -80], [18, -105], [32, -117],
    [48, -125], [60, -140], [65, -168], [70, -165]
  ],
  // South America
  [
    [10, -75], [5, -50], [-5, -35], [-22, -40], [-35, -55], [-55, -68],
    [-52, -75], [-35, -72], [-18, -70], [-5, -80], [5, -77], [10, -75]
  ],
  // Eurasia (Europe + Asia)
  [
    [70, 25], [75, 60], [72, 100], [70, 140], [65, 170], [60, 160],
    [40, 145], [30, 120], [20, 110], [10, 105], [10, 80], [25, 65],
    [30, 50], [32, 35], [38, 25], [45, 15], [55, 10], [60, 5],
    [70, 20], [70, 25]
  ],
  // Africa
  [
    [35, -5], [37, 10], [32, 30], [12, 50], [-5, 40], [-34, 20],
    [-34, 18], [-15, 12], [5, 2], [5, -10], [15, -17], [30, -10], [35, -5]
  ],
  // Australia
  [
    [-12, 130], [-12, 136], [-15, 145], [-25, 153], [-38, 145],
    [-35, 118], [-22, 114], [-16, 123], [-12, 130]
  ],
  // Antarctica (top rim outline)
  [
    [-65, -180], [-68, -120], [-70, -60], [-68, 0], [-65, 60],
    [-66, 120], [-65, 180]
  ]
];

export const Earth3DModal: React.FC<Earth3DModalProps> = ({
  isOpen,
  onClose,
  location,
  weather,
  unit,
}) => {
  const [activeTab, setActiveTab] = useState<'globe' | 'streetview'>('globe');
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [zoomScale, setZoomScale] = useState<number>(1.1);

  // Weather pattern layers
  const [showClouds, setShowClouds] = useState<boolean>(true);
  const [showWindStreams, setShowWindStreams] = useState<boolean>(true);
  const [showThermalGradient, setShowThermalGradient] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Rotation angles (radians)
  const [rotY, setRotY] = useState<number>(() => -((location.longitude * Math.PI) / 180) - Math.PI / 2);
  const [rotX, setRotX] = useState<number>(() => (location.latitude * Math.PI) / 180 * 0.5);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameIdRef = useRef<number | null>(null);
  const timeOffsetRef = useRef<number>(0);

  // Keyboard escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Smoothly center the globe on the active city
  const handleFocusCity = useCallback(() => {
    // Target rotation angles that place the lat/long directly facing the camera
    const targetRotY = -((location.longitude * Math.PI) / 180) - Math.PI / 2;
    const targetRotX = (location.latitude * Math.PI) / 180;

    let progress = 0;
    const startRotY = rotY;
    const startRotX = rotX;

    const step = () => {
      progress += 0.05;
      if (progress < 1) {
        setRotY(startRotY + (targetRotY - startRotY) * progress);
        setRotX(startRotX + (targetRotX - startRotX) * progress);
        requestAnimationFrame(step);
      } else {
        setRotY(targetRotY);
        setRotX(targetRotX);
      }
    };
    step();
  }, [location.latitude, location.longitude, rotX, rotY]);

  // Mouse / Touch Drag handlers for manual rotation
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    setIsAutoRotating(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    setRotY((prev) => prev + deltaX * 0.007);
    setRotX((prev) => Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, prev - deltaY * 0.007)));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Canvas 3D Rendering Engine
  useEffect(() => {
    if (!isOpen || activeTab !== 'globe') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      timeOffsetRef.current += 0.015;
      const t = timeOffsetRef.current;

      // Auto-rotation when idle
      if (isAutoRotating && !isDraggingRef.current) {
        setRotY((prev) => prev + 0.004);
      }

      // Resize canvas to match display resolution
      const width = canvas.parentElement?.clientWidth || 640;
      const height = canvas.parentElement?.clientHeight || 480;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.38;
      const radius = baseRadius * zoomScale;

      // 1. Deep Space Cosmic Background
      const spaceGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 2.2);
      spaceGrad.addColorStop(0, '#060a17');
      spaceGrad.addColorStop(1, '#020409');
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(0, 0, width, height);

      // Distant stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (let i = 0; i < 40; i++) {
        const sx = (Math.sin(i * 99 + 1) * 0.5 + 0.5) * width;
        const sy = (Math.cos(i * 37 + 2) * 0.5 + 0.5) * height;
        const sSize = (Math.sin(i * 13) * 0.5 + 0.5) * 1.5 + 0.5;
        ctx.fillRect(sx, sy, sSize, sSize);
      }

      // 2. Atmospheric Outer Glow
      const glowGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.95, centerX, centerY, radius * 1.25);
      glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      glowGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.15)');
      glowGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.25, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // 3. Shaded Ocean Sphere (3D Light Source from top-left)
      const lightSourceX = centerX - radius * 0.4;
      const lightSourceY = centerY - radius * 0.4;
      const oceanGrad = ctx.createRadialGradient(
        lightSourceX,
        lightSourceY,
        radius * 0.1,
        centerX,
        centerY,
        radius
      );
      oceanGrad.addColorStop(0, '#2563eb');
      oceanGrad.addColorStop(0.4, '#1d4ed8');
      oceanGrad.addColorStop(0.7, '#1e3a8a');
      oceanGrad.addColorStop(1, '#0f172a');

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = oceanGrad;
      ctx.fill();
      ctx.clip(); // Clip everything to the spherical surface

      // Helper function: Convert Spherical Coordinates (lat, lon) to 3D Screen Coordinates
      const project = (lat: number, lon: number): { x: number; y: number; z: number; visible: boolean } => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180) + rotY;

        // Spherical to 3D Cartesian
        const x3D = -radius * Math.sin(phi) * Math.cos(theta);
        const y3D = -radius * Math.cos(phi);
        const z3D = radius * Math.sin(phi) * Math.sin(theta);

        // Rotation around X axis (pitch)
        const yRot = y3D * Math.cos(rotX) - z3D * Math.sin(rotX);
        const zRot = y3D * Math.sin(rotX) + z3D * Math.cos(rotX);

        return {
          x: centerX + x3D,
          y: centerY + yRot,
          z: zRot,
          visible: zRot > 0, // Visible on the front hemisphere facing viewer
        };
      };

      // 4. Geographic Latitude & Longitude Graticule Grid
      if (showGrid) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;

        // Latitude circles (-60° to +60°)
        for (let lat = -60; lat <= 60; lat += 30) {
          ctx.beginPath();
          let started = false;
          for (let lon = -180; lon <= 180; lon += 5) {
            const pt = project(lat, lon);
            if (pt.visible) {
              if (!started) {
                ctx.moveTo(pt.x, pt.y);
                started = true;
              } else {
                ctx.lineTo(pt.x, pt.y);
              }
            } else {
              started = false;
            }
          }
          ctx.stroke();
        }

        // Longitude meridians
        for (let lon = -180; lon < 180; lon += 45) {
          ctx.beginPath();
          let started = false;
          for (let lat = -80; lat <= 80; lat += 5) {
            const pt = project(lat, lon);
            if (pt.visible) {
              if (!started) {
                ctx.moveTo(pt.x, pt.y);
                started = true;
              } else {
                ctx.lineTo(pt.x, pt.y);
              }
            } else {
              started = false;
            }
          }
          ctx.stroke();
        }
      }

      // 5. Thermal Gradient Surface Overlay
      if (showThermalGradient) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
        ctx.fillRect(0, centerY - radius * 0.35, width, radius * 0.7); // Tropical heat belt
      }

      // 6. Continental Landmass Outlines & Shading
      CONTINENT_POLYGONS.forEach((polygon) => {
        ctx.beginPath();
        let firstPt = true;
        let visibleCount = 0;

        polygon.forEach(([lat, lon]) => {
          const pt = project(lat, lon);
          if (pt.visible) {
            visibleCount++;
            if (firstPt) {
              ctx.moveTo(pt.x, pt.y);
              firstPt = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
        });

        if (visibleCount > 2) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.35)'; // Landmass emerald tint
          ctx.fill();
          ctx.strokeStyle = 'rgba(74, 222, 128, 0.6)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });

      // 7. Atmospheric Wind Jet Streams (Fluid animated curves)
      if (showWindStreams) {
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.25)';
        ctx.lineWidth = 1.5;
        for (let stream = 0; stream < 4; stream++) {
          const streamLat = -35 + stream * 25;
          ctx.beginPath();
          let started = false;
          for (let lon = -180; lon <= 180; lon += 6) {
            const waveLat = streamLat + Math.sin((lon * Math.PI) / 60 + t * 2 + stream) * 6;
            const pt = project(waveLat, lon);
            if (pt.visible) {
              if (!started) {
                ctx.moveTo(pt.x, pt.y);
                started = true;
              } else {
                ctx.lineTo(pt.x, pt.y);
              }
            } else {
              started = false;
            }
          }
          ctx.stroke();
        }
      }

      // 8. Swirling Clouds & Storm Patterns (Calibrated to current cloudCover %)
      if (showClouds) {
        const cloudDensity = (weather?.current.cloudCover ?? 50) / 100;
        const cloudAlpha = Math.min(0.7, 0.25 + cloudDensity * 0.45);

        for (let c = 0; c < 12; c++) {
          const cLat = Math.sin(c * 17) * 60;
          const cLon = (c * 30 + t * 15) % 360 - 180;
          const pt = project(cLat, cLon);

          if (pt.visible) {
            const cloudSize = (radius * 0.22) * (0.8 + Math.sin(c * 3) * 0.4);
            const cloudGrad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, cloudSize);
            cloudGrad.addColorStop(0, `rgba(255, 255, 255, ${cloudAlpha})`);
            cloudGrad.addColorStop(0.5, `rgba(255, 255, 255, ${cloudAlpha * 0.5})`);
            cloudGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.beginPath();
            ctx.arc(pt.x, pt.y, cloudSize, 0, Math.PI * 2);
            ctx.fillStyle = cloudGrad;
            ctx.fill();
          }
        }
      }

      // 9. Day / Night Terminator Line & Solar Shadow
      const shadowGrad = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      shadowGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);

      ctx.restore(); // Restore sphere clip

      // 10. Real-time City Pinpoint & Pulse Beacon
      const cityPoint = project(location.latitude, location.longitude);

      if (cityPoint.visible) {
        const pulseSize = (Math.sin(t * 4) * 0.5 + 0.5) * 16 + 6;

        // Pulsing radar ring
        ctx.beginPath();
        ctx.arc(cityPoint.x, cityPoint.y, pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pin core
        ctx.beginPath();
        ctx.arc(cityPoint.x, cityPoint.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Connecting stalk & HUD Callout Card
        const calloutX = cityPoint.x + 28;
        const calloutY = cityPoint.y - 32;

        ctx.beginPath();
        ctx.moveTo(cityPoint.x, cityPoint.y);
        ctx.lineTo(calloutX, calloutY);
        ctx.lineTo(calloutX + 110, calloutY);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // City Callout badge
        const emoji = weather ? getWeatherEmoji(weather.current.weatherCode, weather.current.isDay) : '📍';
        const tempStr = weather ? `${weather.current.temperature}°` : '';

        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.beginPath();
        ctx.roundRect(calloutX, calloutY - 22, 120, 26, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${location.name}`, calloutX + 8, calloutY - 6);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillText(`${emoji} ${tempStr}`, calloutX + 75, calloutY - 6);
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [
    isOpen,
    activeTab,
    isAutoRotating,
    zoomScale,
    showClouds,
    showWindStreams,
    showThermalGradient,
    showGrid,
    rotX,
    rotY,
    location.latitude,
    location.longitude,
    location.name,
    weather,
  ]);

  if (!isOpen) return null;

  const weatherEmoji = weather ? getWeatherEmoji(weather.current.weatherCode, weather.current.isDay) : '☀️';
  const condition = weather ? getWeatherCondition(weather.current.weatherCode, weather.current.isDay) : null;

  // Direct Google Street View and Earth URL generators
  const googleStreetViewUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${location.latitude},${location.longitude}`;
  const googleEarthUrl = `https://earth.google.com/web/@${location.latitude},${location.longitude},1200a,35y,0h,0t,0r`;
  const googleMapsSatelliteUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;

  return (
    <div
      id="earth-3d-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="earth-3d-modal-container"
        className="relative flex h-[90vh] max-h-[820px] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl"
      >
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/70 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400">
              <Globe className="h-5 w-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold sm:text-base text-white">
                  3D Earth & Google Street View
                </h3>
                <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                  <span>{weatherEmoji}</span>
                  <span>{location.name}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E •{' '}
                {weather?.current.temperature ?? '--'}{unit === 'celsius' ? '°C' : '°F'} {condition?.description}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 rounded-2xl bg-slate-800/80 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('globe')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition ${
                activeTab === 'globe'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>3D Weather Globe</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('streetview')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition ${
                activeTab === 'streetview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Google Street View & Satellite</span>
            </button>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white transition"
            title="Close modal (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Main Stage */}
        <div className="relative flex-1 overflow-hidden">
          {activeTab === 'globe' ? (
            /* Tab 1: 3D Interactive Globe Canvas */
            <div className="relative h-full w-full select-none">
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="h-full w-full cursor-grab active:cursor-grabbing touch-none"
              />

              {/* Floating Camera & Layer Controls Toolbar */}
              <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
                {/* Center / Focus on City */}
                <button
                  type="button"
                  onClick={handleFocusCity}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 text-blue-400 shadow-md backdrop-blur-xs transition hover:bg-slate-700 hover:text-white"
                  title="Focus globe on current city"
                >
                  <Crosshair className="h-4 w-4" />
                </button>

                {/* Auto-rotate Toggle */}
                <button
                  type="button"
                  onClick={() => setIsAutoRotating((p) => !p)}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 shadow-md backdrop-blur-xs transition ${
                    isAutoRotating
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={isAutoRotating ? 'Pause auto-rotation' : 'Start auto-rotation'}
                >
                  {isAutoRotating ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                </button>

                {/* Zoom In */}
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.min(2.0, z + 0.15))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 text-slate-300 shadow-md backdrop-blur-xs transition hover:bg-slate-700 hover:text-white"
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>

                {/* Zoom Out */}
                <button
                  type="button"
                  onClick={() => setZoomScale((z) => Math.max(0.75, z - 0.15))}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/90 text-slate-300 shadow-md backdrop-blur-xs transition hover:bg-slate-700 hover:text-white"
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
              </div>

              {/* Top-Right Weather Layer Toggles */}
              <div className="absolute right-4 top-4 z-10 flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-1.5 shadow-lg backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setShowClouds((p) => !p)}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                    showClouds
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Toggle cloud formations & storm fronts"
                >
                  <Cloud className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Clouds</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowWindStreams((p) => !p)}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                    showWindStreams
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Toggle atmospheric wind jet streams"
                >
                  <Wind className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Winds</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowThermalGradient((p) => !p)}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                    showThermalGradient
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Toggle thermal gradient heat layer"
                >
                  <Thermometer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Heat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGrid((p) => !p)}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                    showGrid
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Toggle latitude and longitude grid"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
              </div>

              {/* Bottom Floating Telemetry Bar */}
              <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 text-base">
                    {weatherEmoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {location.name}, {location.country || ''}
                      </span>
                      <span className="rounded bg-blue-500/20 px-1.5 py-0.2 text-[10px] font-bold text-blue-300">
                        Pinned
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Cloud Cover: {weather?.current.cloudCover ?? '--'}% • Wind: {weather?.current.windSpeed ?? '--'} {unit === 'celsius' ? 'km/h' : 'mph'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('streetview')}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:brightness-110 active:scale-95"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Explore Ground Street View</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Google Street View & Satellite Explorer */
            <div className="relative flex h-full w-full flex-col bg-slate-950">
              {/* Google Maps Satellite Embed */}
              <div className="relative flex-1">
                <iframe
                  title={`Google Maps Satellite View for ${location.name}`}
                  src={`https://maps.google.com/maps?q=${location.latitude},${location.longitude}&t=k&z=17&ie=UTF8&iwloc=&output=embed`}
                  className="h-full w-full border-0"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />

                {/* Floating Launcher Action Chips */}
                <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                  <a
                    href={googleStreetViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-blue-600 hover:border-blue-500"
                  >
                    <Eye className="h-4 w-4 text-emerald-400" />
                    <span>Open Google Street View 360°</span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>

                  <a
                    href={googleEarthUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-blue-600 hover:border-blue-500"
                  >
                    <Globe className="h-4 w-4 text-sky-400" />
                    <span>Open in Google Earth 3D</span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>

                  <a
                    href={googleMapsSatelliteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-blue-600 hover:border-blue-500"
                  >
                    <MapPin className="h-4 w-4 text-rose-400" />
                    <span>Google Maps Fullscreen</span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </a>
                </div>
              </div>

              {/* Telemetry & Street View Information Footer */}
              <div className="border-t border-slate-800 bg-slate-900/95 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                      <Navigation className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span>Street View Coordinates</span>
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-300">
                          360° Available
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Lat: {location.latitude.toFixed(6)}° • Lon: {location.longitude.toFixed(6)}°
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('globe')}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
                    >
                      <Globe className="h-3.5 w-3.5 text-blue-400" />
                      <span>Back to 3D Globe</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
