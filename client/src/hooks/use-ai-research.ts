import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

export type FeatureType = 
  | "claim_builder"
  | "evidence_automation"
  | "warrior_coach"
  | "lay_statement"
  | "buddy_statement"
  | "appeals_hub"
  | "evidence_vault"
  | "tdiu_calculator"
  | "education_library";

interface AIResearchResponse {
  response: string;
}

interface ConditionGuidance {
  ratingCriteria: string;
  evidenceNeeded: string;
  commonMistakes: string;
  tips: string;
}

export function useAIResearch(feature: FeatureType) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const mutation = useMutation({
    mutationFn: async ({ query, context }: { query: string; context?: string }) => {
      const { authFetch } = await import("../lib/api-helpers");
      const res = await authFetch("/api/ai/research", {
        method: "POST",
        body: JSON.stringify({ feature, query, context }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to get AI response");
      }
      return res.json() as Promise<AIResearchResponse>;
    },
    onSuccess: (data, variables) => {
      setMessages(prev => [
        ...prev,
        { role: "user", content: variables.query },
        { role: "assistant", content: data.response },
      ]);
    },
  });

  const sendMessage = (query: string, context?: string) => {
    mutation.mutate({ query, context });
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

export function useConditionGuidance() {
  return useMutation({
    mutationFn: async (conditionName: string) => {
      const { authFetch } = await import("../lib/api-helpers");
      const res = await authFetch("/api/ai/condition-guidance", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ conditionName }),
      });
      if (!res.ok) {
        throw new Error("Failed to get condition guidance");
      }
      return res.json() as Promise<ConditionGuidance>;
    },
  });
}

export function useLayStatementGenerator() {
  return useMutation({
    mutationFn: async (data: {
      conditionName: string;
      symptoms: string[];
      dailyImpact: string;
      serviceConnection: string;
    }) => {
      const { authFetch } = await import("../lib/api-helpers");
      const res = await authFetch("/api/ai/generate-lay-statement", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to generate lay statement");
      }
      return res.json() as Promise<{ draft: string }>;
    },
  });
}

export function useBuddyStatementGenerator() {
  return useMutation({
    mutationFn: async (data: {
      conditionName: string;
      relationship: string;
      observedSymptoms: string;
    }) => {
      const { authFetch } = await import("../lib/api-helpers");
      const res = await authFetch("/api/ai/generate-buddy-statement", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error("Failed to generate buddy statement template");
      }
      return res.json() as Promise<{ template: string }>;
    },
  });
}
