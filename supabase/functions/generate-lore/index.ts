import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildPrompt(flowerName: string): string {
  return `Generate information for the flower: "${flowerName}". Avoid pleasantries and filler words. Do not use hyphens, em dashes, or similar. Write in an encyclopedic, reference tone. State cultural associations and historical facts plainly without editorializing, emphasizing significance, or using persuasive language. Avoid superlatives and phrases that argue for the flower's importance. Do not explain why something matters — just describe what it is and what it has meant across cultures. Do not repeat information unless necessary, if one field of response acknowledges a detail, don't address it in other places as well unless it is significant. Do not use biased sources. Do not use sources that are old earth creationists and claim flowers to be millions of years old.
Here is an example of a correctly formatted response for "Rose".
Match this structure, length, and register exactly for all flowers:

{
  "common_name": "Rose",
  "sci_name": "Rosa",
  "summary": "The rose occupies symbolic territory spanning love, desire, secrecy, mourning, and political identity across a wide range of cultures and historical periods. It functions as a marker of romantic intent in Western traditions and as a religious emblem in both Christian and Islamic contexts. Different cultures have assigned it roles ranging from funerary decoration to national emblems.",
  "mythology": "In ancient Greek religion, the rose was associated with Aphrodite, goddess of love, and appears in accounts connecting the flower's red color to her blood or to that of her lover Adonis.\\n\\nRoman mythology carried this association forward, linking the rose to Venus. In Roman practice, roses hung above a table indicated that conversations held there were confidential, giving rise to the Latin phrase sub rosa.\\n\\nIn Christianity, the rose became associated with the Virgin Mary, with the white rose used as a symbol of her purity and the red rose linked to martyrdom.\\n\\nThe rosary, a Catholic devotional object, takes its name from the Latin word for rose garland.",
  "history": "Cultivated roses appear in records from ancient Mesopotamia, with Sumerian texts referencing the plant.\\n\\nIn ancient Rome, roses were cultivated extensively for use in festivals, banquets, and funerary rites.\\n\\nDuring the Wars of the Roses in fifteenth century England, the House of Lancaster used a red rose and the House of York used a white rose as their respective emblems, leading to the Tudor rose combining both after the conflict's resolution.\\n\\nIn the Ottoman Empire, rose water and rose oil derived from Rosa damascena were significant trade goods.\\n\\nDuring the nineteenth century, the rose held political meaning in European socialist movements, and the red rose remains associated with social democratic parties in several countries.",
  "color_meanings": {
    "red": "Red roses carry the most codified symbolic weight of any rose color in Western culture, associated with romantic love and desire, a meaning reinforced through centuries of literary and artistic use tied to Venus and Aphrodite.",
    "white": "White roses are associated with purity and innocence in Christian contexts, particularly with the Virgin Mary. In Western funerary and mourning traditions they signal reverence and remembrance, and historically they served as the emblem of the House of York during the English Wars of the Roses.",
    "pink": "Pink roses generally occupy a middle register between the passion of red and the purity of white, used to express admiration, gratitude, and gentle affection.",
    "yellow": "Yellow roses in European and Western traditions came to be associated with jealousy and infidelity, a meaning that emerged in post-medieval symbolism. In some modern contexts this association has shifted toward friendship and care.",
    "orange": "Orange roses are generally associated with enthusiasm, desire, and fascination in contemporary floral symbolism.",
    "purple": "Purple and lavender roses are associated with enchantment and mystery in contemporary symbolism. Because naturally occurring purple roses are rare, the color is sometimes used to signal uniqueness or the unattainable.",
    "black": "True black roses do not occur naturally. In Western symbolism they are associated with death, farewell, and mourning.",
    "blue": "Blue roses do not exist in nature without artificial intervention. They carry associations with the impossible or the unattainable, a meaning that developed precisely because of their absence in nature."
  }
}

Do not vary the depth or length of fields based on how well-documented a flower is.
If a flower has limited mythology, state what exists plainly and do not attempt to match the same length as a well-documented flower. Do not pad or apologize for gaps. Some flowers simply do not have vast lore, do not attempt to overexaggerate or fill in with generic symbolism. If there is limited information, provide it concisely and move on.

Within the summary, mythology, and history fields, insert \\n\\n each time the content shifts to a different culture, religion, tradition, or historical period. Do not use \\n\\n within a single continuous thought. Only break when the subject genuinely changes context.

Return a JSON object with these fields:
- common_name: string
- sci_name: string (scientific name or genus if no species applies)
- summary: string (2-3 sentences on what this flower symbolizes and what emotional or cultural territory it occupies across cultures. Do not mention scientific classification, specific historical events, specific mythological stories, or individual color meanings. Those are covered in other fields.)
- mythology: string (mythological and religious stories and associations only. Do not repeat anything from summary.)
- history: string (historical events and documented human use only. Do not repeat anything from summary or mythology.)
- color_meanings: object where keys are color names and values are 1-2 sentences on what that specific color of this specific flower means. Go beyond generic color symbolism — tie it to this flower's particular mythology, history, or cultural role where relevant.

Return only valid JSON, no markdown, no explanation.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401, headers: cors });

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { flowerName } = await req.json();

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: buildPrompt(flowerName) }],
      }),
    });
    if (!res.ok) throw new Error(`Claude failed: ${res.status}`);

    const claudeData = await res.json();
    const parsed = JSON.parse(claudeData.content[0].text.trim());

    const flowerId = crypto.randomUUID();
    const { error: dbError } = await serviceClient.from('flowers').insert({
      id: flowerId,
      common_name: parsed.common_name,
      sci_name: parsed.sci_name,
      summary: parsed.summary,
      mythology: parsed.mythology,
      history: parsed.history,
      color_meanings: parsed.color_meanings,
      source: 'user_discovery',
    });
    if (dbError) throw new Error(`DB write failed: ${dbError.message}`);

    return new Response(JSON.stringify({
      flowerId,
      common_name: parsed.common_name,
      sci_name: parsed.sci_name,
      summary: parsed.summary,
      mythology: parsed.mythology,
      history: parsed.history,
      color_meanings: JSON.stringify(parsed.color_meanings),
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
