import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAccessToken, removeAccessToken, getAuthHeaders } from "./api-helpers";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getHeaders(includeContentType: boolean = true): HeadersInit {
  return getAuthHeaders(includeContentType);
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: getHeaders(!!data),
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401) {
    removeAccessToken();
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      headers: getHeaders(false),
      credentials: "include",
    });

    if (res.status === 401) {
      removeAccessToken();
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

function shouldRetry(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message;
    // Check for HTTP status codes that shouldn't be retried
    if (message.startsWith("401:") || message.startsWith("403:") || message.startsWith("404:")) {
      return false;
    }
    // Network errors should be retried
    if (message.includes("fetch failed") || message.includes("network") || message.includes("NetworkError")) {
      return true;
    }
  }
  // Default to retrying for unknown errors (likely network issues)
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        if (!shouldRetry(error)) return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error) => {
        if (!shouldRetry(error)) return false;
        return failureCount < 2;
      },
    },
  },
});
