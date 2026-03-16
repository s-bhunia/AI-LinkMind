"use client";

import { useEffect } from 'react';

declare global {
  interface Window {
    AndroidBridge?: {
      notifyAppReady: () => void;
      notifyLinkSaved: () => void;
      notifySaveFailed: () => void;
    };
    setSharedUrl?: (url: string) => Promise<void>;
  }
}

export default function AndroidBridge() {
  useEffect(() => {
    // Tell Android the app is fully loaded and ready
    if (window.AndroidBridge && typeof window.AndroidBridge.notifyAppReady === 'function') {
      console.log("Notifying Android: Web App Ready");
      window.AndroidBridge.notifyAppReady();
    }

    // Link submission will be handled by LinkForm's setSharedUrl
    // This component just initializes Android bridge notifications
  }, []);

  return null;
}