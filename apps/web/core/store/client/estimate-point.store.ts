import { create } from "zustand";
import type { IEstimate, IEstimatePoint as IEstimatePointType } from "@plane/types";
import estimateService from "@/plane-web/services/project/estimate.service";

type TErrorCodes = {
  status: string;
  message?: string;
};

/**
 * Estimate point state managed by Zustand.
 * Server data is fetched via TanStack Query, but we maintain a local cache
 * for synchronous access and instance-based operations.
 */
interface EstimatePointStoreState {
  // Data cache - map of estimate point ID to estimate point data
  estimatePointMap: Record<string, IEstimatePointType>;
  // Error tracking per estimate point
  errorMap: Record<string, TErrorCodes | undefined>;
}

interface EstimatePointStoreActions {
  // Sync actions - called when TanStack Query data changes
  syncEstimatePoint: (estimatePoint: IEstimatePointType) => void;
  syncEstimatePoints: (estimatePoints: IEstimatePointType[]) => void;
  removeEstimatePoint: (estimatePointId: string) => void;
  // Update actions
  updateEstimatePointObject: (estimatePointId: string, data: Partial<IEstimatePointType>) => void;
  setError: (estimatePointId: string, error: TErrorCodes | undefined) => void;
  // Getters
  getEstimatePointById: (estimatePointId: string) => IEstimatePointType | undefined;
  getEstimatePointsByEstimate: (estimateId: string) => IEstimatePointType[];
}

export type EstimatePointStore = EstimatePointStoreState & EstimatePointStoreActions;

const initialState: EstimatePointStoreState = {
  estimatePointMap: {},
  errorMap: {},
};

export const useEstimatePointStore = create<EstimatePointStore>()((set, get) => ({
  ...initialState,

  syncEstimatePoint: (estimatePoint) => {
    const pointId = estimatePoint.id;
    if (!pointId) return;
    set((state) => ({
      estimatePointMap: {
        ...state.estimatePointMap,
        [pointId]: estimatePoint,
      },
    }));
  },

  syncEstimatePoints: (estimatePoints) => {
    set((state) => {
      const newMap = { ...state.estimatePointMap };
      estimatePoints.forEach((point) => {
        if (point.id) {
          newMap[point.id] = point;
        }
      });
      return { estimatePointMap: newMap };
    });
  },

  removeEstimatePoint: (estimatePointId) => {
    set((state) => {
      const newMap = { ...state.estimatePointMap };
      const newErrorMap = { ...state.errorMap };
      delete newMap[estimatePointId];
      delete newErrorMap[estimatePointId];
      return {
        estimatePointMap: newMap,
        errorMap: newErrorMap,
      };
    });
  },

  updateEstimatePointObject: (estimatePointId, data) => {
    set((state) => {
      const existingPoint = state.estimatePointMap[estimatePointId];
      if (!existingPoint) return state;

      return {
        estimatePointMap: {
          ...state.estimatePointMap,
          [estimatePointId]: {
            ...existingPoint,
            ...data,
          },
        },
      };
    });
  },

  setError: (estimatePointId, error) => {
    set((state) => ({
      errorMap: {
        ...state.errorMap,
        [estimatePointId]: error,
      },
    }));
  },

  getEstimatePointById: (estimatePointId) => {
    return get().estimatePointMap[estimatePointId];
  },

  getEstimatePointsByEstimate: (estimateId) => {
    const { estimatePointMap } = get();
    return Object.values(estimatePointMap).filter((point) => point.estimate === estimateId);
  },
}));

/**
 * Legacy interface for backward compatibility with MobX store.
 */
export interface IEstimatePoint extends IEstimatePointType {
  // observables
  error: TErrorCodes | undefined;
  // computed
  asJson: IEstimatePointType;
  // helper actions
  updateEstimatePointObject: (estimatePoint: Partial<IEstimatePointType>) => void;
  // actions
  updateEstimatePoint: (
    workspaceSlug: string,
    projectId: string,
    payload: Partial<IEstimatePointType>
  ) => Promise<IEstimatePointType | undefined>;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use TanStack Query hooks (useUpdateEstimatePoint, etc.) directly in React components
 */
export class EstimatePointStoreLegacy implements IEstimatePoint {
  // Store reference for accessing root store info
  private rootStore: any;
  private projectEstimate: IEstimate;
  private estimatePointId: string;

  // Data model properties - delegated to Zustand store
  get id() {
    return this.getEstimatePointData()?.id;
  }

  get key() {
    return this.getEstimatePointData()?.key;
  }

  get value() {
    return this.getEstimatePointData()?.value;
  }

  get description() {
    return this.getEstimatePointData()?.description;
  }

  get workspace() {
    return this.getEstimatePointData()?.workspace;
  }

  get project() {
    return this.getEstimatePointData()?.project;
  }

  get estimate() {
    return this.getEstimatePointData()?.estimate;
  }

  get created_at() {
    return this.getEstimatePointData()?.created_at;
  }

  get updated_at() {
    return this.getEstimatePointData()?.updated_at;
  }

  get created_by() {
    return this.getEstimatePointData()?.created_by;
  }

  get updated_by() {
    return this.getEstimatePointData()?.updated_by;
  }

  get error() {
    return useEstimatePointStore.getState().errorMap[this.estimatePointId];
  }

  constructor(rootStore: any, projectEstimate: IEstimate, data: IEstimatePointType) {
    this.rootStore = rootStore;
    this.projectEstimate = projectEstimate;
    this.estimatePointId = data.id ?? "";

    // Sync initial data to store
    useEstimatePointStore.getState().syncEstimatePoint(data);
  }

  private getEstimatePointData() {
    return useEstimatePointStore.getState().getEstimatePointById(this.estimatePointId);
  }

  // computed
  get asJson(): IEstimatePointType {
    const data = this.getEstimatePointData();
    if (!data) {
      return {
        id: this.estimatePointId,
        key: undefined,
        value: undefined,
        description: undefined,
        workspace: undefined,
        project: undefined,
        estimate: undefined,
        created_at: undefined,
        updated_at: undefined,
        created_by: undefined,
        updated_by: undefined,
      };
    }
    return {
      id: data.id,
      key: data.key,
      value: data.value,
      description: data.description,
      workspace: data.workspace,
      project: data.project,
      estimate: data.estimate,
      created_at: data.created_at,
      updated_at: data.updated_at,
      created_by: data.created_by,
      updated_by: data.updated_by,
    };
  }

  // helper actions
  /**
   * @description updating an estimate point object in local store
   * @param { Partial<IEstimatePointType> } estimatePoint
   * @returns { void }
   */
  updateEstimatePointObject = (estimatePoint: Partial<IEstimatePointType>) => {
    useEstimatePointStore.getState().updateEstimatePointObject(this.estimatePointId, estimatePoint);
  };

  // actions
  /**
   * @description updating an estimate point
   * @param { Partial<IEstimatePointType> } payload
   * @returns { IEstimatePointType | undefined }
   */
  updateEstimatePoint = async (
    workspaceSlug: string,
    projectId: string,
    payload: Partial<IEstimatePointType>
  ): Promise<IEstimatePointType | undefined> => {
    try {
      if (!this.projectEstimate?.id || !this.estimatePointId || !payload) return undefined;

      const estimatePoint = await estimateService.updateEstimatePoint(
        workspaceSlug,
        projectId,
        this.projectEstimate.id,
        this.estimatePointId,
        payload
      );

      if (estimatePoint) {
        useEstimatePointStore.getState().updateEstimatePointObject(this.estimatePointId, payload);
      }

      return estimatePoint;
    } catch (error) {
      throw error;
    }
  };
}
