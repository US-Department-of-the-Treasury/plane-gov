import { create } from "zustand";
// Plane-web
import type { RootStore } from "@/plane-web/store/root.store";
import type { IBaseTimelineStore } from "@/plane-web/store/timeline/base-timeline.store";
import { BaseTimeLineStore } from "@/plane-web/store/timeline/base-timeline.store";
import { useTimelineStore } from "@/plane-web/store/client/timeline.store";

export interface IIssuesTimeLineStore extends IBaseTimelineStore {
  isDependencyEnabled: boolean;
}

interface IssuesTimelineState {
  rootStore: RootStore | null;
}

interface IssuesTimelineActions {
  setRootStore: (rootStore: RootStore) => void;
  updateBlocks: () => void;
}

export type IssuesTimelineStoreType = IssuesTimelineState & IssuesTimelineActions;

/**
 * Issues Timeline Store (Zustand)
 *
 * Manages timeline/Gantt chart state specific to issues.
 * Migrated from MobX to Zustand.
 *
 * Migration notes:
 * - Previously used MobX autorun to reactively update blocks when issue data changed
 * - Components should now use useEffect to call updateBlocks() when dependencies change
 * - Or use the Legacy class wrapper for backward compatibility with MobX patterns
 *
 * Usage in React components:
 * @example
 * const issuesTimeline = useIssuesTimelineStore();
 * const timeline = useTimelineStore();
 *
 * useEffect(() => {
 *   issuesTimeline.updateBlocks();
 * }, [dependencies]);
 */
export const useIssuesTimelineStore = create<IssuesTimelineStoreType>()((set, get) => ({
  rootStore: null,

  setRootStore: (rootStore) => {
    set({ rootStore });
  },

  updateBlocks: () => {
    const state = get();
    if (!state.rootStore) return;

    const getIssueById = state.rootStore.issue.issues.getIssueById;
    const timelineStore = useTimelineStore.getState();
    timelineStore.updateBlocks(getIssueById);
  },
}));

/**
 * Legacy class wrapper for backward compatibility.
 * Used by TimeLineStore (ce/store/timeline/index.ts) to maintain API compatibility during migration.
 * @deprecated Use useIssuesTimelineStore hook directly in React components
 */
export class IssuesTimeLineStore extends BaseTimeLineStore implements IIssuesTimeLineStore {
  constructor(_rootStore: RootStore) {
    super(_rootStore);

    // Initialize Zustand store with rootStore reference
    useIssuesTimelineStore.getState().setRootStore(_rootStore);
  }
}
