import { useState, useEffect, useCallback } from 'react';
import { fetchCampPeople } from '@/features/camps/services/campPeopleService';
import type { CampPersonWithDetails } from '@/types';

export function useCampPeople(campId: string | undefined) {
  const [campPeople, setCampPeople] = useState<CampPersonWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCampPeople(campId);
      setCampPeople(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assigned people');
    } finally {
      setIsLoading(false);
    }
  }, [campId]);

  useEffect(() => {
    load();
  }, [load]);

  return { campPeople, isLoading, error, reload: load };
}
