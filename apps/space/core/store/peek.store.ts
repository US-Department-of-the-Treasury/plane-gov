"use client";

import { create } from "zustand";
import type { IPeekMode } from "@/types/issue";

interface PeekState {
  peekId: string | null;
  peekMode: IPeekMode;
  setPeekId: (id: string | null) => void;
  setPeekMode: (mode: IPeekMode) => void;
  getIsIssuePeeked: (issueId: string) => boolean;
}

export const usePeekStore = create<PeekState>((set, get) => ({
  peekId: null,
  peekMode: "side",
  setPeekId: (id) => set({ peekId: id }),
  setPeekMode: (mode) => set({ peekMode: mode }),
  getIsIssuePeeked: (issueId) => get().peekId === issueId,
}));
