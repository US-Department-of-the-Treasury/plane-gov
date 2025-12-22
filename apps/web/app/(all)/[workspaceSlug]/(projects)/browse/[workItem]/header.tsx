import { useParams } from "next/navigation";
// plane imports
import { Header, Row } from "@plane/ui";
import { cn } from "@plane/utils";
// components
import { AppHeader } from "@/components/core/app-header";
import { TabNavigationRoot } from "@/components/navigation";
import { AppSidebarToggleButton } from "@/components/sidebar/sidebar-toggle-button";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { useProjectNavigationPreferences } from "@/hooks/use-navigation-preferences";
// tanstack query
import { useIssueByIdentifier } from "@/store/queries/issue";
// local components
import { WorkItemDetailsHeader } from "./work-item-header";

export function ProjectWorkItemDetailsHeader() {
  // router
  const { workspaceSlug, workItem } = useParams();
  // store hooks
  const { sidebarCollapsed } = useAppTheme();
  // parse work item identifier
  const workItemStr = workItem?.toString() || "";
  const [projectIdentifier, sequenceId] = workItemStr.split("-");
  // tanstack query
  const { data: issueDetails } = useIssueByIdentifier(
    workspaceSlug?.toString() || "",
    projectIdentifier || "",
    sequenceId || ""
  );
  // preferences
  const { preferences: projectPreferences } = useProjectNavigationPreferences();

  return (
    <>
      {projectPreferences.navigationMode === "horizontal" && (
        <div className="z-20">
          <Row className="h-header flex gap-2 w-full items-center border-b border-subtle bg-surface-1">
            <div className="flex items-center gap-2 divide-x divide-subtle h-full w-full">
              <div className="flex items-center gap-2 size-full flex-1">
                {sidebarCollapsed && (
                  <div className="shrink-0">
                    <AppSidebarToggleButton />
                  </div>
                )}
                <Header className={cn("h-full", { "pl-1.5": !sidebarCollapsed })}>
                  <Header.LeftItem className="h-full max-w-full">
                    <TabNavigationRoot
                      workspaceSlug={workspaceSlug}
                      projectId={issueDetails?.project_id?.toString() ?? ""}
                    />
                  </Header.LeftItem>
                </Header>
              </div>
            </div>
          </Row>
        </div>
      )}
      <AppHeader header={<WorkItemDetailsHeader />} />
    </>
  );
}
