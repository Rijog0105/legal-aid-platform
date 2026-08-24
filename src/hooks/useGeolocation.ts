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

export function useGeolocation(options: PositionOptions = { enableHighAccuracy: true, timeout: 10000 }) {
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
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

  const captureLocation = useCallback((isAuto = false): Promise<GeolocationCoords | null> => {
    return new Promise((resolve) => {
      setIsLoading(true);
      setErrorType(null);
      setErrorMessage(null);
      if (!isAuto) {
        setCoords(null);
      }

      if (!navigator.geolocation) {
        const msg = 'Geolocation is not supported by your browser/device.';
        setErrorType('unsupported');
        setErrorMessage(msg);
        setIsLoading(false);
        setPermissionState('denied');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted.current) {
            resolve(null);
            return;
          }
          const newCoords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setCoords(newCoords);
          setIsLoading(false);
          setErrorType(null);
          setErrorMessage(null);
          setPermissionState('granted');
          resolve(newCoords);
        },
        (err) => {
          if (!isMounted.current) {
            resolve(null);
            return;
          }
          let type: GeolocationErrorType = 'unknown';
          let msg = 'An unexpected geolocation error occurred.';

          if (err.code === err.PERMISSION_DENIED) {
            type = 'denied';
            msg = 'Location access denied. Please grant location permissions in your browser settings.';
            setPermissionState('denied');
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            type = 'unavailable';
            msg = 'Location unavailable. Please check your device GPS/network signal.';
          } else if (err.code === err.TIMEOUT) {
            type = 'timeout';
            msg = 'Location request timed out. Please try again in an open area.';
          }

          setErrorType(type);
          setErrorMessage(msg);
          setIsLoading(false);
          resolve(null);
        },
        options
      );
    });
  }, [options]);

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
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!isMounted.current) return;
          const newCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setCoords(newCoords);
          setPermissionState('granted');
          setErrorType(null);
          setErrorMessage(null);
        },
        (err) => {
          if (!isMounted.current) return;
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionState('denied');
            setErrorType('denied');
            setErrorMessage('Location access denied. Please grant location permissions in your browser.');
          } else {
            setPermissionState('prompt');
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      if (!isMounted.current) return;
      
      setPermissionState(result.state as PermissionState);

      if (result.state === 'granted') {
        captureLocation(true);
      } else if (result.state === 'prompt') {
        captureLocation(true);
      } else if (result.state === 'denied') {
        setErrorType('denied');
        setErrorMessage('Location access denied. Please grant location permissions in your browser settings.');
      }

      result.onchange = () => {
        if (!isMounted.current) return;
        setPermissionState(result.state as PermissionState);
        if (result.state === 'granted') {
          captureLocation(true);
        } else if (result.state === 'denied') {
          setCoords(null);
          setErrorType('denied');
          setErrorMessage('Location access denied. Please grant location permissions in your browser settings.');
        }
      };
    } catch (err) {
      console.warn('Geolocation permission query error:', err);
      // Fallback probe
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!isMounted.current) return;
          const newCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setCoords(newCoords);
          setPermissionState('granted');
          setErrorType(null);
          setErrorMessage(null);
        },
        (err) => {
          if (!isMounted.current) return;
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionState('denied');
            setErrorType('denied');
            setErrorMessage('Location access denied. Please grant location permissions in your browser.');
          } else {
            setPermissionState('prompt');
          }
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [captureLocation]);

  useEffect(() => {
    checkPermissionState();
  }, [checkPermissionState]);

  return {
    coords,
    isLoading,
    errorType,
    error: errorMessage,
    permissionState,
    captureLocation,
    retryPermission: checkPermissionState
  };
}
