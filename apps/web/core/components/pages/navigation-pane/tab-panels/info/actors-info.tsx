import Link from "next/link";
import { useParams } from "next/navigation";
// plane imports
import { useTranslation } from "@plane/i18n";
import { Avatar } from "@plane/ui";
import { calculateTimeAgoShort, getFileURL, renderFormattedDate } from "@plane/utils";
// hooks
import { useWorkspaceMembers, getWorkspaceMemberByUserId, getMemberDisplayName } from "@/store/queries/member";
// store
import type { TPageInstance } from "@/store/pages/base-page";

type Props = {
  page: TPageInstance;
};

export function PageNavigationPaneInfoTabActorsInfo(props: Props) {
  const { page } = props;
  // navigation
  const { workspaceSlug } = useParams();
  // store hooks
  const { data: members } = useWorkspaceMembers(workspaceSlug);
  // derived values
  const { owned_by, updated_by } = page;
  const editorInformation = updated_by ? getWorkspaceMemberByUserId(members, updated_by) : undefined;
  const creatorInformation = owned_by ? getWorkspaceMemberByUserId(members, owned_by) : undefined;
  // translation
  const { t } = useTranslation();

  return (
    <div className="space-y-3 mt-4">
      <div>
        <p className="text-11 font-medium text-tertiary">{t("page_navigation_pane.tabs.info.actors_info.edited_by")}</p>
        <div className="mt-2 flex items-center justify-between gap-2 text-13 font-medium">
          <Link href={`/${workspaceSlug?.toString()}/profile/${page.updated_by}`} className="flex items-center gap-1">
            <Avatar
              src={getFileURL(editorInformation?.avatar_url ?? "")}
              name={editorInformation ? getMemberDisplayName(editorInformation) : undefined}
              className="flex-shrink-0"
              size="sm"
            />
            <span>{editorInformation ? getMemberDisplayName(editorInformation) : t("common.deactivated_user")}</span>
          </Link>
          <span className="flex-shrink-0 text-tertiary">{calculateTimeAgoShort(page.updated_at ?? "")} ago</span>
        </div>
      </div>
      <div>
        <p className="text-11 font-medium text-tertiary">
          {t("page_navigation_pane.tabs.info.actors_info.created_by")}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2 text-13 font-medium">
          <Link href={`/${workspaceSlug?.toString()}/profile/${page.created_by}`} className="flex items-center gap-1">
            <Avatar
              src={getFileURL(creatorInformation?.avatar_url ?? "")}
              name={creatorInformation ? getMemberDisplayName(creatorInformation) : undefined}
              className="flex-shrink-0"
              size="sm"
            />
            <span>{creatorInformation ? getMemberDisplayName(creatorInformation) : t("common.deactivated_user")}</span>
          </Link>
          <span className="flex-shrink-0 text-tertiary">{renderFormattedDate(page.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
