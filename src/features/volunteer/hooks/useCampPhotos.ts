import { useState, useEffect, useCallback } from 'react';
import {
  fetchCampPhotos,
  togglePhotoReportSelection,
  deletePhoto,
  type PhotoWithDetails,
} from '@/features/volunteer/services/photoService';

export function useCampPhotos(campId: string | null) {
  const [photos, setPhotos] = useState<PhotoWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campId) {
      setPhotos([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCampPhotos(campId);
      setPhotos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch camp photos');
    } finally {
      setIsLoading(false);
    }
  }, [campId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleReportSelection = async (photoId: string, isSelected: boolean) => {
    // Optimistic update
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, is_selected_for_report: isSelected } : p))
    );
    try {
      await togglePhotoReportSelection(photoId, isSelected);
    } catch (err) {
      // Rollback on error
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, is_selected_for_report: !isSelected } : p))
      );
      throw err;
    }
  };

  const removePhoto = async (photoId: string, filePath: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    try {
      await deletePhoto(photoId, filePath);
    } catch (err) {
      // Reload on error
      load();
      throw err;
    }
  };

  return { photos, isLoading, error, reload: load, toggleReportSelection, removePhoto };
}
