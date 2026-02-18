import { insforge, getAuthenticatedClient, INSFORGE_BASE_URL, getInsforgeKey } from './insforge';
import type { Request, Response, NextFunction } from 'express';

/**
 * Insforge Auth Service
 * Uses client_type=mobile for all auth flows so refreshToken is returned explicitly
 * in the response body (web flow uses httpOnly cookies which don't survive our proxy).
 */

export interface InsforgeUser {
  id: string;
  email: string;
  emailVerified: boolean;
  profile?: {
    name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
}

export interface InsforgeSession {
  accessToken: string;
  user: InsforgeUser;
  expiresAt?: Date;
}

/** Common headers for direct Insforge REST calls (anonKey as Bearer + JSON) */
function insforgeHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = getInsforgeKey();
  if (key) headers['Authorization'] = `Bearer ${key}`;
  return headers;
}

/**
 * Validate a JWT access token against the Insforge backend via REST API.
 * The SDK's getCurrentSession() only works in browsers (relies on in-memory state
 * or cookie refresh). On the server we must call the REST endpoint directly.
 */
export async function getInsforgeSession(req: Request): Promise<InsforgeSession | null> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const accessToken = authHeader.substring(7).trim();
    if (!accessToken) return null;

    // Call Insforge REST API to validate the JWT and get the current user
    const res = await fetch(`${INSFORGE_BASE_URL}/api/auth/sessions/current`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      // Token is invalid or expired — don't log noise for routine 401s
      if (res.status !== 401) {
        console.warn(`[AUTH] Insforge session validation failed: ${res.status}`);
      }
      return null;
    }

    const data = await res.json().catch(() => null);
    if (!data?.user) return null;

    return {
      accessToken,
      user: data.user as InsforgeUser,
    };
  } catch (error: any) {
    console.error('[AUTH] getInsforgeSession error:', error.message);
    return null;
  }
}

/**
 * Middleware that optionally attaches session if present; never rejects.
 * Use for endpoints that work with or without auth (e.g. Evidence uploads, AI analysis).
 */
export function optionalInsforgeAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await getInsforgeSession(req);
      if (session) {
        (req as any).insforgeSession = session;
        (req as any).user = session.user;
      }
      next();
    } catch (error: any) {
      console.error('[AUTH] Error in optionalInsforgeAuth:', error.message);
      next();
    }
  };
}

/**
 * Middleware to require authentication
 */
export function requireInsforgeAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await getInsforgeSession(req);
      
      if (!session) {
        return res.status(401).json({ message: 'Unauthorized. Please sign in again.' });
      }

      // Attach session to request for use in route handlers
      (req as any).insforgeSession = session;
      (req as any).user = session.user;
      next();
    } catch (error: any) {
      console.error('[AUTH] Error in requireInsforgeAuth:', error.message);
      return res.status(500).json({ message: 'Authentication service error. Please try again.' });
    }
  };
}

/**
 * Register a new user with Insforge (client_type=mobile → explicit refreshToken)
 * Returns: { user, accessToken, refreshToken, requireEmailVerification }
 */
