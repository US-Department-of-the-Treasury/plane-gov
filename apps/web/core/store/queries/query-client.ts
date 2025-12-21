import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query client configuration
 *
 * This is the foundation for server state management, replacing MobX for API data.
 * Used alongside Zustand for client state.
 *
 * Key decisions (per migration plan):
 * - staleTime: 60s - data considered fresh for 1 minute
 * - gcTime: 10 minutes - unused data kept in cache for 10 minutes
 * - retry: 2 - retry failed requests twice
 * - refetchOnWindowFocus: false - don't refetch when tab regains focus (explicit user action preferred)
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: 2,
        refetchOnWindowFocus: false,
        // Prevent refetch on mount if data is fresh
        refetchOnMount: false,
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
      },
    },
  });
}

// Singleton for use in SSR/client
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a new QueryClient
    return createQueryClient();
  }
  // Browser: reuse same QueryClient
  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }
  return browserQueryClient;
}
