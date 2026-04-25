import { randomUUID } from 'expo-crypto';
import db from '../db/client';
import type { Flower, FlowerRepository } from './FlowerRepository';

export class SqliteFlowerRepository implements FlowerRepository {
  getAll(): Flower[] {
    return db.getAllSync<Flower>(
      'SELECT * FROM flowers ORDER BY common_name ASC'
    );
  }

  getById(id: string): Flower | null {
    return db.getFirstSync<Flower>(
      'SELECT * FROM flowers WHERE id = ?', [id]
    ) ?? null;
  }

  search(query: string): Flower[] {
    const like = `%${query}%`;
    return db.getAllSync<Flower>(
      `SELECT * FROM flowers
       WHERE common_name LIKE ? OR sci_name LIKE ?
       ORDER BY common_name ASC`,
      [like, like]
    );
  }

  save(flower: Omit<Flower, 'id' | 'created_at'>): Flower {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    db.runSync(
      `INSERT OR REPLACE INTO flowers
       (id, common_name, sci_name, summary, mythology, history, color_meanings, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, flower.common_name, flower.sci_name, flower.summary,
       flower.mythology, flower.history, flower.color_meanings,
       flower.source, created_at]
    );
    return { ...flower, id, created_at };
  }
}

export const flowerRepository = new SqliteFlowerRepository();
