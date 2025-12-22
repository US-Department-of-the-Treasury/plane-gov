import { useParams } from "next/navigation";
// components
import type { TPowerKPageType } from "@/components/power-k/core/types";
import { PowerKMembersMenu } from "@/components/power-k/menus/members";
// hooks
import { useEpicDetails } from "@/store/queries/epic";
import { useProjectMembers } from "@/store/queries/member";
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

  if (!epicDetails) return null;

  return (
    <>
      {/* members menu */}
      {activePage === "update-epic-member" && epicDetails && (
        <PowerKMembersMenu
          handleSelect={handleSelection}
          members={projectMembers.map((m) => ({
            id: m.member,
            display_name: m.member_display_name || m.member_email || "",
            avatar_url: m.member_avatar_url,
          }))}
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
