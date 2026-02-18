import { createClient } from '@insforge/sdk';

// Insforge backend URL — use env or default to current project (https://2ri79ay3.us-west.insforge.app)
export const INSFORGE_BASE_URL = (process.env.INSFORGE_API_BASE_URL || 'https://2ri79ay3.us-west.insforge.app').trim();
// Anon/API key from .env — required for auth and AI (SDK sends it as Authorization: Bearer <key>)
export function getInsforgeKey(): string {
  const key = (process.env.INSFORGE_ANON_KEY || process.env.INSFORGE_API_KEY || '').trim();
  return key;
}
const anonKeyForClient = getInsforgeKey();

if (!anonKeyForClient && process.env.NODE_ENV === 'production') {
  throw new Error('INSFORGE_ANON_KEY must be set in environment (get it from your Insforge project dashboard).');
}
if (!anonKeyForClient && process.env.NODE_ENV !== 'production') {
  console.warn('[INSFORGE] INSFORGE_ANON_KEY not set. Set it in .env for auth and AI (e.g. Intelligent Claim Builder analysis).');
}

/** True if anon/API key is set and not a placeholder (so AI/auth can be used). */
export function isInsforgeAnonKeyConfigured(): boolean {
  const key = getInsforgeKey();
  return key.length > 10 && !/your.*anon|placeholder|xxx|example/i.test(key);
}

// Insforge client configuration (key sent as Bearer token to backend)
export const insforge = createClient({
  baseUrl: INSFORGE_BASE_URL,
  anonKey: anonKeyForClient,
});

// Helper to get authenticated client with user's access token (SDK uses edgeFunctionToken for this)
export function getAuthenticatedClient(accessToken: string) {
  const token = (accessToken || '').trim();
  return createClient({
    baseUrl: INSFORGE_BASE_URL,
    anonKey: anonKeyForClient,
    ...(token ? { edgeFunctionToken: token } : {}),
  });
}
