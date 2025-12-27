import { useCallback, useRef, useState } from "react";
import { useParams } from "next/navigation";
// icons
import { ChartNoAxesColumn, PanelRight, SlidersHorizontal } from "lucide-react";
// plane imports
import {
  EIssueFilterType,
  EUserPermissions,
  EUserPermissionsLevel,
  ISSUE_DISPLAY_FILTERS_BY_PAGE,
  WORK_ITEM_TRACKER_ELEMENTS,
} from "@plane/constants";
import { usePlatformOS } from "@plane/hooks";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { IconButton } from "@plane/propel/icon-button";
import { SprintIcon } from "@plane/propel/icons";
import { Tooltip } from "@plane/propel/tooltip";
import type {
  ICustomSearchSelectOption,
  IIssueDisplayFilterOptions,
  IIssueDisplayProperties,
  ISprint,
} from "@plane/types";
import { EIssuesStoreType, EIssueLayoutTypes } from "@plane/types";
import { Breadcrumbs, BreadcrumbNavigationSearchDropdown, Header } from "@plane/ui";
import { cn } from "@plane/utils";
// components
import { WorkItemsModal } from "@/components/analytics/work-items/modal";
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { SwitcherLabel } from "@/components/common/switcher-label";
import { SprintQuickActions } from "@/components/sprints/quick-actions";
import {
  DisplayFiltersSelection,
  FiltersDropdown,
  LayoutSelection,
  MobileLayoutSelection,
} from "@/components/issues/issue-layouts/filters";
import { WorkItemFiltersToggle } from "@/components/work-item-filters/filters-toggle";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useProjectSprints, getSprintById } from "@/store/queries/sprint";
import { useIssues } from "@/hooks/store/use-issues";
import { useGroupedIssueCount, useSprintIssueFilters, useSprintLayout } from "@/hooks/store/use-issue-store-reactive";
import { useProjectDetails } from "@/store/queries/project";
import { useUserPermissions } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";
import useLocalStorage from "@/hooks/use-local-storage";
// plane web imports
import { CommonProjectBreadcrumbs } from "@/plane-web/components/breadcrumbs/common";

