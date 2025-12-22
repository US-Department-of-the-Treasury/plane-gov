export { QueryProvider } from "./query-provider";
export { createQueryClient, getQueryClient } from "./query-client";
export { queryKeys } from "./query-keys";
export type { QueryKeys } from "./query-keys";

// Instance queries
export {
  useInstanceInfo,
  useUpdateInstance,
  useInstanceAdmins,
  useInstanceConfigurations,
  useUpdateInstanceConfigurations,
  useDisableEmail,
  computeFormattedConfig,
} from "./instance";

// User queries
export { useCurrentUser, useSignOut } from "./user";

// Workspace queries
export { useWorkspaces, useCreateWorkspace, getWorkspaceById, getAllWorkspaces } from "./workspace";

// Theme store (Zustand - re-export from parent directory)
export { useThemeStore } from "../theme.store.zustand";
