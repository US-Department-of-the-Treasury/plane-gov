import { useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Disclosure } from "@headlessui/react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { ChevronDownIcon } from "@plane/propel/icons";
import { Collapsible } from "@plane/ui";
// components
import { CountChip } from "@/components/common/count-chip";
import { MembersSettingsLoader } from "@/components/ui/loader/settings/members";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useWorkspaceMembers, useWorkspaceInvitations } from "@/store/queries/member";
// local imports
import { WorkspaceInvitationsListItem } from "./invitations-list-item";
import { WorkspaceMembersListItem } from "./members-list-item";

export const WorkspaceMembersList = observer(function WorkspaceMembersList(props: {
  searchQuery: string;
  isAdmin: boolean;
}) {
  const { searchQuery, isAdmin } = props;
  const [showPendingInvites, setShowPendingInvites] = useState<boolean>(true);

  // router
  const { workspaceSlug } = useParams();
  // store hooks
  const {
    workspace: {
      getFilteredWorkspaceMemberIds,
      getSearchedWorkspaceMemberIds,
      getSearchedWorkspaceInvitationIds,
    },
  } = useMember();
  const { t } = useTranslation();

  // TanStack Query hooks
  const { data: workspaceMembers, isLoading: membersLoading } = useWorkspaceMembers(workspaceSlug?.toString() || "");
  const { data: workspaceInvitations, isLoading: invitationsLoading } = useWorkspaceInvitations(workspaceSlug?.toString() || "");

  if (membersLoading || invitationsLoading) return <MembersSettingsLoader />;

  // derived values
  const workspaceMemberIds = workspaceMembers?.map(m => m.id);
  const workspaceMemberInvitationIds = workspaceInvitations?.map(i => i.id);
  const filteredMemberIds = workspaceSlug ? getFilteredWorkspaceMemberIds(workspaceSlug.toString()) : [];
  const searchedMemberIds = searchQuery ? getSearchedWorkspaceMemberIds(searchQuery) : filteredMemberIds;
  const searchedInvitationsIds = getSearchedWorkspaceInvitationIds(searchQuery);

  // Filter members based on searched IDs
  const memberDetails = workspaceMembers
    ?.filter(member => searchedMemberIds?.includes(member.id))
    .sort((a, b) => {
      if (a?.is_active && !b?.is_active) return -1;
      if (!a?.is_active && b?.is_active) return 1;
      return 0;
    });

  // Filter invitations based on searched IDs
  const filteredInvitations = workspaceInvitations?.filter(inv => searchedInvitationsIds?.includes(inv.id));

  return (
    <>
      <div className="divide-y-[0.5px] divide-subtle overflow-scroll	">
        {memberDetails && memberDetails.length > 0 && <WorkspaceMembersListItem memberDetails={memberDetails} />}
        {(!filteredInvitations || filteredInvitations.length === 0) && (!memberDetails || memberDetails.length === 0) && (
          <h4 className="mt-16 text-center text-body-xs-regular text-placeholder">{t("no_matching_members")}</h4>
        )}
      </div>
      {isAdmin && filteredInvitations && filteredInvitations.length > 0 && (
        <Collapsible
          isOpen={showPendingInvites}
          onToggle={() => setShowPendingInvites((prev) => !prev)}
          buttonClassName="w-full"
          className=""
          title={
            <div className="flex w-full items-center justify-between pt-4">
              <div className="flex">
                <h4 className="text-h5-medium pt-2 pb-2">{t("workspace_settings.settings.members.pending_invites")}</h4>
                {filteredInvitations && (
                  <CountChip count={filteredInvitations.length} className="h-5  m-auto ml-2" />
                )}
              </div>{" "}
              <ChevronDownIcon className={`h-5 w-5 transition-all ${showPendingInvites ? "rotate-180" : ""}`} />
            </div>
          }
        >
          <Disclosure.Panel>
            <div className="ml-auto items-center gap-1.5 rounded-md bg-surface-1 py-1.5">
              {filteredInvitations?.map((invitation) => (
                <WorkspaceInvitationsListItem key={invitation.id} invitationId={invitation.id} />
              ))}
            </div>
          </Disclosure.Panel>
        </Collapsible>
      )}
    </>
  );
});
