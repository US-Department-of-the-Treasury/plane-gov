import React from "react";
import { AppRailVisibilityProvider as CoreProvider } from "@/lib/app-rail";

interface AppRailVisibilityProviderProps {
  children: React.ReactNode;
}

/**
 * CE AppRailVisibilityProvider
 * Wraps core provider with isEnabled to show mode switcher
 */
export function AppRailVisibilityProvider({ children }: AppRailVisibilityProviderProps) {
  return <CoreProvider isEnabled={true}>{children}</CoreProvider>;
}