export async function registerUser(email: string, password: string, name?: string) {
  const body: Record<string, string> = { email, password };
  if (name) body.name = name;

  let res: globalThis.Response;
  try {
    res = await fetch(`${INSFORGE_BASE_URL}/api/auth/users?client_type=mobile`, {
      method: 'POST',
      headers: insforgeHeaders(),
      body: JSON.stringify(body),
    });
  } catch (networkErr: any) {
    console.error('[INSFORGE AUTH] signUp network error:', networkErr.message);
    throw new Error('Cannot reach the auth service. Check INSFORGE_API_BASE_URL.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok || !data) {
    const msg = data?.message || data?.error || 'Failed to register user';
    console.error('[INSFORGE AUTH] signUp error:', msg);
    throw new Error(msg);
  }

  return {
    user: data.user,
    accessToken: data.accessToken ?? null,
    refreshToken: data.refreshToken ?? null,
    requireEmailVerification: data.requireEmailVerification || false,
  };
}

/**
 * Sign in a user with Insforge (client_type=mobile → explicit refreshToken)
 * Returns: { user, accessToken, refreshToken }
 */
export async function signInUser(email: string, password: string) {
  console.log(`[INSFORGE AUTH] signIn called for: ${email}`);

  let res: globalThis.Response;
  try {
    res = await fetch(`${INSFORGE_BASE_URL}/api/auth/sessions?client_type=mobile`, {
      method: 'POST',
      headers: insforgeHeaders(),
      body: JSON.stringify({ email, password }),
    });
  } catch (networkErr: any) {
    console.error('[INSFORGE AUTH] signIn network error:', networkErr.message);
    const err = new Error('Cannot reach the auth service.') as Error & { statusCode?: number; errorCode?: string };
    throw err;
  }

  const data = await res.json().catch(() => null);

  console.log(`[INSFORGE AUTH] signIn response: status=${res.status}, hasData=${!!data}`);

  if (!res.ok || !data) {
    const msg = data?.message || 'Invalid credentials';
    console.error(`[INSFORGE AUTH] signIn error:`, JSON.stringify(data));
    const err = new Error(msg) as Error & { statusCode?: number; errorCode?: string };
    err.statusCode = res.status;
    err.errorCode = data?.error;
    throw err;
  }

  const user = data.user;
  if (!user) {
    console.error('[INSFORGE AUTH] signIn: no user in response', data);
    throw new Error('Invalid login response');
  }

  return {
    user,
    accessToken: data.accessToken ?? undefined,
    refreshToken: data.refreshToken ?? undefined,
  };
}

/**
 * Verify email with Insforge (client_type=mobile → explicit refreshToken)
 * Returns: { user, accessToken, refreshToken }
 */
export async function verifyEmailDirect(email: string, otp: string) {
  let res: globalThis.Response;
  try {
    res = await fetch(`${INSFORGE_BASE_URL}/api/auth/email/verify?client_type=mobile`, {
      method: 'POST',
      headers: insforgeHeaders(),
      body: JSON.stringify({ email, otp }),
    });
  } catch (networkErr: any) {
    throw new Error('Cannot reach the auth service for email verification.');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    throw new Error(data?.message || 'Invalid or expired verification code');
  }

  return {
    user: data.user,
    accessToken: data.accessToken ?? null,
    refreshToken: data.refreshToken ?? null,
  };
}

/**
 * Refresh an expired access token using a refresh token (client_type=mobile).
 * Returns: { user, accessToken, refreshToken }
 */
export async function refreshAccessToken(refreshToken: string) {
  let res: globalThis.Response;
  try {
    res = await fetch(`${INSFORGE_BASE_URL}/api/auth/refresh?client_type=mobile`, {
      method: 'POST',
      headers: insforgeHeaders(),
      body: JSON.stringify({ refreshToken }),
    });
  } catch (networkErr: any) {
    console.error('[INSFORGE AUTH] refresh network error:', networkErr.message);
    throw new Error('Cannot reach the auth service for token refresh.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok || !data) {
    const msg = data?.message || 'Token refresh failed';
    console.error('[INSFORGE AUTH] refresh error:', msg);
    throw new Error(msg);
  }

  console.log('[INSFORGE AUTH] Token refreshed successfully');
  return {
    user: data.user,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

/**
 * Sign out the current user
 */
export async function signOutUser(accessToken?: string) {
  const client = accessToken ? getAuthenticatedClient(accessToken) : insforge;
  const { error } = await client.auth.signOut();
  
  if (error) {
    throw new Error(error.message || 'Failed to sign out');
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await insforge.auth.getProfile(userId);
  
  if (error) {
    throw new Error(error.message || 'Failed to get user profile');
  }

  return data;
}

/**
 * Update user profile
 */
export async function updateUserProfile(accessToken: string, profile: Record<string, any>) {
  const client = getAuthenticatedClient(accessToken);
  const { data, error } = await client.auth.setProfile(profile);
  
  if (error) {
    throw new Error(error.message || 'Failed to update profile');
  }

  return data;
}

/**
 * Resend verification email (for unverified users who try to sign in)
 */
export async function resendVerificationEmail(email: string) {
  const { data, error } = await insforge.auth.resendVerificationEmail({ email });
  if (error) {
    throw new Error(error.message || 'Failed to send verification email');
  }
  return data;
}
