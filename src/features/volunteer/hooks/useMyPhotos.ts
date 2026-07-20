import { useState, useEffect, useCallback } from 'react';
import { fetchMyPhotos, type PhotoWithActivityName } from '@/features/volunteer/services/photoService';

/**
 * All photos captured by the current volunteer within their assigned camp —
 * drives the volunteer's Personal Gallery ("My Work" tab).
 */
export function useMyPhotos(campId: string | null, uploadedBy: string | null) {
  const [photos, setPhotos] = useState<PhotoWithActivityName[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campId || !uploadedBy) {
      setPhotos([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMyPhotos(campId, uploadedBy);
      setPhotos(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load photos');
    } finally {
      setIsLoading(false);
    }
  }, [campId, uploadedBy]);

  useEffect(() => {
    load();
  }, [load]);

  return { photos, isLoading, error, reload: load };
}
