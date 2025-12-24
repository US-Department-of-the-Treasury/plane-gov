/* eslint-disable react-refresh/only-export-components */
"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

const AnchorContext = createContext<string | null>(null);

interface AnchorProviderProps {
  anchor: string;
  children: ReactNode;
}

export function AnchorProvider({ anchor, children }: AnchorProviderProps) {
  return <AnchorContext.Provider value={anchor}>{children}</AnchorContext.Provider>;
}

export function useAnchor(): string {
  const anchor = useContext(AnchorContext);
  if (anchor === null) {
    throw new Error("useAnchor must be used within an AnchorProvider");
  }
  return anchor;
}
