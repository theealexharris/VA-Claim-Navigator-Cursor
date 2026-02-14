import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import { getCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister, removeAccessToken } from "../lib/api";
import type { User } from "@shared/schema";

const SESSION_DURATION_MS = 60 * 60 * 1000; // 60 minutes

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ user?: any; requireEmailVerification?: boolean } | void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any existing session timer
  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  // Start (or restart) the 60-minute session expiry timer
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

    sessionTimerRef.current = setTimeout(() => {
      handleSessionExpired();
    }, remaining);
  }, [clearSessionTimer]);

  function handleSessionExpired() {
    removeAccessToken();
    setUser(null);
    // Clear user data but preserve claim builder and evidence so re-login restores Evidence for Claims and AI can re-analyze
    const keysToRemove = [
      "userProfile", "serviceHistory", "medicalConditions",
      "layStatements", "buddyStatements", "serviceConnectedPercentage",
      "personalInfoComplete", "serviceHistoryComplete", "medicalConditionsComplete",
      "previousClaimEnded", "showOnboarding", "selectedTier",
      "pendingDeluxePayment", "paymentComplete", "loginTimestamp"
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    // Keep claimBuilderConditions, claimBuilderEvidence, generatedMemorandum so uploads and claim progress persist

    window.dispatchEvent(new CustomEvent("sessionExpired"));
  }

  // When a 401 occurs (e.g. from analysis/upload), clear session but preserve claim builder data so re-login restores evidence
  useEffect(() => {
    const onAuthRequired = () => {
      clearSessionTimer();
      removeAccessToken();
      setUser(null);
      // Do NOT clear claimBuilderEvidence, claimBuilderConditions, generatedMemorandum so Evidence for Claims and claim stay intact
      window.dispatchEvent(new CustomEvent("sessionExpired", { detail: { soft: true } }));
    };
    window.addEventListener("authRequired", onAuthRequired);
    return () => window.removeEventListener("authRequired", onAuthRequired);
  }, [clearSessionTimer]);

  useEffect(() => {
    checkAuth();
    return () => clearSessionTimer();
  }, [clearSessionTimer]);

  async function checkAuth() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
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
    // Otherwise we got a real user back – set it in state
    const userData = result && typeof result === "object" && result.id ? result : null;
    if (userData) {
      setUser(userData);
      // loginTimestamp is set in api.ts register(); start the 60-minute timer
      startSessionTimer();
    }
    return result;
  }

  async function logout() {
    clearSessionTimer();
    await apiLogout();
    setUser(null);
    
    // Clear all user-specific data on logout to prevent data leakage
    const keysToRemove = [
      "userProfile",
      "serviceHistory",
      "medicalConditions", 
      "claimBuilderConditions",
      "claimBuilderEvidence",
      "generatedMemorandum",
      "layStatements",
      "buddyStatements",
      "serviceConnectedPercentage",
      "personalInfoComplete",
      "serviceHistoryComplete",
      "medicalConditionsComplete",
      "previousClaimEnded",
      "showOnboarding",
      "selectedTier",
      "pendingDeluxePayment",
      "paymentComplete",
      "loginTimestamp"
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
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
