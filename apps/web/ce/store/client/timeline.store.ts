import { create } from "zustand";
import { isEqual, set as lodashSet } from "lodash-es";
import type {
  ChartDataType,
  IBlockUpdateDependencyData,
  IGanttBlock,
  TGanttViews,
  EGanttBlockType,
} from "@plane/types";
import { renderFormattedPayloadDate } from "@plane/utils";
import { currentViewDataWithView } from "@/components/gantt-chart/data";
import {
  getDateFromPositionOnGantt,
  getItemPositionWidth,
  getPositionFromDate,
} from "@/components/gantt-chart/views/helpers";

// types
type BlockData = {
  id: string;
  name: string;
  sort_order: number | null;
  start_date?: string | undefined | null;
  target_date?: string | undefined | null;
  project_id?: string | undefined | null;
};

interface TimelineState {
  // View state
  currentView: TGanttViews;
  currentViewData: ChartDataType | undefined;
  renderView: any;

  // Block state
  blocksMap: Record<string, IGanttBlock>;
  blockIds: string[] | undefined;
  activeBlockId: string | null;

  // Interaction state
  isDragging: boolean;
  isDependencyEnabled: boolean;
}

interface TimelineActions {
  // View actions
  updateCurrentView: (view: TGanttViews) => void;
  updateCurrentViewData: (data: ChartDataType | undefined) => void;
  updateRenderView: (data: any) => void;

  // Block actions
  setBlockIds: (ids: string[]) => void;
  updateActiveBlockId: (blockId: string | null) => void;
  updateBlocks: (
    getDataById: (id: string) => BlockData | undefined | null,
    type?: EGanttBlockType,
    index?: number
  ) => void;
  updateBlockPosition: (id: string, deltaLeft: number, deltaWidth: number) => void;
  updateAllBlocksOnChartChangeWhileDragging: (addedWidth: number) => void;

  // Interaction actions
  setIsDragging: (isDragging: boolean) => void;

  // Initialization
  initGantt: () => void;

  // Helper methods
  getBlockById: (blockId: string) => IGanttBlock | undefined;
  isBlockActive: (blockId: string) => boolean;
  getIsCurrentDependencyDragging: (blockId: string) => boolean;
  getUpdatedPositionAfterDrag: (
    id: string,
    shouldUpdateHalfBlock: boolean,
    ignoreDependencies?: boolean
  ) => IBlockUpdateDependencyData[];
  getNumberOfDaysFromPosition: (position: number | undefined) => number | undefined;
  getDateFromPositionOnGantt: (position: number, offsetDays: number) => Date | undefined;
  getPositionFromDateOnGantt: (date: string | Date, offSetWidth: number) => number | undefined;
}

export type TimelineStore = TimelineState & TimelineActions;

const initialState: TimelineState = {
  blocksMap: {},
  blockIds: undefined,
  isDragging: false,
  currentView: "week",
  currentViewData: undefined,
  activeBlockId: null,
  renderView: [],
  isDependencyEnabled: false,
};

/**
 * Timeline Store (Gantt Chart UI State)
 *
 * Manages the UI state for Gantt chart/timeline views.
 * Migrated from MobX BaseTimeLineStore to Zustand.
 *
 * Migration notes:
 * - Previously used MobX observables and actions
 * - autorun reactions (IssuesTimeLineStore, EpicsTimeLineStore) should be replaced
 *   with useEffect in components that use this store
 */
