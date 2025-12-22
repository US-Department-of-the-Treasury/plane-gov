import { useEffect } from "react";
// components
import { IssueAppliedFilters } from "@/components/issues/filters/applied-filters/root";
import { IssuePeekOverview } from "@/components/issues/peek-overview";
// store
import { AnchorProvider } from "@/store/anchor-context";
import { useIssueListStore } from "@/store/issue-list.store";
import { useIssueFiltersStore } from "@/store/issue-filters.store";
import { usePeekStore } from "@/store/peek.store";
// local imports
import { SomethingWentWrongError } from "./error";
import { IssueKanbanLayoutRoot } from "./kanban/base-kanban-root";
import { IssuesListLayoutRoot } from "./list/base-list-root";

type Props = {
  anchor: string;
  peekId: string | undefined;
};

export function IssuesLayoutsRoot(props: Props) {
  const { anchor, peekId } = props;
  // store hooks
  const { getIssueFilters } = useIssueFiltersStore();
  const { fetchPublicIssues, getIssueLoader } = useIssueListStore();
  const { setPeekId } = usePeekStore();

  // derived values
  const issueFilters = anchor ? getIssueFilters(anchor) : undefined;
  const activeLayout = issueFilters?.display_filters?.layout || undefined;
  const loader = getIssueLoader();

  // Fetch issues on mount
  useEffect(() => {
    if (anchor) {
      fetchPublicIssues(anchor, "init-loader", { groupedBy: "state", canGroup: true, perPageCount: 50 });
    }
  }, [anchor, fetchPublicIssues]);

  // Set peek ID when it changes
  useEffect(() => {
    if (peekId) {
      setPeekId(peekId.toString());
    }
  }, [peekId, setPeekId]);

  if (!anchor) return null;

  // Show error if initial load failed (loader is undefined after an attempt)
  if (loader === undefined && !getIssueFilters(anchor)) {
    return <SomethingWentWrongError />;
  }

  return (
    <AnchorProvider anchor={anchor}>
      <div className="relative size-full overflow-hidden">
        {peekId && <IssuePeekOverview anchor={anchor} peekId={peekId} />}
        {activeLayout && (
          <div className="relative flex size-full flex-col overflow-hidden">
            {/* applied filters */}
            <IssueAppliedFilters anchor={anchor} />

            {activeLayout === "list" && (
              <div className="relative size-full overflow-y-auto">
                <IssuesListLayoutRoot anchor={anchor} />
              </div>
            )}
            {activeLayout === "kanban" && (
              <div className="relative mx-auto size-full p-5">
                <IssueKanbanLayoutRoot anchor={anchor} />
              </div>
            )}
          </div>
        )}
      </div>
    </AnchorProvider>
  );
}
