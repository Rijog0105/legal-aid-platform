import { useState, useEffect, useCallback } from 'react';
import { fetchCamps } from '@/features/camps/services/campService';
import type { Camp } from '@/types';
import type { CampStatus } from '@/constants';

export function useCamps() {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampStatus | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCamps({ search, status: statusFilter });
      setCamps(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load camps');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  return {
    camps,
    isLoading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    reload: load,
  };
}
