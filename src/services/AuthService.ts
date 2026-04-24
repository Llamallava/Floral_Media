import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import db from '../db/client';

const SESSION_KEY = 'current_user_id';

export type User = {
  id: string;
  email: string;
  displayName: string;
};

async function hashPassword(salt: string, password: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    salt + password
  );
}

export async function register(email: string, displayName: string, password: string): Promise<User> {
  const existing = db.getFirstSync('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (existing) throw new Error('An account with this email already exists.');

  const id = Crypto.randomUUID();
  const salt = Crypto.randomUUID();
  const hash = await hashPassword(salt, password);
  const now = new Date().toISOString();

  db.runSync(
    'INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, email.toLowerCase(), displayName, `${salt}:${hash}`, now]
  );

  await SecureStore.setItemAsync(SESSION_KEY, id);
  return { id, email: email.toLowerCase(), displayName };
}

export async function login(email: string, password: string): Promise<User> {
  const user = db.getFirstSync<{
    id: string;
    email: string;
    display_name: string;
    password_hash: string;
  }>('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);

  if (!user) throw new Error('No account found with this email.');

  const [salt, storedHash] = user.password_hash.split(':');
  const attemptHash = await hashPassword(salt, password);
  if (attemptHash !== storedHash) throw new Error('Incorrect password.');

  await SecureStore.setItemAsync(SESSION_KEY, user.id);
  return { id: user.id, email: user.email, displayName: user.display_name };
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function getStoredSession(): Promise<User | null> {
  const userId = await SecureStore.getItemAsync(SESSION_KEY);
  if (!userId) return null;

  const user = db.getFirstSync<{ id: string; email: string; display_name: string }>(
    'SELECT id, email, display_name FROM users WHERE id = ?',
    [userId]
  );

  if (!user) return null;
  return { id: user.id, email: user.email, displayName: user.display_name };
}
