import { useState, useEffect, useCallback } from 'react';
import { fetchMyCampAssignment, fetchAllMyCampAssignments, type MyCampAssignment } from '@/features/volunteer/services/volunteerService';
import type { Camp, CampPersonWithDetails } from '@/types';

export function useMyCampAssignment(personId: string | null, targetCampId?: string | null) {
  const [camp, setCamp] = useState<Camp | null>(null);
  const [campPerson, setCampPerson] = useState<CampPersonWithDetails | null>(null);
  const [allAssignments, setAllAssignments] = useState<MyCampAssignment[]>([]);
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
      const [result, all] = await Promise.all([
        fetchMyCampAssignment(personId, targetCampId),
        fetchAllMyCampAssignments(personId),
      ]);
      setCamp(result?.camp ?? null);
      setCampPerson(result?.campPerson ?? null);
      setAllAssignments(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load camp assignment');
    } finally {
      setIsLoading(false);
    }
  }, [personId, targetCampId]);

  useEffect(() => {
    load();
  }, [load]);

  return { camp, campPerson, allAssignments, isLoading, error, reload: load };
}
