"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IModule, ILinkDetails } from "@plane/types";
import { ModuleService } from "@/services/module.service";
import { ModuleArchiveService } from "@/services/module_archive.service";
import { queryKeys } from "./query-keys";

// Service instances
const moduleService = new ModuleService();
const moduleArchiveService = new ModuleArchiveService();

/**
 * Hook to fetch all modules for a project.
 * Replaces MobX ModulesStore.fetchModules for read operations.
 *
 * @example
 * const { data: modules, isLoading } = useProjectModules(workspaceSlug, projectId);
 */
export function useProjectModules(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: queryKeys.modules.all(workspaceSlug, projectId),
    queryFn: () => moduleService.getModules(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to fetch workspace modules.
 * Replaces MobX ModulesStore.fetchWorkspaceModules for read operations.
 *
 * @example
 * const { data: modules, isLoading } = useWorkspaceModules(workspaceSlug);
 */
export function useWorkspaceModules(workspaceSlug: string) {
  return useQuery({
    queryKey: [...queryKeys.modules.all(workspaceSlug, ""), "workspace"],
    queryFn: () => moduleService.getWorkspaceModules(workspaceSlug),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch module details by ID.
 * Replaces MobX ModulesStore.fetchModuleDetails for read operations.
 *
 * @example
 * const { data: module, isLoading } = useModuleDetails(workspaceSlug, projectId, moduleId);
 */
export function useModuleDetails(workspaceSlug: string, projectId: string, moduleId: string) {
  return useQuery({
    queryKey: queryKeys.modules.detail(moduleId),
    queryFn: () => moduleService.getModuleDetails(workspaceSlug, projectId, moduleId),
    enabled: !!workspaceSlug && !!projectId && !!moduleId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook to fetch archived modules for a project.
 * Replaces MobX ModulesStore.fetchArchivedModules for read operations.
 *
 * @example
 * const { data: archivedModules, isLoading } = useArchivedModules(workspaceSlug, projectId);
 */
export function useArchivedModules(workspaceSlug: string, projectId: string) {
  return useQuery({
    queryKey: [...queryKeys.modules.all(workspaceSlug, projectId), "archived"],
    queryFn: () => moduleArchiveService.getArchivedModules(workspaceSlug, projectId),
    enabled: !!workspaceSlug && !!projectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface CreateModuleParams {
  workspaceSlug: string;
  projectId: string;
  data: Partial<IModule>;
}

/**
 * Hook to create a new module with optimistic updates.
 * Replaces MobX ModulesStore.createModule for write operations.
 *
 * @example
 * const { mutate: createModule, isPending } = useCreateModule();
 * createModule({ workspaceSlug, projectId, data: { name: "Module 1" } });
 */
export function useCreateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, data }: CreateModuleParams) =>
      moduleService.createModule(workspaceSlug, projectId, data),
    onMutate: async ({ workspaceSlug, projectId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.modules.all(workspaceSlug, projectId) });

      const previousModules = queryClient.getQueryData<IModule[]>(queryKeys.modules.all(workspaceSlug, projectId));

      // Optimistic update with temporary ID
      if (previousModules) {
        const optimisticModule: IModule = {
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
          sort_order: previousModules.length + 1,
          status: "backlog",
          archived_at: null,
          is_favorite: false,
          member_ids: [],
          link_module: [],
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
        queryClient.setQueryData<IModule[]>(queryKeys.modules.all(workspaceSlug, projectId), [
          ...previousModules,
          optimisticModule,
        ]);
      }

      return { previousModules, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousModules && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.modules.all(context.workspaceSlug, context.projectId),
          context.previousModules
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.modules.all(workspaceSlug, projectId) });
    },
  });
}

interface UpdateModuleParams {
  workspaceSlug: string;
  projectId: string;
  moduleId: string;
  data: Partial<IModule>;
}

/**
 * Hook to update a module with optimistic updates.
 * Replaces MobX ModulesStore.updateModuleDetails for write operations.
 *
 * @example
 * const { mutate: updateModule, isPending } = useUpdateModule();
 * updateModule({ workspaceSlug, projectId, moduleId, data: { name: "Updated Module" } });
 */
export function useUpdateModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, moduleId, data }: UpdateModuleParams) =>
      moduleService.patchModule(workspaceSlug, projectId, moduleId, data),
    onMutate: async ({ workspaceSlug, projectId, moduleId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.modules.all(workspaceSlug, projectId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.modules.detail(moduleId) });

      const previousModules = queryClient.getQueryData<IModule[]>(queryKeys.modules.all(workspaceSlug, projectId));
      const previousModuleDetail = queryClient.getQueryData<IModule>(queryKeys.modules.detail(moduleId));

      if (previousModules) {
        queryClient.setQueryData<IModule[]>(
          queryKeys.modules.all(workspaceSlug, projectId),
          previousModules.map((mod) => (mod.id === moduleId ? { ...mod, ...data } : mod))
        );
      }

      if (previousModuleDetail) {
        queryClient.setQueryData<IModule>(queryKeys.modules.detail(moduleId), {
          ...previousModuleDetail,
          ...data,
        });
      }

      return { previousModules, previousModuleDetail, workspaceSlug, projectId, moduleId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        if (context.previousModules) {
          queryClient.setQueryData(
            queryKeys.modules.all(context.workspaceSlug, context.projectId),
            context.previousModules
          );
        }
        if (context.previousModuleDetail) {
          queryClient.setQueryData(queryKeys.modules.detail(context.moduleId), context.previousModuleDetail);
        }
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, moduleId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.modules.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.modules.detail(moduleId) });
    },
  });
}

