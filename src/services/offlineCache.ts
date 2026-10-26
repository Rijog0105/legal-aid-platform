import { offlineDb } from '@/db/offlineDb';

export const OFFLINE_SYNC_COMPLETE_EVENT = 'offline-sync-complete';

/**
 * True when an error comes from the network being unavailable rather than
 * from the server rejecting the request.
 */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const msg = String(err instanceof Error ? err.message : err).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    msg.includes('network request failed') ||
    msg.includes('fetch failed')
  );
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Runs a read query online and keeps a copy on the device. When the device is
 * offline (or the request fails because of the network) the last saved copy is returned.
 */
export async function withOfflineCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (!isOffline()) {
    try {
      const data = await fetcher();
      offlineDb.queryCache
        .put({ key, data, cached_at: new Date().toISOString() })
        .catch((err) => console.warn('[offlineCache] Failed to save cache entry', key, err));
      return data;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      console.warn('[offlineCache] Network unavailable, using saved copy for', key);
    }
  }

  const cached = await offlineDb.queryCache.get(key).catch(() => undefined);
  if (cached) return cached.data as T;
  throw new Error('You are offline and this information has not been saved on this device yet.');
}

/** Reads the last saved copy without touching the network. */
export async function readOfflineCache<T>(key: string): Promise<T | null> {
  const cached = await offlineDb.queryCache.get(key).catch(() => undefined);
  return cached ? (cached.data as T) : null;
}

export function notifyOfflineSyncComplete(): void {
  window.dispatchEvent(new Event(OFFLINE_SYNC_COMPLETE_EVENT));
}

/** Re-runs `reload` whenever queued offline changes finish syncing. */
export function subscribeToOfflineSync(reload: () => void): () => void {
  window.addEventListener(OFFLINE_SYNC_COMPLETE_EVENT, reload);
  return () => window.removeEventListener(OFFLINE_SYNC_COMPLETE_EVENT, reload);
}

export function makeTempId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
