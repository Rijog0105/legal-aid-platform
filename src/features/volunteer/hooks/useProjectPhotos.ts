import { useState, useEffect, useCallback } from 'react';
import {
  fetchProjectPhotos,
  togglePhotoReportSelection,
  deletePhoto,
  type PhotoWithDetails,
} from '@/features/volunteer/services/photoService';

export function useProjectPhotos(projectId: string | null) {
  const [photos, setPhotos] = useState<PhotoWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhotos([]);
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProjectPhotos(projectId);
      setPhotos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project photos');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

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
