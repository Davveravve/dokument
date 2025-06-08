import { supabase } from './supabase';

// Check current user
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { user: data?.session?.user || null, error };
};

// Sign in with email/password
export const signInWithEmail = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { user: data?.user || null, error };
};

// Sign up
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { user: data?.user || null, error };
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Listen for auth changes
export const onAuthStateChange = (callback) => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null, event);
  });
  
  return data.subscription.unsubscribe;
};