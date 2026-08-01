import { useState, useEffect, useCallback } from 'react';
import { fetchMyProjectAssignment, fetchAllMyProjectAssignments, type MyProjectAssignment } from '@/features/volunteer/services/volunteerService';
import type { Project, ProjectPersonWithDetails } from '@/types';

export function useMyProjectAssignment(personId: string | null, targetProjectId?: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [projectPerson, setProjectPerson] = useState<ProjectPersonWithDetails | null>(null);
  const [allAssignments, setAllAssignments] = useState<MyProjectAssignment[]>([]);
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
        fetchMyProjectAssignment(personId, targetProjectId),
        fetchAllMyProjectAssignments(personId),
      ]);
      setProject(result?.camp ?? null);
      setProjectPerson(result?.campPerson ?? null);
      setAllAssignments(all);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load project assignment');
    } finally {
      setIsLoading(false);
    }
  }, [personId, targetProjectId]);

  useEffect(() => {
    load();
  }, [load]);

  return { project, projectPerson, allAssignments, isLoading, error, reload: load };
}
