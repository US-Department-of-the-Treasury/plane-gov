import type { IEstimate } from "@plane/types";
import {
  useProjectEstimates as useProjectEstimatesQuery,
  useWorkspaceEstimates,
  getCurrentActiveEstimate,
  getCurrentActiveEstimateId,
  getArchivedEstimates,
  getArchivedEstimateIds,
  getEstimateById,
  getEstimateIds,
  useCreateEstimate,
  useDeleteEstimate,
} from "@/store/queries";
import { useParams } from "@/hooks/store/use-router-params";

/**
 * Hook to access project estimates data and methods.
 * Migrated from MobX ProjectEstimateStore to TanStack Query.
 *
 * @returns Object with estimates data and methods
 *
 * @example
 * const { estimates, currentActiveEstimate, isLoading, createEstimate } = useProjectEstimates();
 */
export const useProjectEstimates = () => {
  const { workspaceSlug, projectId } = useParams();

  // Fetch project estimates
  const {
    data: estimates,
    isLoading,
    error,
  } = useProjectEstimatesQuery(workspaceSlug ?? "", projectId ?? "");

  // Fetch workspace estimates
  const { data: workspaceEstimates } = useWorkspaceEstimates(workspaceSlug ?? "");

  // Mutations
  const createEstimateMutation = useCreateEstimate();
  const deleteEstimateMutation = useDeleteEstimate();

  // Computed values
  const currentActiveEstimate = getCurrentActiveEstimate(estimates);
  const currentActiveEstimateId = getCurrentActiveEstimateId(estimates);
  const archivedEstimates = getArchivedEstimates(estimates);
  const archivedEstimateIds = getArchivedEstimateIds(estimates);
  const estimateIds = getEstimateIds(estimates);
  const currentProjectEstimateType = currentActiveEstimate?.type;

  // MobX-compatible loader state
  const loader = isLoading ? "init-loader" : undefined;

  // MobX-compatible getProjectEstimates function
  const getProjectEstimates = async (workspaceSlug: string, projectId: string) => {
    // This is handled automatically by TanStack Query through the useProjectEstimatesQuery hook
    // Return the current data if available
    return estimates;
  };

  // MobX-compatible getWorkspaceEstimates function
  const getWorkspaceEstimates = async (workspaceSlug: string) => {
    // This is handled automatically by TanStack Query through the useWorkspaceEstimatesQuery hook
    // Return the current data if available
    return workspaceEstimates;
  };

  // MobX-compatible createEstimate function with proper signature
  const createEstimate = async (
    workspaceSlug: string,
    projectId: string,
    data: any
  ) => {
    return createEstimateMutation.mutateAsync({ workspaceSlug, projectId, data });
  };

  // MobX-compatible deleteEstimate function with proper signature
  const deleteEstimate = async (workspaceSlug: string, projectId: string, estimateId: string) => {
    return deleteEstimateMutation.mutateAsync({ workspaceSlug, projectId, estimateId });
  };

  // MobX-compatible areEstimateEnabledByProjectId function
  const areEstimateEnabledByProjectId = (projectId: string) => {
    // This requires project data - will be handled separately
    return estimates && estimates.length > 0;
  };

  return {
    // Data
    estimates: estimates ?? [],
    workspaceEstimates: workspaceEstimates ?? [],
    currentActiveEstimate,
    currentActiveEstimateId,
    currentProjectEstimateType,
    archivedEstimates,
    archivedEstimateIds,
    estimateIds,

    // Loading states
    loader,
    isLoading,
    error,

    // Methods
    getEstimateById: (estimateId: string) => getEstimateById(estimates, estimateId),
    estimateById: (estimateId: string) => getEstimateById(estimates, estimateId),
    getProjectEstimates,
    getWorkspaceEstimates,
    areEstimateEnabledByProjectId,
    estimateIdsByProjectId: (projectId: string) => estimateIds,
    currentActiveEstimateIdByProjectId: (projectId: string) => currentActiveEstimateId,

    // Mutations
    createEstimate,
    deleteEstimate,
    isCreating: createEstimateMutation.isPending,
    isDeleting: deleteEstimateMutation.isPending,
  };
};
