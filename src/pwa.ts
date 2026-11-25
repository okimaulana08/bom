/// <reference types="vite/client" />
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface PwaSnapshot {
  isInstalled: boolean;
  canPromptInstall: boolean;
  isIosSafari: boolean;
  hasUpdate: boolean;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let waitingWorker: ServiceWorker | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function detectInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneMedia =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  );
  return standaloneMedia || iosStandalone;
}

function detectIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  const isWebKit = /WebKit/i.test(ua);
  const isOtherBrowser = /CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
  return isIos && isWebKit && !isOtherBrowser;
}

function getSnapshot(): PwaSnapshot {
  return {
    isInstalled: detectInstalled(),
    canPromptInstall: Boolean(deferredPrompt),
    isIosSafari: detectIosSafari(),
    hasUpdate: Boolean(waitingWorker),
  };
}

function emitChange() {
  for (const listener of listeners) listener();
}

export function initPwa(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emitChange();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emitChange();
  });

  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = () => emitChange();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onDisplayChange);
    }
  }

  // Register Service Worker in production builds (never interfere with Vite HMR dev server)
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (reg.waiting) {
            waitingWorker = reg.waiting;
            emitChange();
          }
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                waitingWorker = installing;
                emitChange();
              }
            });
          });
        })
        .catch(() => {
          // Gracefully ignore SW registration failures in restricted/private browsers
        });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }
}

export async function triggerPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  emitChange();
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  return choice.outcome;
}

export function applyPwaUpdate(): void {
  if (waitingWorker) {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  } else if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

export function usePwaInstall() {
  const [snap, setSnap] = useState<PwaSnapshot>(() => getSnapshot());

  useEffect(() => {
    const onChange = () => setSnap(getSnapshot());
    listeners.add(onChange);
    onChange();
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return {
    ...snap,
    promptInstall: triggerPwaInstall,
    applyUpdate: applyPwaUpdate,
  };
}
