import * as FileSystem from 'expo-file-system';

const API_KEY = process.env.EXPO_PUBLIC_PLANT_ID_KEY!;
const ENDPOINT = 'https://api.plant.id/v2/identify';

export type PlantIdResult = {
  speciesName: string;
  genus: string;
  commonNames: string[];
  confidence: number;
};

export async function identifyPlant(photoUri: string): Promise<PlantIdResult> {
  const base64 = await FileSystem.readAsStringAsync(photoUri, {
    encoding: 'base64',
  });

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': API_KEY,
    },
    body: JSON.stringify({
      images: [base64],
      plant_details: ['common_names', 'taxonomy'],
    }),
  });

  if (!response.ok) {
    throw new Error(`Plant.id request failed: ${response.status}`);
  }

  const data = await response.json();
  const top = data.suggestions?.[0];

  if (!top) {
    throw new Error('Plant.id returned no suggestions.');
  }

  return {
    speciesName: top.plant_name as string,
    genus: top.plant_details?.taxonomy?.genus ?? '',
    commonNames: top.plant_details?.common_names ?? [],
    confidence: top.probability as number,
  };
}
