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
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white">
                  Developers & Multi-Platform Guide
                </h2>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-900 dark:bg-blue-950 dark:text-blue-200 border border-blue-200/60 dark:border-blue-800">
                  PWA Ready
                </span>
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                Install as a native-like PWA, compile to Android/iOS, or run as Chrome Extension.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation - High Contrast Segmented Control */}
        <div className="border-b border-slate-200 bg-slate-100/90 p-2.5 dark:border-slate-800 dark:bg-slate-800/80">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
            {[
              { id: 'web', label: 'Web App & PWA', icon: Globe },
              { id: 'android', label: 'Android Native', icon: Smartphone },
              { id: 'ios', label: 'iOS Native', icon: Smartphone },
              { id: 'extension', label: 'Chrome Add-on', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as 'web' | 'android' | 'ios' | 'extension')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 font-bold transition-all text-center select-none ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 ring-1 ring-blue-500'
                      : 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-950 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white border border-slate-200/70 dark:border-slate-700/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 text-sm">
          {activeTab === 'web' && (
            <div className="space-y-4">
              {/* Branded PWA Install Banner */}
              <div
                id="pwa-brand-hero-card"
                className="relative overflow-hidden rounded-3xl border border-blue-200/90 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-slate-50 p-5 dark:border-blue-800/80 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900 shadow-xs"
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
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900 dark:bg-blue-900/80 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                          PWA
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                        Add to your Home Screen or Desktop dock for instant standalone launch, offline caching, and zero browser clutter.
                      </p>
                    </div>
                  </div>

                  {/* Custom Branded 'Add to Home Screen' Button */}
                  <div className="shrink-0 flex items-center">
                    {isInstalled ? (
                      <div
                        id="pwa-installed-status"
                        className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200"
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
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-blue-800 dark:text-blue-300">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Browser install prompt ready! Click &apos;Add to Home Screen&apos; to trigger native installation.</span>
                  </div>
                )}

                {/* Toggle Manual Instructions Accordion */}
                {(!isInstalled || showManualGuide || showGuideFallback) && (
                  <div className="mt-4 border-t border-blue-200/70 pt-3 dark:border-blue-900/70">
                    <button
                      type="button"
                      onClick={() => setShowManualGuide((prev) => !prev)}
                      className="flex items-center justify-between w-full text-xs font-bold text-blue-800 hover:text-blue-950 dark:text-blue-300 dark:hover:text-blue-100 transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5" />
                        <span>How to install on {isIOS ? 'iOS (Safari)' : isAndroid ? 'Android (Chrome)' : 'Desktop & Mobile'}</span>
                      </span>
                      {showManualGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {(showManualGuide || showGuideFallback) && (
                      <div className="mt-3 rounded-2xl bg-white p-4 text-xs text-slate-800 dark:bg-slate-850 dark:text-slate-100 space-y-2.5 border border-blue-200 dark:border-slate-700 shadow-xs">
                        {isIOS ? (
                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-900 dark:text-white">iOS Safari Installation:</p>
                            <ol className="list-decimal pl-4 space-y-1.5 text-slate-700 dark:text-slate-200 font-medium">
                              <li>Tap the <strong className="inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-400 font-bold"><Share2 className="h-3 w-3 inline" /> Share</strong> button in Safari&apos;s bottom toolbar.</li>
                              <li>Scroll down and tap <strong className="inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-400 font-bold"><PlusSquare className="h-3 w-3 inline" /> Add to Home Screen</strong>.</li>
                              <li>Tap <strong>Add</strong> in the top-right corner. The app icon will appear directly on your iOS home screen!</li>
                            </ol>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="font-bold text-slate-900 dark:text-white">Chrome / Edge / Android Installation:</p>
                            <ol className="list-decimal pl-4 space-y-1.5 text-slate-700 dark:text-slate-200 font-medium">
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
                <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed mt-1">
                  The codebase is a standard Vite React single-page application with registered PWA manifest in <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80">public/manifest.json</code>.
                </p>
              </div>

              <div className="relative rounded-2xl bg-slate-950 p-4 text-slate-100 font-mono text-xs border border-slate-800 shadow-inner">
                <button
                  type="button"
                  onClick={() => copyToClipboard('npm run build', 'web-build')}
                  className="absolute right-3 top-3 rounded-lg bg-slate-800 px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                >
                  {copiedCode === 'web-build' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <div className="text-slate-400 font-medium"># 1. Build production static bundle to /dist</div>
                <div className="text-emerald-400 font-semibold mt-0.5">npm run build</div>
                <div className="mt-2.5 text-slate-400 font-medium"># 2. Preview locally</div>
                <div className="text-emerald-400 font-semibold mt-0.5">npm run preview</div>
              </div>

              <ul className="list-disc pl-4 text-xs text-slate-700 dark:text-slate-200 space-y-1.5 leading-relaxed font-normal">
                <li>Configured with <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">BeforeInstallPromptEvent</code> listener for programmatic installation.</li>
                <li>PWA manifest includes high-fidelity 192px and 512px raster PNG icons with <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">maskable</code> adaptive padding for Android launchers.</li>
                <li>Mobile standalone splash screen configured with brand color <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">#1a73e8</code> and zero-flicker pre-hydration loading screen.</li>
                <li>Responsive layout adapts to all viewports from 360px phones to ultra-wide monitors.</li>
                <li>Includes Pre-Sunrise Silent Local Notifications and PWA Clock Alarm integration for automated dawn alerts.</li>
                <li><strong>Service Worker Background Sync:</strong> Uses the Web Background Sync API (<code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">weather-data-sync</code>) and online reconnection handlers to automatically refresh cached forecasts the moment the device regains network connectivity.</li>
              </ul>
            </div>
          )}

          {activeTab === 'android' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white">Android Native Compilation & GitHub Actions</h4>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  CI/CD Automated
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed font-normal">
                <strong>No Android Studio required:</strong> GitHub Actions automatically compiles the native Android APK (<code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">climacast-android-*.apk</code>) on every commit. Download it directly from your repository&apos;s GitHub Releases tab and tap to install!
              </p>
              <div className="relative rounded-2xl bg-slate-950 p-4 text-slate-100 font-mono text-xs border border-slate-800 shadow-inner">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `npm install @capacitor/core @capacitor/cli @capacitor/android\nnpm run build\nnpx cap add android\nnpx cap sync android\nnpx cap open android`,
                      'android-build'
                    )
                  }
                  className="absolute right-3 top-3 rounded-lg bg-slate-800 px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                >
                  {copiedCode === 'android-build' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <div className="text-slate-400 font-medium"># Local Manual Build (Optional):</div>
                <div className="text-slate-400 font-medium"># Install Capacitor dependencies</div>
                <div className="text-emerald-400 font-semibold mt-0.5">npm install @capacitor/core @capacitor/cli @capacitor/android</div>
                <div className="mt-2.5 text-slate-400 font-medium"># Build web assets and initialize Android</div>
                <div className="text-emerald-400 font-semibold mt-0.5">npm run build</div>
                <div className="text-emerald-400 font-semibold mt-0.5">npx cap sync android</div>
                <div className="mt-2.5 text-slate-400 font-medium"># Open in Android Studio to generate signed APK/AAB</div>
                <div className="text-emerald-400 font-semibold mt-0.5">npx cap open android</div>
              </div>
              <ul className="list-disc pl-4 text-xs text-slate-700 dark:text-slate-200 space-y-1.5 leading-relaxed font-normal">
                <li>Automated by GitHub Actions workflow job <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">build-android-apk</code> using Java 21 JDK and Android SDK.</li>
                <li>Uses Android native Geolocation permissions (<code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">ACCESS_FINE_LOCATION</code>).</li>
                <li>Native splash screen and status bar configured via <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">capacitor.config.json</code>.</li>
                <li>Integrates with native Android Clock Alarm via <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">android.intent.action.SET_ALARM</code> to automatically wake users shortly before sunrise.</li>
              </ul>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white">iOS Native Compilation & GitHub Actions</h4>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  CI/CD Automated
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed font-normal">
                GitHub Actions builds both an <strong>iOS Simulator Bundle</strong> (<code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">climacast-ios-simulator-*.zip</code>) and a complete <strong>Pre-configured Xcode Workspace</strong> (<code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">climacast-ios-xcode-project-*.zip</code>) attached to GitHub Releases.
              </p>
              <div className="relative rounded-2xl bg-slate-950 p-4 text-slate-100 font-mono text-xs border border-slate-800 shadow-inner">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `npm install @capacitor/core @capacitor/cli @capacitor/ios\nnpm run build\nnpx cap sync ios\nnpx cap open ios`,
                      'ios-build'
                    )
                  }
                  className="absolute right-3 top-3 rounded-lg bg-slate-800 px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                >
                  {copiedCode === 'ios-build' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <div className="text-slate-400 font-medium"># Local Manual Build (macOS + Xcode):</div>
                <div className="text-slate-400 font-medium"># Install Capacitor iOS dependencies</div>
                <div className="text-emerald-400 font-semibold mt-0.5">npm install @capacitor/core @capacitor/cli @capacitor/ios</div>
                <div className="mt-2.5 text-slate-400 font-medium"># Sync web dist and launch Xcode</div>
                <div className="text-emerald-400 font-semibold mt-0.5">npm run build</div>
                <div className="text-emerald-400 font-semibold mt-0.5">npx cap sync ios</div>
                <div className="text-emerald-400 font-semibold mt-0.5">npx cap open ios</div>
              </div>
              <ul className="list-disc pl-4 text-xs text-slate-700 dark:text-slate-200 space-y-1.5 leading-relaxed font-normal">
                <li>Automated on Apple Silicon macOS runners in GitHub Actions workflow job <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">build-ios-app</code>.</li>
                <li>Includes safe area insets (<code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">viewport-fit=cover</code>) for notch and dynamic island.</li>
                <li>Integrates with iOS System Calendar / Reminders (<code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">VALARM</code>) and Apple Shortcuts for automated pre-sunrise dawn alarms.</li>
              </ul>
            </div>
          )}

          {activeTab === 'extension' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white">Chrome Add-on / Extension (Manifest V3)</h4>
              <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed font-normal">
                Packaged as a Google Chrome Extension popup using Manifest V3 in <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">public/chrome-extension/manifest.json</code>.
              </p>
              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-200 font-normal">
                <p className="font-bold text-slate-900 dark:text-white">Quick Testing in Google Chrome:</p>
                <ol className="list-decimal pl-5 space-y-1.5 font-medium">
                  <li>Run <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">npm run build</code> to produce the production bundle in <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">dist/</code>.</li>
                  <li>Copy <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">public/chrome-extension/manifest.json</code> into <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">dist/manifest.json</code>.</li>
                  <li>Open Google Chrome and navigate to <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">chrome://extensions</code>.</li>
                  <li>Enable <strong>Developer mode</strong> (toggle switch in top right corner).</li>
                  <li>Click <strong>Load unpacked</strong> and select the <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">dist</code> directory.</li>
                  <li>Pin the weather icon in your browser bar for instant popup access!</li>
                </ol>
              </div>
              <div className="rounded-2xl bg-blue-50 border border-blue-200/90 p-3.5 text-xs text-blue-900 dark:bg-blue-950/70 dark:border-blue-800 dark:text-blue-200 font-medium">
                💡 Tip: Use the <strong>&quot;Extension&quot;</strong> view button in the top header to preview how the app fits compactly into the 380px Chrome popup frame!
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          {!isInstalled && activeTab !== 'web' ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Add to Home Screen</span>
            </button>
          ) : (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">ClimaCast PWA</span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
