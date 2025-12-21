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
import { useSprint } from "@/hooks/store/use-sprint";
import { useIssues } from "@/hooks/store/use-issues";
import { useProject } from "@/hooks/store/use-project";

const SUPPORTED_LAYOUTS = [
  { key: "list", titleTranslationKey: "issue.layouts.list", icon: ListLayoutIcon },
  { key: "kanban", titleTranslationKey: "issue.layouts.kanban", icon: BoardLayoutIcon },
  { key: "calendar", titleTranslationKey: "issue.layouts.calendar", icon: CalendarLayoutIcon },
];

export const SprintIssuesMobileHeader = observer(function SprintIssuesMobileHeader() {
  // router
  const { workspaceSlug, projectId, sprintId } = useParams();
  // states
  const [analyticsModal, setAnalyticsModal] = useState(false);
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { currentProjectDetails } = useProject();
  const { getSprintById } = useSprint();
  const {
    issuesFilter: { issueFilters, updateFilters },
  } = useIssues(EIssuesStoreType.SPRINT);
  // derived values
  const activeLayout = issueFilters?.displayFilters?.layout;
  const sprintDetails = sprintId ? getSprintById(sprintId.toString()) : undefined;

  const handleLayoutChange = useCallback(
    (layout: EIssueLayoutTypes) => {
      if (!workspaceSlug || !projectId || !sprintId) return;
      updateFilters(
        workspaceSlug.toString(),
        projectId.toString(),
        EIssueFilterType.DISPLAY_FILTERS,
        { layout: layout },
        sprintId.toString()
      );
    },
    [workspaceSlug, projectId, sprintId, updateFilters]
  );

  const handleDisplayFilters = useCallback(
    (updatedDisplayFilter: Partial<IIssueDisplayFilterOptions>) => {
      if (!workspaceSlug || !projectId || !sprintId) return;
      updateFilters(
        workspaceSlug.toString(),
        projectId.toString(),
        EIssueFilterType.DISPLAY_FILTERS,
        updatedDisplayFilter,
        sprintId.toString()
      );
    },
    [workspaceSlug, projectId, sprintId, updateFilters]
  );

  const handleDisplayProperties = useCallback(
    (property: Partial<IIssueDisplayProperties>) => {
      if (!workspaceSlug || !projectId || !sprintId) return;
      updateFilters(
        workspaceSlug.toString(),
        projectId.toString(),
        EIssueFilterType.DISPLAY_PROPERTIES,
        property,
        sprintId.toString()
      );
    },
    [workspaceSlug, projectId, sprintId, updateFilters]
  );

  return (
    <>
      <WorkItemsModal
        projectDetails={currentProjectDetails}
        isOpen={analyticsModal}
        onClose={() => setAnalyticsModal(false)}
        sprintDetails={sprintDetails ?? undefined}
      />
      <div className="flex justify-evenly py-2 border-b border-subtle md:hidden bg-surface-1">
        <CustomMenu
          maxHeight={"md"}
          className="flex flex-grow justify-center text-secondary text-13"
          placement="bottom-start"
          customButton={
            <span className="flex flex-grow justify-center text-secondary text-13">{t("common.layout")}</span>
          }
          customButtonClassName="flex flex-grow justify-center text-secondary text-13"
          closeOnSelect
        >
          {SUPPORTED_LAYOUTS.map((layout, index) => (
            <CustomMenu.MenuItem
              key={ISSUE_LAYOUTS[index].key}
              onClick={() => {
                handleLayoutChange(ISSUE_LAYOUTS[index].key);
              }}
              className="flex items-center gap-2"
            >
              <IssueLayoutIcon layout={ISSUE_LAYOUTS[index].key} className="w-3 h-3" />
              <div className="text-tertiary">{t(layout.titleTranslationKey)}</div>
            </CustomMenu.MenuItem>
          ))}
        </CustomMenu>
        <div className="flex flex-grow justify-center border-l border-subtle items-center text-secondary text-13">
          <FiltersDropdown
            title={t("common.display")}
            placement="bottom-end"
            menuButton={
              <span className="flex items-center text-secondary text-13">
                {t("common.display")}
                <ChevronDownIcon className="text-secondary h-4 w-4 ml-2" />
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
              ignoreGroupedFilters={["sprint"]}
              sprintViewDisabled={!currentProjectDetails?.sprint_view}
              moduleViewDisabled={!currentProjectDetails?.module_view}
            />
          </FiltersDropdown>
        </div>

        <span
          onClick={() => setAnalyticsModal(true)}
          className="flex flex-grow justify-center text-secondary text-13 border-l border-subtle"
        >
          {t("common.analytics")}
        </span>
      </div>
    </>
  );
});
