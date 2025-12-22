import { useCallback, useMemo } from "react";
// types
import type { IIssueDisplayProperties, TGroupedIssues } from "@plane/types";
// components
import { IssueLayoutHOC } from "@/components/issues/issue-layouts/issue-layout-HOC";
// store
import { useIssueListStore } from "@/store/issue-list.store";
import { List } from "./default";

type Props = {
  anchor: string;
};

export function IssuesListLayoutRoot(props: Props) {
  const { anchor } = props;
  // store hooks
  const {
    groupedIssueIds: storeGroupedIssueIds,
    fetchNextPublicIssues,
    getGroupIssueCount,
    getPaginationData,
    getIssueLoader,
  } = useIssueListStore();

  const groupedIssueIds = storeGroupedIssueIds as TGroupedIssues | undefined;
  // auth
  const displayProperties: IIssueDisplayProperties = useMemo(
    () => ({
      key: true,
      state: true,
      labels: true,
      priority: true,
      due_date: true,
    }),
    []
  );

  const loadMoreIssues = useCallback(
    (groupId?: string) => {
      fetchNextPublicIssues(anchor, groupId);
    },
    [anchor, fetchNextPublicIssues]
  );

  return (
    <IssueLayoutHOC getGroupIssueCount={getGroupIssueCount} getIssueLoader={getIssueLoader}>
      <div className="relative size-full">
        <List
          anchor={anchor}
          displayProperties={displayProperties}
          groupBy={"state"}
          groupedIssueIds={groupedIssueIds ?? {}}
          loadMoreIssues={loadMoreIssues}
          getGroupIssueCount={getGroupIssueCount}
          getPaginationData={getPaginationData}
          getIssueLoader={getIssueLoader}
          showEmptyGroup
        />
      </div>
    </IssueLayoutHOC>
  );
}
