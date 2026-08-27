import { useState, useEffect, useCallback, useRef } from 'react';

export type PermissionState = 'granted' | 'prompt' | 'denied' | 'checking';

export type GeolocationErrorType =
  | 'unsupported'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unknown';

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

// Module-level cache for geolocation coordinates to share fresh data across components
let globalCachedCoords: GeolocationCoords | null = null;
let globalLastCapturedAt: number | null = null;
const CACHE_FRESHNESS_MS = 45000; // 45 seconds freshness threshold

// Global in-flight promise reference to prevent concurrent simultaneous browser location queries
let globalInFlightPromise: Promise<GeolocationCoords | null> | null = null;

export function useGeolocation(options: PositionOptions = { enableHighAccuracy: true, timeout: 10000 }) {
  const [coords, setCoords] = useState<GeolocationCoords | null>(globalCachedCoords);
  const [isLoading, setIsLoading] = useState(false);
  const [errorType, setErrorType] = useState<GeolocationErrorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('checking');
  
  // Track mounting state to prevent state updates on unmounted component
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Store options in a ref to decouple them from the captureLocation callback's dependency array
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const captureLocation = useCallback((isAuto = false): Promise<GeolocationCoords | null> => {
    // 1. Check if cached coordinates are fresh
    if (globalCachedCoords && globalLastCapturedAt && (Date.now() - globalLastCapturedAt < CACHE_FRESHNESS_MS)) {
      console.log('[useGeolocation] Reusing fresh cached coordinates:', globalCachedCoords);
      if (isMounted.current) {
        setCoords(globalCachedCoords);
        setErrorType(null);
        setErrorMessage(null);
        setPermissionState('granted');
      }
      return Promise.resolve(globalCachedCoords);
    }

    // 2. If there is already an in-flight promise, return it to prevent duplicate requests
    if (globalInFlightPromise) {
      console.log('[useGeolocation] Reusing in-flight location request.');
      // Keep UI loading state in sync
      if (isMounted.current) {
        setIsLoading(true);
      }
      return globalInFlightPromise;
    }

    const newPromise = new Promise<GeolocationCoords | null>((resolve) => {
      if (isMounted.current) {
        setIsLoading(true);
        setErrorType(null);
        setErrorMessage(null);
        if (!isAuto) {
          setCoords(null);
        }
      }

      if (!navigator.geolocation) {
        const msg = 'Geolocation is not supported by your browser/device.';
        if (isMounted.current) {
          setErrorType('unsupported');
          setErrorMessage(msg);
          setIsLoading(false);
          setPermissionState('denied');
        }
        globalInFlightPromise = null;
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          globalInFlightPromise = null;
          
          const newCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          
          // Update global cache
          globalCachedCoords = newCoords;
          globalLastCapturedAt = Date.now();

          if (isMounted.current) {
            setCoords(newCoords);
            setIsLoading(false);
            setErrorType(null);
            setErrorMessage(null);
            setPermissionState('granted');
          }
          resolve(newCoords);
        },
        (err) => {
          globalInFlightPromise = null;
          
          let type: GeolocationErrorType = 'unknown';
          let msg = 'An unexpected geolocation error occurred.';

          if (err.code === err.PERMISSION_DENIED) {
            type = 'denied';
            msg = 'Location access denied. Please grant location permissions in your browser settings.';
            if (isMounted.current) {
              setPermissionState('denied');
            }
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            type = 'unavailable';
            msg = 'Location unavailable. Please check your device GPS/network signal.';
          } else if (err.code === err.TIMEOUT) {
            type = 'timeout';
            msg = 'Location request timed out. Please try again in an open area.';
          }

          if (isMounted.current) {
            setErrorType(type);
            setErrorMessage(msg);
            setIsLoading(false);
          }
          resolve(null);
        },
        optionsRef.current
      );
    });

    globalInFlightPromise = newPromise;
    return newPromise;
  }, []);

  const checkPermissionState = useCallback(async () => {
    if (!navigator.geolocation) {
      if (isMounted.current) {
        setPermissionState('denied');
        setErrorType('unsupported');
        setErrorMessage('Geolocation is not supported by your browser/device.');
      }
      return;
    }

    if (!navigator.permissions || !navigator.permissions.query) {
      // Fallback for Safari/browsers lacking Permissions query support
      if (isMounted.current) {
        setPermissionState('prompt');
      }
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      if (!isMounted.current) return;
      
      setPermissionState(result.state as PermissionState);

      // Listen for permission change, but do NOT automatically start tracking GPS here
      result.onchange = () => {
        if (!isMounted.current) return;
        setPermissionState(result.state as PermissionState);
        if (result.state === 'denied') {
          setCoords(null);
          setErrorType('denied');
          setErrorMessage('Location access denied. Please grant location permissions in your browser settings.');
        }
      };
    } catch (err) {
      console.warn('Geolocation permission query error:', err);
      if (isMounted.current) {
        setPermissionState('prompt');
      }
    }
  }, []);

  useEffect(() => {
    checkPermissionState();
  }, [checkPermissionState]);

  return {
    coords,
    isLoading: isLoading || !!globalInFlightPromise,
    errorType,
    error: errorMessage,
    permissionState,
    captureLocation,
    retryPermission: checkPermissionState
  };
}
