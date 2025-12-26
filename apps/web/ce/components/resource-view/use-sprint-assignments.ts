"use client";

import { useCallback, useMemo } from "react";
import {
  useSprintMemberProjects,
  useSetSprintMemberProject,
  useDeleteSprintMemberProject,
  getSprintMemberProjectAssignment,
} from "@/store/queries";

/**
 * Hook to manage sprint project assignments via the API.
 * Assignments are stored in the database (SprintMemberProject table).
 * This is the source of truth for which sprints appear in each project's sprint view.
 *
 * @example
 * const { getAssignment, setAssignment, clearAssignment, isLoading } = useSprintProjectAssignments(workspaceSlug);
 * const projectId = getAssignment(memberId, sprintId);
 * setAssignment(memberId, sprintId, projectId);
 */
export function useSprintProjectAssignments(workspaceSlug: string) {
  const { data: assignments, isLoading, error } = useSprintMemberProjects(workspaceSlug);
  const { mutate: setAssignmentMutation } = useSetSprintMemberProject();
  const { mutate: deleteAssignmentMutation } = useDeleteSprintMemberProject();

  // Get the assigned project for a member's sprint
  const getAssignment = useCallback(
    (memberId: string, sprintId: string): string | undefined => {
      return getSprintMemberProjectAssignment(assignments, memberId, sprintId);
    },
    [assignments]
  );

  // Set or update the project assignment for a member's sprint
  const setAssignment = useCallback(
    (memberId: string, sprintId: string, projectId: string | null) => {
      if (projectId === null || projectId === "") {
        // Clear assignment
        deleteAssignmentMutation({
          workspaceSlug,
          sprintId,
          memberId,
        });
      } else {
        // Set or update assignment
        setAssignmentMutation({
          workspaceSlug,
          sprintId,
          memberId,
          projectId,
        });
      }
    },
    [workspaceSlug, setAssignmentMutation, deleteAssignmentMutation]
  );

  // Clear assignment for a member's sprint
  const clearAssignment = useCallback(
    (memberId: string, sprintId: string) => {
      setAssignment(memberId, sprintId, null);
    },
    [setAssignment]
  );

  // Clear all assignments - not commonly used, but kept for compatibility
  const clearAllAssignments = useCallback(() => {
    // This would require a bulk delete endpoint which we don't have
    // For now, do nothing - individual assignments should be cleared via clearAssignment
    console.warn("clearAllAssignments is not supported with database-backed assignments");
  }, []);

  // Get all assignments as a map (for compatibility with old interface)
  const assignmentsMap = useMemo(() => {
    if (!assignments) return {};
    const map: Record<string, string> = {};
    for (const assignment of assignments) {
      const key = `${assignment.member}-${assignment.sprint}`;
      map[key] = assignment.project;
    }
    return map;
  }, [assignments]);

  return {
    assignments: assignmentsMap,
    getAssignment,
    setAssignment,
    clearAssignment,
    clearAllAssignments,
    isLoading,
    error,
  };
}
