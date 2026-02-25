import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-helpers";

export type StripePriceIds = {
  pro: string | null;
  deluxe: string | null;
  business: string | null;
};

async function fetchPriceIds(): Promise<StripePriceIds> {
  const res = await fetch(apiUrl("/api/stripe/price-ids"), { credentials: "include" });
  if (!res.ok) return { pro: null, deluxe: null, business: null };
  const data = await res.json();
  return {
    pro: data.pro ?? null,
    deluxe: data.deluxe ?? null,
    business: data.business ?? null,
  };
}

/** Map tier key to price ID; only tiers with a configured price ID are valid for checkout. */
export function useStripePriceIds() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stripe-price-ids"],
    queryFn: fetchPriceIds,
    staleTime: 5 * 60 * 1000,
  });

  const priceIds: Record<string, string> = {};
  if (data) {
    if (data.pro) priceIds.pro = data.pro;
    if (data.deluxe) priceIds.deluxe = data.deluxe;
    if (data.business) priceIds.business = data.business;
  }

  const getPriceId = (tier: string) => priceIds[tier.toLowerCase()] ?? null;

  return {
    priceIds,
    getPriceId,
    isLoading,
    error,
    isConfigured: !!data && (!!data.pro || !!data.deluxe || !!data.business),
  };
}
