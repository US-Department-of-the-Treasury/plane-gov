"use client";

import { lazy, Suspense, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "./query-client";

// Lazy load DevTools to reduce initial bundle size
// Using React.lazy instead of next/dynamic for Vite compatibility
const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((mod) => ({ default: mod.ReactQueryDevtools }))
);

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * QueryProvider wraps the application with TanStack Query's QueryClientProvider.
 *
 * This enables:
 * - Server state management (API data caching, refetching)
 * - Automatic request deduplication
 * - Optimistic updates
 * - Background refetching
 *
 * DevTools are included in development mode only.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient once per component lifecycle
  // Using useState ensures the client isn't recreated on re-renders
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
