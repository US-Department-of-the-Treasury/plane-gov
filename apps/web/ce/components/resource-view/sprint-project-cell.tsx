"use client";

import { useMemo } from "react";
import { useTranslation } from "@plane/i18n";
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
  const { t } = useTranslation();
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

  // Render project name or placeholder
  const displayText = assignedProject?.name ?? "—";

  return (
    <div
      className={cn("flex w-40 min-w-40 items-center justify-center border-l border-custom-border-100 px-1 py-1", {
        "bg-custom-primary-100/5": isActiveSprint,
      })}
    >
      <SelectCombobox value={assignedProjectId ?? null} onValueChange={handleValueChange} multiple={false}>
        <SelectCombobox.Trigger className="w-full">
          <button
            type="button"
            className={cn(
              "w-full px-2 py-1.5 text-xs rounded hover:bg-custom-background-80 transition-colors",
              "flex items-center gap-1.5 min-w-0",
              assignedProject ? "text-custom-text-200" : "text-custom-text-400"
            )}
          >
            {assignedProject?.logo_props && (
              <span className="flex-shrink-0">
                <Logo logo={assignedProject.logo_props} size={12} />
              </span>
            )}
            <span className="truncate">{displayText}</span>
          </button>
        </SelectCombobox.Trigger>

        <SelectCombobox.Content
          showSearch={projectIds.length > 3}
          searchPlaceholder={t("search")}
          emptyMessage={t("no_matching_results")}
          maxHeight="md"
          width="auto"
          className="w-48"
        >
          {/* Clear option */}
          <SelectCombobox.Item value="" keywords={["none", "clear", "no project"]}>
            <span className="text-custom-text-400">— {t("no_project") || "No project"}</span>
          </SelectCombobox.Item>

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
                    <Logo logo={project.logo_props} size={12} />
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
