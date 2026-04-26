import { supabase } from '../db/supabaseClient';
import type { GardenEntry, GardenRepository } from './GardenRepository';

export class SupabaseGardenRepository implements GardenRepository {
  async getAllForUser(userId: string): Promise<GardenEntry[]> {
    const { data, error } = await supabase
      .from('garden_entries')
      .select('*')
      .eq('user_id', userId)
      .order('captured_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async getById(id: string): Promise<GardenEntry | null> {
    const { data, error } = await supabase
      .from('garden_entries')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  }

  async save(entry: Omit<GardenEntry, 'created_at'>): Promise<GardenEntry> {
    const { data, error } = await supabase
      .from('garden_entries')
      .insert(entry)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('garden_entries').delete().eq('id', id);
    if (error) throw error;
  }
}

export const gardenRepository = new SupabaseGardenRepository();
