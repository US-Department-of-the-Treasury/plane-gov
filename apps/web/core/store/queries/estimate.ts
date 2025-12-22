"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IEstimate, IEstimateFormData, IEstimatePoint } from "@plane/types";
import estimateService from "@/plane-web/services/project/estimate.service";
import { queryKeys } from "./query-keys";

/**
 * Hook to fetch all estimates for a workspace.
 * Replaces MobX ProjectEstimateStore.getWorkspaceEstimates for read operations.
 *
 * @example
 * const { data: estimates, isLoading } = useWorkspaceEstimates(workspaceSlug);
 */
export function useWorkspaceEstimates(workspaceSlug: string) {
  return useQuery({
    queryKey: queryKeys.estimates.workspace(workspaceSlug),
    queryFn: () => estimateService.fetchWorkspaceEstimates(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch all estimates for a project.
 * Replaces MobX ProjectEstimateStore.getProjectEstimates for read operations.
 *
 * @example
 * const { data: estimates, isLoading } = useProjectEstimates(workspaceSlug, projectId);
 */
export function useProjectEstimates(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.estimates.all(workspaceSlug, projectId),
    queryFn: () => estimateService.fetchProjectEstimates(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch estimate details by ID.
 * Replaces MobX ProjectEstimateStore.getEstimateById for read operations.
 *
 * @example
 * const { data: estimate, isLoading } = useEstimateDetails(workspaceSlug, projectId, estimateId);
 */
export function useEstimateDetails(workspaceSlug: string, projectId: string, estimateId: string) {
  return useQuery({
    queryKey: queryKeys.estimates.detail(estimateId),
    queryFn: () => estimateService.fetchEstimateById(workspaceSlug, projectId, estimateId),
    enabled: !!workspaceSlug && !!projectId && !!estimateId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateEstimateParams {
  workspaceSlug: string;
  projectId: string;
  data: IEstimateFormData;
}

/**
 * Hook to create a new estimate with optimistic updates.
 * Replaces MobX ProjectEstimateStore.createEstimate for write operations.
 *
 * @example
 * const { mutate: createEstimate, isPending } = useCreateEstimate();
 * createEstimate({ workspaceSlug, projectId, data: { name: "Estimate 1", type: "points" } });
 */
export function useCreateEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: CreateEstimateParams) =>
      estimateService.createEstimate(workspaceSlug, projectId, data),
    onMutate: async ({ workspaceSlug, projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.estimates.all(workspaceSlug, projectId) });

      const previousEstimates = queryClient.getQueryData<IEstimate[]>(
        queryKeys.estimates.all(workspaceSlug, projectId)
      );

      // Optimistic update with temporary ID
      if (previousEstimates) {
        const tempId = `temp-${Date.now()}`;
        const optimisticEstimate: IEstimate = {
          id: tempId,
          name: data.estimate?.name ?? "",
          description: "",
          type: (data.estimate?.type as any) ?? "categories",
          workspace: workspaceSlug,
          project: projectId,
          last_used: false,
          points: (data.estimate_points ?? []).map((point) => ({
            id: point.id ?? `temp-point-${Date.now()}`,
            key: point.key,
            value: point.value,
            description: "",
            workspace: workspaceSlug,
            project: projectId,
            estimate: tempId,
            created_at: new Date(),
            updated_at: new Date(),
            created_by: "",
            updated_by: "",
          })),
          created_at: new Date(),
          updated_at: new Date(),
          created_by: "",
          updated_by: "",
        };
        queryClient.setQueryData<IEstimate[]>(queryKeys.estimates.all(workspaceSlug, projectId), [
          ...previousEstimates,
          optimisticEstimate,
        ]);
      }

      return { previousEstimates, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEstimates && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.estimates.all(context.workspaceSlug, context.projectId),
          context.previousEstimates
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.estimates.workspace(workspaceSlug) });
    },
  });
}

interface DeleteEstimateParams {
  workspaceSlug: string;
  projectId: string;
  estimateId: string;
}

/**
 * Hook to delete an estimate with optimistic updates.
 * Replaces MobX ProjectEstimateStore.deleteEstimate for write operations.
 *
 * @example
 * const { mutate: deleteEstimate, isPending } = useDeleteEstimate();
 * deleteEstimate({ workspaceSlug, projectId, estimateId });
 */
export function useDeleteEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, estimateId }: DeleteEstimateParams) =>
      estimateService.deleteEstimate(workspaceSlug, projectId, estimateId),
    onMutate: async ({ workspaceSlug, projectId, estimateId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.estimates.all(workspaceSlug, projectId) });

      const previousEstimates = queryClient.getQueryData<IEstimate[]>(
        queryKeys.estimates.all(workspaceSlug, projectId)
      );

      if (previousEstimates) {
        queryClient.setQueryData<IEstimate[]>(
          queryKeys.estimates.all(workspaceSlug, projectId),
          previousEstimates.filter((estimate) => estimate.id !== estimateId)
        );
      }

      return { previousEstimates, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEstimates && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.estimates.all(context.workspaceSlug, context.projectId),
          context.previousEstimates
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, estimateId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.estimates.workspace(workspaceSlug) });
      void queryClient.removeQueries({ queryKey: queryKeys.estimates.detail(estimateId) });
    },
  });
}

interface CreateEstimatePointParams {
  workspaceSlug: string;
  projectId: string;
  estimateId: string;
  data: Partial<IEstimatePoint>;
}

/**
 * Hook to create an estimate point.
 * Replaces MobX Estimate.creteEstimatePoint for write operations.
 *
 * @example
 * const { mutate: createEstimatePoint, isPending } = useCreateEstimatePoint();
 * createEstimatePoint({ workspaceSlug, projectId, estimateId, data: { key: 1, value: "Small" } });
 */
