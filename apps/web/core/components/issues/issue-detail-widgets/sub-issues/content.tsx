import type { FC } from "react";
import React, { useEffect, useState, useCallback } from "react";
import type { TIssue, TIssueServiceType } from "@plane/types";
import { EIssueServiceType, EIssuesStoreType } from "@plane/types";
// components
import { DeleteIssueModal } from "@/components/issues/delete-issue-modal";
// stores
import { useIssueDetailUIStore } from "@/store/issue/issue-details/ui.store";
import { useIssueSubIssuesStore } from "@/store/issue/issue-details/sub_issues.store";
import { useSubIssues } from "@/store/queries/issue";
// local imports
import { CreateUpdateIssueModal } from "../../issue-modal/modal";
import { useSubIssueOperations } from "./helper";
import { SubIssuesListRoot } from "./issues-list/root";

type Props = {
  workspaceSlug: string;
  projectId: string;
  parentIssueId: string;
  disabled: boolean;
  issueServiceType?: TIssueServiceType;
};

type TIssueCrudState = { toggle: boolean; parentIssueId: string | undefined; issue: TIssue | undefined };

export function SubIssuesCollapsibleContent(props: Props) {
  const { workspaceSlug, projectId, parentIssueId, disabled, issueServiceType = EIssueServiceType.ISSUES } = props;
  // state
  const [issueCrudState, setIssueCrudState] = useState<{
    create: TIssueCrudState;
    existing: TIssueCrudState;
    update: TIssueCrudState;
    delete: TIssueCrudState;
  }>({
    create: {
      toggle: false,
      parentIssueId: undefined,
      issue: undefined,
    },
    existing: {
      toggle: false,
      parentIssueId: undefined,
      issue: undefined,
    },
    update: {
      toggle: false,
      parentIssueId: undefined,
      issue: undefined,
    },
    delete: {
      toggle: false,
      parentIssueId: undefined,
      issue: undefined,
    },
  });
  // store hooks - use Zustand directly
  const toggleCreateIssueModal = useIssueDetailUIStore((s) => s.toggleCreateIssueModal);
  const toggleDeleteIssueModal = useIssueDetailUIStore((s) => s.toggleDeleteIssueModal);
  const subIssueHelpersByIssueId = useIssueSubIssuesStore((s) => s.subIssueHelpersByIssueId);
  const setSubIssueHelpers = useIssueSubIssuesStore((s) => s.setSubIssueHelpers);
  // queries
  const { data: subIssuesData, isLoading } = useSubIssues(workspaceSlug, projectId, parentIssueId);

  // helpers
  const subIssueOperations = useSubIssueOperations(issueServiceType);
  const subIssueHelpers = subIssueHelpersByIssueId(`${parentIssueId}_root`);

  // handler
  const handleIssueCrudState = useCallback(
    (key: "create" | "existing" | "update" | "delete", _parentIssueId: string | null, issue: TIssue | null = null) => {
      setIssueCrudState({
        ...issueCrudState,
        [key]: {
          toggle: !issueCrudState[key].toggle,
          parentIssueId: _parentIssueId,
          issue,
        },
      });
    },
    [issueCrudState]
  );

  // Mark as visible when data is loaded
  useEffect(() => {
    if (subIssuesData && !subIssueHelpers.issue_visibility.includes(parentIssueId)) {
      setSubIssueHelpers(`${parentIssueId}_root`, "issue_visibility", parentIssueId);
    }
  }, [subIssuesData, parentIssueId, subIssueHelpers.issue_visibility, setSubIssueHelpers]);

  // render conditions
  const shouldRenderDeleteIssueModal =
    issueCrudState?.delete?.toggle &&
    issueCrudState?.delete?.issue &&
    issueCrudState.delete.parentIssueId &&
    issueCrudState.delete.issue.id;

  const shouldRenderUpdateIssueModal = issueCrudState?.update?.toggle && issueCrudState?.update?.issue;

  return (
    <>
      {subIssueHelpers.issue_visibility.includes(parentIssueId) && (
        <SubIssuesListRoot
          storeType={EIssuesStoreType.PROJECT}
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          parentIssueId={parentIssueId}
          rootIssueId={parentIssueId}
          spacingLeft={6}
          canEdit={!disabled}
          handleIssueCrudState={handleIssueCrudState}
          subIssueOperations={subIssueOperations}
          issueServiceType={issueServiceType}
        />
      )}

      {shouldRenderDeleteIssueModal && (
        <DeleteIssueModal
          isOpen={issueCrudState?.delete?.toggle}
          handleClose={() => {
            handleIssueCrudState("delete", null, null);
            toggleDeleteIssueModal(null);
          }}
          data={issueCrudState?.delete?.issue as TIssue}
          onSubmit={async () =>
            await subIssueOperations.deleteSubIssue(
              workspaceSlug,
              projectId,
              issueCrudState?.delete?.parentIssueId as string,
              issueCrudState?.delete?.issue?.id as string
            )
          }
          isSubIssue
        />
      )}

      {shouldRenderUpdateIssueModal && (
        <CreateUpdateIssueModal
          isOpen={issueCrudState?.update?.toggle}
          onClose={() => {
            handleIssueCrudState("update", null, null);
            toggleCreateIssueModal(false);
          }}
          data={issueCrudState?.update?.issue ?? undefined}
          onSubmit={async (_issue: TIssue) => {
            await subIssueOperations.updateSubIssue(
              workspaceSlug,
              projectId,
              parentIssueId,
              _issue.id,
              _issue,
              issueCrudState?.update?.issue,
              true
            );
          }}
        />
      )}
    </>
  );
}
