import { create } from "zustand";
import { differenceWith, isEqual } from "lodash-es";
import type { TEntityDetails } from "@/hooks/use-multiple-select";

interface MultipleSelectState {
  // State
  selectedEntityDetails: TEntityDetails[];
  lastSelectedEntityDetails: TEntityDetails | null;
  previousActiveEntity: TEntityDetails | null;
  nextActiveEntity: TEntityDetails | null;
  activeEntityDetails: TEntityDetails | null;
}

interface MultipleSelectActions {
  // Computed getters
  isSelectionActive: () => boolean;
  selectedEntityIds: () => string[];
  // Helper actions
  getIsEntitySelected: (entityID: string) => boolean;
  getIsEntityActive: (entityID: string) => boolean;
  getLastSelectedEntityDetails: () => TEntityDetails | null;
  getPreviousActiveEntity: () => TEntityDetails | null;
  getNextActiveEntity: () => TEntityDetails | null;
  getActiveEntityDetails: () => TEntityDetails | null;
  getEntityDetailsFromEntityID: (entityID: string) => TEntityDetails | null;
  // Entity actions
  updateSelectedEntityDetails: (entityDetails: TEntityDetails, action: "add" | "remove") => void;
  bulkUpdateSelectedEntityDetails: (entitiesList: TEntityDetails[], action: "add" | "remove") => void;
  updateLastSelectedEntityDetails: (entityDetails: TEntityDetails | null) => void;
  updatePreviousActiveEntity: (entityDetails: TEntityDetails | null) => void;
  updateNextActiveEntity: (entityDetails: TEntityDetails | null) => void;
  updateActiveEntityDetails: (entityDetails: TEntityDetails | null) => void;
  clearSelection: () => void;
}

export type MultipleSelectStore = MultipleSelectState & MultipleSelectActions;

// Legacy interface for backward compatibility with MobX store
export interface IMultipleSelectStore {
  isSelectionActive: boolean;
  selectedEntityIds: string[];
  getIsEntitySelected: (entityID: string) => boolean;
  getIsEntityActive: (entityID: string) => boolean;
  getLastSelectedEntityDetails: () => TEntityDetails | null;
  getPreviousActiveEntity: () => TEntityDetails | null;
  getNextActiveEntity: () => TEntityDetails | null;
  getActiveEntityDetails: () => TEntityDetails | null;
  getEntityDetailsFromEntityID: (entityID: string) => TEntityDetails | null;
  updateSelectedEntityDetails: (entityDetails: TEntityDetails, action: "add" | "remove") => void;
  bulkUpdateSelectedEntityDetails: (entitiesList: TEntityDetails[], action: "add" | "remove") => void;
  updateLastSelectedEntityDetails: (entityDetails: TEntityDetails | null) => void;
  updatePreviousActiveEntity: (entityDetails: TEntityDetails | null) => void;
  updateNextActiveEntity: (entityDetails: TEntityDetails | null) => void;
  updateActiveEntityDetails: (entityDetails: TEntityDetails | null) => void;
  clearSelection: () => void;
}

const initialState: MultipleSelectState = {
  selectedEntityDetails: [],
  lastSelectedEntityDetails: null,
  previousActiveEntity: null,
  nextActiveEntity: null,
  activeEntityDetails: null,
};

