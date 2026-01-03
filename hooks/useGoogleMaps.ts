"use client";

import { useState, useEffect, useCallback } from "react";

// Global state to track loading status
let isLoading = false;
let isLoaded = false;
let loadError: string | null = null;
const callbacks: Array<() => void> = [];

/**
 * Centralized Google Maps loader hook.
 * Ensures the API is loaded only once across all components.
 */
export function useGoogleMaps() {
  const [loaded, setLoaded] = useState(isLoaded);
  const [loading, setLoading] = useState(isLoading);
  const [error, setError] = useState<string | null>(loadError);

  const notifyCallbacks = useCallback(() => {
    callbacks.forEach((cb) => cb());
    callbacks.length = 0;
  }, []);

  useEffect(() => {
    // If already loaded, update state immediately
    if (isLoaded || (typeof window !== "undefined" && window.google?.maps?.places)) {
      isLoaded = true;
      setLoaded(true);
      setLoading(false);
      return;
    }

    // If there was a previous error, report it
    if (loadError) {
      setError(loadError);
      setLoading(false);
      return;
    }

    // Register callback for when loading completes
    const onLoadComplete = () => {
      setLoaded(true);
      setLoading(false);
    };
    callbacks.push(onLoadComplete);

    // If already loading, just wait for completion
    if (isLoading) {
      setLoading(true);
      return;
    }

    // Check if script already exists in DOM
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );

    if (existingScript) {
      // Script exists, poll for it to be ready
      isLoading = true;
      setLoading(true);

      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkInterval);
          isLoaded = true;
          isLoading = false;
          notifyCallbacks();
        }
      }, 100);

      // Timeout after 15 seconds
      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google?.maps?.places) {
          loadError = "Google Maps failed to load (timeout)";
          isLoading = false;
          setError(loadError);
          setLoading(false);
        }
      }, 15000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }

    // Load the script
    const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!GOOGLE_API_KEY) {
      loadError = "Google API key not configured";
      setError(loadError);
      setLoading(false);
      return;
    }

    isLoading = true;
    setLoading(true);

    // Create a unique callback name
    const callbackName = `initGoogleMaps_${Date.now()}`;

    // Create callback function
    (window as any)[callbackName] = () => {
      isLoaded = true;
      isLoading = false;
      loadError = null;
      notifyCallbacks();
      // Clean up the callback
      delete (window as any)[callbackName];
    };

    // Handle auth failures
    window.gm_authFailure = () => {
      loadError = "Google Maps authentication failed - Invalid API key";
      isLoading = false;
      setError(loadError);
      setLoading(false);
    };

    // Load the script with async loading for better performance
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&loading=async&callback=${callbackName}`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      loadError = "Failed to load Google Maps script";
      isLoading = false;
      setError(loadError);
      setLoading(false);
      delete (window as any)[callbackName];
    };

    document.head.appendChild(script);

    return () => {
      // Note: We don't remove the script on cleanup since other components may be using it
    };
  }, [notifyCallbacks]);

  return { loaded, loading, error };
}

/**
 * Type declarations for Google Maps
 */
declare global {
  interface Window {
    google: typeof google;
    gm_authFailure?: () => void;
  }
}

export default useGoogleMaps;