export const useTimelineStore = create<TimelineStore>()((set, get) => ({
  ...initialState,

  // View actions
  updateCurrentView: (view) => {
    set({ currentView: view });
  },

  updateCurrentViewData: (data) => {
    set({ currentViewData: data });
  },

  updateRenderView: (data) => {
    set({ renderView: data });
  },

  // Block actions
  setBlockIds: (ids) => {
    set({ blockIds: ids });
  },

  updateActiveBlockId: (blockId) => {
    set({ activeBlockId: blockId });
  },

  updateBlocks: (getDataById, type, index) => {
    const state = get();
    if (!state.blockIds || !Array.isArray(state.blockIds) || state.isDragging) return;

    const updatedBlocksMap = { ...state.blocksMap };
    let hasChanges = false;

    // Loop through blockIds to generate blocks Data
    for (const blockId of state.blockIds) {
      const blockData = getDataById(blockId);
      if (!blockData) continue;

      const block: IGanttBlock = {
        data: blockData,
        id: blockData?.id,
        name: blockData.name,
        sort_order: blockData?.sort_order ?? undefined,
        start_date: blockData?.start_date ?? undefined,
        target_date: blockData?.target_date ?? undefined,
        meta: {
          type,
          index,
          project_id: blockData?.project_id,
        },
      };

      if (state.currentViewData && (state.currentViewData?.data?.startDate || state.currentViewData?.data?.dayWidth)) {
        block.position = getItemPositionWidth(state.currentViewData, block);
      }

      // Update or add block
      if (updatedBlocksMap[blockId]) {
        // Check if any properties changed
        for (const key of Object.keys(block)) {
          const currValue = updatedBlocksMap[blockId][key as keyof IGanttBlock];
          const nextValue = block[key as keyof IGanttBlock];
          if (!isEqual(currValue, nextValue)) {
            updatedBlocksMap[blockId] = {
              ...updatedBlocksMap[blockId],
              [key]: nextValue,
            };
            hasChanges = true;
          }
        }
      } else {
        updatedBlocksMap[blockId] = block;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      set({ blocksMap: updatedBlocksMap });
    }
  },

  updateBlockPosition: (id, deltaLeft, deltaWidth) => {
    const state = get();
    const currBlock = state.blocksMap[id];

    if (!currBlock?.position) return;

    const newMarginLeft = currBlock.position.marginLeft + deltaLeft;
    const newWidth = currBlock.position.width + deltaWidth;

    set({
      blocksMap: {
        ...state.blocksMap,
        [id]: {
          ...currBlock,
          position: {
            marginLeft: newMarginLeft ?? currBlock.position?.marginLeft,
            width: newWidth ?? currBlock.position?.width,
          },
        },
      },
    });
  },

  updateAllBlocksOnChartChangeWhileDragging: (addedWidth) => {
    const state = get();
    if (!state.blockIds || !state.isDragging) return;

    const updatedBlocksMap = { ...state.blocksMap };

    state.blockIds.forEach((blockId) => {
      const currBlock = updatedBlocksMap[blockId];

      if (!currBlock || !currBlock.position) return;

      updatedBlocksMap[blockId] = {
        ...currBlock,
        position: {
          ...currBlock.position,
          marginLeft: currBlock.position.marginLeft + addedWidth,
        },
      };
    });

    set({ blocksMap: updatedBlocksMap });
  },

  // Interaction actions
  setIsDragging: (isDragging) => {
    set({ isDragging });
  },

  // Initialization
  initGantt: () => {
    const state = get();
    const newCurrentViewData = currentViewDataWithView(state.currentView);

    set({
      currentViewData: newCurrentViewData,
      blocksMap: {},
      blockIds: undefined,
    });
  },

  // Helper methods
  getBlockById: (blockId) => {
    return get().blocksMap[blockId];
  },

  isBlockActive: (blockId) => {
    return get().activeBlockId === blockId;
  },

  getIsCurrentDependencyDragging: (blockId) => {
    // Dummy method to return if the current Block's dependency is being dragged
    return false;
  },

  getUpdatedPositionAfterDrag: (id, shouldUpdateHalfBlock, ignoreDependencies) => {
    const state = get();
    const currBlock = state.blocksMap[id];

    if (!currBlock?.position || !state.currentViewData) return [];

    const updatePayload: IBlockUpdateDependencyData = { id, meta: currBlock.meta };

    // If shouldUpdateHalfBlock or the start date is available then update start date
    if (shouldUpdateHalfBlock || currBlock.start_date) {
      updatePayload.start_date = renderFormattedPayloadDate(
        getDateFromPositionOnGantt(currBlock.position.marginLeft, state.currentViewData)
      );
    }
    // If shouldUpdateHalfBlock or the target date is available then update target date
    if (shouldUpdateHalfBlock || currBlock.target_date) {
      updatePayload.target_date = renderFormattedPayloadDate(
        getDateFromPositionOnGantt(
          currBlock.position.marginLeft + currBlock.position.width,
          state.currentViewData,
          -1
        )
      );
    }

    return [updatePayload];
  },

  getNumberOfDaysFromPosition: (position) => {
    const state = get();
    if (!state.currentViewData || !position) return undefined;

    return Math.round(position / state.currentViewData.data.dayWidth);
  },

  getDateFromPositionOnGantt: (position, offsetDays) => {
    const state = get();
    if (!state.currentViewData) return undefined;

    return getDateFromPositionOnGantt(position, state.currentViewData, offsetDays);
  },

  getPositionFromDateOnGantt: (date, offSetWidth) => {
    const state = get();
    if (!state.currentViewData) return undefined;

    return getPositionFromDate(state.currentViewData, date, offSetWidth);
  },
}));

// Export types for backwards compatibility
export type IBaseTimelineStore = TimelineStore;
export type { TimelineState, TimelineActions };
