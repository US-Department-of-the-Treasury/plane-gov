"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IIssueLabel } from "@plane/types";
import { IssueLabelService } from "@/services/issue/issue_label.service";
import { queryKeys } from "./query-keys";

// Service instance
const labelService = new IssueLabelService();

/**
 * Hook to fetch project labels.
 * Replaces MobX LabelStore.fetchProjectLabels for read operations.
 *
 * @example
 * const { data: labels, isLoading } = useProjectLabels(workspaceSlug, projectId);
 */
export function useProjectLabels(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.labels.all(workspaceSlug, projectId),
    queryFn: () => labelService.getProjectLabels(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch workspace labels (all labels across projects).
 * Replaces MobX LabelStore.fetchWorkspaceLabels for read operations.
 *
 * @example
 * const { data: labels, isLoading } = useWorkspaceLabels(workspaceSlug);
 */
export function useWorkspaceLabels(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.labels.workspace(workspaceSlug),
    queryFn: () => labelService.getWorkspaceIssueLabels(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateLabelParams {
  workspaceSlug: string;
  projectId: string;
  data: Partial<IIssueLabel>;
}

/**
 * Hook to create a new label with optimistic updates.
 * Replaces MobX LabelStore.createLabel for write operations.
 *
 * @example
 * const { mutate: createLabel, isPending } = useCreateLabel();
 * createLabel({ workspaceSlug, projectId, data: { name: "Bug", color: "#FF0000" } });
 */
export function useCreateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: CreateLabelParams) =>
      labelService.createIssueLabel(workspaceSlug, projectId, data),
    onMutate: async ({ workspaceSlug, projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.labels.all(workspaceSlug, projectId) });

      const previousLabels = queryClient.getQueryData<IIssueLabel[]>(queryKeys.labels.all(workspaceSlug, projectId));

      // Optimistic update with temporary ID
      if (previousLabels) {
        const optimisticLabel: IIssueLabel = {
          id: `temp-${Date.now()}`,
          name: data.name ?? "",
          color: data.color ?? "#000000",
          project_id: projectId,
          workspace_id: "",
          parent: data.parent ?? null,
          sort_order: previousLabels.length + 1,
        };
        queryClient.setQueryData<IIssueLabel[]>(queryKeys.labels.all(workspaceSlug, projectId), [
          ...previousLabels,
          optimisticLabel,
        ]);
      }

      return { previousLabels, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLabels && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.labels.all(context.workspaceSlug, context.projectId),
          context.previousLabels
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labels.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.labels.workspace(workspaceSlug) });
    },
  });
}

interface UpdateLabelParams {
  workspaceSlug: string;
  projectId: string;
  labelId: string;
  data: Partial<IIssueLabel>;
}

/**
 * Hook to update an existing label with optimistic updates.
 * Replaces MobX LabelStore.updateLabel for write operations.
 *
 * @example
 * const { mutate: updateLabel, isPending } = useUpdateLabel();
 * updateLabel({ workspaceSlug, projectId, labelId, data: { name: "Updated Name" } });
 */
export function useUpdateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, labelId, data }: UpdateLabelParams) =>
      labelService.patchIssueLabel(workspaceSlug, projectId, labelId, data),
    onMutate: async ({ workspaceSlug, projectId, labelId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.labels.all(workspaceSlug, projectId) });

      const previousLabels = queryClient.getQueryData<IIssueLabel[]>(queryKeys.labels.all(workspaceSlug, projectId));

      if (previousLabels) {
        queryClient.setQueryData<IIssueLabel[]>(
          queryKeys.labels.all(workspaceSlug, projectId),
          previousLabels.map((label) => (label.id === labelId ? { ...label, ...data } : label))
        );
      }

      return { previousLabels, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLabels && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.labels.all(context.workspaceSlug, context.projectId),
          context.previousLabels
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labels.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.labels.workspace(workspaceSlug) });
    },
  });
}

interface UpdateLabelPositionParams {
  workspaceSlug: string;
  projectId: string;
  labelId: string;
  data: Partial<IIssueLabel>;
}

/**
 * Hook to update a label's position (sort order) with optimistic updates.
 * Replaces MobX LabelStore.updateLabelPosition for write operations.
 *
 * @example
 * const { mutate: updatePosition, isPending } = useUpdateLabelPosition();
 * updatePosition({ workspaceSlug, projectId, labelId, data: { sort_order: 3 } });
 */
export function useUpdateLabelPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, labelId, data }: UpdateLabelPositionParams) =>
      labelService.patchIssueLabel(workspaceSlug, projectId, labelId, data),
    onMutate: async ({ workspaceSlug, projectId, labelId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.labels.all(workspaceSlug, projectId) });

      const previousLabels = queryClient.getQueryData<IIssueLabel[]>(queryKeys.labels.all(workspaceSlug, projectId));

      if (previousLabels) {
        queryClient.setQueryData<IIssueLabel[]>(
          queryKeys.labels.all(workspaceSlug, projectId),
          previousLabels.map((label) => (label.id === labelId ? { ...label, ...data } : label))
        );
      }

      return { previousLabels, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLabels && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.labels.all(context.workspaceSlug, context.projectId),
          context.previousLabels
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labels.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.labels.workspace(workspaceSlug) });
    },
  });
}

interface DeleteLabelParams {
  workspaceSlug: string;
  projectId: string;
  labelId: string;
}

/**
 * Hook to delete a label with optimistic updates.
 * Replaces MobX LabelStore.deleteLabel for write operations.
 *
 * @example
 * const { mutate: deleteLabel, isPending } = useDeleteLabel();
 * deleteLabel({ workspaceSlug, projectId, labelId });
 */
export function useDeleteLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, labelId }: DeleteLabelParams) =>
      labelService.deleteIssueLabel(workspaceSlug, projectId, labelId),
    onMutate: async ({ workspaceSlug, projectId, labelId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.labels.all(workspaceSlug, projectId) });

      const previousLabels = queryClient.getQueryData<IIssueLabel[]>(queryKeys.labels.all(workspaceSlug, projectId));

      if (previousLabels) {
        queryClient.setQueryData<IIssueLabel[]>(
          queryKeys.labels.all(workspaceSlug, projectId),
          previousLabels.filter((label) => label.id !== labelId)
        );
      }

      return { previousLabels, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousLabels && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.labels.all(context.workspaceSlug, context.projectId),
          context.previousLabels
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.labels.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.labels.workspace(workspaceSlug) });
    },
  });
}

/**
 * Build a tree structure from flat labels array.
 * Utility function that can be used independently.
 */
export function buildLabelTree(labels: IIssueLabel[]): IIssueLabel[] {
  const labelMap = new Map<string, IIssueLabel & { children?: IIssueLabel[] }>();
  const roots: (IIssueLabel & { children?: IIssueLabel[] })[] = [];

  // First pass: create map
  labels.forEach((label) => {
    labelMap.set(label.id, { ...label, children: [] });
  });

  // Second pass: build tree
  labels.forEach((label) => {
    const node = labelMap.get(label.id)!;
    if (label.parent && labelMap.has(label.parent)) {
      const parent = labelMap.get(label.parent)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * Hook to get labels as a tree structure (parent-child relationships).
 *
 * @example
 * const { data: labelTree } = useProjectLabelTree(workspaceSlug, projectId);
 */
export function useProjectLabelTree(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: [...queryKeys.labels.all(workspaceSlug, projectId), "tree"],
    queryFn: async () => {
      const labels = await labelService.getProjectLabels(workspaceSlug, projectId);
      return buildLabelTree(labels);
    },
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
