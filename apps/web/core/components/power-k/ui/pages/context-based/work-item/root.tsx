import { useParams } from "next/navigation";
// plane imports
import { EIssueServiceType } from "@plane/types";
// components
import type { TPowerKPageType } from "@/components/power-k/core/types";
// hooks
import { useIssueDetail } from "@/hooks/store/use-issue-detail";
import { useProjectMembers, useWorkspaceMembers, getWorkspaceMemberByUserId } from "@/store/queries/member";
// local imports
import { PowerKMembersMenu } from "../../../../menus/members";
import { PowerKWorkItemSprintsMenu } from "./sprints-menu";
import { PowerKWorkItemEstimatesMenu } from "./estimates-menu";
import { PowerKWorkItemLabelsMenu } from "./labels-menu";
import { PowerKWorkItemEpicsMenu } from "./epics-menu";
import { PowerKWorkItemPrioritiesMenu } from "./priorities-menu";
import { PowerKProjectStatesMenu } from "./states-menu";

type Props = {
  activePage: TPowerKPageType | null;
  handleSelection: (data: unknown) => void;
};

export function PowerKWorkItemContextBasedPages(props: Props) {
  const { activePage, handleSelection } = props;
  // navigation
  const { workItem: entityIdentifier, workspaceSlug, projectId } = useParams();
  // store hooks
  const {
    issue: { getIssueById, getIssueIdByIdentifier },
  } = useIssueDetail(EIssueServiceType.ISSUES);
  // derived values
  const entityId = entityIdentifier ? getIssueIdByIdentifier(entityIdentifier.toString()) : null;
  const entityDetails = entityId ? getIssueById(entityId) : null;
  // queries
  const { data: projectMembers = [] } = useProjectMembers(
    workspaceSlug?.toString() ?? "",
    entityDetails?.project_id ?? ""
  );
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug?.toString() ?? "");

  if (!entityDetails) return null;

  return (
    <>
      {/* states menu */}
      {activePage === "update-work-item-state" && (
        <PowerKProjectStatesMenu handleSelect={handleSelection} workItemDetails={entityDetails} />
      )}
      {/* priority menu */}
      {activePage === "update-work-item-priority" && (
        <PowerKWorkItemPrioritiesMenu handleSelect={handleSelection} workItemDetails={entityDetails} />
      )}
      {/* members menu */}
      {activePage === "update-work-item-assignee" && (
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
          value={entityDetails.assignee_ids}
        />
      )}
      {/* estimates menu */}
      {activePage === "update-work-item-estimate" && (
        <PowerKWorkItemEstimatesMenu handleSelect={handleSelection} workItemDetails={entityDetails} />
      )}
      {/* sprints menu */}
      {activePage === "update-work-item-sprint" && (
        <PowerKWorkItemSprintsMenu handleSelect={handleSelection} workItemDetails={entityDetails} />
      )}
      {/* epics menu */}
      {activePage === "update-work-item-epic" && (
        <PowerKWorkItemEpicsMenu handleSelect={handleSelection} workItemDetails={entityDetails} />
      )}
      {/* labels menu */}
      {activePage === "update-work-item-labels" && (
        <PowerKWorkItemLabelsMenu handleSelect={handleSelection} workItemDetails={entityDetails} />
      )}
    </>
  );
}
