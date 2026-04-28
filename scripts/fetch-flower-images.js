const fs = require('fs');
const path = require('path');

// Parse .env
const env = {};
for (const line of fs.readFileSync(path.join(__dirname, '../.env'), 'utf-8').split('\n')) {
  const eq = line.indexOf('=');
  if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
}

const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const DELAY_MS = 500;
const FLOWERS_PATH = path.join(__dirname, '../assets/flowers.json');
const PROGRESS_PATH = path.join(__dirname, '../assets/flower-images-progress.json');

if (!SUPABASE_SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY missing from .env'); process.exit(1); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWikipediaImage(commonName) {
  const title = encodeURIComponent(commonName);
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`, {
    headers: { 'User-Agent': 'FloralMedia/1.0 (flower lexicon; educational)' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  const json = await res.json();
  return json.originalimage?.source ?? json.thumbnail?.source ?? null;
}

async function fetchInatImage(sciName) {
  if (!sciName) return null;
  const params = new URLSearchParams({ q: sciName, rank: 'genus,species' });
  const res = await fetch(`https://api.inaturalist.org/v1/taxa?${params}`, {
    headers: { 'User-Agent': 'FloralMedia/1.0' },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.results?.[0]?.default_photo?.medium_url ?? null;
}

async function updateSupabase(id, imageUrl) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/flowers?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ image_url: imageUrl }),
  });
  if (!res.ok) throw new Error(`Supabase PATCH failed: ${res.status} ${await res.text()}`);
}

async function main() {
  const flowers = JSON.parse(fs.readFileSync(FLOWERS_PATH, 'utf-8'));

  let progress = {};
  if (fs.existsSync(PROGRESS_PATH)) {
    try { progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8')); }
    catch { progress = {}; }
  }

  const remaining = flowers.filter(f => !(f.id in progress));
  console.log(`${flowers.length} flowers total, ${Object.keys(progress).length} already done, ${remaining.length} remaining`);

  let wikiCount = 0;
  let inatCount = 0;
  let notFound = 0;
  let failed = 0;

  for (let i = 0; i < remaining.length; i++) {
    const flower = remaining[i];
    const position = Object.keys(progress).length + i + 1;
    process.stdout.write(`[${position}/${flowers.length}] ${flower.common_name}... `);

    try {
      let url = await fetchWikipediaImage(flower.common_name);
      let source = 'wiki';

      if (!url) {
        url = await fetchInatImage(flower.sci_name);
        source = 'inat';
      }

      if (url) {
        await updateSupabase(flower.id, url);
        progress[flower.id] = url;
        console.log(`✓ (${source})`);
        if (source === 'wiki') wikiCount++; else inatCount++;
      } else {
        progress[flower.id] = null;
        console.log('no image');
        notFound++;
      }
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${wikiCount} from Wikipedia, ${inatCount} from iNaturalist, ${notFound} not found, ${failed} errors`);
  if (failed > 0) console.log('Re-run to retry failed entries (progress is saved).');
}

main().catch(console.error);
