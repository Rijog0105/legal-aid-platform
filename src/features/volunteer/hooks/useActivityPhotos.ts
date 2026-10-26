import { useState, useEffect, useCallback } from 'react';
import { fetchMyPhotosForActivity } from '@/features/volunteer/services/photoService';
import type { Photo } from '@/types';
import { subscribeToOfflineSync } from '@/services/offlineCache';

/**
 * Photos captured by the current volunteer for a single activity —
 * drives the per-activity photo counter and the capture-flow mini-gallery.
 */
export function useActivityPhotos(activityId: string | null, uploadedBy: string | null) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activityId || !uploadedBy) {
      setPhotos([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMyPhotosForActivity(activityId, uploadedBy);
      setPhotos(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load photos');
    } finally {
      setIsLoading(false);
    }
  }, [activityId, uploadedBy]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => subscribeToOfflineSync(load), [load]);

  return { photos, isLoading, error, reload: load };
}
