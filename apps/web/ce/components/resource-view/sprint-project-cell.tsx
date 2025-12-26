"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Logo } from "@plane/propel/emoji-icon-picker";
import { SelectCombobox } from "@plane/propel/combobox";
import { cn } from "@plane/utils";
// hooks
import { useProjects, getProjectById, getJoinedProjectIds } from "@/store/queries/project";

type SprintProjectCellProps = {
  workspaceSlug: string;
  memberId: string;
  sprintId: string;
  assignedProjectId: string | undefined;
  onAssignmentChange: (memberId: string, sprintId: string, projectId: string | null) => void;
  isActiveSprint?: boolean;
};

export function SprintProjectCell({
  workspaceSlug,
  memberId,
  sprintId,
  assignedProjectId,
  onAssignmentChange,
  isActiveSprint = false,
}: SprintProjectCellProps) {
  const { data: projects } = useProjects(workspaceSlug);

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

  // Handle value change
  const handleValueChange = (value: string | string[] | null) => {
    const projectId = typeof value === "string" ? value : null;
    onAssignmentChange(memberId, sprintId, projectId === "" ? null : projectId);
  };

  const hasAssignment = !!assignedProject;

  return (
    <div
      className={cn("group/cell flex w-36 min-w-36 items-center justify-center px-2 py-1.5", {
        "bg-accent-primary/5": isActiveSprint,
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
              <SelectCombobox.Item
                key={projectId}
                value={projectId}
                keywords={[project.name ?? ""]}
                className="flex items-center gap-2"
              >
                {project.logo_props && (
                  <span className="flex-shrink-0">
                    <Logo logo={project.logo_props} size={14} />
                  </span>
                )}
                <span className="truncate">{project.name}</span>
              </SelectCombobox.Item>
            );
          })}
        </SelectCombobox.Content>
      </SelectCombobox>
    </div>
  );
}
