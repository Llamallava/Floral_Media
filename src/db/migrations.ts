import db from './client';

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS flowers (
    id TEXT PRIMARY KEY,
    common_name TEXT NOT NULL,
    sci_name TEXT,
    summary TEXT,
    mythology TEXT,
    history TEXT,
    color_meanings TEXT,
    source TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS garden_entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    flower_id TEXT REFERENCES flowers(id),
    photo_path TEXT NOT NULL,
    detected_color TEXT,
    confidence REAL,
    latitude REAL,
    longitude REAL,
    captured_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bouquets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT,
    meaning TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bouquet_entries (
    bouquet_id TEXT REFERENCES bouquets(id),
    garden_entry_id TEXT REFERENCES garden_entries(id),
    PRIMARY KEY (bouquet_id, garden_entry_id)
  );`,
];

export function runMigrations() {
  const result = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  for (let i = currentVersion; i < migrations.length; i++) {
    db.execSync(migrations[i]);
    db.execSync(`PRAGMA user_version = ${i + 1}`);
  }
}
