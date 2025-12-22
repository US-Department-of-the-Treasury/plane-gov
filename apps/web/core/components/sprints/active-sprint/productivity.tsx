import type { FC } from "react";
import { Fragment } from "react";
import { observer } from "mobx-react";
import Link from "next/link";
import { useTheme } from "next-themes";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { ISprint, TSprintEstimateType } from "@plane/types";
import { Loader } from "@plane/ui";
// assets
import darkChartAsset from "@/app/assets/empty-state/active-sprint/chart-dark.webp?url";
import lightChartAsset from "@/app/assets/empty-state/active-sprint/chart-light.webp?url";
// components
import ProgressChart from "@/components/core/sidebar/progress-chart";
import { SimpleEmptyState } from "@/components/empty-state/simple-empty-state-root";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";
import { EstimateTypeDropdown } from "../dropdowns/estimate-type-dropdown";

export type ActiveSprintProductivityProps = {
  workspaceSlug: string;
  projectId: string;
  sprint: ISprint | null;
};

export const ActiveSprintProductivity = observer(function ActiveSprintProductivity(props: ActiveSprintProductivityProps) {
  const { workspaceSlug, projectId, sprint } = props;
  // theme hook
  const { resolvedTheme } = useTheme();
  // plane hooks
  const { t } = useTranslation();
  // hooks
  const { getEstimateTypeBySprintId, setEstimateType } = useSprint();
  // derived values
  const estimateType: TSprintEstimateType = (sprint && getEstimateTypeBySprintId(sprint.id)) || "issues";
  const resolvedPath = resolvedTheme === "light" ? lightChartAsset : darkChartAsset;

  const onChange = async (value: TSprintEstimateType) => {
    if (!workspaceSlug || !projectId || !sprint || !sprint.id) return;
    setEstimateType(sprint.id, value);
  };

  const chartDistributionData =
    sprint && estimateType === "points" ? sprint?.estimate_distribution : sprint?.distribution || undefined;
  const completionChartDistributionData = chartDistributionData?.completion_chart || undefined;

  return sprint && completionChartDistributionData ? (
    <div className="flex flex-col min-h-[17rem] gap-5 px-3.5 py-4 bg-surface-1 border border-subtle rounded-lg">
      <div className="relative flex items-center justify-between gap-4">
        <Link href={`/${workspaceSlug}/projects/${projectId}/sprints/${sprint?.id}`}>
          <h3 className="text-14 text-tertiary font-semibold">{t("project_sprints.active_sprint.issue_burndown")}</h3>
        </Link>
        <EstimateTypeDropdown value={estimateType} onChange={onChange} sprintId={sprint.id} projectId={projectId} workspaceSlug={workspaceSlug} />
      </div>

      <Link href={`/${workspaceSlug}/projects/${projectId}/sprints/${sprint?.id}`}>
        {sprint.total_issues > 0 ? (
          <>
            <div className="h-full w-full px-2">
              <div className="flex items-center justify-end gap-4 py-1 text-11 text-tertiary">
                {estimateType === "points" ? (
                  <span>{`Pending points - ${sprint.backlog_estimate_points + sprint.unstarted_estimate_points + sprint.started_estimate_points}`}</span>
                ) : (
                  <span>{`Pending work items - ${sprint.backlog_issues + sprint.unstarted_issues + sprint.started_issues}`}</span>
                )}
              </div>

              <div className="relative  h-full">
                {completionChartDistributionData && (
                  <Fragment>
                    {estimateType === "points" ? (
                      <ProgressChart
                        distribution={completionChartDistributionData}
                        totalIssues={sprint.total_estimate_points || 0}
                        plotTitle={"points"}
                      />
                    ) : (
                      <ProgressChart
                        distribution={completionChartDistributionData}
                        totalIssues={sprint.total_issues || 0}
                        plotTitle={"work items"}
                      />
                    )}
                  </Fragment>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center h-full w-full">
              <SimpleEmptyState title={t("active_sprint.empty_state.chart.title")} assetPath={resolvedPath} />
            </div>
          </>
        )}
      </Link>
    </div>
  ) : (
    <Loader className="flex flex-col min-h-[17rem] gap-5 bg-surface-1 border border-subtle rounded-lg">
      <Loader.Item width="100%" height="100%" />
    </Loader>
  );
});
