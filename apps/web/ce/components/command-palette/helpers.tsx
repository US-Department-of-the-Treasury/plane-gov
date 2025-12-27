import { LayoutGrid } from "lucide-react";
// plane imports
import { SprintIcon, EpicIcon, PageIcon, ProjectIcon, ViewsIcon } from "@plane/propel/icons";
import type {
  IWorkspaceDefaultSearchResult,
  IWorkspaceIssueSearchResult,
  IWorkspacePageSearchResult,
  IWorkspaceProjectSearchResult,
  IWorkspaceSearchResult,
} from "@plane/types";
import { generateWorkItemLink } from "@plane/utils";
// plane web components
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";

export type TCommandGroups = {
  [key: string]: {
    icon: React.ReactNode | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Pre-existing pattern using any for polymorphic search results
    itemName: (item: any) => React.ReactNode;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Pre-existing pattern using any for polymorphic search results
    path: (item: any, projectId: string | undefined) => string;
    title: string;
  };
};

export const commandGroups: TCommandGroups = {
  sprint: {
    icon: <SprintIcon className="h-3 w-3" />,
    itemName: (sprint: IWorkspaceDefaultSearchResult) => (
      <h6>
        <span className="text-11 text-tertiary">{sprint.project__identifier}</span> {sprint.name}
      </h6>
    ),
    path: (sprint: IWorkspaceDefaultSearchResult) =>
      `/${sprint?.workspace__slug}/projects/${sprint?.project_id}/sprints/${sprint?.id}`,
    title: "Sprints",
  },
  issue: {
    icon: null,
    itemName: (issue: IWorkspaceIssueSearchResult) => (
      <div className="flex gap-2">
        <IssueIdentifier
          projectId={issue.project_id}
          issueTypeId={issue.type_id}
          projectIdentifier={issue.project__identifier}
          issueSequenceId={issue.sequence_id}
          size="xs"
        />{" "}
        {issue.name}
      </div>
    ),
    path: (issue: IWorkspaceIssueSearchResult) =>
      generateWorkItemLink({
        workspaceSlug: issue?.workspace__slug,
        projectId: issue?.project_id,
        issueId: issue?.id,
        projectIdentifier: issue.project__identifier,
        sequenceId: issue?.sequence_id,
      }),
    title: "Work items",
  },
  issue_view: {
    icon: <ViewsIcon className="h-3 w-3" />,
    itemName: (view: IWorkspaceDefaultSearchResult) => (
      <h6>
        <span className="text-11 text-tertiary">{view.project__identifier}</span> {view.name}
      </h6>
    ),
    path: (view: IWorkspaceDefaultSearchResult) =>
      `/${view?.workspace__slug}/projects/${view?.project_id}/views/${view?.id}`,
    title: "Views",
  },
  epic: {
    icon: <EpicIcon className="h-3 w-3" />,
    itemName: (epic: IWorkspaceDefaultSearchResult) => (
      <h6>
        <span className="text-11 text-tertiary">{epic.project__identifier}</span> {epic.name}
      </h6>
    ),
    path: (epic: IWorkspaceDefaultSearchResult) =>
      `/${epic?.workspace__slug}/projects/${epic?.project_id}/epics/${epic?.id}`,
    title: "Epics",
  },
  page: {
    icon: <PageIcon className="h-3 w-3" />,
    itemName: (page: IWorkspacePageSearchResult) => (
      <h6>
        <span className="text-11 text-tertiary">{page.project__identifiers?.[0]}</span> {page.name}
      </h6>
    ),
    path: (page: IWorkspacePageSearchResult, projectId: string | undefined) => {
      let redirectProjectId = page?.project_ids?.[0];
      if (!!projectId && page?.project_ids?.includes(projectId)) redirectProjectId = projectId;
      return redirectProjectId
        ? `/${page?.workspace__slug}/projects/${redirectProjectId}/pages/${page?.id}`
        : `/${page?.workspace__slug}/documents/${page?.id}`;
    },
    title: "Documents",
  },
  project: {
    icon: <ProjectIcon className="h-3 w-3" />,
    itemName: (project: IWorkspaceProjectSearchResult) => project?.name,
    path: (project: IWorkspaceProjectSearchResult) => `/${project?.workspace__slug}/projects/${project?.id}/issues/`,
    title: "Projects",
  },
  workspace: {
    icon: <LayoutGrid className="h-3 w-3" />,
    itemName: (workspace: IWorkspaceSearchResult) => workspace?.name,
    path: (workspace: IWorkspaceSearchResult) => `/${workspace?.slug}/`,
    title: "Workspaces",
  },
};
