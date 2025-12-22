// plane imports
import { useTranslation } from "@plane/i18n";
import type { TDescriptionVersion } from "@plane/types";
import { Avatar, CustomMenu } from "@plane/ui";
import { calculateTimeAgo, getFileURL } from "@plane/utils";
// hooks
import { useWorkspaceMembers, getWorkspaceMemberByUserId, getMemberDisplayName } from "@/store/queries/member";

type Props = {
  onClick: (versionId: string) => void;
  version: TDescriptionVersion;
  workspaceSlug: string;
};

export function DescriptionVersionsDropdownItem(props: Props) {
  const { onClick, version, workspaceSlug } = props;
  // store hooks
  const { data: members } = useWorkspaceMembers(workspaceSlug);
  // derived values
  const versionCreator = version.owned_by ? getWorkspaceMemberByUserId(members, version.owned_by) : null;
  // translation
  const { t } = useTranslation();

  const displayName = versionCreator ? getMemberDisplayName(versionCreator) : t("common.deactivated_user");

  return (
    <CustomMenu.MenuItem key={version.id} className="flex items-center gap-1" onClick={() => onClick(version.id)}>
      <span className="flex-shrink-0">
        <Avatar name={displayName} size="sm" src={getFileURL(versionCreator?.avatar_url ?? "")} />
      </span>
      <p className="text-11 text-secondary flex items-center gap-1.5">
        <span className="font-medium">{displayName}</span>
        <span>{calculateTimeAgo(version.last_saved_at)}</span>
      </p>
    </CustomMenu.MenuItem>
  );
}