interface DeleteModuleParams {
  workspaceSlug: string;
  projectId: string;
  moduleId: string;
}

/**
 * Hook to delete a module with optimistic updates.
 * Replaces MobX ModulesStore.deleteModule for write operations.
 *
 * @example
 * const { mutate: deleteModule, isPending } = useDeleteModule();
 * deleteModule({ workspaceSlug, projectId, moduleId });
 */
export function useDeleteModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, moduleId }: DeleteModuleParams) =>
      moduleService.deleteModule(workspaceSlug, projectId, moduleId),
    onMutate: async ({ workspaceSlug, projectId, moduleId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.modules.all(workspaceSlug, projectId) });

      const previousModules = queryClient.getQueryData<IModule[]>(queryKeys.modules.all(workspaceSlug, projectId));

      if (previousModules) {
        queryClient.setQueryData<IModule[]>(
          queryKeys.modules.all(workspaceSlug, projectId),
          previousModules.filter((mod) => mod.id !== moduleId)
        );
      }

      return { previousModules, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousModules && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.modules.all(context.workspaceSlug, context.projectId),
          context.previousModules
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId, moduleId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.modules.all(workspaceSlug, projectId) });
      void queryClient.removeQueries({ queryKey: queryKeys.modules.detail(moduleId) });
    },
  });
}

interface ArchiveModuleParams {
  workspaceSlug: string;
  projectId: string;
  moduleId: string;
}

/**
 * Hook to archive a module with optimistic updates.
 * Replaces MobX ModulesStore.archiveModule for write operations.
 *
 * @example
 * const { mutate: archiveModule, isPending } = useArchiveModule();
 * archiveModule({ workspaceSlug, projectId, moduleId });
 */
export function useArchiveModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, moduleId }: ArchiveModuleParams) =>
      moduleArchiveService.archiveModule(workspaceSlug, projectId, moduleId),
    onMutate: async ({ workspaceSlug, projectId, moduleId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.modules.all(workspaceSlug, projectId) });

      const previousModules = queryClient.getQueryData<IModule[]>(queryKeys.modules.all(workspaceSlug, projectId));

      if (previousModules) {
        queryClient.setQueryData<IModule[]>(
          queryKeys.modules.all(workspaceSlug, projectId),
          previousModules.map((mod) => (mod.id === moduleId ? { ...mod, archived_at: new Date().toISOString() } : mod))
        );
      }

      return { previousModules, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousModules && context.workspaceSlug && context.projectId) {
        queryClient.setQueryData(
          queryKeys.modules.all(context.workspaceSlug, context.projectId),
          context.previousModules
        );
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.modules.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.modules.all(workspaceSlug, projectId), "archived"],
      });
    },
  });
}

/**
 * Hook to restore an archived module with optimistic updates.
 * Replaces MobX ModulesStore.restoreModule for write operations.
 *
 * @example
 * const { mutate: restoreModule, isPending } = useRestoreModule();
 * restoreModule({ workspaceSlug, projectId, moduleId });
 */
export function useRestoreModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, moduleId }: ArchiveModuleParams) =>
      moduleArchiveService.restoreModule(workspaceSlug, projectId, moduleId),
    onMutate: async ({ workspaceSlug, projectId, moduleId }) => {
      const archivedKey = [...queryKeys.modules.all(workspaceSlug, projectId), "archived"];
      await queryClient.cancelQueries({ queryKey: archivedKey });

      const previousArchivedModules = queryClient.getQueryData<IModule[]>(archivedKey);

      if (previousArchivedModules) {
        queryClient.setQueryData<IModule[]>(
          archivedKey,
          previousArchivedModules.map((mod) => (mod.id === moduleId ? { ...mod, archived_at: null } : mod))
        );
      }

      return { previousArchivedModules, workspaceSlug, projectId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousArchivedModules && context.workspaceSlug && context.projectId) {
        const archivedKey = [...queryKeys.modules.all(context.workspaceSlug, context.projectId), "archived"];
        queryClient.setQueryData(archivedKey, context.previousArchivedModules);
      }
    },
    onSettled: (_data, _error, { workspaceSlug, projectId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.modules.all(workspaceSlug, projectId) });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.modules.all(workspaceSlug, projectId), "archived"],
      });
    },
  });
}

interface CreateModuleLinkParams {
  workspaceSlug: string;
  projectId: string;
  moduleId: string;
  data: Partial<ILinkDetails>;
}

/**
 * Hook to create a module link.
 * Replaces MobX ModulesStore.createModuleLink for write operations.
 *
 * @example
 * const { mutate: createLink, isPending } = useCreateModuleLink();
 * createLink({ workspaceSlug, projectId, moduleId, data: { url: "https://example.com", title: "Example" } });
 */
