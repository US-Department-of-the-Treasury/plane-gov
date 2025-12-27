import { create } from "zustand";
import type { IEstimatePoint as IEstimatePointType } from "@plane/types";

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
