import { useState, useEffect, useCallback } from 'react';
import type { NarrativeSection } from '@/types';
import type { NarrativeSectionType } from '@/constants';
import { fetchNarrativeSections, upsertNarrativeSection } from '../services/narrativeService';

export function useNarratives(projectId: string | null | undefined) {
  const [narratives, setNarratives] = useState<NarrativeSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNarratives = useCallback(async () => {
    if (!projectId) {
      setNarratives([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchNarrativeSections(projectId);
      setNarratives(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load narrative sections');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadNarratives();
  }, [loadNarratives]);

  const saveSection = async (
    sectionType: NarrativeSectionType,
    content: string,
    updatedBy: string
  ) => {
    if (!projectId) return;
    try {
      const updated = await upsertNarrativeSection(projectId, sectionType, content, updatedBy);
      setNarratives((prev) => {
        const idx = prev.findIndex((n) => n.section_type === sectionType);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
      return updated;
    } catch (err) {
      throw err;
    }
  };

  return {
    narratives,
    isLoading,
    error,
    reload: loadNarratives,
    saveSection,
  };
}
