import { useState, useEffect, useCallback } from 'react';
import { fetchProjects } from '@/features/projects/services/projectService';
import type { Project } from '@/types';
import type { ProjectStatus } from '@/constants';
import { deriveProjectStatus } from '@/utils/projectLifecycle';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProjects({ search });
      const filtered = statusFilter
        ? data.filter((p) => deriveProjectStatus(p) === statusFilter)
        : data;
      setProjects(filtered);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  return {
    projects,
    isLoading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    reload: load,
  };
}
