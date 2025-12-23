import { create } from "zustand";
import type { EditorRefApi, TEditorAsset } from "@plane/editor";

/**
 * Page Editor UI State Store
 *
 * Manages local UI state for the page editor:
 * - Editor reference for programmatic access
 * - Assets list for editor attachments
 *
 * Replaces MobX PageEditorInstance with Zustand for client-side state.
 */

export interface PageEditorState {
  // State
  editorRef: EditorRefApi | null;
  assetsList: TEditorAsset[];

  // Actions
  setEditorRef: (editorRef: EditorRefApi | null) => void;
  updateAssetsList: (assets: TEditorAsset[]) => void;
  resetEditorState: () => void;
}

export const usePageEditorStore = create<PageEditorState>((set) => ({
  // Initial state
  editorRef: null,
  assetsList: [],

  // Actions
  setEditorRef: (editorRef) => set({ editorRef }),

  updateAssetsList: (assets) => set({ assetsList: assets }),

  resetEditorState: () => set({ editorRef: null, assetsList: [] }),
}));
