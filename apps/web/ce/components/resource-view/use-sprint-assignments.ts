"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@plane/hooks";

// Type for sprint assignments: maps "memberId-sprintId" to projectId
type TSprintAssignments = Record<string, string>;

/**
 * Hook to manage sprint project assignments in localStorage.
 * Assignments are workspace-scoped for data isolation.
 *
 * @example
 * const { getAssignment, setAssignment, clearAssignment } = useSprintProjectAssignments(workspaceSlug);
 * const projectId = getAssignment(memberId, sprintId);
 * setAssignment(memberId, sprintId, projectId);
 */
export function useSprintProjectAssignments(workspaceSlug: string) {
  const storageKey = `plane_sprint_assignments_${workspaceSlug}`;
  const { storedValue, setValue } = useLocalStorage<TSprintAssignments>(storageKey, {});

  // Create a composite key for member+sprint combination
  const makeKey = useCallback((memberId: string, sprintId: string) => `${memberId}-${sprintId}`, []);

  // Get the assigned project for a member's sprint
  const getAssignment = useCallback(
    (memberId: string, sprintId: string): string | undefined => {
      const key = makeKey(memberId, sprintId);
      return storedValue?.[key];
    },
    [storedValue, makeKey]
  );

  // Set or update the project assignment for a member's sprint
  const setAssignment = useCallback(
    (memberId: string, sprintId: string, projectId: string | null) => {
      const key = makeKey(memberId, sprintId);
      const newAssignments = { ...storedValue };

      if (projectId === null || projectId === "") {
        delete newAssignments[key];
      } else {
        newAssignments[key] = projectId;
      }

      setValue(newAssignments);
    },
    [storedValue, setValue, makeKey]
  );

  // Clear assignment for a member's sprint
  const clearAssignment = useCallback(
    (memberId: string, sprintId: string) => {
      setAssignment(memberId, sprintId, null);
    },
    [setAssignment]
  );

  // Clear all assignments (useful for reset)
  const clearAllAssignments = useCallback(() => {
    setValue({});
  }, [setValue]);

  // Get all assignments as a map
  const assignments = useMemo(() => storedValue ?? {}, [storedValue]);

  return {
    assignments,
    getAssignment,
    setAssignment,
    clearAssignment,
    clearAllAssignments,
  };
}
