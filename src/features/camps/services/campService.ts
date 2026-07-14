import { supabase } from '@/services/supabase';
import type { Camp, ReportSettings } from '@/types';
import type { CampStatus } from '@/constants';

export interface CampPayload {
  camp_name: string;
  description?: string | null;
  camp_date: string;
  start_time?: string | null;
  end_time?: string | null;
  village_name: string;
  taluk: string;
  district: string;
  report_settings: ReportSettings;
  created_by: string;
}

export interface CampFilters {
  search?: string;
  status?: CampStatus | null;
}

export async function fetchCamps(filters: CampFilters = {}): Promise<Camp[]> {
  let query = supabase
    .from('camps')
    .select('*')
    .order('camp_date', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.search && filters.search.trim()) {
    query = query.ilike('camp_name', `%${filters.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Camp[];
}

export async function fetchCamp(id: string): Promise<Camp | null> {
  const { data, error } = await supabase
    .from('camps')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data as Camp;
}

export async function createCamp(payload: CampPayload): Promise<Camp> {
  const { data, error } = await supabase
    .from('camps')
    .insert([{ ...payload, status: 'draft' }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Camp;
}

export async function updateCamp(
  id: string,
  payload: Partial<Omit<CampPayload, 'created_by'>>
): Promise<Camp> {
  const { data, error } = await supabase
    .from('camps')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Camp;
}

export async function updateCampStatus(id: string, status: CampStatus): Promise<Camp> {
  const { data, error } = await supabase
    .from('camps')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Camp;
}

export async function deleteCamp(id: string): Promise<void> {
  const { error } = await supabase.from('camps').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
