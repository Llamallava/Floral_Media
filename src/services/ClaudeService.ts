import { supabase } from '../db/supabaseClient';

export type FlowerLore = {
  flowerId: string;
  common_name: string;
  sci_name: string;
  summary: string;
  mythology: string;
  history: string;
  color_meanings: string;
};

export async function generateFlowerLore(flowerName: string): Promise<FlowerLore> {
  const { data, error } = await supabase.functions.invoke('generate-lore', {
    body: { flowerName },
  });
  if (error) throw error;
  return data as FlowerLore;
}
