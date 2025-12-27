"use client";

import type { FC } from "react";
import { useMemo } from "react";
import { UserRoundPlus } from "lucide-react";
import { Tooltip } from "@plane/propel/tooltip";
import { Avatar, AvatarGroup } from "@plane/ui";
import { getFileURL } from "@plane/utils";
import { useWorkspaceMembers, getWorkspaceMemberById } from "@/store/queries/member";
import { useSprintProjectAssignments } from "../resource-view/use-sprint-assignments";

type Props = {
  workspaceSlug: string;
  projectId: string;
  sprintId: string;
};

/**
 * Shows members who are assigned to work on this project during this sprint.
 * Data comes from SprintMemberProject assignments (Resource Matrix).
 */
export const SprintAssignedMembers: FC<Props> = ({ workspaceSlug, projectId, sprintId }) => {
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceSlug);
  const { assignments, isLoading } = useSprintProjectAssignments(workspaceSlug);

  // Find members assigned to this project for this sprint
  const assignedMemberIds = useMemo(() => {
    if (!assignments) return [];

    const memberIds: string[] = [];
    // The assignments map is "memberId::sprintId" -> projectId
    // We need to find all entries where sprintId matches AND projectId matches
    const KEY_SEPARATOR = "::";
    for (const [key, assignedProjectId] of Object.entries(assignments)) {
      if (assignedProjectId !== projectId) continue;
      const [memberId, keySprintId] = key.split(KEY_SEPARATOR);
      if (keySprintId === sprintId) {
        memberIds.push(memberId);
      }
    }
    return memberIds;
  }, [assignments, projectId, sprintId]);

  if (isLoading || assignedMemberIds.length === 0) return null;

  return (
    <Tooltip
      tooltipContent={`${assignedMemberIds.length} resource${assignedMemberIds.length !== 1 ? "s" : ""} assigned`}
    >
      <div className="flex items-center gap-1 cursor-default">
        <UserRoundPlus className="h-3.5 w-3.5 text-blue-500" />
        <AvatarGroup showTooltip={false} size={20}>
          {assignedMemberIds.map((memberId) => {
            // memberId is the workspace membership ID, not the user ID
            const memberData = getWorkspaceMemberById(workspaceMembers, memberId);
            const member = memberData?.member;
            return (
              <Avatar
                key={memberId}
                name={member?.display_name}
                src={getFileURL(member?.avatar_url ?? "")}
                className="border-2 border-blue-500"
              />
            );
          })}
        </AvatarGroup>
      </div>
    </Tooltip>
  );
};
