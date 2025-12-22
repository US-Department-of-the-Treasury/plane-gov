"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { TSprintPlotType, TSprintEstimateType } from "@plane/types";
import { SprintService } from "@/services/sprint.service";
import { FavoriteService } from "@/services/favorite";
import { queryKeys } from "@/store/queries/query-keys";
import { getFavoriteByEntityId } from "@/store/queries/favorite";

/**
 * Sprint hooks using TanStack Query.
 * These hooks replace the MobX-based SprintStore.
 *
 * Migration from MobX:
 * - Old: const sprintStore = useSprint(); sprintStore.fetchAllSprints(workspaceSlug, projectId);
 * - New: const { data: sprints } = useProjectSprints(workspaceSlug, projectId);
 */

// Re-export all TanStack Query hooks from the queries module
export {
  useProjectSprints,
  useWorkspaceSprints,
  useActiveSprint,
  useSprintDetails,
  useArchivedSprints,
  useSprintProgress,
  useCreateSprint,
  useUpdateSprint,
  useDeleteSprint,
  useArchiveSprint,
  useRestoreSprint,
  getSprintById,
  getSprintNameById,
  getSprintIds,
  getActiveSprint,
  getCompletedSprints,
  getUpcomingSprints,
} from "@/store/queries/sprint";

// Service instances
const sprintService = new SprintService();
const favoriteService = new FavoriteService();

/**
 * Backward-compatible hook that provides MobX-style API.
 * Uses useParams() to get workspaceSlug and projectId from the route,
 * providing a simpler API for consumers.
 *
 * @example
 * const { addSprintToFavorites, removeSprintFromFavorites, getEstimateTypeBySprintId, setEstimateType } = useSprint();
 * addSprintToFavorites(workspaceSlug, sprintId); // projectId is retrieved from params or cache
 */
