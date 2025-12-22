/**
 * Re-export Zustand filter store for workspace draft issues.
 * Components should use the filter store directly for better performance and type safety.
 *
 * This file maintains backward compatibility while the codebase migrates away from MobX.
 */

// Re-export Zustand filter store
export { useWorkspaceDraftFilterStore } from "@/store/client";

// Re-export TanStack Query hooks for convenience
// Note: useWorkspaceDraftIssues is exported from use-workspace-draft-issue.ts as compatibility layer
export {
  useInfiniteWorkspaceDraftIssues,
  useWorkspaceDraftIssue,
  useCreateWorkspaceDraftIssue,
  useUpdateWorkspaceDraftIssue,
  useDeleteWorkspaceDraftIssue,
  useMoveWorkspaceDraftIssue,
} from "@/store/queries";
