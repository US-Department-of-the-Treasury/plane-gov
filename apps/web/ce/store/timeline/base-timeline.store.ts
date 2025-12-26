import { isEqual, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// components
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
// helpers
// store
import type { RootStore } from "@/plane-web/store/root.store";

// types
type BlockData = {
  id: string;
  name: string;
  sort_order: number | null;
  start_date?: string | undefined | null;
  target_date?: string | undefined | null;
  project_id?: string | undefined | null;
};

// Zustand store state
interface TimelineStoreState {
  blocksMap: Record<string, IGanttBlock>;
  blockIds: string[] | undefined;
  isDragging: boolean;
  currentView: TGanttViews;
  currentViewData: ChartDataType | undefined;
  activeBlockId: string | null;
  renderView: any;
  isDependencyEnabled: boolean;
  rootStore: RootStore | null;
}

// Zustand store actions
interface TimelineStoreActions {
  setBlockIds: (ids: string[]) => void;
  setIsDragging: (isDragging: boolean) => void;
  updateCurrentView: (view: TGanttViews) => void;
  updateCurrentViewData: (data: ChartDataType | undefined) => void;
  updateActiveBlockId: (blockId: string | null) => void;
  updateRenderView: (data: any) => void;
  initGantt: () => void;
  updateBlocks: (getDataById: (id: string) => BlockData | undefined | null, type?: EGanttBlockType, index?: number) => void;
  getNumberOfDaysFromPosition: (position: number | undefined) => number | undefined;
  updateAllBlocksOnChartChangeWhileDragging: (addedWidth: number) => void;
  getUpdatedPositionAfterDrag: (id: string, shouldUpdateHalfBlock: boolean, ignoreDependencies?: boolean) => IBlockUpdateDependencyData[];
  updateBlockPosition: (id: string, deltaLeft: number, deltaWidth: number, ignoreDependencies?: boolean) => void;
  // Computed-style functions (arrow functions, not computedFn)
  getBlockById: (blockId: string) => IGanttBlock | undefined;
  isBlockActive: (blockId: string) => boolean;
  getPositionFromDateOnGantt: (date: string | Date, offSetWidth: number) => number | undefined;
  getDateFromPositionOnGantt: (position: number, offsetDays: number) => Date | undefined;
  getIsCurrentDependencyDragging: (blockId: string) => boolean;
  // Internal
  setRootStore: (rootStore: RootStore) => void;
}

type TimelineStoreType = TimelineStoreState & TimelineStoreActions;

// Zustand store
export const useTimelineStore = create<TimelineStoreType>()(
  immer((set, get) => ({
    // State
    blocksMap: {},
    blockIds: undefined,
    isDragging: false,
    currentView: "week",
    currentViewData: undefined,
    activeBlockId: null,
    renderView: [],
    isDependencyEnabled: false,
    rootStore: null,

    // Actions
    setBlockIds: (ids: string[]) => {
      set((state) => {
        state.blockIds = ids;
      });
    },

    setIsDragging: (isDragging: boolean) => {
      set((state) => {
        state.isDragging = isDragging;
      });
    },

    updateCurrentView: (view: TGanttViews) => {
      set((state) => {
        state.currentView = view;
      });
    },

    updateCurrentViewData: (data: ChartDataType | undefined) => {
      set((state) => {
        state.currentViewData = data;
      });
    },

    updateActiveBlockId: (blockId: string | null) => {
      set((state) => {
        state.activeBlockId = blockId;
      });
    },

    updateRenderView: (data: any) => {
      set((state) => {
        state.renderView = data;
      });
    },

    initGantt: () => {
      const newCurrentViewData = currentViewDataWithView(get().currentView);
      set((state) => {
        state.currentViewData = newCurrentViewData;
        state.blocksMap = {};
        state.blockIds = undefined;
      });
    },

    updateBlocks: (getDataById: (id: string) => BlockData | undefined | null, type?: EGanttBlockType, index?: number) => {
      const state = get();
      if (!state.blockIds || !Array.isArray(state.blockIds) || state.isDragging) return;

      const updatedBlockMaps: { path: string[]; value: any }[] = [];
      const newBlocks: IGanttBlock[] = [];

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

        // create block updates if the block already exists, or push them to newBlocks
        if (state.blocksMap[blockId]) {
          for (const key of Object.keys(block)) {
            const currValue = state.blocksMap[blockId][key as keyof IGanttBlock];
            const nextValue = block[key as keyof IGanttBlock];
            if (!isEqual(currValue, nextValue)) {
              updatedBlockMaps.push({ path: [blockId, key], value: nextValue });
            }
          }
        } else {
          newBlocks.push(block);
        }
      }

      // update the store with the block updates
      set((state) => {
        for (const updatedBlock of updatedBlockMaps) {
          // Use string path for proper Zustand/immer reactivity
          lodashSet(state.blocksMap, updatedBlock.path.join('.'), updatedBlock.value);
        }

        for (const newBlock of newBlocks) {
          // Direct property access for proper Zustand/immer reactivity
          state.blocksMap[newBlock.id] = newBlock;
        }
      });
    },

    getNumberOfDaysFromPosition: (position: number | undefined) => {
      const state = get();
      if (!state.currentViewData || !position) return undefined;
      return Math.round(position / state.currentViewData.data.dayWidth);
    },

    updateAllBlocksOnChartChangeWhileDragging: (addedWidth: number) => {
      const state = get();
      if (!state.blockIds || !state.isDragging) return;

      set((state) => {
        state.blockIds?.forEach((blockId) => {
          const currBlock = state.blocksMap[blockId];

          if (!currBlock || !currBlock.position) return;

          currBlock.position.marginLeft += addedWidth;
        });
      });
    },

    getUpdatedPositionAfterDrag: (id: string, shouldUpdateHalfBlock: boolean, ignoreDependencies?: boolean) => {
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
          getDateFromPositionOnGantt(currBlock.position.marginLeft + currBlock.position.width, state.currentViewData, -1)
        );
      }

      return [updatePayload];
    },

    updateBlockPosition: (id: string, deltaLeft: number, deltaWidth: number, ignoreDependencies?: boolean) => {
      const state = get();
      const currBlock = state.blocksMap[id];

      if (!currBlock?.position) return;

      const newMarginLeft = currBlock.position.marginLeft + deltaLeft;
      const newWidth = currBlock.position.width + deltaWidth;

      set((state) => {
        // Direct property access for proper Zustand/immer reactivity
        if (state.blocksMap[id]) {
          state.blocksMap[id].position = {
            marginLeft: newMarginLeft ?? currBlock.position?.marginLeft,
            width: newWidth ?? currBlock.position?.width,
          };
        }
      });
    },

    // Computed-style functions (regular arrow functions)
    getBlockById: (blockId: string) => {
      const state = get();
      return state.blocksMap[blockId];
    },

    isBlockActive: (blockId: string): boolean => {
      const state = get();
      return state.activeBlockId === blockId;
    },

    getPositionFromDateOnGantt: (date: string | Date, offSetWidth: number) => {
      const state = get();
      if (!state.currentViewData) return undefined;
      return getPositionFromDate(state.currentViewData, date, offSetWidth);
    },

    getDateFromPositionOnGantt: (position: number, offsetDays: number) => {
      const state = get();
      if (!state.currentViewData) return undefined;
      return getDateFromPositionOnGantt(position, state.currentViewData, offsetDays);
    },

    getIsCurrentDependencyDragging: (blockId: string) => false,

    setRootStore: (rootStore: RootStore) => {
      set((state) => {
        state.rootStore = rootStore as any;
      });
    },
  }))
);

