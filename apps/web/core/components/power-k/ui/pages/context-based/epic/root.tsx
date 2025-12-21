import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// components
import type { TPowerKPageType } from "@/components/power-k/core/types";
import { PowerKMembersMenu } from "@/components/power-k/menus/members";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useEpic } from "@/hooks/store/use-module";
// local imports
import { PowerKModuleStatusMenu } from "./status-menu";

type Props = {
  activePage: TPowerKPageType | null;
  handleSelection: (data: unknown) => void;
};

export const PowerKEpicContextBasedPages = observer(function PowerKEpicContextBasedPages(props: Props) {
  const { activePage, handleSelection } = props;
  // navigation
  const { epicId } = useParams();
  // store hooks
  const { getEpicById } = useEpic();
  const {
    project: { getProjectMemberIds },
  } = useMember();
  // derived values
  const epicDetails = epicId ? getEpicById(epicId.toString()) : null;
  const projectMemberIds = epicDetails?.project_id ? getProjectMemberIds(epicDetails.project_id, false) : [];

  if (!epicDetails) return null;

  return (
    <>
      {/* members menu */}
      {activePage === "update-module-member" && epicDetails && (
        <PowerKMembersMenu
          handleSelect={handleSelection}
          userIds={projectMemberIds ?? undefined}
          value={epicDetails.member_ids}
        />
      )}
      {/* status menu */}
      {activePage === "update-module-status" && epicDetails?.status && (
        <PowerKModuleStatusMenu handleSelect={handleSelection} value={epicDetails.status} />
      )}
    </>
  );
});
