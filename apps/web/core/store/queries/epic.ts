"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IEpic, ILinkDetails } from "@plane/types";
import { EpicService } from "@/services/epic.service";
import { EpicArchiveService } from "@/services/epic_archive.service";
import { queryKeys } from "./query-keys";

// Service instances
const epicService = new EpicService();
const epicArchiveService = new EpicArchiveService();

/**
 * Hook to fetch all epics for a project.
 * Replaces MobX EpicsStore.fetchEpics for read operations.
 *
 * @example
 * const { data: epics, isLoading } = useProjectEpics(workspaceSlug, projectId);
 */
export function useProjectEpics(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.epics.all(workspaceSlug, projectId),
    queryFn: () => epicService.getEpics(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch workspace epics.
 * Replaces MobX EpicsStore.fetchWorkspaceEpics for read operations.
 *
 * @example
 * const { data: epics, isLoading } = useWorkspaceEpics(workspaceSlug);
 */
export function useWorkspaceEpics(workspaceSlug: string) {
  return useQuery({
    queryKey: [...queryKeys.epics.all(workspaceSlug, ""), "workspace"],
    queryFn: () => epicService.getWorkspaceEpics(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch epic details by ID.
 * Replaces MobX EpicsStore.fetchEpicDetails for read operations.
 *
 * @example
 * const { data: epic, isLoading } = useEpicDetails(workspaceSlug, projectId, epicId);
 */
export function useEpicDetails(workspaceSlug: string, projectId: string, epicId: string) {
  return useQuery({
    queryKey: queryKeys.epics.detail(epicId),
    queryFn: () => epicService.getEpicDetails(workspaceSlug, projectId, epicId),
    enabled: !!workspaceSlug && !!projectId && !!epicId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch archived epics for a project.
 * Replaces MobX EpicsStore.fetchArchivedEpics for read operations.
 *
 * @example
 * const { data: archivedEpics, isLoading } = useArchivedEpics(workspaceSlug, projectId);
 */
export function useArchivedEpics(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: [...queryKeys.epics.all(workspaceSlug, projectId), "archived"],
    queryFn: () => epicArchiveService.getArchivedEpics(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateEpicParams {
  workspaceSlug: string;
  projectId: string;
  data: Partial<IEpic>;
}

/**
 * Hook to create a new epic with optimistic updates.
 * Replaces MobX EpicsStore.createEpic for write operations.
 *
 * @example
 * const { mutate: createEpic, isPending } = useCreateEpic();
 * createEpic({ workspaceSlug, projectId, data: { name: "Epic 1" } });
 */
export function useCreateEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: CreateEpicParams) =>
      epicService.createEpic(workspaceSlug, projectId, data),
    onMutate: async ({ workspaceSlug, projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });

      const previousEpics = queryClient.getQueryData<IEpic[]>(queryKeys.epics.all(workspaceSlug, projectId));

      // Optimistic update with temporary ID
      if (previousEpics) {
        const optimisticEpic: IEpic = {
          id: `temp-${Date.now()}`,
          name: data.name ?? "",
          description: data.description ?? "",
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          description_text: data.description_text ?? null,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          description_html: data.description_html ?? null,
          start_date: data.start_date ?? null,
          target_date: data.target_date ?? null,
          project_id: projectId,
          workspace_id: "",
          lead_id: null,
          sort_order: previousEpics.length + 1,
          status: "backlog",
          archived_at: null,
          is_favorite: false,
          member_ids: [],
          link_epic: [],
          view_props: { filters: {} },
          total_issues: 0,
          completed_issues: 0,
          cancelled_issues: 0,
          started_issues: 0,
          backlog_issues: 0,
          unstarted_issues: 0,
          sub_issues: 0,
          backlog_estimate_points: 0,
          started_estimate_points: 0,
          unstarted_estimate_points: 0,
          cancelled_estimate_points: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData<IEpic[]>(queryKeys.epics.all(workspaceSlug, projectId), [
          ...previousEpics,
          optimisticEpic,
        ]);
      }

      return { previousEpics, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEpics && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.epics.all(context.workspaceSlug, context.projectId),
          context.previousEpics
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });
    },
  });
}

interface UpdateEpicParams {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
  data: Partial<IEpic>;
}

/**
 * Hook to update a epic with optimistic updates.
 * Replaces MobX EpicsStore.updateEpicDetails for write operations.
 *
 * @example
 * const { mutate: updateEpic, isPending } = useUpdateEpic();
 * updateEpic({ workspaceSlug, projectId, epicId, data: { name: "Updated Epic" } });
 */
export function useUpdateEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, epicId, data }: UpdateEpicParams) =>
      epicService.patchEpic(workspaceSlug, projectId, epicId, data),
    onMutate: async ({ workspaceSlug, projectId, epicId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.epics.detail(epicId) });

      const previousEpics = queryClient.getQueryData<IEpic[]>(queryKeys.epics.all(workspaceSlug, projectId));
      const previousEpicDetail = queryClient.getQueryData<IEpic>(queryKeys.epics.detail(epicId));

      if (previousEpics) {
        queryClient.setQueryData<IEpic[]>(
          queryKeys.epics.all(workspaceSlug, projectId),
          previousEpics.map((mod) => (mod.id === epicId ? { ...mod, ...data } : mod))
        );
      }

      if (previousEpicDetail) {
        queryClient.setQueryData<IEpic>(queryKeys.epics.detail(epicId), {
          ...previousEpicDetail,
          ...data,
        });
      }

      return { previousEpics, previousEpicDetail, workspaceSlug, projectId, epicId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousEpics) {
          queryClient.setQueryData(
            queryKeys.epics.all(context.workspaceSlug, context.projectId),
            context.previousEpics
          );
        }
        if (context.previousEpicDetail) {
          queryClient.setQueryData(queryKeys.epics.detail(context.epicId), context.previousEpicDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, epicId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.epics.detail(epicId) });
    },
  });
}

