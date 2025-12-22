// icons
import type { LucideIcon } from "lucide-react";
import { MembersPropertyIcon } from "@plane/propel/icons";
// plane ui
import { Avatar, AvatarGroup } from "@plane/ui";
// plane utils
import { cn } from "@plane/utils";
// store
import { useAnchor } from "@/store/anchor-context";
import { useMembers } from "@/store/queries";
// types
import type { TPublicMember } from "@/types/member";

type Props = {
  memberIds: string[];
  shouldShowBorder?: boolean;
};

type AvatarProps = {
  showTooltip: boolean;
  members: TPublicMember[];
  icon?: LucideIcon;
};

export function ButtonAvatars(props: AvatarProps) {
  const { showTooltip, members, icon: Icon } = props;

  if (Array.isArray(members)) {
    if (members.length > 1) {
      return (
        <AvatarGroup size="md" showTooltip={!showTooltip}>
          {members.map((member) => {
            if (!member) return;
            return <Avatar key={member.id} src={member.member__avatar} name={member.member__display_name} />;
          })}
        </AvatarGroup>
      );
    } else if (members.length === 1) {
      return (
        <Avatar
          src={members[0].member__avatar}
          name={members[0].member__display_name}
          size="md"
          showTooltip={!showTooltip}
        />
      );
    }
  }

  return Icon ? (
    <Icon className="h-3 w-3 flex-shrink-0" />
  ) : (
    <MembersPropertyIcon className="h-3 w-3 mx-[4px] flex-shrink-0" />
  );
}

export function IssueBlockMembers({ memberIds, shouldShowBorder = true }: Props) {
  // hooks
  const anchor = useAnchor();
  const { getMembersByIds } = useMembers(anchor);

  const members = getMembersByIds(memberIds);

  return (
    <div className="relative h-full flex flex-wrap items-center gap-1">
      <div
        className={cn("flex flex-shrink-0 cursor-default items-center rounded-md text-11", {
          "border-[0.5px] border-strong px-2.5 py-1": shouldShowBorder && !members?.length,
        })}
      >
        <div className="flex items-center gap-1.5 text-secondary">
          <ButtonAvatars members={members} showTooltip={false} />
          {!shouldShowBorder && members.length <= 1 && (
            <span>{members?.[0]?.member__display_name ?? "No Assignees"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
