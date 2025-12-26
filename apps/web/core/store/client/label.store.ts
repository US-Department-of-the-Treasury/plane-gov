import { create } from "zustand";
import { sortBy } from "lodash-es";
import type { IIssueLabel, IIssueLabelTree } from "@plane/types";
import { buildTree } from "@plane/utils";
import { IssueLabelService } from "@/services/issue/issue_label.service";
import { getRouterProjectId, getRouterWorkspaceSlug } from "./router.store";

/**
 * Label state managed by Zustand.
 * Server data is fetched via TanStack Query, but we maintain a local cache
 * for synchronous access by issue stores that need labelMap for filtering.
 */
interface LabelState {
  // Data cache - synchronized from TanStack Query
  labelMap: Record<string, IIssueLabel>;
  fetchedMap: Record<string, boolean>;
}

interface LabelActions {
  // Sync actions - called when TanStack Query data changes
  syncLabels: (labels: IIssueLabel[], key: string) => void;
  syncLabel: (label: IIssueLabel) => void;
  removeLabel: (labelId: string) => void;
  // Getters
  getProjectLabels: (projectId: string | undefined | null) => IIssueLabel[] | undefined;
  getProjectLabelIds: (projectId: string | undefined | null) => string[] | undefined;
  getWorkspaceLabels: (workspaceId: string) => IIssueLabel[] | undefined;
  getWorkspaceLabelIds: (workspaceId: string) => string[] | undefined;
  getLabelById: (labelId: string) => IIssueLabel | null;
  getProjectLabelsTree: (projectId: string | undefined | null) => IIssueLabelTree[] | undefined;
}

export type LabelStore = LabelState & LabelActions;

const initialState: LabelState = {
  labelMap: {},
  fetchedMap: {},
};

export const useLabelStore = create<LabelStore>()((set, get) => ({
  ...initialState,

  // Sync labels from TanStack Query to local cache
  syncLabels: (labels, key) => {
    set((state) => {
      const newLabelMap = { ...state.labelMap };
      labels.forEach((label) => {
        newLabelMap[label.id] = label;
      });
      return {
        labelMap: newLabelMap,
        fetchedMap: { ...state.fetchedMap, [key]: true },
      };
    });
  },

  syncLabel: (label) => {
    set((state) => ({
      labelMap: { ...state.labelMap, [label.id]: label },
    }));
  },

  removeLabel: (labelId) => {
    set((state) => {
      const newLabelMap = { ...state.labelMap };
      delete newLabelMap[labelId];
      return { labelMap: newLabelMap };
    });
  },

  getProjectLabels: (projectId) => {
    if (!projectId) return undefined;
    const { labelMap, fetchedMap } = get();
    if (!fetchedMap[projectId]) return undefined;
    return sortBy(
      Object.values(labelMap).filter((label) => label?.project_id === projectId),
      "sort_order"
    );
  },

  getProjectLabelIds: (projectId) => {
    const labels = get().getProjectLabels(projectId);
    return labels?.map((label) => label.id);
  },

  getWorkspaceLabels: (workspaceId) => {
    const { labelMap, fetchedMap } = get();
    if (!fetchedMap[workspaceId]) return undefined;
    return sortBy(
      Object.values(labelMap).filter((label) => label.workspace_id === workspaceId),
      "sort_order"
    );
  },

  getWorkspaceLabelIds: (workspaceId) => {
    const labels = get().getWorkspaceLabels(workspaceId);
    return labels?.map((label) => label.id);
  },

  getLabelById: (labelId) => {
    return get().labelMap[labelId] || null;
  },

  getProjectLabelsTree: (projectId) => {
    const labels = get().getProjectLabels(projectId);
    if (!labels) return undefined;
    return buildTree(labels);
  },
}));

// Service instance for legacy wrapper
const labelService = new IssueLabelService();

/**
 * Legacy interface for backward compatibility with MobX store.
 */
export interface ILabelStore {
  fetchedMap: Record<string, boolean>;
  labelMap: Record<string, IIssueLabel>;
  projectLabels: IIssueLabel[] | undefined;
  projectLabelsTree: IIssueLabelTree[] | undefined;
  workspaceLabels: IIssueLabel[] | undefined;
  getWorkspaceLabels: (workspaceSlug: string) => IIssueLabel[] | undefined;
  getWorkspaceLabelIds: (workspaceSlug: string) => string[] | undefined;
  getProjectLabels: (projectId: string | undefined | null) => IIssueLabel[] | undefined;
  getProjectLabelIds: (projectId: string | undefined | null) => string[] | undefined;
  getLabelById: (labelId: string) => IIssueLabel | null;
  fetchWorkspaceLabels: (workspaceSlug: string) => Promise<IIssueLabel[]>;
  fetchProjectLabels: (workspaceSlug: string, projectId: string) => Promise<IIssueLabel[]>;
  createLabel: (workspaceSlug: string, projectId: string, data: Partial<IIssueLabel>) => Promise<IIssueLabel>;
  updateLabel: (
    workspaceSlug: string,
    projectId: string,
    labelId: string,
    data: Partial<IIssueLabel>
  ) => Promise<IIssueLabel>;
  updateLabelPosition: (
    workspaceSlug: string,
    projectId: string,
    draggingLabelId: string,
    droppedParentId: string | null,
    droppedLabelId: string | undefined,
    dropAtEndOfList: boolean
  ) => Promise<void>;
  deleteLabel: (workspaceSlug: string, projectId: string, labelId: string) => Promise<void>;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use TanStack Query hooks (useProjectLabels, useCreateLabel, etc.) directly in React components
 */
export class LabelStoreLegacy implements ILabelStore {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_rootStore?: unknown) {
    // rootStore no longer needed - using getRouterProjectId/getRouterWorkspaceSlug helpers
  }