interface DeleteEpicParams {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
}

/**
 * Hook to delete a epic with optimistic updates.
 * Replaces MobX EpicsStore.deleteEpic for write operations.
 *
 * @example
 * const { mutate: deleteEpic, isPending } = useDeleteEpic();
 * deleteEpic({ workspaceSlug, projectId, epicId });
 */
export function useDeleteEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, epicId }: DeleteEpicParams) =>
      epicService.deleteEpic(workspaceSlug, projectId, epicId),
    onMutate: async ({ workspaceSlug, projectId, epicId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });

      const previousEpics = queryClient.getQueryData<IEpic[]>(queryKeys.epics.all(workspaceSlug, projectId));

      if (previousEpics) {
        queryClient.setQueryData<IEpic[]>(
          queryKeys.epics.all(workspaceSlug, projectId),
          previousEpics.filter((mod) => mod.id !== epicId)
        );
      }

      return { previousEpics, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEpics && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.epics.all(context.workspaceSlug, context.projectId),
          context.previousEpics
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, epicId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });
      void queryClient.removeQueries({ queryKey: queryKeys.epics.detail(epicId) });
    },
  });
}

interface ArchiveEpicParams {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
}

/**
 * Hook to archive a epic with optimistic updates.
 * Replaces MobX EpicsStore.archiveEpic for write operations.
 *
 * @example
 * const { mutate: archiveEpic, isPending } = useArchiveEpic();
 * archiveEpic({ workspaceSlug, projectId, epicId });
 */
export function useArchiveEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, epicId }: ArchiveEpicParams) =>
      epicArchiveService.archiveEpic(workspaceSlug, projectId, epicId),
    onMutate: async ({ workspaceSlug, projectId, epicId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });

      const previousEpics = queryClient.getQueryData<IEpic[]>(queryKeys.epics.all(workspaceSlug, projectId));

      if (previousEpics) {
        queryClient.setQueryData<IEpic[]>(
          queryKeys.epics.all(workspaceSlug, projectId),
          previousEpics.map((mod) => (mod.id === epicId ? { ...mod, archived_at: new Date().toISOString() } : mod))
        );
      }

      return { previousEpics, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEpics && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.epics.all(context.workspaceSlug, context.projectId),
          context.previousEpics
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.epics.all(workspaceSlug, projectId), "archived"],
      });
    },
  });
}

/**
 * Hook to restore an archived epic with optimistic updates.
 * Replaces MobX EpicsStore.restoreEpic for write operations.
 *
 * @example
 * const { mutate: restoreEpic, isPending } = useRestoreEpic();
 * restoreEpic({ workspaceSlug, projectId, epicId });
 */
