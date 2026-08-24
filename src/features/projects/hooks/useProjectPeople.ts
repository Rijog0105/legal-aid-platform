import { useState, useEffect, useCallback } from 'react';
import { fetchProjectPeople } from '@/features/projects/services/projectPeopleService';
import type { ProjectPersonWithDetails } from '@/types';

export function useProjectPeople(projectId: string | undefined, phase?: 'survey' | 'camp') {
  const [projectPeople, setProjectPeople] = useState<ProjectPersonWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setProjectPeople([]);
    if (!projectId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProjectPeople(projectId, phase);
      setProjectPeople(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load assigned people');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, phase]);

  useEffect(() => {
    load();
  }, [load]);

  return { projectPeople, isLoading, error, reload: load };
}
