import { create } from "zustand";
// Store
import type { RootStore } from "@/plane-web/store/root.store";
import { BaseTimeLineStore } from "@/plane-web/store/timeline/base-timeline.store";
import type { IBaseTimelineStore } from "@/plane-web/store/timeline/base-timeline.store";
import { useTimelineStore } from "@/plane-web/store/client/timeline.store";

export interface IEpicsTimeLineStore extends IBaseTimelineStore {
  isDependencyEnabled: boolean;
}

interface EpicsTimelineState {
  rootStore: RootStore | null;
}

interface EpicsTimelineActions {
  setRootStore: (rootStore: RootStore) => void;
  updateBlocks: () => void;
}

export type EpicsTimelineStoreType = EpicsTimelineState & EpicsTimelineActions;

/**
 * Epics Timeline Store (Zustand)
 *
 * Manages timeline/Gantt chart state specific to epics.
 * Migrated from MobX to Zustand.
 *
 * Migration notes:
 * - Previously used MobX autorun to reactively update blocks when epic data changed
 * - Components should now use useEffect to call updateBlocks() when dependencies change
 * - Or use the Legacy class wrapper for backward compatibility with MobX patterns
 *
 * Usage in React components:
 * @example
 * const epicsTimeline = useEpicsTimelineStore();
 * const timeline = useTimelineStore();
 *
 * useEffect(() => {
 *   epicsTimeline.updateBlocks();
 * }, [dependencies]);
 */
export const useEpicsTimelineStore = create<EpicsTimelineStoreType>()((set, get) => ({
  rootStore: null,

  setRootStore: (rootStore) => {
    set({ rootStore });
  },

  updateBlocks: () => {
    const state = get();
    if (!state.rootStore) return;

    const getEpicById = state.rootStore.epic.getEpicById;
    const timelineStore = useTimelineStore.getState();
    timelineStore.updateBlocks(getEpicById);
  },
}));

/**
 * Legacy class wrapper for backward compatibility.
 * Used by TimeLineStore (ce/store/timeline/index.ts) to maintain API compatibility during migration.
 * @deprecated Use useEpicsTimelineStore hook directly in React components
 */
export class EpicsTimeLineStore extends BaseTimeLineStore implements IEpicsTimeLineStore {
  constructor(_rootStore: RootStore) {
    super(_rootStore);

    // Initialize Zustand store with rootStore reference
    useEpicsTimelineStore.getState().setRootStore(_rootStore);
  }
}
