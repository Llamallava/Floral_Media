import { randomUUID } from 'expo-crypto';
import { supabase } from '../db/supabaseClient';
import type { Flower, FlowerRepository } from './FlowerRepository';

function normalize(row: any): Flower {
  return {
    ...row,
    color_meanings: row.color_meanings ? JSON.stringify(row.color_meanings) : null,
  };
}

export class SupabaseFlowerRepository implements FlowerRepository {
  async getAll(): Promise<Flower[]> {
    const { data, error } = await supabase
      .from('flowers')
      .select('*')
      .order('common_name', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(normalize);
  }

  async getById(id: string): Promise<Flower | null> {
    const { data, error } = await supabase
      .from('flowers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return normalize(data);
  }

  async search(query: string): Promise<Flower[]> {
    const { data, error } = await supabase
      .from('flowers')
      .select('*')
      .or(`common_name.ilike.%${query}%,sci_name.ilike.%${query}%`)
      .order('common_name', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(normalize);
  }

  async save(flower: Omit<Flower, 'id' | 'created_at'>): Promise<Flower> {
    const id = randomUUID();
    const row = {
      ...flower,
      id,
      color_meanings: flower.color_meanings ? JSON.parse(flower.color_meanings) : null,
    };
    const { data, error } = await supabase
      .from('flowers')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return normalize(data);
  }
}

export const flowerRepository = new SupabaseFlowerRepository();
