import { orderBy, set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type {
  IEstimate as IEstimateType,
  IEstimatePoint as IEstimatePointType,
  TEstimateSystemKeys,
} from "@plane/types";
// plane web services
import estimateService from "@/plane-web/services/project/estimate.service";
// store
import type { IEstimatePoint } from "@/store/estimates/estimate-point";
import { EstimatePoint } from "@/store/estimates/estimate-point";
import type { CoreRootStore } from "@/store/root.store";

type TErrorCodes = {
  status: string;
  message?: string;
};

export interface IEstimate extends Omit<IEstimateType, "points"> {
  // observables
  error: TErrorCodes | undefined;
  estimatePoints: Record<string, IEstimatePoint>;
  // computed
  asJson: Omit<IEstimateType, "points">;
  estimatePointIds: string[] | undefined;
  estimatePointById: (estimatePointId: string) => IEstimatePointType | undefined;
  // actions
  creteEstimatePoint: (
    workspaceSlug: string,
    projectId: string,
    payload: Partial<IEstimatePointType>
  ) => Promise<IEstimatePointType | undefined>;
}

// Zustand store state
interface EstimateStoreState {
  // data model properties
  id: string | undefined;
  name: string | undefined;
  description: string | undefined;
  type: TEstimateSystemKeys | undefined;
  workspace: string | undefined;
  project: string | undefined;
  last_used: boolean | undefined;
  created_at: Date | undefined;
  updated_at: Date | undefined;
  created_by: string | undefined;
  updated_by: string | undefined;
  // observables
  error: TErrorCodes | undefined;
  estimatePoints: Record<string, IEstimatePoint>;
}

// Zustand store actions
interface EstimateStoreActions {
  initialize: (data: IEstimateType) => void;
  addEstimatePoint: (estimatePointId: string, estimatePoint: IEstimatePoint) => void;
  getAsJson: () => Omit<IEstimateType, "points">;
  getEstimatePointIds: () => string[] | undefined;
  estimatePointById: (estimatePointId: string) => IEstimatePointType | undefined;
}

type EstimateStoreType = EstimateStoreState & EstimateStoreActions;

// Create a store factory function since we need separate instances per estimate
const createEstimateStore = () =>
  create<EstimateStoreType>()(
    immer((set, get) => ({
      // State
      id: undefined,
      name: undefined,
      description: undefined,
      type: undefined,
      workspace: undefined,
      project: undefined,
      last_used: undefined,
      created_at: undefined,
      updated_at: undefined,
      created_by: undefined,
      updated_by: undefined,
      error: undefined,
      estimatePoints: {},

      // Initialize with data
      initialize: (data: IEstimateType) => {
        set((state) => {
          state.id = data.id;
          state.name = data.name;
          state.description = data.description;
          state.type = data.type;
          state.workspace = data.workspace;
          state.project = data.project;
          state.last_used = data.last_used;
          state.created_at = data.created_at;
          state.updated_at = data.updated_at;
          state.created_by = data.created_by;
          state.updated_by = data.updated_by;
        });
      },

      // Actions
      addEstimatePoint: (estimatePointId: string, estimatePoint: IEstimatePoint) => {
        set((state) => {
          // Direct property access for proper Zustand/immer reactivity
          state.estimatePoints[estimatePointId] = estimatePoint;
        });
      },

      // Computed methods
      getAsJson: () => {
        const state = get();
        return {
          id: state.id,
          name: state.name,
          description: state.description,
          type: state.type,
          workspace: state.workspace,
          project: state.project,
          last_used: state.last_used,
          created_at: state.created_at,
          updated_at: state.updated_at,
          created_by: state.created_by,
          updated_by: state.updated_by,
        };
      },

      getEstimatePointIds: () => {
        const state = get();
        const { estimatePoints } = state;
        if (!estimatePoints) return undefined;
        let currentEstimatePoints = Object.values(estimatePoints).filter(
          (estimatePoint) => estimatePoint?.estimate === state.id
        );
        currentEstimatePoints = orderBy(currentEstimatePoints, ["key"], "asc");
        const estimatePointIds = currentEstimatePoints.map((estimatePoint) => estimatePoint.id) as string[];
        return estimatePointIds ?? undefined;
      },

      estimatePointById: (estimatePointId: string) => {
        if (!estimatePointId) return undefined;
        const state = get();
        return state.estimatePoints[estimatePointId] ?? undefined;
      },
    }))
  );

// Legacy class wrapper for backward compatibility
export class Estimate implements IEstimate {
  // Store instance for this estimate
  private useEstimateStore: ReturnType<typeof createEstimateStore>;

  constructor(
    public store: CoreRootStore,
    public data: IEstimateType
  ) {
    // Create a new store instance for this estimate
    this.useEstimateStore = createEstimateStore();
    // Initialize the store with data
    this.useEstimateStore.getState().initialize(data);
    // Initialize estimate points
    data.points?.forEach((estimationPoint) => {
      if (estimationPoint.id) {
        const estimatePoint = new EstimatePoint(this.store, this.data, estimationPoint);
        this.useEstimateStore.getState().addEstimatePoint(estimationPoint.id, estimatePoint);
      }
    });
  }

  private get state() {
    return this.useEstimateStore.getState();
  }

  // Data model observables (getters that read from Zustand store)
  get id() {
    return this.state.id;
  }

  get name() {
    return this.state.name;
  }

  get description() {
    return this.state.description;
  }

  get type() {
    return this.state.type;
  }

  get workspace() {
    return this.state.workspace;
  }

  get project() {
    return this.state.project;
  }

  get last_used() {
    return this.state.last_used;
  }

  get created_at() {
    return this.state.created_at;
  }

  get updated_at() {
    return this.state.updated_at;
  }

  get created_by() {
    return this.state.created_by;
  }

  get updated_by() {
    return this.state.updated_by;
  }

  get error() {
    return this.state.error;
  }

  get estimatePoints() {
    return this.state.estimatePoints;
  }

  // Computed properties (delegate to Zustand store)
  get asJson() {
    return this.state.getAsJson();
  }

  get estimatePointIds() {
    return this.state.getEstimatePointIds();
  }

  estimatePointById = (estimatePointId: string) => {
    return this.state.estimatePointById(estimatePointId);
  };

  // Actions
  creteEstimatePoint = async (
    workspaceSlug: string,
    projectId: string,
    payload: Partial<IEstimatePointType>
  ): Promise<IEstimatePointType | undefined> => {
    if (!this.id || !payload) return;

    const estimatePoint = await estimateService.createEstimatePoint(workspaceSlug, projectId, this.id, payload);
    if (estimatePoint && estimatePoint.id) {
      const newEstimatePoint = new EstimatePoint(this.store, this.data, estimatePoint);
      this.state.addEstimatePoint(estimatePoint.id, newEstimatePoint);
    }
    return estimatePoint;
  };
}
