import { supabase } from '../db/supabaseClient';

export type PlantIdResult = {
  speciesName: string;
  genus: string;
  commonNames: string[];
  confidence: number;
};

export async function identifyPlant(base64: string): Promise<PlantIdResult> {
  const { data, error } = await supabase.functions.invoke('identify-plant', {
    body: { image: base64 },
  });
  if (error) throw error;
  return data as PlantIdResult;
}