  get fetchedMap() {
    return useLabelStore.getState().fetchedMap;
  }

  get labelMap() {
    return useLabelStore.getState().labelMap;
  }

  get projectLabels() {
    const projectId = getRouterProjectId();
    return useLabelStore.getState().getProjectLabels(projectId);
  }

  get projectLabelsTree() {
    const projectId = getRouterProjectId();
    return useLabelStore.getState().getProjectLabelsTree(projectId);
  }

  get workspaceLabels() {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return undefined;
    // Note: This requires workspace ID, not slug. May need adjustment.
    return useLabelStore.getState().getWorkspaceLabels(workspaceSlug);
  }

  getWorkspaceLabels = (workspaceSlug: string) => {
    return useLabelStore.getState().getWorkspaceLabels(workspaceSlug);
  };

  getWorkspaceLabelIds = (workspaceSlug: string) => {
    return useLabelStore.getState().getWorkspaceLabelIds(workspaceSlug);
  };

  getProjectLabels = (projectId: string | undefined | null) => {
    return useLabelStore.getState().getProjectLabels(projectId);
  };

  getProjectLabelIds = (projectId: string | undefined | null) => {
    return useLabelStore.getState().getProjectLabelIds(projectId);
  };

  getLabelById = (labelId: string) => {
    return useLabelStore.getState().getLabelById(labelId);
  };

  fetchWorkspaceLabels = async (workspaceSlug: string) => {
    const response = await labelService.getWorkspaceIssueLabels(workspaceSlug);
    useLabelStore.getState().syncLabels(response, workspaceSlug);
    return response;
  };

  fetchProjectLabels = async (workspaceSlug: string, projectId: string) => {
    const response = await labelService.getProjectLabels(workspaceSlug, projectId);
    useLabelStore.getState().syncLabels(response, projectId);
    return response;
  };

  createLabel = async (workspaceSlug: string, projectId: string, data: Partial<IIssueLabel>) => {
    const response = await labelService.createIssueLabel(workspaceSlug, projectId, data);
    useLabelStore.getState().syncLabel(response);
    return response;
  };

  updateLabel = async (workspaceSlug: string, projectId: string, labelId: string, data: Partial<IIssueLabel>) => {
    const originalLabel = useLabelStore.getState().labelMap[labelId];
    try {
      // Optimistic update
      useLabelStore.getState().syncLabel({ ...originalLabel, ...data } as IIssueLabel);
      const response = await labelService.patchIssueLabel(workspaceSlug, projectId, labelId, data);
      return response;
    } catch (error) {
      // Rollback on error
      if (originalLabel) {
        useLabelStore.getState().syncLabel(originalLabel);
      }
      throw error;
    }
  };

  updateLabelPosition = async (
    workspaceSlug: string,
    projectId: string,
    draggingLabelId: string,
    droppedParentId: string | null,
    droppedLabelId: string | undefined,
    dropAtEndOfList: boolean
  ) => {
    const { labelMap, getProjectLabelsTree } = useLabelStore.getState();
    const currLabel = labelMap[draggingLabelId];
    const labelTree = getProjectLabelsTree(projectId);

    if (!currLabel || !labelTree) return;

    // If dropped in the same parent without a specific target, keep original position
    if (currLabel.parent === droppedParentId && !droppedLabelId) return;

    const data: Partial<IIssueLabel> = { parent: droppedParentId };

    // Find array in which the label is to be added
    let currentArray: IIssueLabel[];
    if (!droppedParentId) {
      currentArray = labelTree;
    } else {
      currentArray = (labelTree.find((label) => label.id === droppedParentId) as any)?.children || [];
    }

    let droppedLabelIndex = currentArray.findIndex((label) => label.id === droppedLabelId);
    if (dropAtEndOfList || droppedLabelIndex === -1) {
      droppedLabelIndex = currentArray.length;
    }

    // Compute sort order
    if (currentArray.length > 0) {
      let prevSortOrder: number | undefined;
      let nextSortOrder: number | undefined;

      if (typeof currentArray[droppedLabelIndex - 1] !== "undefined") {
        prevSortOrder = currentArray[droppedLabelIndex - 1].sort_order;
      }
      if (typeof currentArray[droppedLabelIndex] !== "undefined") {
        nextSortOrder = currentArray[droppedLabelIndex].sort_order;
      }

      let sortOrder: number = 65535;
      if (prevSortOrder && nextSortOrder) {
        sortOrder = (prevSortOrder + nextSortOrder) / 2;
      } else if (nextSortOrder) {
        sortOrder = nextSortOrder / 2;
      } else if (prevSortOrder) {
        sortOrder = prevSortOrder + 10000;
      }
      data.sort_order = sortOrder;
    }

    await this.updateLabel(workspaceSlug, projectId, draggingLabelId, data);
  };

  deleteLabel = async (workspaceSlug: string, projectId: string, labelId: string) => {
    const { labelMap, removeLabel } = useLabelStore.getState();
    if (!labelMap[labelId]) return;
    await labelService.deleteIssueLabel(workspaceSlug, projectId, labelId);
    removeLabel(labelId);
  };
}
