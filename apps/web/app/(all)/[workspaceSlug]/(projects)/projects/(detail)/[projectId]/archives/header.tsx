import { useParams } from "next/navigation";
import { ArchiveIcon, SprintIcon, EpicIcon, WorkItemsIcon } from "@plane/propel/icons";
import { Tooltip } from "@plane/propel/tooltip";
import { EIssuesStoreType } from "@plane/types";
// ui
import { Breadcrumbs, Header } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
// hooks
import { useGroupedIssueCount } from "@/hooks/store/use-issue-store-reactive";
import { useProjects } from "@/store/queries/project";
import { useAppRouter } from "@/hooks/use-app-router";
import { usePlatformOS } from "@/hooks/use-platform-os";
// plane web imports
import { CommonProjectBreadcrumbs } from "@/plane-web/components/breadcrumbs/common";

type TProps = {
  activeTab: "issues" | "sprints" | "epics";
};

const PROJECT_ARCHIVES_BREADCRUMB_LIST: {
  [key: string]: {
    label: string;
    href: string;
    icon: React.FC<React.SVGAttributes<SVGElement> & { className?: string }>;
  };
} = {
  issues: {
    label: "Work items",
    href: "/issues",
    icon: WorkItemsIcon,
  },
  sprints: {
    label: "Sprints",
    href: "/sprints",
    icon: SprintIcon,
  },
  epics: {
    label: "Epics",
    href: "/epics",
    icon: EpicIcon,
  },
};

export function ProjectArchivesHeader(props: TProps) {
  const { activeTab } = props;
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId } = useParams();
  // queries
  const { isLoading } = useProjects(workspaceSlug?.toString() ?? "");
  // hooks
  const { isMobile } = usePlatformOS();
  // reactive issue count from Zustand
  const issueCount = useGroupedIssueCount(EIssuesStoreType.ARCHIVED);

  const activeTabBreadcrumbDetail =
    PROJECT_ARCHIVES_BREADCRUMB_LIST[activeTab as keyof typeof PROJECT_ARCHIVES_BREADCRUMB_LIST];

  return (
    <Header>
      <Header.LeftItem>
        <div className="flex items-center gap-2.5">
          <Breadcrumbs onBack={router.back} isLoading={isLoading}>
            <CommonProjectBreadcrumbs workspaceSlug={workspaceSlug?.toString()} projectId={projectId?.toString()} />
            <Breadcrumbs.Item
              component={
                <BreadcrumbLink
                  href={`/${workspaceSlug}/projects/${projectId}/archives/issues`}
                  label="Archives"
                  icon={<ArchiveIcon className="h-4 w-4 text-tertiary" />}
                />
              }
            />
            {activeTabBreadcrumbDetail && (
              <Breadcrumbs.Item
                component={
                  <BreadcrumbLink
                    label={activeTabBreadcrumbDetail.label}
                    icon={<activeTabBreadcrumbDetail.icon className="h-4 w-4 text-tertiary" />}
                  />
                }
              />
            )}
          </Breadcrumbs>
          {activeTab === "issues" && issueCount && issueCount > 0 ? (
            <Tooltip
              isMobile={isMobile}
              tooltipContent={`There are ${issueCount} ${issueCount > 1 ? "work items" : "work item"} in project's archived`}
              position="bottom"
            >
              <span className="cursor-default flex items-center text-center justify-center px-2.5 py-0.5 flex-shrink-0 bg-accent-primary/20 text-accent-primary text-11 font-semibold rounded-xl">
                {issueCount}
              </span>
            </Tooltip>
          ) : null}
        </div>
      </Header.LeftItem>
    </Header>
  );
}
