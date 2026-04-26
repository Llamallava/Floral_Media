import { supabase } from '../db/supabaseClient';

export type User = {
  id: string;
  email: string;
  displayName: string;
};

export async function register(email: string, displayName: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Registration failed.');
  return { id: data.user.id, email: data.user.email!, displayName };
}

export async function login(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Login failed.');
  return {
    id: data.user.id,
    email: data.user.email!,
    displayName: data.user.user_metadata?.display_name ?? '',
  };
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getStoredSession(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return {
    id: user.id,
    email: user.email!,
    displayName: user.user_metadata?.display_name ?? '',
  };
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    const u = session?.user;
    callback(u ? { id: u.id, email: u.email!, displayName: u.user_metadata?.display_name ?? '' } : null);
  });
  return () => subscription.unsubscribe();
}
