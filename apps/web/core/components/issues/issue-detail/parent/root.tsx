import { useRouter } from "next/navigation";
import { MinusCircle } from "lucide-react";
import { useTranslation } from "@plane/i18n";
import type { TIssue } from "@plane/types";
// component
// ui
import { ControlLink, CustomMenu } from "@plane/ui";
// helpers
import { generateWorkItemLink } from "@plane/utils";
// hooks
import { useIssue } from "@/store/queries/issue";
import { useProjects, getProjectById } from "@/store/queries/project";
import { useProjectStates, getStateById } from "@/store/queries/state";
import useIssuePeekOverviewRedirection from "@/hooks/use-issue-peek-overview-redirection";
import { usePlatformOS } from "@/hooks/use-platform-os";
// plane web components
import { IssueIdentifier } from "@/plane-web/components/issues/issue-details/issue-identifier";
// types
import type { TIssueOperations } from "../root";
import { IssueParentSiblings } from "./siblings";

export type TIssueParentDetail = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  issue: TIssue;
  issueOperations: TIssueOperations;
};

export function IssueParentDetail(props: TIssueParentDetail) {
  const { workspaceSlug, projectId, issueId, issue, issueOperations } = props;
  // router
  const router = useRouter();
  const { t } = useTranslation();
  // hooks
  const { handleRedirection } = useIssuePeekOverviewRedirection();
  const { isMobile } = usePlatformOS();

  // Fetch parent issue if exists
  const { data: parentIssue } = useIssue(workspaceSlug, issue.parent_id ? projectId : "", issue.parent_id ?? "");

  // derived values
  const isParentEpic = parentIssue?.is_epic;

  // queries
  const { data: projects } = useProjects(workspaceSlug);
  const { data: parentStates } = useProjectStates(workspaceSlug, parentIssue?.project_id ?? "");

  const projectDetails = getProjectById(projects, parentIssue?.project_id);
  const projectIdentifier = projectDetails?.identifier;
  const issueParentState = getStateById(parentStates ?? [], parentIssue?.state_id ?? "");
  const stateColor = issueParentState?.color || undefined;

  if (!parentIssue) return <></>;

  const workItemLink = generateWorkItemLink({
    workspaceSlug,
    projectId: parentIssue?.project_id,
    issueId: parentIssue.id,
    projectIdentifier,
    sequenceId: parentIssue.sequence_id,
    isEpic: isParentEpic,
  });

  const handleParentIssueClick = () => {
    if (isParentEpic) router.push(workItemLink);
    else handleRedirection(workspaceSlug, parentIssue, isMobile);
  };

  return (
    <>
      <div className="mb-5 flex w-min items-center gap-3 whitespace-nowrap rounded-md border border-strong bg-layer-1 px-2.5 py-1 text-11">
        <ControlLink href={workItemLink} onClick={handleParentIssueClick}>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2.5">
              <span className="block h-2 w-2 rounded-full" style={{ backgroundColor: stateColor }} />
              {parentIssue.project_id && (
                <IssueIdentifier
                  projectId={parentIssue.project_id}
                  issueId={parentIssue.id}
                  size="xs"
                  variant="secondary"
                />
              )}
            </div>
            <span className="truncate text-primary">{(parentIssue?.name ?? "").substring(0, 50)}</span>
          </div>
        </ControlLink>

        <CustomMenu ellipsis optionsClassName="p-1.5">
          <div className="border-b border-strong text-11 font-medium text-secondary">{t("issue.sibling.label")}</div>

          <IssueParentSiblings workspaceSlug={workspaceSlug} currentIssue={issue} parentIssue={parentIssue} />

          <CustomMenu.MenuItem
            onClick={() => issueOperations.update(workspaceSlug, projectId, issueId, { parent_id: null })}
            className="flex items-center gap-2 py-2 text-red-500"
          >
            <MinusCircle className="h-4 w-4" />
            <span>{t("issue.remove.parent.label")}</span>
          </CustomMenu.MenuItem>
        </CustomMenu>
      </div>
    </>
  );
}
