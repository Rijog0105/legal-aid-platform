import { useState, useEffect, useCallback } from 'react';
import { fetchPeople } from '@/features/people/services/peopleService';
import type { Person } from '@/types';
import type { PersonCategory } from '@/constants';

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<PersonCategory | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPeople({ search, category: categoryFilter });
      setPeople(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load people');
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  return {
    people,
    isLoading,
    error,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    reload: load,
  };
}
