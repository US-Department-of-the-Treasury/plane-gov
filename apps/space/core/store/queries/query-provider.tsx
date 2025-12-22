"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "./query-client";

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * QueryProvider wraps the Space app with TanStack Query's QueryClientProvider.
 *
 * This enables:
 * - Server state management (API data caching, refetching)
 * - Automatic request deduplication
 * - Optimistic updates
 * - Background refetching
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient once per component lifecycle
  // Using useState ensures the client isn't recreated on re-renders
  const [queryClient] = useState(() => createQueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
