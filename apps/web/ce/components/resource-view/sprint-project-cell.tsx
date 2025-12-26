"use client";

import { useMemo, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Logo } from "@plane/propel/emoji-icon-picker";
import { SelectCombobox } from "@plane/propel/combobox";
import { cn } from "@plane/utils";
// hooks
import { useProjects, getProjectById, getJoinedProjectIds } from "@/store/queries/project";
import { useMaterializeSprint } from "@/store/queries/sprint";

type SprintProjectCellProps = {
  workspaceSlug: string;
  memberId: string;
  /** Sprint ID (undefined for virtual sprints) */
  sprintId: string | undefined;
  /** Sprint number (only for virtual sprints that need materialization) */
  sprintNumber?: number;
  assignedProjectId: string | undefined;
  onAssignmentChange: (memberId: string, sprintId: string, projectId: string | null) => void;
  isActiveSprint?: boolean;
  /** Whether this is a virtual sprint (not yet in database) */
  isVirtualSprint?: boolean;
};

export function SprintProjectCell({
  workspaceSlug,
  memberId,
  sprintId,
  sprintNumber,
  assignedProjectId,
  onAssignmentChange,
  isActiveSprint = false,
  isVirtualSprint = false,
}: SprintProjectCellProps) {
  const { data: projects } = useProjects(workspaceSlug);
  const { mutateAsync: materializeSprint } = useMaterializeSprint();
  const [isMaterializing, setIsMaterializing] = useState(false);

  // Get project IDs
  const projectIds = useMemo(() => {
    if (!projects) return [];
    return getJoinedProjectIds(projects);
  }, [projects]);

  // Get assigned project details
  const assignedProject = useMemo(() => {
    if (!assignedProjectId || !projects) return undefined;
    return getProjectById(projects, assignedProjectId);
  }, [assignedProjectId, projects]);

  // Handle value change - for virtual sprints, materialize first
  const handleValueChange = (value: string | string[] | null): void => {
    void handleValueChangeAsync(value);
  };

  const handleValueChangeAsync = async (value: string | string[] | null) => {
    const projectId = typeof value === "string" ? value : null;

    // If clearing assignment and we have a real sprint ID
    if ((projectId === "" || projectId === null) && sprintId) {
      onAssignmentChange(memberId, sprintId, null);
      return;
    }

    // If this is a virtual sprint, we need to materialize it first
    if (isVirtualSprint && sprintNumber && projectId) {
      setIsMaterializing(true);
      try {
        const materializedSprint = await materializeSprint({
          workspaceSlug,
          sprintNumber,
        });
        // Now create the assignment with the real sprint ID
        onAssignmentChange(memberId, materializedSprint.id, projectId);
      } catch (error) {
        console.error("Failed to materialize sprint:", error);
      } finally {
        setIsMaterializing(false);
      }
      return;
    }

    // Regular real sprint assignment
    if (sprintId && projectId) {
      onAssignmentChange(memberId, sprintId, projectId);
    }
  };

  const hasAssignment = !!assignedProject;

  // Show loading state during materialization
  if (isMaterializing) {
    return (
      <div
        className={cn("group/cell flex w-36 min-w-36 items-center justify-center px-2 py-1.5", {
          "bg-accent-primary/5": isActiveSprint,
          "border-l border-dashed border-subtle": isVirtualSprint,
        })}
      >
        <Loader2 className="h-4 w-4 animate-spin text-placeholder" />
      </div>
    );
  }

  return (
    <div
      className={cn("group/cell flex w-36 min-w-36 items-center justify-center px-2 py-1.5", {
        "bg-accent-primary/5": isActiveSprint,
        "border-l border-dashed border-subtle": isVirtualSprint,
      })}
    >
      <SelectCombobox value={assignedProjectId ?? null} onValueChange={handleValueChange} multiple={false}>
        <SelectCombobox.Trigger className="w-full">
          {hasAssignment ? (
            <button
              type="button"
              className={cn(
                "w-full px-2 py-0.5 text-13 rounded transition-colors",
                "flex items-center gap-1.5 min-w-0",
                "hover:bg-layer-transparent-hover",
                "text-primary"
              )}
            >
              {assignedProject?.logo_props && (
                <span className="flex-shrink-0">
                  <Logo logo={assignedProject.logo_props} size={12} />
                </span>
              )}
              <span className="truncate">{assignedProject.name}</span>
            </button>
          ) : (
            <button
              type="button"
              className={cn(
                "w-full h-6 rounded transition-all",
                "flex items-center justify-center",
                "border border-dashed border-transparent",
                "group-hover/cell:border-subtle group-hover/cell:bg-layer-transparent-hover",
                "text-placeholder hover:text-tertiary"
              )}
            >
              <Plus className="h-3.5 w-3.5 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
            </button>
          )}
        </SelectCombobox.Trigger>

        <SelectCombobox.Content
          showSearch
          searchPlaceholder="Search projects..."
          emptyMessage="No matching projects"
          maxHeight="md"
          width="auto"
          className="w-56"
        >
          {/* Clear option - only show if there's an assignment */}
          {hasAssignment && (
            <SelectCombobox.Item value="" keywords={["none", "clear", "no project", "remove"]}>
              <span className="text-custom-text-400">Remove assignment</span>
            </SelectCombobox.Item>
          )}

          {/* Project options */}
          {projectIds.map((projectId) => {
            const project = projects ? getProjectById(projects, projectId) : undefined;
            if (!project) return null;

            return (
              <SelectCombobox.Item key={projectId} value={projectId} keywords={[project.name ?? ""]}>
                <div className="flex items-center gap-2">
                  {project.logo_props && (
                    <span className="flex-shrink-0">
                      <Logo logo={project.logo_props} size={14} />
                    </span>
                  )}
                  <span className="truncate">{project.name}</span>
                </div>
              </SelectCombobox.Item>
            );
          })}
        </SelectCombobox.Content>
      </SelectCombobox>
    </div>
  );
}
