import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane imports
import type { EditorRefApi, TEditorAsset } from "@plane/editor";

export type TPageEditorInstance = {
  // observables
  assetsList: TEditorAsset[];
  editorRef: EditorRefApi | null;
  // actions
  setEditorRef: (editorRef: EditorRefApi | null) => void;
  updateAssetsList: (assets: TEditorAsset[]) => void;
};

// Zustand Store
interface PageEditorState {
  editorRef: EditorRefApi | null;
  assetsList: TEditorAsset[];
}

interface PageEditorActions {
  setEditorRef: (editorRef: EditorRefApi | null) => void;
  updateAssetsList: (assets: TEditorAsset[]) => void;
}

type PageEditorStoreType = PageEditorState & PageEditorActions;

const createPageEditorStore = () =>
  create<PageEditorStoreType>()(
    immer((set) => ({
      // State
      editorRef: null,
      assetsList: [],

      // Actions
      setEditorRef: (editorRef) => {
        set((state) => {
          state.editorRef = editorRef;
        });
      },

      updateAssetsList: (assets) => {
        set((state) => {
          state.assetsList = assets;
        });
      },
    }))
  );

// Legacy class wrapper for backward compatibility
export class PageEditorInstance implements TPageEditorInstance {
  private store: ReturnType<typeof createPageEditorStore>;

  constructor() {
    this.store = createPageEditorStore();
  }

  get editorRef() {
    return this.store.getState().editorRef;
  }

  get assetsList() {
    return this.store.getState().assetsList;
  }

  setEditorRef = (editorRef: EditorRefApi | null) => {
    this.store.getState().setEditorRef(editorRef);
  };

  updateAssetsList = (assets: TEditorAsset[]) => {
    this.store.getState().updateAssetsList(assets);
  };
}
