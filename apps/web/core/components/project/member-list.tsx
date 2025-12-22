import { useState } from "react";
import { Search } from "lucide-react";
// plane imports
import { EUserPermissions, EUserPermissionsLevel, MEMBER_TRACKER_ELEMENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
// components
import { MembersSettingsLoader } from "@/components/ui/loader/settings/members";
// hooks
import { useUserPermissions } from "@/hooks/store/user";
// queries
import { useProjectMembers, useWorkspaceMembers, getWorkspaceMemberByUserId } from "@/store/queries/member";
// local imports
import { MemberListFiltersDropdown } from "./dropdowns/filters/member-list";
import { ProjectMemberListItem } from "./member-list-item";
import { SendProjectInvitationModal } from "./send-project-invitation-modal";

type TProjectMemberListProps = {
  projectId: string;
  workspaceSlug: string;
};

export function ProjectMemberList(props: TProjectMemberListProps) {
  const { projectId, workspaceSlug } = props;
  // states
  const [inviteModal, setInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  // hooks
  const { allowPermissions } = useUserPermissions();
  const { t } = useTranslation();
  // queries
  const { data: projectMembers = [], isLoading } = useProjectMembers(workspaceSlug, projectId);
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug);

  const filteredMembers = projectMembers.filter((member) => {
    // Get workspace member details
    const workspaceMember = getWorkspaceMemberByUserId(workspaceMembers, member.member);
    if (!workspaceMember?.member) return false;

    // Search filter
    const fullName = `${workspaceMember.member.first_name} ${workspaceMember.member.last_name}`.toLowerCase();
    const displayName = workspaceMember.member.display_name.toLowerCase();
    const matchesSearch =
      displayName?.includes(searchQuery.toLowerCase()) || fullName.includes(searchQuery.toLowerCase());

    // Role filter
    const matchesRole = roleFilters.length === 0 || roleFilters.includes(member.role?.toString() || "");

    return matchesSearch && matchesRole;
  });

  const isAdmin = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT);

  // Handler for role filter updates
  const handleRoleFilterUpdate = (role: string) => {
    setRoleFilters((prev) => {
      if (prev.includes(role)) {
        return prev.filter((r) => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  return (
    <>
      <SendProjectInvitationModal
        isOpen={inviteModal}
        onClose={() => setInviteModal(false)}
        projectId={projectId}
        workspaceSlug={workspaceSlug}
      />
      <div className="flex items-center justify-between gap-4 py-2 overflow-x-hidden border-b border-subtle">
        <div className="text-14 font-semibold">{t("common.members")}</div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-start gap-1.5 rounded-md border border-subtle bg-surface-1 px-2 py-1">
            <Search className="h-3.5 w-3.5" />
            <input
              className="w-full max-w-[234px] border-none bg-transparent text-13 focus:outline-none placeholder:text-placeholder"
              placeholder="Search"
              value={searchQuery}
              autoFocus
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <MemberListFiltersDropdown
            appliedFilters={roleFilters}
            handleUpdate={handleRoleFilterUpdate}
            memberType="project"
          />
          {isAdmin && (
            <Button
              variant="primary"
              onClick={() => {
                setInviteModal(true);
              }}
              data-ph-element={MEMBER_TRACKER_ELEMENTS.HEADER_ADD_BUTTON}
            >
              {t("add_member")}
            </Button>
          )}
        </div>
      </div>
      {isLoading ? (
        <MembersSettingsLoader />
      ) : (
        <div className="divide-y divide-subtle overflow-scroll">
          {filteredMembers.length !== 0 && (
            <ProjectMemberListItem
              memberDetails={filteredMembers
                .map((projectMember) => {
                  const workspaceMember = getWorkspaceMemberByUserId(workspaceMembers, projectMember.member);
                  if (!workspaceMember?.member) return null;
                  return {
                    ...projectMember,
                    member: workspaceMember.member,
                  };
                })
                .filter((member) => member !== null)}
              projectId={projectId}
              workspaceSlug={workspaceSlug}
            />
          )}
          {filteredMembers.length === 0 && (
            <h4 className="text-13 mt-16 text-center text-placeholder">{t("no_matching_members")}</h4>
          )}
        </div>
      )}
    </>
  );
}
