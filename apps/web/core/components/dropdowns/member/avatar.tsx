import { useMemo } from "react";
import { useParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { MembersPropertyIcon } from "@plane/propel/icons";
// plane ui
import { Avatar, AvatarGroup } from "@plane/ui";
import { cn, getFileURL } from "@plane/utils";
// plane utils
// helpers
// hooks
import { useWorkspaceMembers, getWorkspaceMembersMap } from "@/store/queries/member";

type AvatarProps = {
  showTooltip: boolean;
  userIds: string | string[] | null;
  icon?: LucideIcon;
  size?: "sm" | "md" | "base" | "lg" | number;
};

export const ButtonAvatars = function ButtonAvatars(props: AvatarProps) {
  const { showTooltip, userIds, icon: Icon, size = "md" } = props;
  // router
  const { workspaceSlug } = useParams();
  // store hooks
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug?.toString());

  const membersMap = useMemo(() => {
    if (!workspaceMembers) return new Map();
    return getWorkspaceMembersMap(workspaceMembers);
  }, [workspaceMembers]);

  if (Array.isArray(userIds)) {
    if (userIds.length > 0)
      return (
        <AvatarGroup size={size} showTooltip={!showTooltip}>
          {userIds.map((userId) => {
            const workspaceMember = membersMap.get(userId);
            const userDetails = workspaceMember?.member;

            if (!userDetails) return;
            return <Avatar key={userId} src={getFileURL(userDetails.avatar_url)} name={userDetails.display_name} />;
          })}
        </AvatarGroup>
      );
  } else {
    if (userIds) {
      const workspaceMember = membersMap.get(userIds);
      const userDetails = workspaceMember?.member;
      return (
        <Avatar
          src={getFileURL(userDetails?.avatar_url ?? "")}
          name={userDetails?.display_name}
          size={size}
          showTooltip={!showTooltip}
        />
      );
    }
  }

  return Icon ? (
    <Icon className="h-3 w-3 flex-shrink-0" />
  ) : (
    <MembersPropertyIcon className={cn("h-3 w-3 mx-[4px] flex-shrink-0")} />
  );
};
