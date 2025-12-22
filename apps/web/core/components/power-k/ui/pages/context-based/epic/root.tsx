import { useParams } from "next/navigation";
// components
import type { TPowerKPageType } from "@/components/power-k/core/types";
import { PowerKMembersMenu } from "@/components/power-k/menus/members";
// hooks
import { useEpicDetails } from "@/store/queries/epic";
import { useProjectMembers, useWorkspaceMembers, getWorkspaceMemberByUserId } from "@/store/queries/member";
// local imports
import { PowerKEpicStatusMenu } from "./status-menu";

type Props = {
  activePage: TPowerKPageType | null;
  handleSelection: (data: unknown) => void;
};

export function PowerKEpicContextBasedPages(props: Props) {
  const { activePage, handleSelection } = props;
  // navigation
  const { workspaceSlug, projectId, epicId } = useParams();
  // queries
  const { data: epicDetails } = useEpicDetails(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? "",
    epicId?.toString() ?? ""
  );
  const { data: projectMembers = [] } = useProjectMembers(
    workspaceSlug?.toString() ?? "",
    epicDetails?.project_id ?? ""
  );
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug?.toString() ?? "");

  if (!epicDetails) return null;

  return (
    <>
      {/* members menu */}
      {activePage === "update-epic-member" && epicDetails && (
        <PowerKMembersMenu
          handleSelect={handleSelection}
          members={projectMembers
            .map((m) => {
              const workspaceMember = getWorkspaceMemberByUserId(workspaceMembers, m.member);
              if (!workspaceMember?.member) return null;
              return {
                id: workspaceMember.member.id,
                display_name: workspaceMember.member.display_name || workspaceMember.member.email || "",
                avatar_url: workspaceMember.member.avatar_url,
              };
            })
            .filter((member) => member !== null)}
          value={epicDetails.member_ids}
        />
      )}
      {/* status menu */}
      {activePage === "update-epic-status" && epicDetails?.status && (
        <PowerKEpicStatusMenu handleSelect={handleSelection} value={epicDetails.status} />
      )}
    </>
  );
}
