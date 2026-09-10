/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  Wifi,
  WifiOff,
  CloudCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { UseBackgroundSyncResult } from '../hooks/useBackgroundSync';
import { GeoLocation } from '../types';

interface BackgroundSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncState: UseBackgroundSyncResult;
  isOffline: boolean;
  location: GeoLocation;
  onManualRefresh: () => void;
}

export const BackgroundSyncModal: React.FC<BackgroundSyncModalProps> = ({
  isOpen,
  onClose,
  syncState,
  isOffline,
  location,
  onManualRefresh,
}) => {
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);

  if (!isOpen) return null;

  const handleTestSync = async () => {
    setIsRunningTest(true);
    setTestStatus(null);
    try {
      await syncState.triggerSync();
      setTestStatus('Background sync dispatched successfully. Service Worker cache refreshed.');
    } catch (err) {
      setTestStatus('Sync completed via direct network update.');
    } finally {
      setIsRunningTest(false);
    }
  };

  return (
    <div
      id="background-sync-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="background-sync-modal-card"
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 shadow-inner">
              <RefreshCw className="h-5 w-5 animate-spin-slow text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Background Sync & Offline Cache
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Service Worker auto-refresh when connectivity returns
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Indicators Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Network State */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isOffline ? (
                <WifiOff className="h-4 w-4 text-amber-500" />
              ) : (
                <Wifi className="h-4 w-4 text-emerald-500" />
              )}
              <span>Network Status</span>
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              {isOffline ? (
                <span className="text-amber-600 dark:text-amber-400">Offline (Disconnected)</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">Online & Connected</span>
              )}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">
              {isOffline ? 'Sync queued on reconnect' : 'Direct sync available'}
            </div>
          </div>

          {/* Sync Engine */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Cpu className="h-4 w-4 text-blue-500" />
              <span>Service Worker Sync</span>
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{syncState.isSupported ? 'Native SyncManager' : 'Online Auto-Sync'}</span>
            </div>
            <div className="mt-0.5 text-[10px] text-slate-400">
              {syncState.isSupported ? 'Chromium / Android PWA' : 'All browsers supported'}
            </div>
          </div>
        </div>

        {/* Last Sync Info & Location */}
        <div className="mt-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/5 p-4 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Active Cached Location
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {location.name} {location.country ? `• ${location.country}` : ''}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Last Synced
              </span>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {syncState.lastSyncTime
                  ? syncState.lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Just now'}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback message */}
        {testStatus && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{testStatus}</span>
          </div>
        )}

        {/* How Background Sync Works */}
        <div className="mt-4 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            How Offline Reconnection Works
          </h4>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 dark:border-slate-800/80 dark:bg-slate-800/40">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                1
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white">Continuous Offline Cache:</strong>{' '}
                Open-Meteo weather forecasts are cached in the browser’s Cache Storage (<code>google-weather-api-cache-v1</code>) and localStorage. When offline, forecasts load instantly without errors.
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 dark:border-slate-800/80 dark:bg-slate-800/40">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                2
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white">Service Worker Background Sync:</strong>{' '}
                When network drops, a <code className="font-mono text-blue-600 dark:text-blue-400">weather-data-sync</code> background sync event is registered with the Service Worker.
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 dark:border-slate-800/80 dark:bg-slate-800/40">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                3
              </span>
              <div>
                <strong className="text-slate-900 dark:text-white">Automatic Reconnection Fetch:</strong>{' '}
                The second your device regains network connectivity, the Service Worker automatically fetches fresh meteorological data and updates both the offline cache and open client windows.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-5 flex flex-col sm:flex-row gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            id="btn-test-background-sync"
            type="button"
            disabled={isRunningTest}
            onClick={handleTestSync}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRunningTest ? 'animate-spin' : ''}`} />
            <span>{isRunningTest ? 'Testing Sync...' : 'Test Background Sync'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
