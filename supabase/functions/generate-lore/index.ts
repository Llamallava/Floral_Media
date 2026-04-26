import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const COLORS = ['red', 'pink', 'white', 'yellow', 'orange', 'purple', 'blue', 'lavender', 'cream', 'multi'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

    // Verify the user with their token
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401, headers: cors });

    // Service role client for writing to flowers table (RLS: service role only)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { image, plantId } = await req.json();
    const { speciesName, genus, commonNames } = plantId;
    const commonNamesNote = commonNames.length ? `, also known as: ${commonNames.join(', ')}` : '';

    const prompt = `You are a floriography expert. Plant.id has identified this flower as "${speciesName}" (genus: ${genus}${commonNamesNote}).

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

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error(`Claude failed: ${res.status}`);

    const claudeData = await res.json();
    const parsed = JSON.parse(claudeData.content[0].text.trim());

    const flowerId = crypto.randomUUID();
    const { error: dbError } = await serviceClient.from('flowers').insert({
      id: flowerId,
      common_name: parsed.commonName,
      sci_name: parsed.sciName,
      summary: parsed.summary,
      mythology: parsed.mythology,
      history: parsed.history,
      color_meanings: parsed.colorMeanings,
      source: 'user_discovery',
    });
    if (dbError) throw new Error(`DB write failed: ${dbError.message}`);

    return new Response(JSON.stringify({
      flowerId,
      commonName: parsed.commonName,
      sciName: parsed.sciName,
      summary: parsed.summary,
      mythology: parsed.mythology,
      history: parsed.history,
      colorMeanings: JSON.stringify(parsed.colorMeanings),
      detectedColor: COLORS.includes(parsed.detectedColor) ? parsed.detectedColor : 'multi',
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
