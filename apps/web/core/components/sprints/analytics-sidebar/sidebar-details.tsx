import type { FC } from "react";
import React from "react";
import { isEmpty } from "lodash-es";
import { SquareUser } from "lucide-react";
// plane types
import { EEstimateSystem } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { MembersPropertyIcon, WorkItemsIcon } from "@plane/propel/icons";
import type { ISprint } from "@plane/types";
// plane ui
import { Avatar, AvatarGroup, TextArea } from "@plane/ui";
// helpers
import { getFileURL } from "@plane/utils";
// hooks
import { useProjectEstimates } from "@/hooks/store/estimates";
// queries
import { useWorkspaceMembers, getWorkspaceMemberByUserId } from "@/store/queries/member";
// plane web constants

type Props = {
  projectId: string;
  workspaceSlug: string;
  sprintDetails: ISprint;
};

export function SprintSidebarDetails(props: Props) {
  const { projectId, workspaceSlug, sprintDetails } = props;
  // hooks
  const { areEstimateEnabledByProjectId, currentActiveEstimateId, estimateById } = useProjectEstimates();
  const { t } = useTranslation();
  // queries
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceSlug);

  const areEstimateEnabled = projectId && areEstimateEnabledByProjectId(projectId.toString());
  const sprintStatus = sprintDetails?.status?.toLocaleLowerCase();
  const isCompleted = sprintStatus === "completed";

  const issueCount =
    isCompleted && !isEmpty(sprintDetails?.progress_snapshot)
      ? sprintDetails?.progress_snapshot?.total_issues === 0
        ? `0 ${t("common.work_item")}`
        : `${sprintDetails?.progress_snapshot?.completed_issues}/${sprintDetails?.progress_snapshot?.total_issues}`
      : sprintDetails?.total_issues === 0
        ? `0 ${t("common.work_item")}`
        : `${sprintDetails?.completed_issues}/${sprintDetails?.total_issues}`;
  const estimateType = areEstimateEnabled && currentActiveEstimateId && estimateById(currentActiveEstimateId);
  const sprintOwnerDetails = sprintDetails
    ? getWorkspaceMemberByUserId(workspaceMembers, sprintDetails.owned_by_id)?.member
    : undefined;

  const isEstimatePointValid = isEmpty(sprintDetails?.progress_snapshot || {})
    ? estimateType && estimateType?.type == EEstimateSystem.POINTS
      ? true
      : false
    : isEmpty(sprintDetails?.progress_snapshot?.estimate_distribution || {})
      ? false
      : true;

  const issueEstimatePointCount =
    isCompleted && !isEmpty(sprintDetails?.progress_snapshot)
      ? sprintDetails?.progress_snapshot.total_issues === 0
        ? `0 ${t("common.work_item")}`
        : `${sprintDetails?.progress_snapshot.completed_estimate_points}/${sprintDetails?.progress_snapshot.total_estimate_points}`
      : sprintDetails?.total_issues === 0
        ? `0 ${t("common.work_item")}`
        : `${sprintDetails?.completed_estimate_points}/${sprintDetails?.total_estimate_points}`;
  return (
    <div className="flex flex-col gap-5 w-full">
      {sprintDetails?.description && (
        <TextArea
          className="outline-none ring-none w-full max-h-max bg-transparent !p-0 !m-0 !border-0 resize-none text-13 leading-5 text-secondary"
          value={sprintDetails.description}
          disabled
        />
      )}

      <div className="flex flex-col gap-5 pb-6 pt-2.5">
        <div className="flex items-center justify-start gap-1">
          <div className="flex w-2/5 items-center justify-start gap-2 text-tertiary">
            <SquareUser className="h-4 w-4" />
            <span className="text-14">{t("lead")}</span>
          </div>
          <div className="flex w-3/5 items-center rounded-xs">
            <div className="flex items-center gap-2.5">
              <Avatar name={sprintOwnerDetails?.display_name} src={getFileURL(sprintOwnerDetails?.avatar_url ?? "")} />
              <span className="text-13 text-secondary">{sprintOwnerDetails?.display_name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-start gap-1">
          <div className="flex w-2/5 items-center justify-start gap-2 text-tertiary">
            <MembersPropertyIcon className="h-4 w-4" />
            <span className="text-14">{t("members")}</span>
          </div>
          <div className="flex w-3/5 items-center rounded-xs">
            <div className="flex items-center gap-2.5">
              {sprintDetails?.assignee_ids && sprintDetails.assignee_ids.length > 0 ? (
                <>
                  <AvatarGroup showTooltip>
                    {sprintDetails.assignee_ids.map((memberId) => {
                      const memberData = getWorkspaceMemberByUserId(workspaceMembers, memberId);
                      const memberDetails = memberData?.member;
                      return (
                        <Avatar
                          key={memberDetails?.id}
                          name={memberDetails?.display_name ?? ""}
                          src={getFileURL(memberDetails?.avatar_url ?? "")}
                          showTooltip={false}
                        />
                      );
                    })}
                  </AvatarGroup>
                </>
              ) : (
                <span className="px-1.5 text-13 text-tertiary">{t("no_assignee")}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-start gap-1">
          <div className="flex w-2/5 items-center justify-start gap-2 text-tertiary">
            <WorkItemsIcon className="h-4 w-4" />
            <span className="text-14">{t("work_items")}</span>
          </div>
          <div className="flex w-3/5 items-center">
            <span className="px-1.5 text-13 text-tertiary">{issueCount}</span>
          </div>
        </div>

        {/**
         * NOTE: Render this section when estimate points of he projects is enabled and the estimate system is points
         */}
        {isEstimatePointValid && !isCompleted && (
          <div className="flex items-center justify-start gap-1">
            <div className="flex w-2/5 items-center justify-start gap-2 text-tertiary">
              <WorkItemsIcon className="h-4 w-4" />
              <span className="text-14">{t("points")}</span>
            </div>
            <div className="flex w-3/5 items-center">
              <span className="px-1.5 text-13 text-tertiary">{issueEstimatePointCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
