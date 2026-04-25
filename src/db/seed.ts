import db from './client';
import flowersData from '../../assets/flowers.json';

export function seedLexicon() {
  const count = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM flowers'
  )?.count ?? 0;

  if (count > 0) return;

  db.withTransactionSync(() => {
    for (const flower of flowersData as any[]) {
      db.runSync(
        `INSERT OR IGNORE INTO flowers
         (id, common_name, sci_name, summary, mythology, history, color_meanings, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          flower.id,
          flower.common_name,
          flower.sci_name ?? null,
          flower.summary ?? null,
          flower.mythology ?? null,
          flower.history ?? null,
          flower.color_meanings ?? null,
          flower.source,
          flower.created_at,
        ]
      );
    }
  });
}
