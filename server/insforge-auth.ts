import { insforge, getAuthenticatedClient } from './insforge';
import type { Request, Response, NextFunction } from 'express';

/**
 * Insforge Auth Service
 * Replaces Passport.js with Insforge auth SDK
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

/**
 * Middleware to extract and verify Insforge session from request
 */
export async function getInsforgeSession(req: Request): Promise<InsforgeSession | null> {
  try {
    // Try to get access token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.substring(7);
      const client = getAuthenticatedClient(accessToken);
      const { data, error } = await client.auth.getCurrentSession();
      
      if (!error && data?.session) {
        return data.session as unknown as InsforgeSession;
      }
    }

    // Try to get session from cookie (if using httpOnly cookies)
    const { data, error } = await insforge.auth.getCurrentSession();
    
    if (!error && data?.session) {
      return data.session as unknown as InsforgeSession;
    }

    return null;
  } catch (error: any) {
    console.error('[AUTH] getInsforgeSession error:', error.message);
    return null;
  }
}

/**
 * Middleware to require authentication
 */
export function requireInsforgeAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await getInsforgeSession(req);
      
      if (!session) {
        return res.status(401).json({ message: 'Unauthorized' });
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
 * Register a new user with Insforge
 * Returns: { user, accessToken, requireEmailVerification }
 */
export async function registerUser(email: string, password: string, name?: string) {
  const { data, error } = await insforge.auth.signUp({
    email,
    password,
    name,
  });

  if (error) {
    console.error('[INSFORGE AUTH] signUp error:', error.message || 'Unknown');
    throw new Error(error.message || 'Failed to register user');
  }

  if (!data) {
    throw new Error('No response data from auth service');
  }

  // Return normalized response
  // Insforge returns: { user, accessToken, requireEmailVerification, redirectTo, csrfToken }
  return {
    user: data.user,
    accessToken: data.accessToken,
    requireEmailVerification: data.requireEmailVerification || false,
  };
}

/**
 * Sign in a user with Insforge
 * Returns: { user, accessToken } - normalizes SDK response (top-level or session nested)
 */
export async function signInUser(email: string, password: string) {
  console.log(`[INSFORGE AUTH] signInWithPassword called for: ${email}`);
  
  const { data, error } = await insforge.auth.signInWithPassword({
    email,
    password,
  });

  console.log(`[INSFORGE AUTH] signIn response:`, { data: !!data, error: error?.message });

  if (error) {
    console.error(`[INSFORGE AUTH] signIn error:`, JSON.stringify(error));
    // Preserve the original error code so the route handler can detect specific cases
    const err = new Error(error.message || 'Invalid credentials') as Error & { statusCode?: number; errorCode?: string };
    err.statusCode = (error as any).statusCode;
    err.errorCode = (error as any).error; // e.g. "AUTH_UNAUTHORIZED"
    throw err;
  }

  if (!data) {
    throw new Error('No response data from auth service');
  }

  // Normalize: SDK may return { user, accessToken } or { session: { user, accessToken } }
  const user = data.user ?? (data as any).session?.user;
  const accessToken = data.accessToken ?? (data as any).session?.accessToken ?? null;

  if (!user) {
    console.error('[INSFORGE AUTH] signIn: no user in response', data);
    throw new Error('Invalid login response');
  }

  return {
    user,
    accessToken: accessToken ?? undefined,
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
