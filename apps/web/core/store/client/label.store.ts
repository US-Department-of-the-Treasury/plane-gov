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
