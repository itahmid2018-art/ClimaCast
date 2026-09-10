/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  installOutcome: 'accepted' | 'dismissed' | null;
  install: () => Promise<boolean>;
  showGuideFallback: boolean;
  setShowGuideFallback: (show: boolean) => void;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [installOutcome, setInstallOutcome] = useState<'accepted' | 'dismissed' | null>(null);
  const [showGuideFallback, setShowGuideFallback] = useState<boolean>(false);

  useEffect(() => {
    // 1. Detect standalone mode (already installed as PWA or running in webview)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);

    // 2. Detect mobile operating system
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // 3. Listen for the BeforeInstallPromptEvent
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser's default mini-infobar on mobile
      e.preventDefault();
      // Store the event so it can be triggered programmatically by our custom branded UI
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Listen for the appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallOutcome('accepted');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      // If native deferred prompt is not available (e.g. iOS Safari or browser restrictions),
      // open the branded installation guide
      setShowGuideFallback(true);
      return false;
    }

    try {
      // Show the browser's native install prompt
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setInstallOutcome(choice.outcome);

      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Error invoking native PWA install prompt:', err);
      setShowGuideFallback(true);
      return false;
    }
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    installOutcome,
    install,
    showGuideFallback,
    setShowGuideFallback,
  };
}
