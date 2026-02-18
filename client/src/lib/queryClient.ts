import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { authFetch } from "./api-helpers";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const options: RequestInit = { method };
  if (data) options.body = JSON.stringify(data);

  // authFetch adds Authorization, Content-Type, credentials, and auto-refreshes on 401
  const res = await authFetch(url, options);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // authFetch adds Authorization, credentials, and auto-refreshes on 401
    const res = await authFetch(queryKey.join("/") as string);

    if (res.status === 401) {
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
    if (message.startsWith("401:") || message.startsWith("403:") || message.startsWith("404:")) {
      return false;
    }
    if (message.includes("fetch failed") || message.includes("network") || message.includes("NetworkError")) {
      return true;
    }
  }
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
