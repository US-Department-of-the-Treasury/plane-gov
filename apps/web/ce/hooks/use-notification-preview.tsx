import type { IWorkItemPeekOverview } from "@plane/types";
import { IssuePeekOverview } from "@/components/issues/peek-overview";
import type { TPeekIssue } from "@/store/issue/issue-details/root.store";
import { useIssueDetailUIStore } from "@/store/issue/issue-details/ui.store";

export type TNotificationPreview = {
  isWorkItem: boolean;
  PeekOverviewComponent: React.ComponentType<IWorkItemPeekOverview>;
  setPeekWorkItem: (peekIssue: TPeekIssue | undefined) => void;
};

/**
 * This function returns if the current active notification is related to work item or an epic.
 * @returns isWorkItem: boolean, peekOverviewComponent: IWorkItemPeekOverview, setPeekWorkItem
 */
export const useNotificationPreview = (): TNotificationPreview => {
  // UI state from Zustand (reactive)
  const peekIssue = useIssueDetailUIStore((state) => state.peekIssue);
  const setPeekIssue = useIssueDetailUIStore((state) => state.setPeekIssue);

  return {
    isWorkItem: Boolean(peekIssue),
    PeekOverviewComponent: IssuePeekOverview,
    setPeekWorkItem: setPeekIssue,
  };
};
