/* eslint-disable no-useless-catch */

import { set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { IEstimate, IEstimatePoint as IEstimatePointType } from "@plane/types";
// plane web services
import estimateService from "@/plane-web/services/project/estimate.service";
// store
import type { CoreRootStore } from "@/store/root.store";

type TErrorCodes = {
  status: string;
  message?: string;
};

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

// Zustand Store
interface EstimatePointState {
  id: string | undefined;
  key: number | undefined;
  value: string | undefined;
  description: string | undefined;
  workspace: string | undefined;
  project: string | undefined;
  estimate: string | undefined;
  created_at: Date | undefined;
  updated_at: Date | undefined;
  created_by: string | undefined;
  updated_by: string | undefined;
  error: TErrorCodes | undefined;
}

interface EstimatePointActions {
  updateEstimatePointObject: (estimatePoint: Partial<IEstimatePointType>) => void;
  updateEstimatePoint: (
    workspaceSlug: string,
    projectId: string,
    payload: Partial<IEstimatePointType>,
    projectEstimateId: string
  ) => Promise<IEstimatePointType | undefined>;
}

type EstimatePointStoreType = EstimatePointState & EstimatePointActions;

const createEstimatePointStore = (
  data: IEstimatePointType
) => {
  return create<EstimatePointStoreType>()(
    immer((set, get) => ({
      // State
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
      error: undefined,

      // Actions
      updateEstimatePointObject: (estimatePoint: Partial<IEstimatePointType>) => {
        set((draft) => {
          Object.keys(estimatePoint).forEach((key) => {
            const estimatePointKey = key as keyof IEstimatePointType;
            lodashSet(draft, estimatePointKey, estimatePoint[estimatePointKey]);
          });
        });
      },

      updateEstimatePoint: async (
        workspaceSlug: string,
        projectId: string,
        payload: Partial<IEstimatePointType>,
        projectEstimateId: string
      ): Promise<IEstimatePointType | undefined> => {
        try {
          const state = get();
          if (!projectEstimateId || !state.id || !payload) return undefined;

          const estimatePoint = await estimateService.updateEstimatePoint(
            workspaceSlug,
            projectId,
            projectEstimateId,
            state.id,
            payload
          );
          if (estimatePoint) {
            set((draft) => {
              Object.keys(payload).forEach((key) => {
                const estimatePointKey = key as keyof IEstimatePointType;
                lodashSet(draft, estimatePointKey, estimatePoint[estimatePointKey]);
              });
            });
          }

          return estimatePoint;
        } catch (error) {
          throw error;
        }
      },
    }))
  );
};

// Legacy class wrapper for backward compatibility
export class EstimatePoint implements IEstimatePoint {
  private useStore: ReturnType<typeof createEstimatePointStore>;

  constructor(
    private store: CoreRootStore,
    private projectEstimate: IEstimate,
    private data: IEstimatePointType
  ) {
    this.useStore = createEstimatePointStore(data);
  }

  private get state() {
    return this.useStore.getState();
  }

  get id() {
    return this.state.id;
  }

  get key() {
    return this.state.key;
  }

  get value() {
    return this.state.value;
  }

  get description() {
    return this.state.description;
  }

  get workspace() {
    return this.state.workspace;
  }

  get project() {
    return this.state.project;
  }

  get estimate() {
    return this.state.estimate;
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

  // computed
  get asJson() {
    return {
      id: this.state.id,
      key: this.state.key,
      value: this.state.value,
      description: this.state.description,
      workspace: this.state.workspace,
      project: this.state.project,
      estimate: this.state.estimate,
      created_at: this.state.created_at,
      updated_at: this.state.updated_at,
      created_by: this.state.created_by,
      updated_by: this.state.updated_by,
    };
  }

  // helper actions
  /**
   * @description updating an estimate point object in local store
   * @param { Partial<IEstimatePointType> } estimatePoint
   * @returns { void }
   */
  updateEstimatePointObject = (estimatePoint: Partial<IEstimatePointType>) =>
    this.state.updateEstimatePointObject(estimatePoint);

  // actions
  /**
   * @description updating an estimate point
   * @param { Partial<IEstimatePointType> } payload
   * @returns { IEstimatePointType | undefined }
   */
  updateEstimatePoint = (
    workspaceSlug: string,
    projectId: string,
    payload: Partial<IEstimatePointType>
  ): Promise<IEstimatePointType | undefined> =>
    this.state.updateEstimatePoint(workspaceSlug, projectId, payload, this.projectEstimate?.id || "");
}
