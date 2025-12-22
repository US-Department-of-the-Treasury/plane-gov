import type { IEstimate, IEstimatePoint } from "@plane/types";
import {
  useEstimateDetails,
  getEstimateById,
  useProjectEstimates,
  useCreateEstimatePoint,
  getEstimatePointById as getEstimatePointByIdHelper
} from "@/store/queries";
import { useParams } from "@/hooks/store/use-router-params";

/**
 * Hook to get estimate by ID with MobX-compatible API.
 * Migrated from MobX to TanStack Query.
 *
 * @param estimateId - The estimate ID to fetch
 * @returns Object with estimate data and methods
 *
 * @example
 * const { asJson, estimatePointIds, estimatePointById, creteEstimatePoint } = useEstimate(estimateId);
 */
export const useEstimate = (estimateId: string | undefined) => {
  const { workspaceSlug, projectId } = useParams();

  // Fetch estimate details directly if we have all required params
  const { data: estimateDetails } = useEstimateDetails(
    workspaceSlug ?? "",
    projectId ?? "",
    estimateId ?? "",
  );

  // Fallback to getting from project estimates list
  const { data: estimates } = useProjectEstimates(workspaceSlug ?? "", projectId ?? "");

  // Get the estimate data
  const estimate = estimateDetails || getEstimateById(estimates, estimateId);

  // Mutations
  const createEstimatePointMutation = useCreateEstimatePoint();

  // Get estimate point IDs (sorted by key)
  const estimatePointIds = estimate?.points
    ?.map(point => point.id)
    .filter((id): id is string => Boolean(id)) || undefined;

  // Function to get estimate point by ID
  const estimatePointById = (pointId: string): IEstimatePoint | undefined => {
    return getEstimatePointByIdHelper(estimate, pointId);
  };

  // Function to create an estimate point (MobX-compatible signature)
  const creteEstimatePoint = async (
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
    // MobX-compatible API
    asJson: estimate,
    estimatePointIds,
    estimatePointById,
    creteEstimatePoint,

    // Additional query state
    isLoading: !estimate,
    estimate,
  };
};
