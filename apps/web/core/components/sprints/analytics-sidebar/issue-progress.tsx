import { useMemo } from "react";
import { isEmpty } from "lodash-es";
import { useSearchParams } from "next/navigation";
import { Disclosure, Transition } from "@headlessui/react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { ChevronUpIcon, ChevronDownIcon } from "@plane/propel/icons";
import type { ISprint, TSprintPlotType, TProgressSnapshot } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { getDate } from "@plane/utils";
// hooks
import { useSprintDetails } from "@/store/queries/sprint";
import { useSprint } from "@/hooks/store/use-sprint";
// plane web components
import { useWorkItemFilters } from "@/hooks/store/work-item-filters/use-work-item-filters";
import { SidebarChartRoot } from "@/plane-web/components/sprints";
// local imports
import { SprintProgressStats } from "./progress-stats";

type TSprintAnalyticsProgress = {
  workspaceSlug: string;
  projectId: string;
  sprintId: string;
};
type Options = {
  value: string;
  label: string;
};

export const sprintEstimateOptions: Options[] = [
  { value: "issues", label: "Work items" },
  { value: "points", label: "Estimates" },
];
export const sprintChartOptions: Options[] = [
  { value: "burndown", label: "Burn-down" },
  { value: "burnup", label: "Burn-up" },
];

export const validateSprintSnapshot = (sprintDetails: ISprint | null): ISprint | null => {
  if (!sprintDetails || sprintDetails === null) return sprintDetails;

  const updatedSprintDetails: any = { ...sprintDetails };
  if (!isEmpty(sprintDetails.progress_snapshot)) {
    Object.keys(sprintDetails.progress_snapshot || {}).forEach((key) => {
      const currentKey = key as keyof TProgressSnapshot;
      if (!isEmpty(sprintDetails.progress_snapshot) && !isEmpty(updatedSprintDetails)) {
        updatedSprintDetails[currentKey as keyof ISprint] = sprintDetails?.progress_snapshot?.[currentKey];
      }
    });
  }
  return updatedSprintDetails;
};

export function SprintAnalyticsProgress(props: TSprintAnalyticsProgress) {
  // props
  const { workspaceSlug, projectId, sprintId } = props;
  // router
  const searchParams = useSearchParams();
  const peekSprint = searchParams.get("peekSprint") || undefined;
  // plane hooks
  const { t } = useTranslation();
  // hooks
  const { data: sprintData } = useSprintDetails(workspaceSlug, projectId, sprintId);
  const { getPlotTypeBySprintId, getEstimateTypeBySprintId } = useSprint();
  const { getFilter, updateFilterValueFromSidebar } = useWorkItemFilters();
  // derived values
  const sprintFilter = getFilter(EIssuesStoreType.SPRINT, sprintId);
  const selectedAssignees = sprintFilter?.findFirstConditionByPropertyAndOperator("assignee_id", "in");
  const selectedLabels = sprintFilter?.findFirstConditionByPropertyAndOperator("label_id", "in");
  const selectedStateGroups = sprintFilter?.findFirstConditionByPropertyAndOperator("state_group", "in");
  const sprintDetails = validateSprintSnapshot(sprintData || null);
  const plotType: TSprintPlotType = getPlotTypeBySprintId(sprintId);
  const estimateType = getEstimateTypeBySprintId(sprintId);
  const totalIssues = sprintDetails?.total_issues || 0;
  const totalEstimatePoints = sprintDetails?.total_estimate_points || 0;
  const chartDistributionData =
    estimateType === "points" ? sprintDetails?.estimate_distribution : sprintDetails?.distribution || undefined;
  const groupedIssues = useMemo(
    () => ({
      backlog:
        estimateType === "points" ? sprintDetails?.backlog_estimate_points || 0 : sprintDetails?.backlog_issues || 0,
      unstarted:
        estimateType === "points"
          ? sprintDetails?.unstarted_estimate_points || 0
          : sprintDetails?.unstarted_issues || 0,
      started:
        estimateType === "points" ? sprintDetails?.started_estimate_points || 0 : sprintDetails?.started_issues || 0,
      completed:
        estimateType === "points"
          ? sprintDetails?.completed_estimate_points || 0
          : sprintDetails?.completed_issues || 0,
      cancelled:
        estimateType === "points"
          ? sprintDetails?.cancelled_estimate_points || 0
          : sprintDetails?.cancelled_issues || 0,
    }),
    [estimateType, sprintDetails]
  );
  const sprintStartDate = getDate(sprintDetails?.start_date);
  const sprintEndDate = getDate(sprintDetails?.end_date);
  const isSprintStartDateValid = sprintStartDate && sprintStartDate <= new Date();
  const isSprintEndDateValid = sprintStartDate && sprintEndDate && sprintEndDate >= sprintStartDate;
  const isSprintDateValid = isSprintStartDateValid && isSprintEndDateValid;

  if (!sprintDetails) return <></>;
  return (
    <div className="border-t border-subtle space-y-4 py-5">
      <Disclosure defaultOpen>
        {({ open }) => (
          <div className="flex flex-col">
            {/* progress bar header */}
            {isSprintDateValid ? (
              <div className="relative w-full flex justify-between items-center gap-2">
                <Disclosure.Button className="relative flex items-center gap-2 w-full">
                  <div className="font-medium text-secondary text-13">
                    {t("project_sprints.active_sprint.progress")}
                  </div>
                </Disclosure.Button>
                <Disclosure.Button className="ml-auto">
                  {open ? (
                    <ChevronUpIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            ) : (
              <div className="relative w-full flex justify-between items-center gap-2">
                <div className="font-medium text-secondary text-13">{t("project_sprints.active_sprint.progress")}</div>
              </div>
            )}
            <Transition show={open} as="div">
              <Disclosure.Panel className="flex flex-col divide-y divide-subtle-1">
                {sprintStartDate && sprintEndDate ? (
                  <>
                    {isSprintDateValid && (
                      <SidebarChartRoot workspaceSlug={workspaceSlug} projectId={projectId} sprintId={sprintId} />
                    )}
                    {/* progress detailed view */}
                    {chartDistributionData && (
                      <div className="w-full py-4">
                        <SprintProgressStats
                          sprintId={sprintId}
                          distribution={chartDistributionData}
                          groupedIssues={groupedIssues}
                          handleFiltersUpdate={updateFilterValueFromSidebar.bind(
                            updateFilterValueFromSidebar,
                            EIssuesStoreType.SPRINT,
                            sprintId
                          )}
                          isEditable={Boolean(!peekSprint) && sprintFilter !== undefined}
                          noBackground={false}
                          plotType={plotType}
                          roundedTab={false}
                          selectedFilters={{
                            assignees: selectedAssignees,
                            labels: selectedLabels,
                            stateGroups: selectedStateGroups,
                          }}
                          size="xs"
                          totalIssuesCount={estimateType === "points" ? totalEstimatePoints || 0 : totalIssues || 0}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="my-2 py-2 text-13 text-tertiary  bg-surface-2 rounded-md px-2 w-full">
                    {t("no_data_yet")}
                  </div>
                )}
              </Disclosure.Panel>
            </Transition>
          </div>
        )}
      </Disclosure>
    </div>
  );
}