// Legacy interface for backward compatibility
export interface IBaseTimelineStore {
  // observables
  currentView: TGanttViews;
  currentViewData: ChartDataType | undefined;
  activeBlockId: string | null;
  renderView: any;
  isDragging: boolean;
  isDependencyEnabled: boolean;
  //
  setBlockIds: (ids: string[]) => void;
  getBlockById: (blockId: string) => IGanttBlock;
  // computed functions
  getIsCurrentDependencyDragging: (blockId: string) => boolean;
  isBlockActive: (blockId: string) => boolean;
  // actions
  updateCurrentView: (view: TGanttViews) => void;
  updateCurrentViewData: (data: ChartDataType | undefined) => void;
  updateActiveBlockId: (blockId: string | null) => void;
  updateRenderView: (data: any) => void;
  updateAllBlocksOnChartChangeWhileDragging: (addedWidth: number) => void;
  getUpdatedPositionAfterDrag: (
    id: string,
    shouldUpdateHalfBlock: boolean,
    ignoreDependencies?: boolean
  ) => IBlockUpdateDependencyData[];
  updateBlockPosition: (id: string, deltaLeft: number, deltaWidth: number, ignoreDependencies?: boolean) => void;
  getNumberOfDaysFromPosition: (position: number | undefined) => number | undefined;
  setIsDragging: (isDragging: boolean) => void;
  initGantt: () => void;

