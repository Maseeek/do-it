import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let lastUrl: string | null = null;
let lastKey: string | null = null;

export function isValidSupabaseUrl(url?: string): url is string {
  if (!url) return false;
  if (url.includes('xyzcompany') || url.includes('your-project-id') || url.includes('example.com')) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const url = customUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = customKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !isValidSupabaseUrl(url) || !anonKey || anonKey.includes('your-anon-public-key')) {
    return null;
  }

  // Return cached instance if credentials haven't changed
  if (cachedClient && lastUrl === url && lastKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
      },
    });
    lastUrl = url || null;
    lastKey = anonKey || null;
    return cachedClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}
