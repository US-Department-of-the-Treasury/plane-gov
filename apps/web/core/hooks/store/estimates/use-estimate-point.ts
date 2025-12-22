import type { IEstimatePoint } from "@plane/types";
import {
  useEstimateDetails,
  getEstimatePointById,
  useUpdateEstimatePoint,
  useCreateEstimatePoint,
} from "@/store/queries";
import { useParams } from "@/hooks/store/use-router-params";

/**
 * Hook to get estimate point by ID.
 * Migrated from MobX to TanStack Query.
 *
 * @param estimateId - The estimate ID
 * @param estimatePointId - The estimate point ID to fetch
 * @returns Object with estimate point data and methods
 *
 * @example
 * const { estimatePoint, updateEstimatePoint, isUpdating } = useEstimatePoint(estimateId, pointId);
 */
export const useEstimatePoint = (estimateId: string | undefined, estimatePointId: string | undefined) => {
  const { workspaceSlug, projectId } = useParams();

  // Fetch estimate details which includes points
  const { data: estimate, isLoading } = useEstimateDetails(
    workspaceSlug ?? "",
    projectId ?? "",
    estimateId ?? ""
  );

  // Mutations
  const updateEstimatePointMutation = useUpdateEstimatePoint();
  const createEstimatePointMutation = useCreateEstimatePoint();

  // Get the specific estimate point
  const estimatePoint = getEstimatePointById(estimate, estimatePointId);

  // MobX-compatible updateEstimatePoint function with proper signature
  const updateEstimatePoint = async (
    workspaceSlug: string,
    projectId: string,
    payload: Partial<IEstimatePoint>
  ): Promise<IEstimatePoint | undefined> => {
    if (!estimateId || !estimatePointId) return undefined;

    try {
      const result = await updateEstimatePointMutation.mutateAsync({
        workspaceSlug,
        projectId,
        estimateId,
        estimatePointId,
        data: payload,
      });
      return result;
    } catch (error) {
      console.error("Error updating estimate point:", error);
      throw error;
    }
  };

  // MobX-compatible createEstimatePoint function
  const createEstimatePoint = async (
    workspaceSlug: string,
    projectId: string,
    payload: Partial<IEstimatePoint>
  ): Promise<IEstimatePoint | undefined> => {
    if (!estimateId) return undefined;

    try {
      const result = await createEstimatePointMutation.mutateAsync({
        workspaceSlug,
        projectId,
        estimateId,
        data: payload,
      });
      return result;
    } catch (error) {
      console.error("Error creating estimate point:", error);
      throw error;
    }
  };

  return {
    // Data
    estimatePoint,
    estimate,
    isLoading,

    // Mutations with MobX-compatible signatures
    updateEstimatePoint,
    createEstimatePoint,
    isUpdating: updateEstimatePointMutation.isPending,
    isCreating: createEstimatePointMutation.isPending,
  };
};
