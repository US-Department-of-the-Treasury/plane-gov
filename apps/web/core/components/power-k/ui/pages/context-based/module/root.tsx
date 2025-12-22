import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// components
import type { TPowerKPageType } from "@/components/power-k/core/types";
import { PowerKMembersMenu } from "@/components/power-k/menus/members";
// hooks
import { useModuleDetails } from "@/store/queries/module";
import { useProjectMembers } from "@/store/queries/member";
// local imports
import { PowerKModuleStatusMenu } from "./status-menu";

type Props = {
  activePage: TPowerKPageType | null;
  handleSelection: (data: unknown) => void;
};

export const PowerKModuleContextBasedPages = observer(function PowerKModuleContextBasedPages(props: Props) {
  const { activePage, handleSelection } = props;
  // navigation
  const { workspaceSlug, projectId, moduleId } = useParams();
  // queries
  const { data: moduleDetails } = useModuleDetails(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? "",
    moduleId?.toString() ?? ""
  );
  const { data: projectMembers = [] } = useProjectMembers(
    workspaceSlug?.toString() ?? "",
    moduleDetails?.project_id ?? ""
  );

  if (!moduleDetails) return null;

  return (
    <>
      {/* members menu */}
      {activePage === "update-module-member" && moduleDetails && (
        <PowerKMembersMenu
          handleSelect={handleSelection}
          members={projectMembers.map((m) => ({
            id: m.member,
            display_name: m.member_display_name || m.member_email || "",
            avatar_url: m.member_avatar_url,
          }))}
          value={moduleDetails.member_ids}
        />
      )}
      {/* status menu */}
      {activePage === "update-module-status" && moduleDetails?.status && (
        <PowerKModuleStatusMenu handleSelect={handleSelection} value={moduleDetails.status} />
      )}
    </>
  );
});
