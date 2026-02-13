import { createClient } from '@insforge/sdk';

const INSFORGE_BASE_URL = process.env.INSFORGE_API_BASE_URL || 'https://2ri79ay3.us-west.insforge.app';
// Never use a hardcoded fallback in production; require INSFORGE_ANON_KEY from env/secrets
const INSFORGE_ANON_KEY = process.env.INSFORGE_ANON_KEY;
if (!INSFORGE_ANON_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('INSFORGE_ANON_KEY must be set in environment (e.g. Supabase/Insforge Edge Function Secrets).');
}
if (!INSFORGE_ANON_KEY && process.env.NODE_ENV !== 'production') {
  console.warn('[INSFORGE] INSFORGE_ANON_KEY not set. Set it in .env for auth and data to work.');
}
const anonKeyForClient = INSFORGE_ANON_KEY || '';

// Insforge client configuration
export const insforge = createClient({
  baseUrl: INSFORGE_BASE_URL,
  anonKey: anonKeyForClient,
});

// Helper to get authenticated client with user's access token (SDK accepts accessToken at runtime)
export function getAuthenticatedClient(accessToken: string) {
  return createClient({
    baseUrl: INSFORGE_BASE_URL,
    anonKey: anonKeyForClient,
    accessToken,
  } as Parameters<typeof createClient>[0]);
}
