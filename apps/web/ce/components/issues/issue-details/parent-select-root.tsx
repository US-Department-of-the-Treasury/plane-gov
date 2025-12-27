// plane imports
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// components
import type { TIssueOperations } from "@/components/issues/issue-detail";
import { IssueParentSelect } from "@/components/issues/issue-detail/parent-select";
// stores
import { useIssueDetailUIStore } from "@/store/issue/issue-details/ui.store";
import { useIssueSubIssuesStore } from "@/store/issue/issue-details/sub_issues.store";
// queries
import { useIssue } from "@/store/queries/issue";

type TIssueParentSelect = {
  className?: string;
  disabled?: boolean;
  issueId: string;
  issueOperations: TIssueOperations;
  projectId: string;
  workspaceSlug: string;
};

export function IssueParentSelectRoot(props: TIssueParentSelect) {
  const { issueId, issueOperations, projectId, workspaceSlug } = props;
  const { t } = useTranslation();

  // TanStack Query - fetch current issue
  const { data: issue } = useIssue(workspaceSlug, projectId, issueId);

  // TanStack Query - fetch parent issue if it exists
  const { data: parentIssue } = useIssue(workspaceSlug, issue?.parent_id ? projectId : "", issue?.parent_id ?? "");

  // Zustand stores - UI state and sub-issue operations
  const toggleParentIssueModal = useIssueDetailUIStore((s) => s.toggleParentIssueModal);
  const removeSubIssue = useIssueSubIssuesStore((s) => s.removeSubIssue);
  const setSubIssueHelpers = useIssueSubIssuesStore((s) => s.setSubIssueHelpers);
  const fetchSubIssues = useIssueSubIssuesStore((s) => s.fetchSubIssues);

  const handleParentIssue = async (_issueId: string | null = null) => {
    try {
      await issueOperations.update(workspaceSlug, projectId, issueId, { parent_id: _issueId });
      await issueOperations.fetch(workspaceSlug, projectId, issueId, false);
      if (_issueId) await fetchSubIssues(workspaceSlug, projectId, _issueId);
      toggleParentIssueModal(null);
    } catch (_error) {
      console.error("something went wrong while fetching the issue");
    }
  };

  const handleRemoveSubIssue = async (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueId: string
  ) => {
    try {
      setSubIssueHelpers(parentIssueId, "issue_loader", issueId);
      await removeSubIssue(workspaceSlug, projectId, parentIssueId, issueId);
      await fetchSubIssues(workspaceSlug, projectId, parentIssueId);
      setSubIssueHelpers(parentIssueId, "issue_loader", issueId);
    } catch (_error) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("common.error.label"),
        message: t("common.something_went_wrong"),
      });
    }
  };

  const workItemLink = `/${workspaceSlug}/projects/${parentIssue?.project_id}/issues/${parentIssue?.id}`;

  if (!issue) return <></>;

  return (
    <IssueParentSelect
      {...props}
      handleParentIssue={handleParentIssue}
      handleRemoveSubIssue={handleRemoveSubIssue}
      workItemLink={workItemLink}
    />
  );
}