export const useMultipleSelectStore = create<MultipleSelectStore>()((set, get) => ({
  ...initialState,

  // Computed getters
  isSelectionActive: () => get().selectedEntityDetails.length > 0,

  selectedEntityIds: () => get().selectedEntityDetails.map((en) => en.entityID),

  // Helper actions
  getIsEntitySelected: (entityID: string) =>
    get().selectedEntityDetails.some((en) => en.entityID === entityID),

  getIsEntityActive: (entityID: string) =>
    get().activeEntityDetails?.entityID === entityID,

  getLastSelectedEntityDetails: () => get().lastSelectedEntityDetails,

  getPreviousActiveEntity: () => get().previousActiveEntity,

  getNextActiveEntity: () => get().nextActiveEntity,

  getActiveEntityDetails: () => get().activeEntityDetails,

  getEntityDetailsFromEntityID: (entityID: string) =>
    get().selectedEntityDetails.find((en) => en.entityID === entityID) ?? null,

  // Entity actions
  updateSelectedEntityDetails: (entityDetails, action) => {
    if (action === "add") {
      set((state) => {
        // Remove if already exists, then add at end
        const filtered = state.selectedEntityDetails.filter(
          (en) => en.entityID !== entityDetails.entityID
        );
        return {
          selectedEntityDetails: [...filtered, entityDetails],
          lastSelectedEntityDetails: entityDetails,
        };
      });
    } else {
      set((state) => {
        const newSelection = state.selectedEntityDetails.filter(
          (en) => en.entityID !== entityDetails.entityID
        );
        return {
          selectedEntityDetails: newSelection,
          lastSelectedEntityDetails: newSelection[newSelection.length - 1] ?? null,
        };
      });
    }
  },

  bulkUpdateSelectedEntityDetails: (entitiesList, action) => {
    if (action === "add") {
      set((state) => {
        // Remove duplicates and add new entities
        const existingWithoutNew = differenceWith(
          state.selectedEntityDetails,
          entitiesList,
          isEqual
        );
        const newEntities = [...existingWithoutNew, ...entitiesList];
        return {
          selectedEntityDetails: newEntities,
          lastSelectedEntityDetails:
            entitiesList.length > 0
              ? entitiesList[entitiesList.length - 1]
              : state.lastSelectedEntityDetails,
        };
      });
    } else {
      set((state) => ({
        selectedEntityDetails: differenceWith(
          state.selectedEntityDetails,
          entitiesList,
          (obj1, obj2) => isEqual(obj1.entityID, obj2.entityID)
        ),
      }));
    }
  },

  updateLastSelectedEntityDetails: (entityDetails) =>
    set({ lastSelectedEntityDetails: entityDetails }),

  updatePreviousActiveEntity: (entityDetails) =>
    set({ previousActiveEntity: entityDetails }),

  updateNextActiveEntity: (entityDetails) =>
    set({ nextActiveEntity: entityDetails }),

  updateActiveEntityDetails: (entityDetails) =>
    set({ activeEntityDetails: entityDetails }),

  clearSelection: () => set(initialState),
}));

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use useMultipleSelectStore hook directly in React components
 */
export class MultipleSelectStoreLegacy implements IMultipleSelectStore {
  get isSelectionActive() {
    return useMultipleSelectStore.getState().isSelectionActive();
  }

  get selectedEntityIds() {
    return useMultipleSelectStore.getState().selectedEntityIds();
  }

  getIsEntitySelected = (entityID: string) =>
    useMultipleSelectStore.getState().getIsEntitySelected(entityID);

  getIsEntityActive = (entityID: string) =>
    useMultipleSelectStore.getState().getIsEntityActive(entityID);

  getLastSelectedEntityDetails = () =>
    useMultipleSelectStore.getState().getLastSelectedEntityDetails();

  getPreviousActiveEntity = () =>
    useMultipleSelectStore.getState().getPreviousActiveEntity();

  getNextActiveEntity = () =>
    useMultipleSelectStore.getState().getNextActiveEntity();

  getActiveEntityDetails = () =>
    useMultipleSelectStore.getState().getActiveEntityDetails();

  getEntityDetailsFromEntityID = (entityID: string) =>
    useMultipleSelectStore.getState().getEntityDetailsFromEntityID(entityID);

  updateSelectedEntityDetails = (entityDetails: TEntityDetails, action: "add" | "remove") =>
    useMultipleSelectStore.getState().updateSelectedEntityDetails(entityDetails, action);

  bulkUpdateSelectedEntityDetails = (entitiesList: TEntityDetails[], action: "add" | "remove") =>
    useMultipleSelectStore.getState().bulkUpdateSelectedEntityDetails(entitiesList, action);

  updateLastSelectedEntityDetails = (entityDetails: TEntityDetails | null) =>
    useMultipleSelectStore.getState().updateLastSelectedEntityDetails(entityDetails);

  updatePreviousActiveEntity = (entityDetails: TEntityDetails | null) =>
    useMultipleSelectStore.getState().updatePreviousActiveEntity(entityDetails);

  updateNextActiveEntity = (entityDetails: TEntityDetails | null) =>
    useMultipleSelectStore.getState().updateNextActiveEntity(entityDetails);

  updateActiveEntityDetails = (entityDetails: TEntityDetails | null) =>
    useMultipleSelectStore.getState().updateActiveEntityDetails(entityDetails);

  clearSelection = () =>
    useMultipleSelectStore.getState().clearSelection();
}