export function SprintIssuesHeader() {
  // refs
  const parentRef = useRef<HTMLDivElement>(null);
  // states
  const [analyticsModal, setAnalyticsModal] = useState(false);
  // router
  const router = useAppRouter();
  const { workspaceSlug, projectId, sprintId } = useParams();
  // i18n
  const { t } = useTranslation();
  // store hooks - use reactive hooks for reading filters/layout
  const issueFilters = useSprintIssueFilters();
  const activeLayout = useSprintLayout() ?? EIssueLayoutTypes.LIST;
  const {
    issuesFilter: { updateFilters },
  } = useIssues(EIssuesStoreType.SPRINT);
  // reactive issue count from Zustand
  const workItemsCount = useGroupedIssueCount(EIssuesStoreType.SPRINT);
  const { toggleCreateIssueModal } = useCommandPalette();
  const { isMobile } = usePlatformOS();
  const { allowPermissions } = useUserPermissions();

  // TanStack Query
  const { data: sprints } = useProjectSprints(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "");
  const { data: currentProjectDetails, isLoading } = useProjectDetails(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );
  const loader = isLoading ? "init-loader" : undefined;

  const { setValue, storedValue } = useLocalStorage("sprint_sidebar_collapsed", false);

  const isSidebarCollapsed = storedValue ? (storedValue === true ? true : false) : false;
  const toggleSidebar = () => {
    setValue(!isSidebarCollapsed);
  };

  const handleLayoutChange = useCallback(
    (layout: EIssueLayoutTypes) => {
      if (!workspaceSlug || !projectId) return;
      updateFilters(workspaceSlug, projectId, EIssueFilterType.DISPLAY_FILTERS, { layout: layout }, sprintId);
    },
    [workspaceSlug, projectId, sprintId, updateFilters]
  );

  const handleDisplayFilters = useCallback(
    (updatedDisplayFilter: Partial<IIssueDisplayFilterOptions>) => {
      if (!workspaceSlug || !projectId) return;
      updateFilters(workspaceSlug, projectId, EIssueFilterType.DISPLAY_FILTERS, updatedDisplayFilter, sprintId);
    },
    [workspaceSlug, projectId, sprintId, updateFilters]
  );

  const handleDisplayProperties = useCallback(
    (property: Partial<IIssueDisplayProperties>) => {
      if (!workspaceSlug || !projectId) return;
      updateFilters(workspaceSlug, projectId, EIssueFilterType.DISPLAY_PROPERTIES, property, sprintId);
    },
    [workspaceSlug, projectId, sprintId, updateFilters]
  );

  // derived values
  const sprintDetails = sprintId ? getSprintById(sprints, sprintId.toString()) : undefined;
  const isCompletedSprint = sprintDetails?.status?.toLocaleLowerCase() === "completed";
  const canUserCreateIssue = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug?.toString(),
    projectId?.toString()
  );

  const switcherOptions = (sprints?.map((sprint: ISprint): ICustomSearchSelectOption => {
    return {
      value: sprint.id,
      query: sprint.name,
      content: <SwitcherLabel name={sprint.name} LabelIcon={SprintIcon} />,
    };
  }) ?? []) as ICustomSearchSelectOption[];

  return (
    <>
      <WorkItemsModal
        projectDetails={currentProjectDetails}
        isOpen={analyticsModal}
        onClose={() => setAnalyticsModal(false)}
        sprintDetails={sprintDetails ?? undefined}
      />
      <Header>
        <Header.LeftItem>
          <div className="flex items-center gap-2">
            <Breadcrumbs onBack={router.back} isLoading={loader === "init-loader"}>
              <CommonProjectBreadcrumbs workspaceSlug={workspaceSlug?.toString()} projectId={projectId?.toString()} />
              <Breadcrumbs.Item
                component={
                  <BreadcrumbLink
                    label="Sprints"
                    href={`/${workspaceSlug}/projects/${projectId}/sprints/`}
                    icon={<SprintIcon className="h-4 w-4 text-tertiary" />}
                  />
                }
              />
              <Breadcrumbs.Item
                component={
                  <BreadcrumbNavigationSearchDropdown
                    selectedItem={sprintId}
                    navigationItems={switcherOptions}
                    onChange={(value: string) => {
                      router.push(`/${workspaceSlug}/projects/${projectId}/sprints/${value}`);
                    }}
                    title={sprintDetails?.name}
                    icon={
                      <Breadcrumbs.Icon>
                        <SprintIcon className="size-4 flex-shrink-0 text-tertiary" />
                      </Breadcrumbs.Icon>
                    }
                    isLast
                  />
                }
                isLast
              />
            </Breadcrumbs>
            {workItemsCount && workItemsCount > 0 ? (
              <Tooltip
                isMobile={isMobile}
                tooltipContent={`There are ${workItemsCount} ${
                  workItemsCount > 1 ? "work items" : "work item"
                } in this sprint`}
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
          <div className="hidden items-center gap-2 md:flex ">
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
            <WorkItemFiltersToggle entityType={EIssuesStoreType.SPRINT} entityId={sprintId} />
            <FiltersDropdown
              title={t("common.display")}
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
                ignoreGroupedFilters={["sprint"]}
                sprintViewDisabled={!currentProjectDetails?.sprint_view}
                epicViewDisabled={!currentProjectDetails?.epic_view}
              />
            </FiltersDropdown>

            {canUserCreateIssue && (
              <>
                <Button onClick={() => setAnalyticsModal(true)} variant="secondary" size="lg">
                  <span className="hidden @4xl:flex">Analytics</span>
                  <span className="@4xl:hidden">
                    <ChartNoAxesColumn className="size-3.5" />
                  </span>
                </Button>
                {!isCompletedSprint && (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => {
                      toggleCreateIssueModal(true, EIssuesStoreType.SPRINT);
                    }}
                    data-ph-element={WORK_ITEM_TRACKER_ELEMENTS.HEADER_ADD_BUTTON.SPRINT}
                  >
                    {t("issue.add.label")}
                  </Button>
                )}
              </>
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
            <SprintQuickActions
              parentRef={parentRef}
              sprintId={sprintId}
              projectId={projectId}
              workspaceSlug={workspaceSlug}
              customClassName="flex-shrink-0 flex items-center justify-center size-[26px] bg-layer-1/70 rounded-sm"
            />
          </div>
        </Header.RightItem>
      </Header>
    </>
  );
}
