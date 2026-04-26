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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401, headers: cors });

    const { image } = await req.json();

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: `What color is the flower in this image? Reply with exactly one word from this list: ${COLORS.join(', ')}. No other text.` },
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error(`Claude failed: ${res.status}`);

    const data = await res.json();
    const raw = data.content[0].text.trim().toLowerCase();

    return new Response(JSON.stringify({
      detectedColor: COLORS.includes(raw) ? raw : 'multi',
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
