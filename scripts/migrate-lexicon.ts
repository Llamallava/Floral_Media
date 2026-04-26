import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const env: Record<string, string> = {};
for (const line of readFileSync(join(__dirname, '../.env'), 'utf-8').split('\n')) {
  const eq = line.indexOf('=');
  if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
}

const supabase = createClient(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const flowers = JSON.parse(
  readFileSync(join(__dirname, '../assets/flowers.json'), 'utf-8')
);

const rows = flowers.map((f: any) => ({
  ...f,
  color_meanings: f.color_meanings ? JSON.parse(f.color_meanings) : null,
}));

async function migrate() {
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from('flowers').upsert(batch);
    if (error) { console.error('Failed at batch', i, error); process.exit(1); }
    console.log(`${Math.min(i + BATCH, rows.length)} / ${rows.length} inserted`);
  }
  console.log('Done.');
}

migrate();
