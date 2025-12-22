import type { FC } from "react";
import { useTheme } from "next-themes";
// plane imports
import { PROGRESS_STATE_GROUPS_DETAILS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import type { TWorkItemFilterCondition } from "@plane/shared-state";
import type { ISprint } from "@plane/types";
import { LinearProgressIndicator, Loader } from "@plane/ui";
// assets
import darkProgressAsset from "@/app/assets/empty-state/active-sprint/progress-dark.webp?url";
import lightProgressAsset from "@/app/assets/empty-state/active-sprint/progress-light.webp?url";
// components
import { SimpleEmptyState } from "@/components/empty-state/simple-empty-state-root";

export type ActiveSprintProgressProps = {
  sprint: ISprint | null;
  workspaceSlug: string;
  projectId: string;
  handleFiltersUpdate: (conditions: TWorkItemFilterCondition[]) => void;
};

export function ActiveSprintProgress(props: ActiveSprintProgressProps) {
  const { handleFiltersUpdate, sprint } = props;
  // theme hook
  const { resolvedTheme } = useTheme();
  // plane hooks
  const { t } = useTranslation();
  // derived values
  const progressIndicatorData = PROGRESS_STATE_GROUPS_DETAILS.map((group, index) => ({
    id: index,
    name: group.title,
    value: sprint && sprint.total_issues > 0 ? (sprint[group.key as keyof ISprint] as number) : 0,
    color: group.color,
  }));
  const groupedIssues: any = sprint
    ? {
        completed: sprint?.completed_issues,
        started: sprint?.started_issues,
        unstarted: sprint?.unstarted_issues,
        backlog: sprint?.backlog_issues,
      }
    : {};
  const resolvedPath = resolvedTheme === "light" ? lightProgressAsset : darkProgressAsset;

  return sprint && sprint.hasOwnProperty("started_issues") ? (
    <div className="flex flex-col min-h-[17rem] gap-5 py-4 px-3.5 bg-surface-1 border border-subtle rounded-lg">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-14 text-tertiary font-semibold">{t("project_sprints.active_sprint.progress")}</h3>
          {sprint.total_issues > 0 && (
            <span className="flex gap-1 text-13 text-placeholder font-medium whitespace-nowrap rounded-xs px-3 py-1 ">
              {`${sprint.completed_issues + sprint.cancelled_issues}/${sprint.total_issues - sprint.cancelled_issues} ${
                sprint.completed_issues + sprint.cancelled_issues > 1 ? "Work items" : "Work item"
              } closed`}
            </span>
          )}
        </div>
        {sprint.total_issues > 0 && <LinearProgressIndicator size="lg" data={progressIndicatorData} />}
      </div>

      {sprint.total_issues > 0 ? (
        <div className="flex flex-col gap-5">
          {Object.keys(groupedIssues).map((group, index) => (
            <>
              {groupedIssues[group] > 0 && (
                <div key={index}>
                  <div
                    className="flex items-center justify-between gap-2 text-13 cursor-pointer"
                    onClick={() => {
                      handleFiltersUpdate([{ property: "state_group", operator: "in", value: [group] }]);
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="block h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: PROGRESS_STATE_GROUPS_DETAILS[index].color,
                        }}
                      />
                      <span className="text-tertiary capitalize font-medium w-16">{group}</span>
                    </div>
                    <span className="text-tertiary">{`${groupedIssues[group]} ${
                      groupedIssues[group] > 1 ? "Work items" : "Work item"
                    }`}</span>
                  </div>
                </div>
              )}
            </>
          ))}
          {sprint.cancelled_issues > 0 && (
            <span className="flex items-center gap-2 text-13 text-tertiary">
              <span>
                {`${sprint.cancelled_issues} cancelled ${
                  sprint.cancelled_issues > 1 ? "work items are" : "work item is"
                } excluded from this report.`}{" "}
              </span>
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full w-full">
          <SimpleEmptyState title={t("active_sprint.empty_state.progress.title")} assetPath={resolvedPath} />
        </div>
      )}
    </div>
  ) : (
    <Loader className="flex flex-col min-h-[17rem] gap-5 bg-surface-1 border border-subtle rounded-lg">
      <Loader.Item width="100%" height="100%" />
    </Loader>
  );
}
