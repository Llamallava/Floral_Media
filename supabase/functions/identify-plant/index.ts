import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PLANT_ID_KEY = Deno.env.get('PLANT_ID_KEY')!;

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

    const res = await fetch('https://api.plant.id/v2/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Api-Key': PLANT_ID_KEY },
      body: JSON.stringify({ images: [image], plant_details: ['common_names', 'taxonomy'] }),
    });
    if (!res.ok) throw new Error(`Plant.id failed: ${res.status}`);

    const data = await res.json();
    const top = data.suggestions?.[0];
    if (!top) throw new Error('No suggestions returned.');

    return new Response(JSON.stringify({
      speciesName: top.plant_name,
      genus: top.plant_details?.taxonomy?.genus ?? '',
      commonNames: top.plant_details?.common_names ?? [],
      confidence: top.probability,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
