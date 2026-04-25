const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const DELAY_MS = 1500;
const OUTPUT_PATH = path.join(__dirname, '../assets/flowers.json');
const PROGRESS_PATH = path.join(__dirname, '../assets/flowers-progress.json');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchFlowerList() {
  const listPath = path.join(__dirname, '../assets/flower-list.txt');
  return fs.readFileSync(listPath, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

async function callClaude(flowerName) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: buildPrompt(flowerName),
      }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error(`No response content: ${JSON.stringify(data)}`);
  return JSON.parse(text);
}

function buildPrompt(flowerName) {
  return `Generate  information for the flower: "${flowerName}". Avoid pleasantries and filler words. Do not use hyphens, em dashes, or similar. Write in an encyclopedic, reference tone. State cultural associations and historical facts plainly without editorializing, emphasizing significance, or using persuasive language. Avoid superlatives and phrases that argue for the flower's importance. Do not explain why something matters — just describe what it is and what it has meant across cultures. Do not repeat information unless necessary, if one field of response acknowledges a detail, don't address it in other places as well unless it is significant. Do not use biased sources. Do not use sources that are old earth creationists and claim flowers to be millions of years old. 
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

async function main() {
  let results = [];
  const processedNames = new Set();

  if (fs.existsSync(PROGRESS_PATH)) {
    try {
      results = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
      results.forEach(r => processedNames.add(r.common_name.toLowerCase()));
      console.log(`Resuming: ${results.length} flowers already done`);
    } catch {
      console.log('Progress file corrupted, starting fresh.');
      results = [];
    }
  }

  const flowerNames = fetchFlowerList();
  const toProcess = flowerNames.filter(n => !processedNames.has(n.toLowerCase()));
  console.log(`${flowerNames.length} total, ${toProcess.length} remaining`);

  for (let i = 0; i < toProcess.length; i++) {
    const name = toProcess[i];
    process.stdout.write(`[${i + 1}/${toProcess.length}] ${name}... `);

    try {
      const data = await callClaude(name);
      results.push({
        id: randomUUID(),
        common_name: data.common_name,
        sci_name: data.sci_name ?? null,
        summary: data.summary ?? null,
        mythology: data.mythology ?? null,
        history: data.history ?? null,
        color_meanings: JSON.stringify(data.color_meanings ?? {}),
        source: 'seed',
        created_at: new Date().toISOString(),
      });
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(results, null, 2));
      console.log('done');
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\nComplete. ${results.length} flowers written to assets/flowers.json`);
}

main().catch(console.error);
