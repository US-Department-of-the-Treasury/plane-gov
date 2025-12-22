import { History } from "lucide-react";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { TDescriptionVersion } from "@plane/types";
import { CustomMenu } from "@plane/ui";
import { calculateTimeAgo } from "@plane/utils";
// hooks
import { useWorkspaceMembers, getWorkspaceMemberByUserId, getMemberDisplayName } from "@/store/queries/member";
// local imports
import { DescriptionVersionsDropdownItem } from "./dropdown-item";
import type { TDescriptionVersionEntityInformation } from "./root";

type Props = {
  disabled: boolean;
  entityInformation: TDescriptionVersionEntityInformation;
  onVersionClick: (versionId: string) => void;
  versions: TDescriptionVersion[] | undefined;
  workspaceSlug: string;
};

export function DescriptionVersionsDropdown(props: Props) {
  const { disabled, entityInformation, onVersionClick, versions, workspaceSlug } = props;
  // store hooks
  const { data: members } = useWorkspaceMembers(workspaceSlug);
  // derived values
  const latestVersion = versions?.[0];
  const lastUpdatedAt = latestVersion?.created_at ?? entityInformation.createdAt;
  const lastUpdatedByUser = latestVersion?.owned_by
    ? getWorkspaceMemberByUserId(members, latestVersion.owned_by)
    : null;
  const lastUpdatedByUserDisplayName = lastUpdatedByUser
    ? getMemberDisplayName(lastUpdatedByUser)
    : entityInformation.createdByDisplayName;
  // translation
  const { t } = useTranslation();

  return (
    <CustomMenu
      label={
        <div className="flex items-center gap-1 text-tertiary">
          <span className="flex-shrink-0 size-4 grid place-items-center">
            <History className="size-3.5" />
          </span>
          <p className="text-11">
            {t("description_versions.last_edited_by")}{" "}
            <span className="font-medium">{lastUpdatedByUserDisplayName ?? t("common.deactivated_user")}</span>{" "}
            {calculateTimeAgo(lastUpdatedAt)}
          </p>
        </div>
      }
      noBorder
      noChevron={disabled}
      placement="bottom-end"
      optionsClassName="w-[300px]"
      disabled={disabled}
      closeOnSelect
    >
      <p className="text-11 text-tertiary font-medium mb-1">{t("description_versions.previously_edited_by")}</p>
      {versions?.map((version) => (
        <DescriptionVersionsDropdownItem
          key={version.id}
          onClick={onVersionClick}
          version={version}
          workspaceSlug={workspaceSlug}
        />
      ))}
    </CustomMenu>
  );
}
