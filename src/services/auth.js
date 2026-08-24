import { isSupabaseConfigured, supabase } from '../lib/supabase';

async function assertStoreAdmin() {
  const { data, error } = await supabase.rpc('is_store_admin');

  if (error) throw error;

  if (!data) {
    await supabase.auth.signOut();
    throw new Error('Esta conta não tem permissões de administrador.');
  }
}

export async function getAdminSession() {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  if (!data.session) return null;

  try {
    await assertStoreAdmin();
    return data.session;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export function subscribeToAuth(callback) {
  if (!isSupabaseConfigured) return () => {};

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => data.subscription.unsubscribe();
}

export async function signInAdmin(email, password) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase ainda não está configurado.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;

  await assertStoreAdmin();

  return data.session;
}

export async function signOutAdmin() {
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
