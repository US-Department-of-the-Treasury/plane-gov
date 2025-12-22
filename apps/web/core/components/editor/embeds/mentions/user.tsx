import { useMemo } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Link } from "react-router";
// plane imports
import { ROLE } from "@plane/constants";
import { Popover } from "@plane/propel/popover";
import { Avatar } from "@plane/ui";
import { cn, getFileURL } from "@plane/utils";
// hooks
import { useUser } from "@/hooks/store/user";
import { useWorkspaceMembers, useProjectMembers, getWorkspaceMemberByUserId, getProjectMemberByUserId } from "@/store/queries/member";

type Props = {
  id: string;
};

export const EditorUserMention = observer(function EditorUserMention(props: Props) {
  const { id } = props;
  // router
  const { projectId, workspaceSlug } = useParams();
  // store hooks
  const { data: currentUser } = useUser();
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug?.toString());
  const { data: projectMembers } = useProjectMembers(workspaceSlug?.toString(), projectId?.toString());
  // derived values
  const workspaceMember = useMemo(
    () => getWorkspaceMemberByUserId(workspaceMembers || [], id),
    [workspaceMembers, id]
  );
  const userDetails = workspaceMember?.member;
  const projectMember = useMemo(
    () => (projectId ? getProjectMemberByUserId(projectMembers || [], id) : null),
    [projectMembers, projectId, id]
  );
  const roleDetails = projectMember?.role || null;
  const profileLink = `/${workspaceSlug}/profile/${id}`;

  if (!userDetails) {
    return (
      <div className="not-prose inline px-1 py-0.5 rounded-sm bg-layer-1 text-tertiary no-underline">
        @suspended user
      </div>
    );
  }

  return (
    <div
      className={cn(
        "not-prose inline px-1 py-0.5 rounded-sm bg-accent-subtle-active text-accent-primary no-underline",
        {
          "bg-label-yellow-bg text-label-yellow-text": id === currentUser?.id,
        }
      )}
    >
      <Popover delay={100} openOnHover>
        <Popover.Button>
          <Link to={profileLink}>@{userDetails?.display_name}</Link>
        </Popover.Button>
        <Popover.Panel side="bottom" align="start">
          <div className="w-60 bg-surface-1 shadow-raised-200 rounded-lg p-3 border-[0.5px] border-strong">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 size-10 grid place-items-center">
                <Avatar
                  src={getFileURL(userDetails?.avatar_url ?? "")}
                  name={userDetails?.display_name}
                  size={40}
                  className="text-18"
                  showTooltip={false}
                />
              </div>
              <div>
                <Link to={profileLink} className="not-prose font-medium text-primary text-13 hover:underline">
                  {userDetails?.first_name} {userDetails?.last_name}
                </Link>
                {roleDetails && <p className="text-secondary text-11">{ROLE[roleDetails]}</p>}
              </div>
            </div>
          </div>
        </Popover.Panel>
      </Popover>
    </div>
  );
});
