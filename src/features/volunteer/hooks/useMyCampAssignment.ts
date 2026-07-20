import { useState, useEffect, useCallback } from 'react';
import { fetchMyActiveCampAssignment } from '@/features/volunteer/services/volunteerService';
import type { Camp, CampPersonWithDetails } from '@/types';

export function useMyCampAssignment(personId: string | null) {
  const [camp, setCamp] = useState<Camp | null>(null);
  const [campPerson, setCampPerson] = useState<CampPersonWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!personId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchMyActiveCampAssignment(personId);
      setCamp(result?.camp ?? null);
      setCampPerson(result?.campPerson ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load camp assignment');
    } finally {
      setIsLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    load();
  }, [load]);

  return { camp, campPerson, isLoading, error, reload: load };
}