export function useRestoreEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, epicId }: ArchiveEpicParams) =>
      epicArchiveService.restoreEpic(workspaceSlug, projectId, epicId),
    onMutate: async ({ workspaceSlug, projectId, epicId }) => {
      const archivedKey = [...queryKeys.epics.all(workspaceSlug, projectId), "archived"];
      await queryClient.cancelQueries({ queryKey: archivedKey });

      const previousArchivedEpics = queryClient.getQueryData<IEpic[]>(archivedKey);

      if (previousArchivedEpics) {
        queryClient.setQueryData<IEpic[]>(
          archivedKey,
          previousArchivedEpics.map((mod) => (mod.id === epicId ? { ...mod, archived_at: null } : mod))
        );
      }

      return { previousArchivedEpics, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousArchivedEpics && context.workspaceSlug && context.projectId) {
        const archivedKey = [...queryKeys.epics.all(context.workspaceSlug, context.projectId), "archived"];
        queryClient.setQueryData(archivedKey, context.previousArchivedEpics);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.epics.all(workspaceSlug, projectId), "archived"],
      });
    },
  });
}

interface CreateEpicLinkParams {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
  data: Partial<ILinkDetails>;
}

/**
 * Hook to create a epic link.
 * Replaces MobX EpicsStore.createEpicLink for write operations.
 *
 * @example
 * const { mutate: createLink, isPending } = useCreateEpicLink();
 * createLink({ workspaceSlug, projectId, epicId, data: { url: "https://example.com", title: "Example" } });
 */
export function useCreateEpicLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, epicId, data }: CreateEpicLinkParams) =>
      epicService.createEpicLink(workspaceSlug, projectId, epicId, data),
    onSettled: (_data, _error, { epicId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.epics.detail(epicId) });
    },
  });
}

interface UpdateEpicLinkParams {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
  linkId: string;
  data: Partial<ILinkDetails>;
}

/**
 * Hook to update a epic link with optimistic updates.
 * Replaces MobX EpicsStore.updateEpicLink for write operations.
 *
 * @example
 * const { mutate: updateLink, isPending } = useUpdateEpicLink();
 * updateLink({ workspaceSlug, projectId, epicId, linkId, data: { title: "Updated Title" } });
 */
export function useUpdateEpicLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, epicId, linkId, data }: UpdateEpicLinkParams) =>
      epicService.updateEpicLink(workspaceSlug, projectId, epicId, linkId, data),
    onMutate: async ({ epicId, linkId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.epics.detail(epicId) });

      const previousEpic = queryClient.getQueryData<IEpic>(queryKeys.epics.detail(epicId));

      if (previousEpic) {
        queryClient.setQueryData<IEpic>(queryKeys.epics.detail(epicId), {
          ...previousEpic,
          link_epic: previousEpic.link_epic?.map((link) => (link.id === linkId ? { ...link, ...data } : link)),
        });
      }

      return { previousEpic, epicId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEpic && context.epicId) {
        queryClient.setQueryData(queryKeys.epics.detail(context.epicId), context.previousEpic);
      }
    },
    onSettled: (_data, _error, { epicId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.epics.detail(epicId) });
    },
  });
}

interface AddEpicToFavoritesParams {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
}

/**
 * Hook to add an epic to favorites with optimistic updates.
 * Replaces MobX EpicsStore.addEpicToFavorites for write operations.
 *
 * @example
 * const { mutate: addToFavorites, isPending } = useAddEpicToFavorites();
 * addToFavorites({ workspaceSlug, projectId, epicId });
 */
export function useAddEpicToFavorites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, epicId }: AddEpicToFavoritesParams) =>
      epicService.addEpicToFavorites(workspaceSlug, projectId, { epic: epicId }),
    onMutate: async ({ workspaceSlug, projectId, epicId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });

      const previousEpics = queryClient.getQueryData<IEpic[]>(queryKeys.epics.all(workspaceSlug, projectId));

      if (previousEpics) {
        queryClient.setQueryData<IEpic[]>(
          queryKeys.epics.all(workspaceSlug, projectId),
          previousEpics.map((epic) => (epic.id === epicId ? { ...epic, is_favorite: true } : epic))
        );
      }

      return { previousEpics, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEpics && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.epics.all(context.workspaceSlug, context.projectId),
          context.previousEpics
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });
    },
  });
}

interface RemoveEpicFromFavoritesParams {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
}

