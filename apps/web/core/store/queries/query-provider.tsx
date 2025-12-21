"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createQueryClient } from "./query-client";

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
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}
