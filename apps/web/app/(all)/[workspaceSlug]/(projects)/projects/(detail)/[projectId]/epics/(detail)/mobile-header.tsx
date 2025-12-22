import { useCallback, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { EIssueFilterType, ISSUE_LAYOUTS, ISSUE_DISPLAY_FILTERS_BY_PAGE } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { CalendarLayoutIcon, BoardLayoutIcon, ListLayoutIcon, ChevronDownIcon } from "@plane/propel/icons";
import type { IIssueDisplayFilterOptions, IIssueDisplayProperties, EIssueLayoutTypes } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { CustomMenu } from "@plane/ui";
// components
import { WorkItemsModal } from "@/components/analytics/work-items/modal";
import { DisplayFiltersSelection, FiltersDropdown } from "@/components/issues/issue-layouts/filters";
import { IssueLayoutIcon } from "@/components/issues/issue-layouts/layout-icon";
// hooks
import { useIssues } from "@/hooks/store/use-issues";
import { useEpic } from "@/hooks/store/use-epic";
import { useProject } from "@/hooks/store/use-project";
// tanstack query
import { useProjectDetails } from "@/store/queries/project";

const SUPPORTED_LAYOUTS = [
  { key: "list", i18n_title: "issue.layouts.list", icon: ListLayoutIcon },
  { key: "kanban", i18n_title: "issue.layouts.kanban", icon: BoardLayoutIcon },
  { key: "calendar", i18n_title: "issue.layouts.calendar", icon: CalendarLayoutIcon },
];

export const EpicIssuesMobileHeader = observer(function EpicIssuesMobileHeader() {
  // router
  const { workspaceSlug, projectId, epicId } = useParams();
  // states
  const [analyticsModal, setAnalyticsModal] = useState(false);
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { data: currentProjectDetails } = useProjectDetails(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "");
  const { getEpicById } = useEpic();
  const {
    issuesFilter: { issueFilters, updateFilters },
  } = useIssues(EIssuesStoreType.EPIC);
  // derived values
  const activeLayout = issueFilters?.displayFilters?.layout;
  const epicDetails = epicId ? getEpicById(epicId.toString()) : undefined;

  const handleLayoutChange = useCallback(
    (layout: EIssueLayoutTypes) => {
      if (!workspaceSlug || !projectId) return;
      updateFilters(workspaceSlug, projectId, EIssueFilterType.DISPLAY_FILTERS, { layout: layout }, epicId);
    },
    [workspaceSlug, projectId, epicId, updateFilters]
  );

  const handleDisplayFilters = useCallback(
    (updatedDisplayFilter: Partial<IIssueDisplayFilterOptions>) => {
      if (!workspaceSlug || !projectId) return;
      updateFilters(workspaceSlug, projectId, EIssueFilterType.DISPLAY_FILTERS, updatedDisplayFilter, epicId);
    },
    [workspaceSlug, projectId, epicId, updateFilters]
  );

  const handleDisplayProperties = useCallback(
    (property: Partial<IIssueDisplayProperties>) => {
      if (!workspaceSlug || !projectId) return;
      updateFilters(workspaceSlug, projectId, EIssueFilterType.DISPLAY_PROPERTIES, property, epicId);
    },
    [workspaceSlug, projectId, epicId, updateFilters]
  );

  return (
    <div className="block md:hidden">
      <WorkItemsModal
        isOpen={analyticsModal}
        onClose={() => setAnalyticsModal(false)}
        epicDetails={epicDetails ?? undefined}
        projectDetails={currentProjectDetails}
      />
      <div className="flex justify-evenly border-b border-subtle bg-surface-1 py-2">
        <CustomMenu
          maxHeight={"md"}
          className="flex flex-grow justify-center text-13 text-secondary"
          placement="bottom-start"
          customButton={<span className="flex flex-grow justify-center text-13 text-secondary">Layout</span>}
          customButtonClassName="flex flex-grow justify-center text-secondary text-13"
          closeOnSelect
        >
          {SUPPORTED_LAYOUTS.map((layout, index) => (
            <CustomMenu.MenuItem
              key={layout.key}
              onClick={() => {
                handleLayoutChange(ISSUE_LAYOUTS[index].key);
              }}
              className="flex items-center gap-2"
            >
              <IssueLayoutIcon layout={ISSUE_LAYOUTS[index].key} className="h-3 w-3" />
              <div className="text-tertiary">{t(layout.i18n_title)}</div>
            </CustomMenu.MenuItem>
          ))}
        </CustomMenu>
        <div className="flex flex-grow items-center justify-center border-l border-subtle text-13 text-secondary">
          <FiltersDropdown
            title="Display"
            placement="bottom-end"
            menuButton={
              <span className="flex items-center text-13 text-secondary">
                Display
                <ChevronDownIcon className="ml-2 h-4 w-4 text-secondary" />
              </span>
            }
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

        <button
          onClick={() => setAnalyticsModal(true)}
          className="flex flex-grow justify-center border-l border-subtle text-13 text-secondary"
        >
          Analytics
        </button>
      </div>
    </div>
  );
});