/**
 * Hook to remove an epic from favorites with optimistic updates.
 * Replaces MobX EpicsStore.removeEpicFromFavorites for write operations.
 *
 * @example
 * const { mutate: removeFromFavorites, isPending } = useRemoveEpicFromFavorites();
 * removeFromFavorites({ workspaceSlug, projectId, epicId });
 */
export function useRemoveEpicFromFavorites() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, epicId }: RemoveEpicFromFavoritesParams) =>
      epicService.removeEpicFromFavorites(workspaceSlug, projectId, epicId),
    onMutate: async ({ workspaceSlug, projectId, epicId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });

      const previousEpics = queryClient.getQueryData<IEpic[]>(queryKeys.epics.all(workspaceSlug, projectId));

      if (previousEpics) {
        queryClient.setQueryData<IEpic[]>(
          queryKeys.epics.all(workspaceSlug, projectId),
          previousEpics.map((epic) => (epic.id === epicId ? { ...epic, is_favorite: false } : epic))
        );
      }

      return { previousEpics, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEpics && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.epics.all(context.workspaceSlug, context.projectId),
          context.previousEpics
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.epics.all(workspaceSlug, projectId) });
    },
  });
}

interface DeleteEpicLinkParams {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
  linkId: string;
}

/**
 * Hook to delete a epic link with optimistic updates.
 * Replaces MobX EpicsStore.deleteEpicLink for write operations.
 *
 * @example
 * const { mutate: deleteLink, isPending } = useDeleteEpicLink();
 * deleteLink({ workspaceSlug, projectId, epicId, linkId });
 */
export function useDeleteEpicLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, epicId, linkId }: DeleteEpicLinkParams) =>
      epicService.deleteEpicLink(workspaceSlug, projectId, epicId, linkId),
    onMutate: async ({ epicId, linkId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.epics.detail(epicId) });

      const previousEpic = queryClient.getQueryData<IEpic>(queryKeys.epics.detail(epicId));

      if (previousEpic) {
        queryClient.setQueryData<IEpic>(queryKeys.epics.detail(epicId), {
          ...previousEpic,
          link_epic: previousEpic.link_epic?.filter((link) => link.id !== linkId),
        });
      }

      return { previousEpic, epicId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousEpic && context.epicId) {
        queryClient.setQueryData(queryKeys.epics.detail(context.epicId), context.previousEpic);
      }
    },
    onSettled: (_data, _error, { epicId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.epics.detail(epicId) });
    },
  });
}

// Utility functions for derived data

/**
 * Get epic by ID from a epics array.
 *
 * @example
 * const { data: epics } = useProjectEpics(workspaceSlug, projectId);
 * const epic = getEpicById(epics, epicId);
 */
export function getEpicById(epics: IEpic[] | undefined, epicId: string | null | undefined): IEpic | undefined {
  if (!epics || !epicId) return undefined;
  return epics.find((mod) => mod.id === epicId);
}

/**
 * Get epic name by ID from a epics array.
 *
 * @example
 * const { data: epics } = useProjectEpics(workspaceSlug, projectId);
 * const name = getEpicNameById(epics, epicId);
 */
export function getEpicNameById(epics: IEpic[] | undefined, epicId: string | null | undefined): string | undefined {
  if (!epics || !epicId) return undefined;
  return epics.find((mod) => mod.id === epicId)?.name;
}

/**
 * Get epic IDs from epics array.
 *
 * @example
 * const { data: epics } = useProjectEpics(workspaceSlug, projectId);
 * const epicIds = getEpicIds(epics);
 */
export function getEpicIds(epics: IEpic[] | undefined): string[] {
  if (!epics) return [];
  return epics.map((mod) => mod.id);
}

/**
 * Get active epics (not archived) from epics array.
 *
 * @example
 * const { data: epics } = useProjectEpics(workspaceSlug, projectId);
 * const activeEpics = getActiveEpics(epics);
 */
export function getActiveEpics(epics: IEpic[] | undefined): IEpic[] {
  if (!epics) return [];
  return epics.filter((mod) => !mod.archived_at);
}

/**
 * Get favorite epics from epics array.
 *
 * @example
 * const { data: epics } = useProjectEpics(workspaceSlug, projectId);
 * const favoriteEpics = getFavoriteEpics(epics);
 */
export function getFavoriteEpics(epics: IEpic[] | undefined): IEpic[] {
  if (!epics) return [];
  return epics.filter((mod) => mod.is_favorite);
}
