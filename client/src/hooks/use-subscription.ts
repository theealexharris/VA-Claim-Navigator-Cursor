import { useState, useEffect } from "react";

export const PROMO_ACTIVE = true;

interface SubscriptionState {
  subscriptionTier: string;
  isAdmin: boolean;
  isPaidTier: boolean;
  isPromoActive: boolean;
}

export function useSubscription(): SubscriptionState {
  const [subscriptionTier, setSubscriptionTier] = useState<string>("starter");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadSubscription = () => {
      const savedProfile = localStorage.getItem("userProfile");
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile);
          setSubscriptionTier(profile.subscriptionTier || "starter");
          setIsAdmin(profile.role === "admin");
        } catch {
          setSubscriptionTier("starter");
          setIsAdmin(false);
        }
      }
    };

    loadSubscription();

    const handleStorageChange = () => loadSubscription();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("workflowProgressUpdate", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("workflowProgressUpdate", handleStorageChange);
    };
  }, []);

  const isPaidTier = 
    import.meta.env.DEV || 
    subscriptionTier !== "starter" || 
    isAdmin || 
    PROMO_ACTIVE;

  return {
    subscriptionTier,
    isAdmin,
    isPaidTier,
    isPromoActive: PROMO_ACTIVE,
  };
}

export function activateProTier(): void {
  const savedProfile = localStorage.getItem("userProfile");
  const profile = savedProfile ? JSON.parse(savedProfile) : {};
  profile.subscriptionTier = "pro";
  localStorage.setItem("userProfile", JSON.stringify(profile));
  window.dispatchEvent(new Event("workflowProgressUpdate"));
}
