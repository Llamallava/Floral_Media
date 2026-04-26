import { supabase } from '../db/supabaseClient';
import type { PlantIdResult } from './PlantIdService';

export type FlowerColor = 'red' | 'pink' | 'white' | 'yellow' | 'orange' | 'purple' | 'blue' | 'lavender' | 'cream' | 'multi';

export type FlowerLore = {
  flowerId: string;
  commonName: string;
  sciName: string;
  summary: string;
  mythology: string;
  history: string;
  colorMeanings: string;
  detectedColor: FlowerColor;
};

export async function detectColor(base64: string): Promise<FlowerColor> {
  const { data, error } = await supabase.functions.invoke('detect-color', {
    body: { image: base64 },
  });
  if (error) throw error;
  return data.detectedColor as FlowerColor;
}

export async function generateFlowerLore(
  base64: string,
  plantId: PlantIdResult
): Promise<FlowerLore> {
  const { data, error } = await supabase.functions.invoke('generate-lore', {
    body: { image: base64, plantId },
  });
  if (error) throw error;
  return data as FlowerLore;
}
