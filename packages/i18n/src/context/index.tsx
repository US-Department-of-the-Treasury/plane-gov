import React, { createContext, useEffect } from "react";
// store
import { TranslationStore, useTranslationStore } from "../store";

// eslint-disable-next-line react-refresh/only-export-components
export const TranslationContext = createContext<TranslationStore | null>(null);

interface TranslationProviderProps {
  children: React.ReactNode;
}

/**
 * Provides the translation store to the application
 * Now uses Zustand store under the hood for better performance
 */
export function TranslationProvider({ children }: TranslationProviderProps) {
  // Initialize translations on mount
  useEffect(() => {
    const state = useTranslationStore.getState();
    if (!state.isInitialized) {
      void state._initialize();
    }
  }, []);

  // Create a singleton instance for backward compatibility with the old API
  const [store] = React.useState(() => new TranslationStore());

  return <TranslationContext.Provider value={store}>{children}</TranslationContext.Provider>;
}
