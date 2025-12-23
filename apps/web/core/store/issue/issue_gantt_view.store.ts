import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// helpers
import type { ChartDataType, TGanttViews } from "@plane/types";
import { currentViewDataWithView } from "@/components/gantt-chart/data";
// types

export interface IGanttStore {
  // observables
  currentView: TGanttViews;
  currentViewData: ChartDataType | undefined;
  activeBlockId: string | null;
  renderView: any;
  // computed functions
  isBlockActive: (blockId: string) => boolean;
  // actions
  updateCurrentView: (view: TGanttViews) => void;
  updateCurrentViewData: (data: ChartDataType | undefined) => void;
  updateActiveBlockId: (blockId: string | null) => void;
  updateRenderView: (data: any[]) => void;
}

// Zustand Store
interface GanttState {
  currentView: TGanttViews;
  currentViewData: ChartDataType | undefined;
  activeBlockId: string | null;
  renderView: any[];
}

interface GanttActions {
  updateCurrentView: (view: TGanttViews) => void;
  updateCurrentViewData: (data: ChartDataType | undefined) => void;
  updateActiveBlockId: (blockId: string | null) => void;
  updateRenderView: (data: any[]) => void;
  initGantt: () => void;
}

type GanttStoreType = GanttState & GanttActions;

export const useGanttStore = create<GanttStoreType>()(
  immer((set, get) => ({
    // State
    currentView: "month" as TGanttViews,
    currentViewData: undefined,
    activeBlockId: null,
    renderView: [],

    // Actions
    /**
     * @description update current view
     * @param {TGanttViews} view
     */
    updateCurrentView: (view) => {
      set((state) => {
        state.currentView = view;
      });
    },

    /**
     * @description update current view data
     * @param {ChartDataType | undefined} data
     */
    updateCurrentViewData: (data) => {
      set((state) => {
        state.currentViewData = data;
      });
    },

    /**
     * @description update active block
     * @param {string | null} blockId
     */
    updateActiveBlockId: (blockId) => {
      set((state) => {
        state.activeBlockId = blockId;
      });
    },

    /**
     * @description update render view
     * @param {any[]} data
     */
    updateRenderView: (data) => {
      set((state) => {
        state.renderView = data;
      });
    },

    /**
     * @description initialize gantt chart with month view
     */
    initGantt: () => {
      const state = get();
      const newCurrentViewData = currentViewDataWithView(state.currentView);

      set((draftState) => {
        draftState.currentViewData = newCurrentViewData;
      });
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class GanttStore implements IGanttStore {
  constructor() {
    const store = useGanttStore.getState();
    store.initGantt();
  }

  private get store() {
    return useGanttStore.getState();
  }

  get currentView() {
    return this.store.currentView;
  }

  get currentViewData() {
    return this.store.currentViewData;
  }

  get activeBlockId() {
    return this.store.activeBlockId;
  }

  get renderView() {
    return this.store.renderView;
  }

  /**
   * @description check if block is active
   * @param {string} blockId
   */
  isBlockActive = (blockId: string): boolean => this.store.activeBlockId === blockId;

  updateCurrentView = (view: TGanttViews) => this.store.updateCurrentView(view);

  updateCurrentViewData = (data: ChartDataType | undefined) => this.store.updateCurrentViewData(data);

  updateActiveBlockId = (blockId: string | null) => this.store.updateActiveBlockId(blockId);

  updateRenderView = (data: any[]) => this.store.updateRenderView(data);

  initGantt = () => this.store.initGantt();
}
