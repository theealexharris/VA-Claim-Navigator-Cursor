import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister } from "../lib/api";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const user = await apiLogin(email, password);
    setUser(user);
  }

  async function register(email: string, password: string, firstName?: string, lastName?: string) {
    const user = await apiRegister(email, password, firstName, lastName);
    setUser(user);
  }

  async function logout() {
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
      "paymentComplete"
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