  getDateFromPositionOnGantt: (position: number, offsetDays: number) => Date | undefined;
  getPositionFromDateOnGantt: (date: string | Date, offSetWidth: number) => number | undefined;
}

// Legacy class wrapper for backward compatibility
export class BaseTimeLineStore implements IBaseTimelineStore {
  rootStore: RootStore;

  constructor(_rootStore: RootStore) {
    this.rootStore = _rootStore;
    useTimelineStore.getState().setRootStore(_rootStore);
    useTimelineStore.getState().initGantt();
  }

  private get state() {
    return useTimelineStore.getState();
  }

  // State getters
  get blocksMap() {
    return this.state.blocksMap;
  }
  get blockIds() {
    return this.state.blockIds;
  }
  get isDragging() {
    return this.state.isDragging;
  }
  get currentView() {
    return this.state.currentView;
  }
  get currentViewData() {
    return this.state.currentViewData;
  }
  get activeBlockId() {
    return this.state.activeBlockId;
  }
  get renderView() {
    return this.state.renderView;
  }
  get isDependencyEnabled() {
    return this.state.isDependencyEnabled;
  }

  // Actions - delegate to Zustand store
  setBlockIds = (ids: string[]) => this.state.setBlockIds(ids);
  setIsDragging = (isDragging: boolean) => this.state.setIsDragging(isDragging);
  isBlockActive = (blockId: string) => this.state.isBlockActive(blockId);
  updateCurrentView = (view: TGanttViews) => this.state.updateCurrentView(view);
  updateCurrentViewData = (data: ChartDataType | undefined) => this.state.updateCurrentViewData(data);
  updateActiveBlockId = (blockId: string | null) => this.state.updateActiveBlockId(blockId);
  updateRenderView = (data: any) => this.state.updateRenderView(data);
  initGantt = () => this.state.initGantt();
  getBlockById = (blockId: string) => this.state.getBlockById(blockId) as IGanttBlock;
  updateBlocks = (getDataById: (id: string) => BlockData | undefined | null, type?: EGanttBlockType, index?: number) =>
    this.state.updateBlocks(getDataById, type, index);
  getNumberOfDaysFromPosition = (position: number | undefined) => this.state.getNumberOfDaysFromPosition(position);
  getPositionFromDateOnGantt = (date: string | Date, offSetWidth: number) =>
    this.state.getPositionFromDateOnGantt(date, offSetWidth);
  getDateFromPositionOnGantt = (position: number, offsetDays: number) =>
    this.state.getDateFromPositionOnGantt(position, offsetDays);
  updateAllBlocksOnChartChangeWhileDragging = (addedWidth: number) =>
    this.state.updateAllBlocksOnChartChangeWhileDragging(addedWidth);
  getUpdatedPositionAfterDrag = (id: string, shouldUpdateHalfBlock: boolean, ignoreDependencies?: boolean) =>
    this.state.getUpdatedPositionAfterDrag(id, shouldUpdateHalfBlock, ignoreDependencies);
  updateBlockPosition = (id: string, deltaLeft: number, deltaWidth: number, ignoreDependencies?: boolean) =>
    this.state.updateBlockPosition(id, deltaLeft, deltaWidth, ignoreDependencies);
  getIsCurrentDependencyDragging = (blockId: string) => this.state.getIsCurrentDependencyDragging(blockId);
}
