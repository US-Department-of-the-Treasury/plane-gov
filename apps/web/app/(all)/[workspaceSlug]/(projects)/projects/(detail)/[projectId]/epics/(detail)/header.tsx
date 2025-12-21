import { useCallback, useRef, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// icons
import { ChartNoAxesColumn, PanelRight, SlidersHorizontal } from "lucide-react";
// plane imports
import {
  EIssueFilterType,
  ISSUE_DISPLAY_FILTERS_BY_PAGE,
  EUserPermissions,
  EUserPermissionsLevel,
  WORK_ITEM_TRACKER_ELEMENTS,
} from "@plane/constants";
import { Button } from "@plane/propel/button";
import { EpicIcon } from "@plane/propel/icons";
import { Tooltip } from "@plane/propel/tooltip";
import type { ICustomSearchSelectOption, IIssueDisplayFilterOptions, IIssueDisplayProperties } from "@plane/types";
import { EIssuesStoreType, EIssueLayoutTypes } from "@plane/types";
import { Breadcrumbs, Header, BreadcrumbNavigationSearchDropdown } from "@plane/ui";
import { cn } from "@plane/utils";
// components
import { WorkItemsModal } from "@/components/analytics/work-items/modal";
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { SwitcherLabel } from "@/components/common/switcher-label";
import {
  DisplayFiltersSelection,
  FiltersDropdown,
  LayoutSelection,
  MobileLayoutSelection,
} from "@/components/issues/issue-layouts/filters";
import { EpicQuickActions } from "@/components/epics";
import { WorkItemFiltersToggle } from "@/components/work-item-filters/filters-toggle";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useIssues } from "@/hooks/store/use-issues";
import { useEpic } from "@/hooks/store/use-epic";
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
import { useIssuesActions } from "@/hooks/use-issues-actions";
import useLocalStorage from "@/hooks/use-local-storage";
import { usePlatformOS } from "@/hooks/use-platform-os";
// plane web imports
import { CommonProjectBreadcrumbs } from "@/plane-web/components/breadcrumbs/common";
import { IconButton } from "@plane/propel/icon-button";