export function useCreateEstimatePoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, estimateId, data }: CreateEstimatePointParams) =>
      estimateService.createEstimatePoint(workspaceSlug, projectId, estimateId, data),
    onSettled: (_data, _error, { workspaceSlug, projectId, estimateId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.estimates.detail(estimateId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all(workspaceSlug, projectId) });
    },
  });
}

interface UpdateEstimatePointParams {
  workspaceSlug: string;
  projectId: string;
  estimateId: string;
  estimatePointId: string;
  data: Partial<IEstimatePoint>;
}

/**
 * Hook to update an estimate point with optimistic updates.
 * Replaces MobX EstimatePoint.updateEstimatePoint for write operations.
 *
 * @example
 * const { mutate: updateEstimatePoint, isPending } = useUpdateEstimatePoint();
 * updateEstimatePoint({ workspaceSlug, projectId, estimateId, estimatePointId, data: { value: "Medium" } });
 */
export function useUpdateEstimatePoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, estimateId, estimatePointId, data }: UpdateEstimatePointParams) =>
      estimateService.updateEstimatePoint(workspaceSlug, projectId, estimateId, estimatePointId, data),
    onMutate: async ({ estimateId, estimatePointId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.estimates.detail(estimateId) });

      const previousEstimate = queryClient.getQueryData<IEstimate>(queryKeys.estimates.detail(estimateId));

      if (previousEstimate) {
        queryClient.setQueryData<IEstimate>(queryKeys.estimates.detail(estimateId), {
          ...previousEstimate,
          points: previousEstimate.points?.map((point) =>
            point.id === estimatePointId ? { ...point, ...data } : point
          ),
        });
      }

      return { previousEstimate, estimateId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEstimate && context.estimateId) {
        queryClient.setQueryData(queryKeys.estimates.detail(context.estimateId), context.previousEstimate);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, estimateId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.estimates.detail(estimateId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.estimates.all(workspaceSlug, projectId) });
    },
  });
}

// Utility functions for derived data

/**
 * Get estimate by ID from an estimates array.
 *
 * @example
 * const { data: estimates } = useProjectEstimates(workspaceSlug, projectId);
 * const estimate = getEstimateById(estimates, estimateId);
 */
export function getEstimateById(
  estimates: IEstimate[] | undefined,
  estimateId: string | null | undefined
): IEstimate | undefined {
  if (!estimates || !estimateId) return undefined;
  return estimates.find((estimate) => estimate.id === estimateId);
}

/**
 * Get current active estimate for a project (last_used = true).
 *
 * @example
 * const { data: estimates } = useProjectEstimates(workspaceSlug, projectId);
 * const activeEstimate = getCurrentActiveEstimate(estimates);
 */
export function getCurrentActiveEstimate(estimates: IEstimate[] | undefined): IEstimate | undefined {
  if (!estimates) return undefined;
  return estimates.find((estimate) => estimate.last_used);
}

/**
 * Get current active estimate ID for a project.
 *
 * @example
 * const { data: estimates } = useProjectEstimates(workspaceSlug, projectId);
 * const activeEstimateId = getCurrentActiveEstimateId(estimates);
 */
export function getCurrentActiveEstimateId(estimates: IEstimate[] | undefined): string | undefined {
  const activeEstimate = getCurrentActiveEstimate(estimates);
  return activeEstimate?.id;
}

/**
 * Get archived estimates (last_used = false).
 *
 * @example
 * const { data: estimates } = useProjectEstimates(workspaceSlug, projectId);
 * const archivedEstimates = getArchivedEstimates(estimates);
 */
export function getArchivedEstimates(estimates: IEstimate[] | undefined): IEstimate[] {
  if (!estimates) return [];
  return estimates.filter((estimate) => !estimate.last_used);
}

/**
 * Get archived estimate IDs.
 *
 * @example
 * const { data: estimates } = useProjectEstimates(workspaceSlug, projectId);
 * const archivedEstimateIds = getArchivedEstimateIds(estimates);
 */
export function getArchivedEstimateIds(estimates: IEstimate[] | undefined): string[] {
  return getArchivedEstimates(estimates).map((estimate) => estimate.id ?? "").filter(Boolean);
}

/**
 * Get estimate IDs from estimates array.
 *
 * @example
 * const { data: estimates } = useProjectEstimates(workspaceSlug, projectId);
 * const estimateIds = getEstimateIds(estimates);
 */
export function getEstimateIds(estimates: IEstimate[] | undefined): string[] {
  if (!estimates) return [];
  return estimates.map((estimate) => estimate.id ?? "").filter(Boolean);
}

/**
 * Get estimate point by ID from an estimate.
 *
 * @example
 * const { data: estimate } = useEstimateDetails(workspaceSlug, projectId, estimateId);
 * const point = getEstimatePointById(estimate, pointId);
 */
export function getEstimatePointById(
  estimate: IEstimate | undefined,
  pointId: string | null | undefined
): IEstimatePoint | undefined {
  if (!estimate || !pointId) return undefined;
  return estimate.points?.find((point) => point.id === pointId);
}

/**
 * Get estimate point IDs from an estimate, sorted by key.
 *
 * @example
 * const { data: estimate } = useEstimateDetails(workspaceSlug, projectId, estimateId);
 * const pointIds = getEstimatePointIds(estimate);
 */
export function getEstimatePointIds(estimate: IEstimate | undefined): string[] {
  if (!estimate || !estimate.points) return [];
  const sortedPoints = [...estimate.points].sort((a, b) => (a.key ?? 0) - (b.key ?? 0));
  return sortedPoints.map((point) => point.id ?? "").filter(Boolean);
}
