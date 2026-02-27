import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { getCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister, removeAccessToken, removeRefreshToken } from "../lib/api";
import { authFetch } from "../lib/api-helpers";
import type { User } from "@shared/schema";

const SESSION_DURATION_MS = 60 * 60 * 1000; // 60 minutes
const SESSION_WARNING_MS = 10 * 60 * 1000; // warn 10 minutes before expiry

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ user?: any; requireEmailVerification?: boolean } | void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Keys to clear for HIPAA-sensitive data (SSN, evidence, documents) */
const SENSITIVE_KEYS = [
  "claimBuilderConditions",
  "claimBuilderEvidence",
  "generatedMemorandum",
];

/** All user-specific keys (cleared on logout and session expiry) */
const ALL_USER_KEYS = [
  "userProfile", "serviceHistory", "medicalConditions",
  ...SENSITIVE_KEYS,
  "layStatements", "buddyStatements", "serviceConnectedPercentage",
  "personalInfoComplete", "serviceHistoryComplete", "medicalConditionsComplete",
  "previousClaimEnded", "showOnboarding", "selectedTier",
  "pendingDeluxePayment", "paymentComplete", "loginTimestamp"
];

/** Clear SSN from userProfile in localStorage */
function clearSSNFromStorage() {
  try {
    const raw = localStorage.getItem("userProfile");
    if (raw) {
      const profile = JSON.parse(raw);
      if (profile.ssn) {
        profile.ssn = "";
        localStorage.setItem("userProfile", JSON.stringify(profile));
      }
    }
  } catch (_) {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any existing session timer
  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  }, []);

  // Start (or restart) the 60-minute session expiry timer + 10-minute warning
  const startSessionTimer = useCallback(() => {
    clearSessionTimer();
    const loginTime = localStorage.getItem("loginTimestamp");
    if (!loginTime) return;
    const elapsed = Date.now() - parseInt(loginTime, 10);
    const remaining = SESSION_DURATION_MS - elapsed;

    if (remaining <= 0) {
      // Already expired
      handleSessionExpired();
      return;
    }

    // Set the 10-minute warning timer
    const warningAt = remaining - SESSION_WARNING_MS;
    if (warningAt > 0) {
      warningTimerRef.current = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("sessionWarning"));
      }, warningAt);
    }

    sessionTimerRef.current = setTimeout(() => {
      handleSessionExpired();
    }, remaining);
  }, [clearSessionTimer]);

  function handleSessionExpired() {
    removeAccessToken();
    removeRefreshToken();
    setUser(null);
    // Clear ALL user data including sensitive SSN and evidence (HIPAA)
    ALL_USER_KEYS.forEach(key => localStorage.removeItem(key));
    clearSSNFromStorage();

    window.dispatchEvent(new CustomEvent("sessionExpired"));
  }

  // When a 401 occurs (e.g. from analysis/upload) after refresh has already failed, clear session
  useEffect(() => {
    const onAuthRequired = () => {
      clearSessionTimer();
      removeAccessToken();
      removeRefreshToken();
      setUser(null);
      window.dispatchEvent(new CustomEvent("sessionExpired", { detail: { soft: true } }));
    };
    window.addEventListener("authRequired", onAuthRequired);
    return () => window.removeEventListener("authRequired", onAuthRequired);
  }, [clearSessionTimer]);

  // Clear sensitive data on browser/tab close (HIPAA protection)
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearSSNFromStorage();
      SENSITIVE_KEYS.forEach(key => localStorage.removeItem(key));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    checkAuth();
    return () => clearSessionTimer();
  }, [clearSessionTimer]);

  // Sync API user to localStorage so subscriptionTier (Pro/Deluxe) and profile are available for Dashboard and Claim Builder
  function syncUserProfileToStorage(apiUser: User) {
    if (!apiUser || typeof apiUser !== "object" || !apiUser.id) return;
    try {
      const existing = localStorage.getItem("userProfile");
      const merged = existing ? { ...JSON.parse(existing), ...apiUser } : { ...apiUser };
      localStorage.setItem("userProfile", JSON.stringify(merged));
      window.dispatchEvent(new Event("workflowProgressUpdate"));
    } catch (_) {}
  }

  async function checkAuth() {
    try {
      // getCurrentUser() uses authFetch which auto-refreshes expired JWT
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      syncUserProfileToStorage(currentUser);
      // If user is already logged in, start/resume the session timer
      startSessionTimer();
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const result = await apiLogin(email, password);
    // api.login returns the user object directly (or throws)
    const loggedInUser = result && typeof result === "object" ? (result.user ?? result) : null;
    if (loggedInUser && typeof loggedInUser === "object") {
      setUser(loggedInUser);
      syncUserProfileToStorage(loggedInUser);
      // loginTimestamp is set in api.ts login(); start the 60-minute timer
      startSessionTimer();
    } else {
      throw new Error("Invalid login response. Please try again.");
    }
  }

  async function register(email: string, password: string, firstName?: string, lastName?: string) {
    const result = await apiRegister(email, password, firstName, lastName);
    // If verification is required, return the flag but do NOT set user
    if (result?.requireEmailVerification) {
      return { requireEmailVerification: true };
    }
    // Otherwise we got a real user back – set it in state and sync to localStorage (Pro/Deluxe tier, etc.)
    const userData = result && typeof result === "object" && result.id ? result : null;
    if (userData) {
      setUser(userData);
      syncUserProfileToStorage(userData as User);
      // loginTimestamp is set in api.ts register(); start the 60-minute timer
      startSessionTimer();
    }
    return result;
  }

  async function logout() {
    clearSessionTimer();

    // Clear SSN from server database (HIPAA)
    try {
      await authFetch("/api/users/profile", {
        method: "PATCH",
        body: JSON.stringify({ ssn: "" }),
      });
    } catch (_) { /* best-effort */ }

    await apiLogout();
    setUser(null);

    // Clear all user-specific data on logout to prevent data leakage (HIPAA)
    ALL_USER_KEYS.forEach(key => localStorage.removeItem(key));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
