import React, { useMemo } from "react";
import { AppRailVisibilityContext } from "./context";
import type { IAppRailVisibilityContext } from "./types";

interface AppRailVisibilityProviderProps {
  children: React.ReactNode;
  isEnabled?: boolean; // Allow override, default false
}

/**
 * AppRailVisibilityProvider - manages app rail visibility state
 * Base provider that accepts isEnabled as a prop
 */
export function AppRailVisibilityProvider({ children, isEnabled = false }: AppRailVisibilityProviderProps) {
  const value: IAppRailVisibilityContext = useMemo(
    () => ({
      isEnabled,
      shouldRenderAppRail: isEnabled,
    }),
    [isEnabled]
  );

  return <AppRailVisibilityContext.Provider value={value}>{children}</AppRailVisibilityContext.Provider>;
}
