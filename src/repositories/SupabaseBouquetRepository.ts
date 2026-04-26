import { supabase } from '../db/supabaseClient';
import type { Bouquet, BouquetRepository } from './BouquetRepository';

export class SupabaseBouquetRepository implements BouquetRepository {
  async getAllForUser(userId: string): Promise<Bouquet[]> {
    const { data, error } = await supabase
      .from('bouquets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async getById(id: string): Promise<Bouquet | null> {
    const { data, error } = await supabase
      .from('bouquets')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  }

  async save(bouquet: Omit<Bouquet, 'created_at'>, gardenEntryIds: string[]): Promise<Bouquet> {
    const { data, error } = await supabase
      .from('bouquets')
      .insert(bouquet)
      .select()
      .single();
    if (error) throw error;

    if (gardenEntryIds.length > 0) {
      const entries = gardenEntryIds.map(id => ({
        bouquet_id: bouquet.id,
        garden_entry_id: id,
      }));
      const { error: entriesError } = await supabase.from('bouquet_entries').insert(entries);
      if (entriesError) throw entriesError;
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('bouquets').delete().eq('id', id);
    if (error) throw error;
  }
}

export const bouquetRepository = new SupabaseBouquetRepository();
