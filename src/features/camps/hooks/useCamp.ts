import { useState, useEffect, useCallback } from 'react';
import { fetchCamp } from '@/features/camps/services/campService';
import type { Camp } from '@/types';

export function useCamp(campId: string | undefined) {
  const [camp, setCamp] = useState<Camp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCamp(campId);
      if (!data) {
        setError('Camp not found');
      }
      setCamp(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load camp');
    } finally {
      setIsLoading(false);
    }
  }, [campId]);

  useEffect(() => {
    load();
  }, [load]);

  return { camp, isLoading, error, reload: load, setCamp };
}