export function useSprint() {
  const params = useParams();
  const queryClient = useQueryClient();

  // Get projectId from URL params if available
  const projectIdFromParams = params?.projectId as string | undefined;

  // Client-side state for plot type and estimate type preferences
  const [plotTypeMap, setPlotTypeMap] = useState<Record<string, TSprintPlotType>>({});
  const [estimateTypeMap, setEstimateTypeMap] = useState<Record<string, TSprintEstimateType>>({});

  /**
   * Add sprint to favorites.
   * Accepts 2 parameters (workspaceSlug, sprintId).
   * Gets projectId from URL params or searches the query cache.
   */
  const addSprintToFavorites = useCallback(
    async (workspaceSlug: string, sprintId: string): Promise<any> => {
      try {
        let projectId = projectIdFromParams;
        let sprint: any = null;

        // If projectId not in params, search the query cache
        if (!projectId) {
          const queryCache = queryClient.getQueryCache();
          const allQueries = queryCache.getAll();

          // Find the sprint in any cached queries
          for (const query of allQueries) {
            const data = query.state.data as any[];
            if (Array.isArray(data)) {
              const foundSprint = data.find((s: any) => s?.id === sprintId);
              if (foundSprint) {
                sprint = foundSprint;
                projectId = foundSprint.project_id;
                break;
              }
            }
          }
        } else {
          // Get sprint from project sprints cache
          const sprints = queryClient.getQueryData<any[]>(queryKeys.sprints.all(workspaceSlug, projectId));
          sprint = sprints?.find((s) => s.id === sprintId);
        }

        if (!projectId) {
          throw new Error("Could not determine projectId for sprint");
        }

        // Optimistically update the project sprints cache
        const sprints = queryClient.getQueryData<any[]>(queryKeys.sprints.all(workspaceSlug, projectId));
        if (sprints) {
          queryClient.setQueryData(
            queryKeys.sprints.all(workspaceSlug, projectId),
            sprints.map((s) => (s.id === sprintId ? { ...s, is_favorite: true } : s))
          );
        }

        // Also update workspace sprints cache if it exists
        const workspaceSprintsKey = [...queryKeys.sprints.all(workspaceSlug, ""), "workspace"];
        const workspaceSprints = queryClient.getQueryData<any[]>(workspaceSprintsKey);
        if (workspaceSprints) {
          queryClient.setQueryData(
            workspaceSprintsKey,
            workspaceSprints.map((s) => (s.id === sprintId ? { ...s, is_favorite: true } : s))
          );
        }

        // Call the favorites API
        const response = await favoriteService.addFavorite(workspaceSlug, {
          entity_type: "sprint",
          entity_identifier: sprintId,
          entity_data: { name: sprint?.name || "" },
        });

        // Invalidate sprint queries to refetch
        await queryClient.invalidateQueries({ queryKey: queryKeys.sprints.all(workspaceSlug, projectId) });
        await queryClient.invalidateQueries({ queryKey: workspaceSprintsKey });

        return response;
      } catch (error) {
        // Revert optimistic update on error
        if (projectIdFromParams) {
          const sprints = queryClient.getQueryData<any[]>(queryKeys.sprints.all(workspaceSlug, projectIdFromParams));
          if (sprints) {
            queryClient.setQueryData(
              queryKeys.sprints.all(workspaceSlug, projectIdFromParams),
              sprints.map((s) => (s.id === sprintId ? { ...s, is_favorite: false } : s))
            );
          }
        }
        throw error;
      }
    },
    [queryClient, projectIdFromParams]
  );

  /**
   * Remove sprint from favorites.
   * Accepts 2 parameters (workspaceSlug, sprintId).
   * Gets projectId from URL params or searches the query cache.
   */
  const removeSprintFromFavorites = useCallback(
    async (workspaceSlug: string, sprintId: string): Promise<void> => {
      try {
        let projectId = projectIdFromParams;

        // If projectId not in params, search the query cache
        if (!projectId) {
          const queryCache = queryClient.getQueryCache();
          const allQueries = queryCache.getAll();

          // Find the sprint in any cached queries
          for (const query of allQueries) {
            const data = query.state.data as any[];
            if (Array.isArray(data)) {
              const foundSprint = data.find((s: any) => s?.id === sprintId);
              if (foundSprint) {
                projectId = foundSprint.project_id;
                break;
              }
            }
          }
        }

        if (!projectId) {
          throw new Error("Could not determine projectId for sprint");
        }

        // Get the favorite by entity_identifier (sprintId)
        const favorites = queryClient.getQueryData<any[]>(queryKeys.favorites.all(workspaceSlug));
        const favorite = getFavoriteByEntityId(favorites, sprintId);

        if (!favorite) {
          throw new Error("Favorite not found for sprint");
        }

        // Optimistically update the project sprints cache
        const sprints = queryClient.getQueryData<any[]>(queryKeys.sprints.all(workspaceSlug, projectId));
        if (sprints) {
          queryClient.setQueryData(
            queryKeys.sprints.all(workspaceSlug, projectId),
            sprints.map((s) => (s.id === sprintId ? { ...s, is_favorite: false } : s))
          );
        }

        // Also update workspace sprints cache if it exists
        const workspaceSprintsKey = [...queryKeys.sprints.all(workspaceSlug, ""), "workspace"];
        const workspaceSprints = queryClient.getQueryData<any[]>(workspaceSprintsKey);
        if (workspaceSprints) {
          queryClient.setQueryData(
            workspaceSprintsKey,
            workspaceSprints.map((s) => (s.id === sprintId ? { ...s, is_favorite: false } : s))
          );
        }

        // Call the favorites API with the favorite ID
        await favoriteService.deleteFavorite(workspaceSlug, favorite.id);

        // Invalidate queries to refetch
        await queryClient.invalidateQueries({ queryKey: queryKeys.sprints.all(workspaceSlug, projectId) });
        await queryClient.invalidateQueries({ queryKey: workspaceSprintsKey });
        await queryClient.invalidateQueries({ queryKey: queryKeys.favorites.all(workspaceSlug) });
      } catch (error) {
        // Revert optimistic update on error
        if (projectIdFromParams) {
          const sprints = queryClient.getQueryData<any[]>(queryKeys.sprints.all(workspaceSlug, projectIdFromParams));
          if (sprints) {
            queryClient.setQueryData(
              queryKeys.sprints.all(workspaceSlug, projectIdFromParams),
              sprints.map((s) => (s.id === sprintId ? { ...s, is_favorite: true } : s))
            );
          }
        }
        throw error;
      }
    },
    [queryClient, projectIdFromParams]
  );

  /**
   * Get plot type for a sprint.
   */
  const getPlotTypeBySprintId = useCallback(
    (sprintId: string): TSprintPlotType => {
      return plotTypeMap[sprintId] || "burndown";
    },
    [plotTypeMap]
  );

  /**
   * Set plot type for a sprint.
   */
  const setPlotType = useCallback((sprintId: string, plotType: TSprintPlotType) => {
    setPlotTypeMap((prev) => ({ ...prev, [sprintId]: plotType }));
  }, []);

  /**
   * Get estimate type for a sprint.
   */
  const getEstimateTypeBySprintId = useCallback(
    (sprintId: string): TSprintEstimateType => {
      return estimateTypeMap[sprintId] || "issues";
    },
    [estimateTypeMap]
  );

  /**
   * Set estimate type for a sprint.
   */
  const setEstimateType = useCallback((sprintId: string, estimateType: TSprintEstimateType) => {
    setEstimateTypeMap((prev) => ({ ...prev, [sprintId]: estimateType }));
  }, []);

  return {
    addSprintToFavorites,
    removeSprintFromFavorites,
    getPlotTypeBySprintId,
    setPlotType,
    getEstimateTypeBySprintId,
    setEstimateType,
  };
}
