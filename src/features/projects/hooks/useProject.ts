import { useState, useEffect, useCallback } from 'react';
import { fetchProject } from '@/features/projects/services/projectService';
import type { Project } from '@/types';

export function useProject(projectId: string | undefined) {
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProject(projectId);
      if (!data) {
        setError('Project not found');
      }
      setProject(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return { project, isLoading, error, reload: load, setProject };
}
