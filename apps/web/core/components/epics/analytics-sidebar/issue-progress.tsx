import type { FC } from "react";
import { Fragment, useMemo, useState } from "react";
import { observer } from "mobx-react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Disclosure, Transition } from "@headlessui/react";
import { EEstimateSystem } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { ChevronUpIcon, ChevronDownIcon } from "@plane/propel/icons";
import type { TEpicPlotType } from "@plane/types";
import { EIssuesStoreType } from "@plane/types";
import { CustomSelect, Spinner } from "@plane/ui";
// components
// constants
// helpers
import { getDate } from "@plane/utils";
import ProgressChart from "@/components/core/sidebar/progress-chart";
import { EpicProgressStats } from "@/components/epics";
// hooks
import { useProjectEstimates } from "@/hooks/store/estimates";
import { useEpic } from "@/hooks/store/use-epic";
import { useWorkItemFilters } from "@/hooks/store/work-item-filters/use-work-item-filters";
// plane web constants
type TEpicAnalyticsProgress = {
  workspaceSlug: string;
  projectId: string;
  epicId: string;
};

const epicBurnDownChartOptions = [
  { value: "burndown", i18n_label: "issues" },
  { value: "points", i18n_label: "points" },
];

export const EpicAnalyticsProgress = observer(function EpicAnalyticsProgress(props: TEpicAnalyticsProgress) {
  // props
  const { workspaceSlug, projectId, epicId } = props;
  // router
  const searchParams = useSearchParams();
  const peekEpic = searchParams.get("peekEpic") || undefined;
  // plane hooks
  const { t } = useTranslation();
  // hooks
  const { areEstimateEnabledByProjectId, currentActiveEstimateId, estimateById } = useProjectEstimates();
  const { getPlotTypeByEpicId, setPlotType, getEpicById, fetchEpicDetails, fetchArchivedEpicDetails } =
    useEpic();
  const { getFilter, updateFilterValueFromSidebar } = useWorkItemFilters();
  // state
  const [loader, setLoader] = useState(false);
  // derived values
  const epicFilter = getFilter(EIssuesStoreType.EPIC, epicId);
  const selectedAssignees = epicFilter?.findFirstConditionByPropertyAndOperator("assignee_id", "in");
  const selectedLabels = epicFilter?.findFirstConditionByPropertyAndOperator("label_id", "in");
  const selectedStateGroups = epicFilter?.findFirstConditionByPropertyAndOperator("state_group", "in");
  const epicDetails = getEpicById(epicId);
  const plotType: TEpicPlotType = getPlotTypeByEpicId(epicId);
  const isCurrentProjectEstimateEnabled = projectId && areEstimateEnabledByProjectId(projectId) ? true : false;
  const estimateDetails =
    isCurrentProjectEstimateEnabled && currentActiveEstimateId && estimateById(currentActiveEstimateId);
  const isCurrentEstimateTypeIsPoints = estimateDetails && estimateDetails?.type === EEstimateSystem.POINTS;
  const completedIssues = epicDetails?.completed_issues || 0;
  const totalIssues = epicDetails?.total_issues || 0;
  const completedEstimatePoints = epicDetails?.completed_estimate_points || 0;
  const totalEstimatePoints = epicDetails?.total_estimate_points || 0;
  const progressHeaderPercentage = epicDetails
    ? plotType === "points"
      ? completedEstimatePoints != 0 && totalEstimatePoints != 0
        ? Math.round((completedEstimatePoints / totalEstimatePoints) * 100)
        : 0
      : completedIssues != 0 && completedIssues != 0
        ? Math.round((completedIssues / totalIssues) * 100)
        : 0
    : 0;
  const chartDistributionData =
    plotType === "points" ? epicDetails?.estimate_distribution : epicDetails?.distribution || undefined;
  const completionChartDistributionData = chartDistributionData?.completion_chart || undefined;
  const groupedIssues = useMemo(
    () => ({
      backlog: plotType === "points" ? epicDetails?.backlog_estimate_points || 0 : epicDetails?.backlog_issues || 0,
      unstarted:
        plotType === "points" ? epicDetails?.unstarted_estimate_points || 0 : epicDetails?.unstarted_issues || 0,
      started: plotType === "points" ? epicDetails?.started_estimate_points || 0 : epicDetails?.started_issues || 0,
      completed:
        plotType === "points" ? epicDetails?.completed_estimate_points || 0 : epicDetails?.completed_issues || 0,
      cancelled:
        plotType === "points" ? epicDetails?.cancelled_estimate_points || 0 : epicDetails?.cancelled_issues || 0,
    }),
    [plotType, epicDetails]
  );
  const epicStartDate = getDate(epicDetails?.start_date);
  const epicEndDate = getDate(epicDetails?.target_date);
  const isEpicStartDateValid = epicStartDate && epicStartDate <= new Date();
  const isEpicEndDateValid = epicStartDate && epicEndDate && epicEndDate >= epicStartDate;
  const isEpicDateValid = isEpicStartDateValid && isEpicEndDateValid;
  const isArchived = !!epicDetails?.archived_at;

  // handlers
  const onChange = async (value: TEpicPlotType) => {
    setPlotType(epicId, value);
    if (!workspaceSlug || !projectId || !epicId) return;
    try {
      setLoader(true);
      if (isArchived) {
        await fetchArchivedEpicDetails(workspaceSlug, projectId, epicId);
      } else {
        await fetchEpicDetails(workspaceSlug, projectId, epicId);
      }
      setLoader(false);
    } catch (error) {
      setLoader(false);
      setPlotType(epicId, plotType);
    }
  };

  if (!epicDetails) return <></>;
  return (
    <div className="border-t border-subtle space-y-4 py-4 px-3">
      <Disclosure defaultOpen={isEpicDateValid ? true : false}>
        {({ open }) => (
          <div className="space-y-6">
            {/* progress bar header */}
            {isEpicDateValid ? (
              <div className="relative w-full flex justify-between items-center gap-2">
                <Disclosure.Button className="relative flex items-center gap-2 w-full">
                  <div className="font-medium text-secondary text-13">{t("progress")}</div>
                  {progressHeaderPercentage > 0 && (
                    <div className="flex h-5 w-9 items-center justify-center rounded-sm bg-amber-500/20 text-11 font-medium text-amber-500">{`${progressHeaderPercentage}%`}</div>
                  )}
                </Disclosure.Button>
                {isCurrentEstimateTypeIsPoints && (
                  <>
                    <div>
                      <CustomSelect
                        value={plotType}
                        label={
                          <span>
                            {t(epicBurnDownChartOptions.find((v) => v.value === plotType)?.i18n_label || "none")}
                          </span>
                        }
                        onChange={onChange}
                        maxHeight="lg"
                      >
                        {epicBurnDownChartOptions.map((item) => (
                          <CustomSelect.Option key={item.value} value={item.value}>
                            {t(item.i18n_label)}
                          </CustomSelect.Option>
                        ))}
                      </CustomSelect>
                    </div>
                    {loader && <Spinner className="h-3 w-3" />}
                  </>
                )}
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
                <div className="font-medium text-secondary text-13">Progress</div>
                <div className="flex items-center gap-1">
                  <AlertCircle height={14} width={14} className="text-secondary" />
                  <span className="text-11 italic text-secondary">
                    {epicDetails?.start_date && epicDetails?.target_date
                      ? t("project_epic.empty_state.sidebar.in_active")
                      : t("project_epic.empty_state.sidebar.invalid_date")}
                  </span>
                </div>
              </div>
            )}

            <Transition show={open}>
              <Disclosure.Panel className="space-y-4">
                {/* progress burndown chart */}
                <div>
                  {epicStartDate && epicEndDate && completionChartDistributionData && (
                    <Fragment>
                      {plotType === "points" ? (
                        <ProgressChart
                          distribution={completionChartDistributionData}
                          totalIssues={totalEstimatePoints}
                          plotTitle={"points"}
                        />
                      ) : (
                        <ProgressChart
                          distribution={completionChartDistributionData}
                          totalIssues={totalIssues}
                          plotTitle={"work items"}
                        />
                      )}
                    </Fragment>
                  )}
                </div>

                {/* progress detailed view */}
                {chartDistributionData && (
                  <div className="w-full border-t border-subtle pt-5">
                    <EpicProgressStats
                      distribution={chartDistributionData}
                      groupedIssues={groupedIssues}
                      handleFiltersUpdate={updateFilterValueFromSidebar.bind(
                        updateFilterValueFromSidebar,
                        EIssuesStoreType.EPIC,
                        epicId
                      )}
                      isEditable={Boolean(!peekEpic) && epicFilter !== undefined}
                      epicId={epicId}
                      noBackground={false}
                      plotType={plotType}
                      roundedTab={false}
                      selectedFilters={{
                        assignees: selectedAssignees,
                        labels: selectedLabels,
                        stateGroups: selectedStateGroups,
                      }}
                      size="xs"
                      totalIssuesCount={plotType === "points" ? totalEstimatePoints || 0 : totalIssues || 0}
                    />
                  </div>
                )}
              </Disclosure.Panel>
            </Transition>
          </div>
        )}
      </Disclosure>
    </div>
  );
});
