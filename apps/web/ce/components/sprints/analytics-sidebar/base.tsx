import { Fragment } from "react";
import { observer } from "mobx-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { TSprintEstimateType } from "@plane/types";
import { Loader } from "@plane/ui";
import { getDate } from "@plane/utils";
// components
import ProgressChart from "@/components/core/sidebar/progress-chart";
import { validateSprintSnapshot } from "@/components/sprints/analytics-sidebar/issue-progress";
import { EstimateTypeDropdown } from "@/components/sprints/dropdowns";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";

type ProgressChartProps = {
  workspaceSlug: string;
  projectId: string;
  sprintId: string;
};
export const SidebarChart = observer(function SidebarChart(props: ProgressChartProps) {
  const { workspaceSlug, projectId, sprintId } = props;

  // hooks
  const { getEstimateTypeBySprintId, getSprintById, fetchSprintDetails, fetchArchivedSprintDetails, setEstimateType } =
    useSprint();
  const { t } = useTranslation();

  // derived data
  const sprintDetails = validateSprintSnapshot(getSprintById(sprintId));
  const sprintStartDate = getDate(sprintDetails?.start_date);
  const sprintEndDate = getDate(sprintDetails?.end_date);
  const totalEstimatePoints = sprintDetails?.total_estimate_points || 0;
  const totalIssues = sprintDetails?.total_issues || 0;
  const estimateType = getEstimateTypeBySprintId(sprintId);

  const chartDistributionData =
    estimateType === "points" ? sprintDetails?.estimate_distribution : sprintDetails?.distribution || undefined;

  const completionChartDistributionData = chartDistributionData?.completion_chart || undefined;

  if (!workspaceSlug || !projectId || !sprintId) return null;

  const isArchived = !!sprintDetails?.archived_at;

  // handlers
  const onChange = async (value: TSprintEstimateType) => {
    setEstimateType(sprintId, value);
    if (!workspaceSlug || !projectId || !sprintId) return;
    try {
      if (isArchived) {
        await fetchArchivedSprintDetails(workspaceSlug, projectId, sprintId);
      } else {
        await fetchSprintDetails(workspaceSlug, projectId, sprintId);
      }
    } catch (err) {
      console.error(err);
      setEstimateType(sprintId, estimateType);
    }
  };
  return (
    <div>
      <div className="relative flex items-center justify-between gap-2 pt-4">
        <EstimateTypeDropdown value={estimateType} onChange={onChange} sprintId={sprintId} projectId={projectId} />
      </div>
      <div className="py-4">
        <div>
          {sprintStartDate && sprintEndDate && completionChartDistributionData ? (
            <Fragment>
              <ProgressChart
                distribution={completionChartDistributionData}
                totalIssues={estimateType === "points" ? totalEstimatePoints : totalIssues}
                plotTitle={estimateType === "points" ? t("points") : t("work_items")}
              />
            </Fragment>
          ) : (
            <Loader className="w-full h-[160px] mt-4">
              <Loader.Item width="100%" height="100%" />
            </Loader>
          )}
        </div>
      </div>
    </div>
  );
});
