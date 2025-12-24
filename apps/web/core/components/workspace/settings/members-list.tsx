import { useParams } from "next/navigation";
// plane imports
import { useTranslation } from "@plane/i18n";
// components
import { MembersSettingsLoader } from "@/components/ui/loader/settings/members";
// hooks
import { useWorkspaceMembers } from "@/store/queries/member";
// local imports
import { WorkspaceMembersListItem } from "./members-list-item";

export function WorkspaceMembersList(props: { searchQuery: string; isAdmin: boolean }) {
  const { searchQuery } = props;

  // router
  const { workspaceSlug } = useParams();
  const { t } = useTranslation();

  // TanStack Query hooks
  const { data: workspaceMembers, isLoading: membersLoading } = useWorkspaceMembers(workspaceSlug?.toString() || "");

  if (membersLoading) return <MembersSettingsLoader />;

  // Filter and search members
  const searchLower = searchQuery.toLowerCase();
  const memberDetails = workspaceMembers
    ?.filter((member) => {
      if (!searchQuery) return true;
      const displayName = member.member?.display_name?.toLowerCase() || "";
      const email = member.member?.email?.toLowerCase() || "";
      const firstName = member.member?.first_name?.toLowerCase() || "";
      const lastName = member.member?.last_name?.toLowerCase() || "";
      return (
        displayName.includes(searchLower) ||
        email.includes(searchLower) ||
        firstName.includes(searchLower) ||
        lastName.includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (a?.is_active && !b?.is_active) return -1;
      if (!a?.is_active && b?.is_active) return 1;
      return 0;
    });

  return (
    <div className="divide-y-[0.5px] divide-subtle overflow-scroll">
      {memberDetails && memberDetails.length > 0 && <WorkspaceMembersListItem memberDetails={memberDetails} />}
      {(!memberDetails || memberDetails.length === 0) && (
        <h4 className="mt-16 text-center text-body-xs-regular text-placeholder">{t("no_matching_members")}</h4>
      )}
    </div>
  );
}
