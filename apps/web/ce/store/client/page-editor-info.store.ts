import { create } from "zustand";
// plane imports
import type { EditorRefApi, TEditorAsset } from "@plane/editor";

/**
 * State interface for Page Editor Info Store
 */
interface PageEditorInfoStoreState {
  editorRef: EditorRefApi | null;
  assetsList: TEditorAsset[];
}

/**
 * Actions interface for Page Editor Info Store
 */
interface PageEditorInfoStoreActions {
  setEditorRef: (editorRef: EditorRefApi | null) => void;
  updateAssetsList: (assets: TEditorAsset[]) => void;
}

/**
 * Combined type export for Page Editor Info Store
 */
export type PageEditorInfoStore = PageEditorInfoStoreState & PageEditorInfoStoreActions;

/**
 * Initial state constant
 */
const initialState: PageEditorInfoStoreState = {
  editorRef: null,
  assetsList: [],
};

/**
 * Page Editor Info Store (Zustand)
 *
 * Manages editor instance state including editor reference and assets list.
 * Migrated from MobX PageEditorInstance to Zustand.
 *
 * Migration notes:
 * - Previously used MobX observables and actions
 * - Now uses Zustand's create() with immutable state updates
 * - setEditorRef: Sets the editor reference
 * - updateAssetsList: Updates the list of editor assets
 */
export const usePageEditorInfoStore = create<PageEditorInfoStore>()((set) => ({
  ...initialState,

  setEditorRef: (editorRef) => {
    set({ editorRef });
  },

  updateAssetsList: (assets) => {
    set({ assetsList: assets });
  },
}));

/**
 * Legacy interface matching original MobX interface
 * @deprecated Use usePageEditorInfoStore directly
 */
export interface IPageEditorInfo {
  // observables
  editorRef: EditorRefApi | null;
  assetsList: TEditorAsset[];
  // actions
  setEditorRef: (editorRef: EditorRefApi | null) => void;
  updateAssetsList: (assets: TEditorAsset[]) => void;
}

/**
 * Legacy class wrapper for backward compatibility
 * Delegates to usePageEditorInfoStore.getState()
 *
 * @deprecated Use usePageEditorInfoStore hook directly in components
 */
export class PageEditorInfoStoreLegacy implements IPageEditorInfo {
  constructor() {
    // No-op constructor for backward compatibility
  }

  get editorRef(): EditorRefApi | null {
    return usePageEditorInfoStore.getState().editorRef;
  }

  get assetsList(): TEditorAsset[] {
    return usePageEditorInfoStore.getState().assetsList;
  }

  setEditorRef = (editorRef: EditorRefApi | null): void => {
    usePageEditorInfoStore.getState().setEditorRef(editorRef);
  };

  updateAssetsList = (assets: TEditorAsset[]): void => {
    usePageEditorInfoStore.getState().updateAssetsList(assets);
  };
}

/**
 * Legacy type alias for backward compatibility
 * @deprecated Use PageEditorInfoStore instead
 */
export type TPageEditorInstance = IPageEditorInfo;

/**
 * Legacy class export for backward compatibility
 * @deprecated Use usePageEditorInfoStore hook or PageEditorInfoStoreLegacy
 */
export const PageEditorInstance = PageEditorInfoStoreLegacy;
