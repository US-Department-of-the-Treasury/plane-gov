"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronDown, ListFilter, Loader2 } from "lucide-react";
import { Logo } from "@plane/propel/emoji-icon-picker";
import { StateGroupIcon } from "@plane/propel/icons";
import { SelectCombobox } from "@plane/propel/combobox";
import { cn, getFileURL } from "@plane/utils";
import { Avatar } from "@plane/ui";
import type { TIssue, IWorkspaceMember, IState } from "@plane/types";
import type { TProject } from "@/plane-web/types/projects";
// hooks
import { useWorkspaceMembers, getWorkspaceMembersMap } from "@/store/queries/member";
import { useProjects, getProjectById } from "@/store/queries/project";
import { useWorkspaceStates, getStateById } from "@/store/queries/state";
import { useWorkspaceViewIssuesPaginated, extractIssuesFromPages } from "@/store/queries/issues-paginated";

type FilterState = {
  assigneeId: string | null;
  projectId: string | null;
};

export function AssignmentsView() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [filters, setFilters] = useState<FilterState>({
    assigneeId: null,
    projectId: null,
  });

  // Fetch workspace members
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceSlug);
  const membersMap = useMemo(() => getWorkspaceMembersMap(members), [members]);

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = useProjects(workspaceSlug);

  // Fetch workspace states for status display
  const { data: states, isLoading: statesLoading } = useWorkspaceStates(workspaceSlug || "");

  // Build filter params for the issues query
  const filterParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (filters.assigneeId) {
      params.assignees = filters.assigneeId;
    }
    if (filters.projectId) {
      params.project = filters.projectId;
    }
    return params;
  }, [filters]);

  // Fetch workspace issues with filters
  const {
    data: issuesData,
    isLoading: issuesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useWorkspaceViewIssuesPaginated({
    workspaceSlug: workspaceSlug || "",
    viewId: "all-issues",
    filterParams,
    enabled: !!workspaceSlug,
    perPage: 50,
  });

  // Extract flat list of issues from paginated response
  const issues = useMemo(() => extractIssuesFromPages(issuesData?.pages), [issuesData]);

  // Get assignee options from members
  const assigneeOptions = useMemo(() => {
    if (!members) return [];
    return members
      .filter((m) => m.member?.id)
      .map((m) => ({
        id: m.member.id,
        name: m.member.display_name || m.member.email || "Unknown",
        avatar_url: m.member.avatar_url,
      }));
  }, [members]);

  // Get project options
  const projectOptions = useMemo(() => {
    if (!projects) return [];
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      logo_props: p.logo_props,
    }));
  }, [projects]);

  const handleAssigneeChange = (value: string | string[] | null) => {
    const assigneeId = typeof value === "string" ? value : null;
    setFilters((prev) => ({ ...prev, assigneeId: assigneeId === "" ? null : assigneeId }));
  };

  const handleProjectChange = (value: string | string[] | null) => {
    const projectId = typeof value === "string" ? value : null;
    setFilters((prev) => ({ ...prev, projectId: projectId === "" ? null : projectId }));
  };

  const selectedAssignee = filters.assigneeId ? assigneeOptions.find((a) => a.id === filters.assigneeId) : null;
  const selectedProject = filters.projectId ? projectOptions.find((p) => p.id === filters.projectId) : null;

  const isLoading = membersLoading || projectsLoading || statesLoading || issuesLoading;

  return (
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-3 border-b border-strong px-4 py-3">
        <ListFilter className="size-4 text-placeholder" />
        <span className="text-13 font-medium text-secondary">Filters:</span>

        {/* Assignee filter */}
        <SelectCombobox value={filters.assigneeId ?? null} onValueChange={handleAssigneeChange} multiple={false}>
          <SelectCombobox.Trigger className="w-auto">
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 text-13 rounded border border-strong",
                "hover:bg-layer-transparent-hover transition-colors",
                filters.assigneeId ? "text-primary" : "text-placeholder"
              )}
            >
              {selectedAssignee ? (
                <>
                  <Avatar src={getFileURL(selectedAssignee.avatar_url ?? "")} name={selectedAssignee.name} size="sm" />
                  <span className="truncate max-w-[120px]">{selectedAssignee.name}</span>
                </>
              ) : (
                <span>All assignees</span>
              )}
              <ChevronDown className="size-3 ml-1" />
            </button>
          </SelectCombobox.Trigger>
          <SelectCombobox.Content
            showSearch
            searchPlaceholder="Search members..."
            emptyMessage="No members found"
            maxHeight="md"
            width="auto"
            className="w-56"
          >
            {filters.assigneeId && (
              <SelectCombobox.Item value="" keywords={["all", "clear"]}>
                <span className="text-custom-text-400">All assignees</span>
              </SelectCombobox.Item>
            )}
            {assigneeOptions.map((assignee) => (
              <SelectCombobox.Item key={assignee.id} value={assignee.id} keywords={[assignee.name]}>
                <div className="flex items-center gap-2">
                  <Avatar src={getFileURL(assignee.avatar_url ?? "")} name={assignee.name} size="sm" />
                  <span className="truncate">{assignee.name}</span>
                </div>
              </SelectCombobox.Item>
            ))}
          </SelectCombobox.Content>
        </SelectCombobox>

        {/* Project filter */}
        <SelectCombobox value={filters.projectId ?? null} onValueChange={handleProjectChange} multiple={false}>
          <SelectCombobox.Trigger className="w-auto">
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 text-13 rounded border border-strong",
                "hover:bg-layer-transparent-hover transition-colors",
                filters.projectId ? "text-primary" : "text-placeholder"
              )}
            >
              {selectedProject ? (
                <>
                  {selectedProject.logo_props && (
                    <span className="flex-shrink-0">
                      <Logo logo={selectedProject.logo_props} size={14} />
                    </span>
                  )}
                  <span className="truncate max-w-[120px]">{selectedProject.name}</span>
                </>
              ) : (
                <span>All projects</span>
              )}
              <ChevronDown className="size-3 ml-1" />
            </button>
          </SelectCombobox.Trigger>
          <SelectCombobox.Content
            showSearch
            searchPlaceholder="Search projects..."
            emptyMessage="No projects found"
            maxHeight="md"
            width="auto"
            className="w-56"
          >
            {filters.projectId && (
              <SelectCombobox.Item value="" keywords={["all", "clear"]}>
                <span className="text-custom-text-400">All projects</span>
              </SelectCombobox.Item>
            )}
            {projectOptions.map((project) => (
              <SelectCombobox.Item key={project.id} value={project.id} keywords={[project.name]}>
                <div className="flex items-center gap-2">
                  {project.logo_props && (
                    <span className="flex-shrink-0">
                      <Logo logo={project.logo_props} size={14} />
                    </span>
                  )}
                  <span className="truncate">{project.name}</span>
                </div>
              </SelectCombobox.Item>
            ))}
          </SelectCombobox.Content>
        </SelectCombobox>

        {/* Results count */}
        <div className="ml-auto text-13 text-placeholder">
          {isLoading ? "Loading..." : `${issues.length} work items`}
        </div>
      </div>

      {/* Issues list */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="size-5 animate-spin text-placeholder" />
          </div>
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-placeholder">
            <span className="text-14">No work items found</span>
            {(filters.assigneeId || filters.projectId) && (
              <button
                type="button"
                onClick={() => setFilters({ assigneeId: null, projectId: null })}
                className="text-13 text-accent-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-surface-1 z-10">
              <tr className="border-b border-strong text-13 text-secondary">
                <th className="text-left px-4 py-2 font-medium">Work Item</th>
                <th className="text-left px-4 py-2 font-medium w-32">Status</th>
                <th className="text-left px-4 py-2 font-medium w-40">Project</th>
                <th className="text-left px-4 py-2 font-medium w-40">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} membersMap={membersMap} projects={projects} states={states} />
              ))}
            </tbody>
          </table>
        )}

        {/* Load more */}
        {hasNextPage && (
          <div className="flex justify-center py-4">
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="px-4 py-2 text-13 text-accent-primary hover:underline disabled:opacity-50"
            >
              {isFetchingNextPage ? "Loading more..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type IssueRowProps = {
  issue: TIssue;
  membersMap: Map<string, IWorkspaceMember>;
  projects: TProject[] | undefined;
  states: IState[] | undefined;
};

function IssueRow({ issue, membersMap, projects, states }: IssueRowProps) {
  const project = getProjectById(projects, issue.project_id);
  const assignees = issue.assignee_ids || [];
  const primaryAssignee = assignees.length > 0 ? membersMap.get(assignees[0]) : undefined;

  // Get state info from workspace states (states is a flat array with project_id on each state)
  const state = getStateById(states, issue.state_id);

  return (
    <tr className="border-b border-subtle hover:bg-layer-transparent-hover transition-colors">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-13 text-placeholder font-mono">
            {project?.identifier ?? "?"}-{issue.sequence_id}
          </span>
          <span className="text-13 text-primary truncate">{issue.name}</span>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          {(state?.group || issue.state__group) && (
            <StateGroupIcon stateGroup={state?.group || issue.state__group!} className="size-3.5" />
          )}
          <span className="text-13 text-secondary truncate">{state?.name || "Unknown"}</span>
        </div>
      </td>
      <td className="px-4 py-2.5">
        {project ? (
          <div className="flex items-center gap-1.5">
            {project.logo_props && (
              <span className="flex-shrink-0">
                <Logo logo={project.logo_props} size={14} />
              </span>
            )}
            <span className="text-13 text-secondary truncate">{project.name}</span>
          </div>
        ) : (
          <span className="text-13 text-placeholder">-</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        {primaryAssignee?.member ? (
          <div className="flex items-center gap-1.5">
            <Avatar
              src={getFileURL(primaryAssignee.member.avatar_url ?? "")}
              name={primaryAssignee.member.display_name || primaryAssignee.member.email || ""}
              size="sm"
            />
            <span className="text-13 text-secondary truncate">
              {primaryAssignee.member.display_name || primaryAssignee.member.email}
            </span>
            {assignees.length > 1 && <span className="text-12 text-placeholder">+{assignees.length - 1}</span>}
          </div>
        ) : (
          <span className="text-13 text-placeholder">Unassigned</span>
        )}
      </td>
    </tr>
  );
}
