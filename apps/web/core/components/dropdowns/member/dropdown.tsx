import { useMemo } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
// hooks
import { useWorkspaceMembers, useProjectMembers, getWorkspaceMembersMap, getProjectMembersMap } from "@/store/queries/member";
// local imports
import { MemberDropdownBase } from "./base";
import type { MemberDropdownProps } from "./types";

type TMemberDropdownProps = {
  icon?: LucideIcon;
  memberIds?: string[];
  onClose?: () => void;
  optionsClassName?: string;
  projectId?: string;
  renderByDefault?: boolean;
} & MemberDropdownProps;

export const MemberDropdown = observer(function MemberDropdown(props: TMemberDropdownProps) {
  const { memberIds: propsMemberIds, projectId } = props;
  // router params
  const { workspaceSlug } = useParams();
  // store hooks
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug?.toString());
  const { data: projectMembers } = useProjectMembers(
    workspaceSlug?.toString(),
    projectId,
    { enabled: !!projectId }
  );

  // Create member maps for lookup
  const workspaceMembersMap = useMemo(() => {
    if (!workspaceMembers) return new Map();
    return getWorkspaceMembersMap(workspaceMembers);
  }, [workspaceMembers]);

  const projectMembersMap = useMemo(() => {
    if (!projectMembers) return new Map();
    return getProjectMembersMap(projectMembers);
  }, [projectMembers]);

  // Determine member IDs
  const memberIds = useMemo(() => {
    if (propsMemberIds) return propsMemberIds;
    if (projectId && projectMembers) {
      return projectMembers.map((m) => m.member.id);
    }
    if (workspaceMembers) {
      return workspaceMembers.map((m) => m.member.id);
    }
    return [];
  }, [propsMemberIds, projectId, projectMembers, workspaceMembers]);

  // Create getUserDetails function
  const getUserDetails = useMemo(() => {
    return (userId: string) => {
      const workspaceMember = workspaceMembersMap.get(userId);
      return workspaceMember?.member;
    };
  }, [workspaceMembersMap]);

  const onDropdownOpen = () => {
    // With TanStack Query, data fetching is handled automatically
  };

  return (
    <MemberDropdownBase
      {...props}
      getUserDetails={getUserDetails}
      memberIds={memberIds ?? []}
      onDropdownOpen={onDropdownOpen}
    />
  );
});
