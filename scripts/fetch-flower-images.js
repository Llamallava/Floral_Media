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
const PEXELS_API_KEY = env.PEXELS_API_KEY;
const DELAY_MS = 500;
const TARGET_COUNT = 5;
const FLOWERS_PATH = path.join(__dirname, '../assets/flowers.json');
const PROGRESS_PATH = path.join(__dirname, '../assets/pexels-images-progress.json');

if (!SUPABASE_SERVICE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY missing from .env'); process.exit(1); }
if (!PEXELS_API_KEY) { console.error('PEXELS_API_KEY missing from .env'); process.exit(1); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Search Pexels for flower photos. Returns { urls: string[], rateLimited: bool }.
// Tries the scientific name first (more precise), falls back to common name.
// Appends "flower" to every query to avoid drawings, cartoons, and unrelated content.
async function fetchPexelsImages(commonName, sciName) {
  const queries = [];
  if (sciName) queries.push(`${sciName} flower`);
  queries.push(`${commonName} flower`);

  for (const query of queries) {
    const params = new URLSearchParams({ query, per_page: String(TARGET_COUNT), page: '1' });
    let res;
    try {
      res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
        headers: { Authorization: PEXELS_API_KEY },
      });
    } catch (e) {
      throw new Error(`Network error: ${e.message}`);
    }

    if (res.status === 429) return { urls: [], rateLimited: true };
    if (!res.ok) continue;

    const json = await res.json();
    const urls = (json.photos ?? []).map(p => p.src.large).filter(Boolean);
    if (urls.length > 0) return { urls, rateLimited: false };
  }

  return { urls: [], rateLimited: false };
}

async function updateSupabase(id, urls) {
  const body = {
    image_url: urls[0] ?? null,
    image_urls: urls,
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/flowers?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH failed: ${res.status} ${await res.text()}`);
}

async function main() {
  const flowers = JSON.parse(fs.readFileSync(FLOWERS_PATH, 'utf-8'));

  // Progress: { [flowerId]: string[] } — present means done (even if empty array = no images found)
  let progress = {};
  if (fs.existsSync(PROGRESS_PATH)) {
    try { progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf-8')); }
    catch { progress = {}; }
  }

  const remaining = flowers.filter(f => !(f.id in progress));
  console.log(`${flowers.length} flowers total, ${Object.keys(progress).length} already done, ${remaining.length} remaining`);

  let found = 0;
  let notFound = 0;
  let failed = 0;

  for (let i = 0; i < remaining.length; i++) {
    const flower = remaining[i];
    const position = Object.keys(progress).length + i + 1;
    process.stdout.write(`[${position}/${flowers.length}] ${flower.common_name} (${flower.sci_name ?? 'no sci name'})... `);

    let result;
    try {
      result = await fetchPexelsImages(flower.common_name, flower.sci_name);
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      failed++;
      await sleep(DELAY_MS);
      continue;
    }

    if (result.rateLimited) {
      console.log('\nRate limited by Pexels. Progress saved — re-run to continue.');
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
      break;
    }

    try {
      if (result.urls.length > 0) {
        await updateSupabase(flower.id, result.urls);
        progress[flower.id] = result.urls;
        console.log(`${result.urls.length} image${result.urls.length > 1 ? 's' : ''}`);
        found++;
      } else {
        progress[flower.id] = [];
        console.log('no images found');
        notFound++;
      }
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
    } catch (e) {
      console.log(`FAILED (Supabase): ${e.message}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  const done = found + notFound;
  if (done > 0 || failed > 0) {
    console.log(`\nDone. ${found} flowers with images, ${notFound} not found, ${failed} errors`);
    if (failed > 0) console.log('Re-run to retry failed entries.');
  }
}

main().catch(console.error);
