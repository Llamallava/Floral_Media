const fs = require('fs');
const path = require('path');

const PERENUAL_KEY = process.env.PERENUAL_KEY;
const OUTPUT_PATH = path.join(__dirname, '../assets/flower-list.txt');

if (!PERENUAL_KEY) {
  console.error('Set the PERENUAL_KEY environment variable before running.');
  process.exit(1);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getSpeciesPage(page) {
  const params = new URLSearchParams({ key: PERENUAL_KEY, page });
  const url = `https://perenual.com/api/species-list?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const allNames = new Set();

  console.log('Fetching page 1...');
  const first = await getSpeciesPage(1);

  if (!first.data) {
    console.error('Unexpected response:', JSON.stringify(first, null, 2));
    return;
  }

  const lastPage = first.last_page;
  console.log(`${first.total} total species across ${lastPage} pages`);

  for (const plant of first.data) {
    if (plant.common_name) allNames.add(plant.common_name);
  }

  for (let page = 2; page <= lastPage; page++) {
    process.stdout.write(`\rFetching page ${page}/${lastPage} (${allNames.size} names so far)...`);
    await sleep(500);
    try {
      const data = await getSpeciesPage(page);
      if (!data.data) break;
      for (const plant of data.data) {
        if (plant.common_name) allNames.add(plant.common_name);
      }
      fs.writeFileSync(OUTPUT_PATH, [...allNames].sort().join('\n'));
    } catch (err) {
      console.error(`\nFailed on page ${page}:`, err.message);
      break;
    }
  }

  console.log();
  console.log(`Done. ${allNames.size} names written to assets/flower-list.txt`);
}

main().catch(console.error);