export const EpicIssuesHeader = observer(function EpicIssuesHeader() {
  // refs
  const parentRef = useRef<HTMLDivElement>(null);
  // states
  const [analyticsModal, setAnalyticsModal] = useState(false);
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId, epicId: routerEpicId } = useParams();
  const epicId = routerEpicId ? routerEpicId.toString() : undefined;
  // hooks
  const { isMobile } = usePlatformOS();
  // store hooks
  const {
    issuesFilter: { issueFilters },
    issues: { getGroupIssueCount },
  } = useIssues(EIssuesStoreType.EPIC);
  const { updateFilters } = useIssuesActions(EIssuesStoreType.EPIC);
  const { projectEpicIds, getEpicById } = useEpic();
  const { toggleCreateIssueModal } = useCommandPalette();
  const { allowPermissions } = useUserPermissions();
  const { currentProjectDetails, loader } = useProject();
  // local storage
  const { setValue, storedValue } = useLocalStorage("epic_sidebar_collapsed", "false");
  // derived values
  const isSidebarCollapsed = storedValue ? (storedValue === "true" ? true : false) : false;
  const activeLayout = issueFilters?.displayFilters?.layout;
  const epicDetails = epicId ? getEpicById(epicId) : undefined;
  const canUserCreateIssue = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT
  );
  const workItemsCount = getGroupIssueCount(undefined, undefined, false);

  const toggleSidebar = () => {
    setValue(`${!isSidebarCollapsed}`);
  };

  const handleLayoutChange = useCallback(
    (layout: EIssueLayoutTypes) => {
      if (!projectId) return;
      updateFilters(projectId.toString(), EIssueFilterType.DISPLAY_FILTERS, { layout: layout });
    },
    [projectId, updateFilters]
  );

  const handleDisplayFilters = useCallback(
    (updatedDisplayFilter: Partial<IIssueDisplayFilterOptions>) => {
      if (!projectId) return;
      updateFilters(projectId.toString(), EIssueFilterType.DISPLAY_FILTERS, updatedDisplayFilter);
    },
    [projectId, updateFilters]
  );

  const handleDisplayProperties = useCallback(
    (property: Partial<IIssueDisplayProperties>) => {
      if (!projectId) return;
      updateFilters(projectId.toString(), EIssueFilterType.DISPLAY_PROPERTIES, property);
    },
    [projectId, updateFilters]
  );

  const switcherOptions = projectEpicIds
    ?.map((id) => {
      const _epic = id === epicId ? epicDetails : getEpicById(id);
      if (!_epic) return;
      return {
        value: _epic.id,
        query: _epic.name,
        content: <SwitcherLabel name={_epic.name} LabelIcon={EpicIcon} />,
      };
    })
    .filter((option) => option !== undefined) as ICustomSearchSelectOption[];

  return (
    <>
      <WorkItemsModal
        isOpen={analyticsModal}
        onClose={() => setAnalyticsModal(false)}
        epicDetails={epicDetails ?? undefined}
        projectDetails={currentProjectDetails}
      />
      <Header>
        <Header.LeftItem>
          <div className="flex items-center gap-2">
            <Breadcrumbs onBack={router.back} isLoading={loader === "init-loader"}>
              <CommonProjectBreadcrumbs workspaceSlug={workspaceSlug?.toString()} projectId={projectId?.toString()} />
              <Breadcrumbs.Item
                component={
                  <BreadcrumbLink
                    label="Epics"
                    href={`/${workspaceSlug}/projects/${projectId}/epics/`}
                    icon={<EpicIcon className="h-4 w-4 text-tertiary" />}
                    isLast
                  />
                }
                isLast
              />
              <Breadcrumbs.Item
                component={
                  <BreadcrumbNavigationSearchDropdown
                    selectedItem={epicId?.toString() ?? ""}
                    navigationItems={switcherOptions}
                    onChange={(value: string) => {
                      router.push(`/${workspaceSlug}/projects/${projectId}/epics/${value}`);
                    }}
                    title={epicDetails?.name}
                    icon={<EpicIcon className="size-3.5 flex-shrink-0 text-tertiary" />}
                    isLast
                  />
                }
              />
            </Breadcrumbs>
            {workItemsCount && workItemsCount > 0 ? (
              <Tooltip
                isMobile={isMobile}
                tooltipContent={`There are ${workItemsCount} ${
                  workItemsCount > 1 ? "work items" : "work item"
                } in this epic`}
                position="bottom"
              >
                <span className="flex flex-shrink-0 cursor-default items-center justify-center rounded-xl bg-accent-primary/20 px-2 text-center text-11 font-semibold text-accent-primary">
                  {workItemsCount}
                </span>
              </Tooltip>
            ) : null}
          </div>
        </Header.LeftItem>
        <Header.RightItem className="items-center">
          <div className="hidden gap-2 md:flex">
            <div className="hidden @4xl:flex">
              <LayoutSelection
                layouts={[
                  EIssueLayoutTypes.LIST,
                  EIssueLayoutTypes.KANBAN,
                  EIssueLayoutTypes.CALENDAR,
                  EIssueLayoutTypes.SPREADSHEET,
                  EIssueLayoutTypes.GANTT,
                ]}
                onChange={(layout) => handleLayoutChange(layout)}
                selectedLayout={activeLayout}
              />
            </div>
            <div className="flex @4xl:hidden">
              <MobileLayoutSelection
                layouts={[
                  EIssueLayoutTypes.LIST,
                  EIssueLayoutTypes.KANBAN,
                  EIssueLayoutTypes.CALENDAR,
                  EIssueLayoutTypes.SPREADSHEET,
                  EIssueLayoutTypes.GANTT,
                ]}
                onChange={(layout) => handleLayoutChange(layout)}
                activeLayout={activeLayout}
              />
            </div>
            {epicId && <WorkItemFiltersToggle entityType={EIssuesStoreType.EPIC} entityId={epicId} />}
            <FiltersDropdown
              title="Display"
              placement="bottom-end"
              miniIcon={<SlidersHorizontal className="size-3.5" />}
            >
              <DisplayFiltersSelection
                layoutDisplayFiltersOptions={
                  activeLayout ? ISSUE_DISPLAY_FILTERS_BY_PAGE.issues.layoutOptions[activeLayout] : undefined
                }
                displayFilters={issueFilters?.displayFilters ?? {}}
                handleDisplayFiltersUpdate={handleDisplayFilters}
                displayProperties={issueFilters?.displayProperties ?? {}}
                handleDisplayPropertiesUpdate={handleDisplayProperties}
                ignoreGroupedFilters={["epic"]}
                sprintViewDisabled={!currentProjectDetails?.sprint_view}
                epicViewDisabled={!currentProjectDetails?.epic_view}
              />
            </FiltersDropdown>
          </div>

          {canUserCreateIssue ? (
            <>
              <Button className="hidden md:block" onClick={() => setAnalyticsModal(true)} variant="secondary" size="lg">
                <span className="hidden @4xl:flex">Analytics</span>
                <span className="@4xl:hidden">
                  <ChartNoAxesColumn className="size-3.5" />
                </span>
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="hidden sm:flex"
                onClick={() => {
                  toggleCreateIssueModal(true, EIssuesStoreType.EPIC);
                }}
                data-ph-element={WORK_ITEM_TRACKER_ELEMENTS.HEADER_ADD_BUTTON.EPIC}
              >
                Add work item
              </Button>
            </>
          ) : (
            <></>
          )}
          <IconButton
            variant="tertiary"
            size="lg"
            icon={PanelRight}
            onClick={toggleSidebar}
            className={cn({
              "text-accent-primary bg-accent-subtle": !isSidebarCollapsed,
            })}
          />
          {epicId && (
            <EpicQuickActions
              parentRef={parentRef}
              epicId={epicId}
              projectId={projectId.toString()}
              workspaceSlug={workspaceSlug.toString()}
              customClassName="flex-shrink-0 flex items-center justify-center bg-layer-1/70 rounded-sm size-[26px]"
            />
          )}
        </Header.RightItem>
      </Header>
    </>
  );
});
