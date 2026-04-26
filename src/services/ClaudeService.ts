import Anthropic from '@anthropic-ai/sdk';
import * as FileSystem from 'expo-file-system';
import type { PlantIdResult } from './PlantIdService';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY!,
  dangerouslyAllowBrowser: true,
});

const COLORS = ['red', 'pink', 'white', 'yellow', 'orange', 'purple', 'blue', 'lavender', 'cream', 'multi'] as const;
export type FlowerColor = typeof COLORS[number];

export type FlowerLore = {
  commonName: string;
  sciName: string;
  summary: string;
  mythology: string;
  history: string;
  colorMeanings: string;
  detectedColor: FlowerColor;
};

async function readBase64(photoUri: string): Promise<string> {
  return FileSystem.readAsStringAsync(photoUri, { encoding: 'base64' });
}

export async function detectColor(photoUri: string): Promise<FlowerColor> {
  const base64 = await readBase64(photoUri);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 10,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
          },
          {
            type: 'text',
            text: `What color is the flower in this image? Reply with exactly one word from this list: ${COLORS.join(', ')}. No other text.`,
          },
        ],
      },
    ],
  });

  const raw = (response.content[0] as { text: string }).text.trim().toLowerCase() as FlowerColor;
  return COLORS.includes(raw) ? raw : 'multi';
}

export async function generateFlowerLore(
  photoUri: string,
  plantId: PlantIdResult
): Promise<FlowerLore> {
  const base64 = await readBase64(photoUri);

  const commonNamesNote = plantId.commonNames.length
    ? `, also known as: ${plantId.commonNames.join(', ')}`
    : '';

  const prompt = `You are a floriography expert. Plant.id has identified this flower as "${plantId.speciesName}" (genus: ${plantId.genus}${commonNamesNote}).

Your tasks:
1. Confirm or correct the identification based on what you see in the image.
2. Determine the exact color of the flower in this photo. Choose one word from: ${COLORS.join(', ')}.
3. Generate rich floriographic content — symbolism, mythology, and cultural history. Not botany.

Respond with valid JSON only, no markdown, in this exact shape:
{
  "commonName": "the most widely recognized common name",
  "sciName": "scientific name",
  "summary": "2-3 sentences on the flower's general symbolic meaning and cultural significance",
  "mythology": "myths, legends, or deities associated with this flower across cultures",
  "history": "historical uses, notable appearances, or cultural traditions involving this flower",
  "colorMeanings": { "colorName": "1-2 sentence meaning for that color variety" },
  "detectedColor": "the color of the flower in this photo — one word from the list above"
}

colorMeanings should include only colors this species naturally comes in.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  const text = (response.content[0] as { text: string }).text.trim();
  const parsed = JSON.parse(text);

  return {
    commonName: parsed.commonName,
    sciName: parsed.sciName,
    summary: parsed.summary,
    mythology: parsed.mythology,
    history: parsed.history,
    colorMeanings: JSON.stringify(parsed.colorMeanings),
    detectedColor: COLORS.includes(parsed.detectedColor) ? parsed.detectedColor : 'multi',
  };
}
