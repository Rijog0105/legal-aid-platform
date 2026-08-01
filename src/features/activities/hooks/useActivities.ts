import { useState, useEffect, useCallback } from 'react';
import { fetchActivities } from '@/features/activities/services/activityService';
import type { Activity } from '@/types';

export function useActivities(campId: string | undefined) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setActivities([]);
    if (!campId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchActivities(campId);
      setActivities(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  }, [campId]);

  useEffect(() => {
    load();
  }, [load]);

  return { activities, isLoading, error, reload: load, setActivities };
}
