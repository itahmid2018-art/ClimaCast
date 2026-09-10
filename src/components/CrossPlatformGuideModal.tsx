/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Globe,
  Smartphone,
  Layers,
  Terminal,
  Copy,
  Check,
  Download,
  CheckCircle2,
  Share2,
  PlusSquare,
  Sparkles,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface CrossPlatformGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CrossPlatformGuideModal: React.FC<CrossPlatformGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'web' | 'android' | 'ios' | 'extension'>('web');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [showManualGuide, setShowManualGuide] = useState<boolean>(false);

  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    installOutcome,
    install,
    showGuideFallback,
    setShowGuideFallback,
  } = usePWAInstall();

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const success = await install();
      if (!success) {
        setShowManualGuide(true);
      }
    } catch (err) {
      console.warn('Install error:', err);
      setShowManualGuide(true);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                  Multi-Platform & PWA Guide
                </h2>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
                  PWA Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Install as a native-like PWA, compile to Android/iOS, or run as Chrome Extension.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-4 text-xs font-semibold dark:border-slate-800 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={() => setActiveTab('web')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition ${
              activeTab === 'web'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>Web App & PWA</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition ${
              activeTab === 'android'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Android Native</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition ${
              activeTab === 'ios'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>iOS Native</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('extension')}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 transition ${
              activeTab === 'extension'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Chrome Add-on</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 text-sm">
          {activeTab === 'web' && (
            <div className="space-y-4">
              {/* Branded PWA Install Banner */}
              <div
                id="pwa-brand-hero-card"
                className="relative overflow-hidden rounded-3xl border border-blue-200/80 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-slate-50 p-5 dark:border-blue-800/60 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
                      <Download className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          Install ClimaCast
                        </h4>
                        <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          PWA
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Add to your Home Screen or Desktop dock for instant standalone launch, offline caching, and zero browser clutter.
                      </p>
                    </div>
                  </div>

                  {/* Custom Branded 'Add to Home Screen' Button */}
                  <div className="shrink-0 flex items-center">
                    {isInstalled ? (
                      <div
                        id="pwa-installed-status"
                        className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/50 dark:text-emerald-300"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Added to Home Screen</span>
                      </div>
                    ) : (
                      <button
                        id="add-to-home-screen-btn"
                        type="button"
                        onClick={handleInstallClick}
                        disabled={isInstalling}
                        className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 transition hover:from-blue-700 hover:to-blue-800 hover:shadow-lg active:scale-98 disabled:opacity-50"
                        title="Add ClimaCast to your Home Screen"
                      >
                        <Download className={`h-4 w-4 ${isInstalling ? 'animate-bounce' : ''}`} />
                        <span>{isInstalling ? 'Installing...' : 'Add to Home Screen'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Status or Browser Fallback prompt indicator */}
                {isInstallable && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-blue-700 dark:text-blue-300">
                    <Sparkles className="h-3 w-3" />
                    <span>Browser install prompt ready! Click &apos;Add to Home Screen&apos; to trigger native installation.</span>
                  </div>
                )}

                {/* Toggle Manual Instructions Accordion */}
                {(!isInstalled || showManualGuide || showGuideFallback) && (
                  <div className="mt-4 border-t border-blue-200/50 pt-3 dark:border-blue-900/50">
                    <button
                      type="button"
                      onClick={() => setShowManualGuide((prev) => !prev)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
                    >
                      <span className="flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5" />
                        <span>How to install on {isIOS ? 'iOS (Safari)' : isAndroid ? 'Android (Chrome)' : 'Desktop & Mobile'}</span>
                      </span>
                      {showManualGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {(showManualGuide || showGuideFallback) && (
                      <div className="mt-3 rounded-2xl bg-white/90 p-3.5 text-xs text-slate-700 dark:bg-slate-800/90 dark:text-slate-200 space-y-2 border border-blue-100 dark:border-slate-700">
                        {isIOS ? (
                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-900 dark:text-white">iOS Safari Installation:</p>
                            <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                              <li>Tap the <strong className="inline-flex items-center gap-0.5"><Share2 className="h-3 w-3 inline text-blue-600" /> Share</strong> button in Safari&apos;s bottom toolbar.</li>
                              <li>Scroll down and tap <strong className="inline-flex items-center gap-0.5"><PlusSquare className="h-3 w-3 inline text-blue-600" /> Add to Home Screen</strong>.</li>
                              <li>Tap <strong>Add</strong> in the top-right corner. The app icon will appear directly on your iOS home screen!</li>
                            </ol>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-900 dark:text-white">Chrome / Edge / Android Installation:</p>
                            <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                              <li>Click the <strong>&apos;Add to Home Screen&apos;</strong> button above.</li>
                              <li>If prompted in your browser, tap <strong>Install</strong> or <strong>Add</strong>.</li>
                              <li>Alternatively, click the <strong>Install app icon (⤓)</strong> in the browser address bar, or tap the <strong>⋮ Menu</strong> &rarr; <strong>&apos;Install app&apos;</strong>.</li>
                            </ol>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Developer Build & Host Commands */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">Web Hosting & PWA Build</h4>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed mt-1">
                  The codebase is a standard Vite React single-page application with registered PWA manifest in <code>public/manifest.json</code>.
                </p>
              </div>

              <div className="relative rounded-2xl bg-slate-900 p-3 text-slate-200 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => copyToClipboard('npm run build', 'web-build')}
                  className="absolute right-2 top-2 rounded-md bg-slate-800 p-1 text-slate-400 hover:text-white"
                >
                  {copiedCode === 'web-build' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <div className="text-slate-500"># 1. Build production static bundle to /dist</div>
                <div>npm run build</div>
                <div className="mt-2 text-slate-500"># 2. Preview locally</div>
                <div>npm run preview</div>
              </div>

              <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <li>Configured with <code>BeforeInstallPromptEvent</code> listener for programmatic installation.</li>
                <li>PWA manifest includes high-fidelity 192px and 512px raster PNG icons with <code>maskable</code> adaptive padding for Android launchers.</li>
                <li>Mobile standalone splash screen configured with brand color <code>#1a73e8</code> and zero-flicker pre-hydration loading screen.</li>
                <li>Responsive layout adapts to all viewports from 360px phones to ultra-wide monitors.</li>
                <li>Includes Pre-Sunrise Silent Local Notifications and PWA Clock Alarm integration for automated dawn alerts.</li>
                <li><strong>Service Worker Background Sync:</strong> Uses the Web Background Sync API (<code>weather-data-sync</code>) and online reconnection handlers to automatically refresh cached forecasts the moment the device regains network connectivity, guaranteeing the most accurate data is available offline.</li>
              </ul>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white">Android Native Compilation (Capacitor)</h4>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                Using Capacitor with <code>capacitor.config.json</code>, compile the web bundle into a native Android Studio project and generate signed APKs or AABs for Google Play Store.
              </p>
              <div className="relative rounded-2xl bg-slate-900 p-3 text-slate-200 font-mono text-xs">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `npm install @capacitor/core @capacitor/cli @capacitor/android\nnpm run build\nnpx cap add android\nnpx cap sync android\nnpx cap open android`,
                      'android-build'
                    )
                  }
                  className="absolute right-2 top-2 rounded-md bg-slate-800 p-1 text-slate-400 hover:text-white"
                >
                  {copiedCode === 'android-build' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <div className="text-slate-500"># Install Capacitor dependencies</div>
                <div>npm install @capacitor/core @capacitor/cli @capacitor/android</div>
                <div className="mt-2 text-slate-500"># Build web assets and initialize Android</div>
                <div>npm run build</div>
                <div>npx cap add android</div>
                <div>npx cap sync android</div>
                <div className="mt-2 text-slate-500"># Open in Android Studio to build APK/AAB</div>
                <div>npx cap open android</div>
              </div>
              <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <li>Uses Android native Geolocation permissions (<code>ACCESS_FINE_LOCATION</code>).</li>
                <li>Native splash screen and status bar configured via <code>capacitor.config.json</code>.</li>
                <li>Integrates with native Android Clock Alarm via <code>android.intent.action.SET_ALARM</code> to automatically wake users shortly before sunrise.</li>
              </ul>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white">iOS Native Compilation (Capacitor & Xcode)</h4>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                Compile into a native iOS project and run on iOS Simulator or deploy to Apple TestFlight and the App Store.
              </p>
              <div className="relative rounded-2xl bg-slate-900 p-3 text-slate-200 font-mono text-xs">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `npm install @capacitor/core @capacitor/cli @capacitor/ios\nnpm run build\nnpx cap add ios\nnpx cap sync ios\nnpx cap open ios`,
                      'ios-build'
                    )
                  }
                  className="absolute right-2 top-2 rounded-md bg-slate-800 p-1 text-slate-400 hover:text-white"
                >
                  {copiedCode === 'ios-build' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <div className="text-slate-500"># Install Capacitor iOS dependencies</div>
                <div>npm install @capacitor/core @capacitor/cli @capacitor/ios</div>
                <div className="mt-2 text-slate-500"># Sync web dist and launch Xcode</div>
                <div>npm run build</div>
                <div>npx cap add ios</div>
                <div>npx cap sync ios</div>
                <div>npx cap open ios</div>
              </div>
              <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <li>Requires macOS and Xcode 15+ installed.</li>
                <li>Includes safe area insets (<code>viewport-fit=cover</code>) for notch and dynamic island.</li>
                <li>Integrates with iOS System Calendar / Reminders (<code>VALARM</code>) and Apple Shortcuts for automated pre-sunrise dawn alarms.</li>
              </ul>
            </div>
          )}

          {activeTab === 'extension' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white">Chrome Add-on / Extension (Manifest V3)</h4>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                Packaged as a Google Chrome Extension popup using Manifest V3 in <code>public/chrome-extension/manifest.json</code>.
              </p>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Quick Testing in Google Chrome:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Run <code>npm run build</code> to produce the production bundle in <code>dist/</code>.</li>
                  <li>Copy <code>public/chrome-extension/manifest.json</code> into <code>dist/manifest.json</code>.</li>
                  <li>Open Google Chrome and navigate to <code>chrome://extensions</code>.</li>
                  <li>Enable <strong>Developer mode</strong> (toggle in top right).</li>
                  <li>Click <strong>Load unpacked</strong> and select the <code>dist</code> directory.</li>
                  <li>Pin the weather icon in your browser bar for instant popup access!</li>
                </ol>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                💡 Tip: Use the <strong>&quot;Extension&quot;</strong> view button in the top header to preview how the app fits compactly into the 380px Chrome popup frame!
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 dark:border-slate-800">
          {!isInstalled && activeTab !== 'web' ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Add to Home Screen</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400">ClimaCast PWA</span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