export function useCreateModuleLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, moduleId, data }: CreateModuleLinkParams) =>
      moduleService.createModuleLink(workspaceSlug, projectId, moduleId, data),
    onSettled: (_data, _error, { moduleId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.modules.detail(moduleId) });
    },
  });
}

interface UpdateModuleLinkParams {
  workspaceSlug: string;
  projectId: string;
  moduleId: string;
  linkId: string;
  data: Partial<ILinkDetails>;
}

/**
 * Hook to update a module link with optimistic updates.
 * Replaces MobX ModulesStore.updateModuleLink for write operations.
 *
 * @example
 * const { mutate: updateLink, isPending } = useUpdateModuleLink();
 * updateLink({ workspaceSlug, projectId, moduleId, linkId, data: { title: "Updated Title" } });
 */
export function useUpdateModuleLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, moduleId, linkId, data }: UpdateModuleLinkParams) =>
      moduleService.updateModuleLink(workspaceSlug, projectId, moduleId, linkId, data),
    onMutate: async ({ moduleId, linkId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.modules.detail(moduleId) });

      const previousModule = queryClient.getQueryData<IModule>(queryKeys.modules.detail(moduleId));

      if (previousModule) {
        queryClient.setQueryData<IModule>(queryKeys.modules.detail(moduleId), {
          ...previousModule,
          link_module: previousModule.link_module?.map((link) => (link.id === linkId ? { ...link, ...data } : link)),
        });
      }

      return { previousModule, moduleId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousModule && context.moduleId) {
        queryClient.setQueryData(queryKeys.modules.detail(context.moduleId), context.previousModule);
      }
    },
    onSettled: (_data, _error, { moduleId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.modules.detail(moduleId) });
    },
  });
}

interface DeleteModuleLinkParams {
  workspaceSlug: string;
  projectId: string;
  moduleId: string;
  linkId: string;
}

/**
 * Hook to delete a module link with optimistic updates.
 * Replaces MobX ModulesStore.deleteModuleLink for write operations.
 *
 * @example
 * const { mutate: deleteLink, isPending } = useDeleteModuleLink();
 * deleteLink({ workspaceSlug, projectId, moduleId, linkId });
 */
export function useDeleteModuleLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceSlug, projectId, moduleId, linkId }: DeleteModuleLinkParams) =>
      moduleService.deleteModuleLink(workspaceSlug, projectId, moduleId, linkId),
    onMutate: async ({ moduleId, linkId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.modules.detail(moduleId) });

      const previousModule = queryClient.getQueryData<IModule>(queryKeys.modules.detail(moduleId));

      if (previousModule) {
        queryClient.setQueryData<IModule>(queryKeys.modules.detail(moduleId), {
          ...previousModule,
          link_module: previousModule.link_module?.filter((link) => link.id !== linkId),
        });
      }

      return { previousModule, moduleId };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousModule && context.moduleId) {
        queryClient.setQueryData(queryKeys.modules.detail(context.moduleId), context.previousModule);
      }
    },
    onSettled: (_data, _error, { moduleId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.modules.detail(moduleId) });
    },
  });
}

// Utility functions for derived data

/**
 * Get module by ID from a modules array.
 *
 * @example
 * const { data: modules } = useProjectModules(workspaceSlug, projectId);
 * const module = getModuleById(modules, moduleId);
 */
export function getModuleById(modules: IModule[] | undefined, moduleId: string | null | undefined): IModule | undefined {
  if (!modules || !moduleId) return undefined;
  return modules.find((mod) => mod.id === moduleId);
}

/**
 * Get module name by ID from a modules array.
 *
 * @example
 * const { data: modules } = useProjectModules(workspaceSlug, projectId);
 * const name = getModuleNameById(modules, moduleId);
 */
export function getModuleNameById(modules: IModule[] | undefined, moduleId: string | null | undefined): string | undefined {
  if (!modules || !moduleId) return undefined;
  return modules.find((mod) => mod.id === moduleId)?.name;
}

/**
 * Get module IDs from modules array.
 *
 * @example
 * const { data: modules } = useProjectModules(workspaceSlug, projectId);
 * const moduleIds = getModuleIds(modules);
 */
export function getModuleIds(modules: IModule[] | undefined): string[] {
  if (!modules) return [];
  return modules.map((mod) => mod.id);
}

/**
 * Get active modules (not archived) from modules array.
 *
 * @example
 * const { data: modules } = useProjectModules(workspaceSlug, projectId);
 * const activeModules = getActiveModules(modules);
 */
export function getActiveModules(modules: IModule[] | undefined): IModule[] {
  if (!modules) return [];
  return modules.filter((mod) => !mod.archived_at);
}

/**
 * Get favorite modules from modules array.
 *
 * @example
 * const { data: modules } = useProjectModules(workspaceSlug, projectId);
 * const favoriteModules = getFavoriteModules(modules);
 */
export function getFavoriteModules(modules: IModule[] | undefined): IModule[] {
  if (!modules) return [];
  return modules.filter((mod) => mod.is_favorite);
}
