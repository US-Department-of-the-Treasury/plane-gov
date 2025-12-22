import type { MutableRefObject } from "react";
import { isNil } from "lodash-es";
// types
import type {
  GroupByColumnTypes,
  IGroupByColumn,
  TGroupedIssues,
  IIssueDisplayProperties,
  TSubGroupedIssues,
  TIssueGroupByOptions,
  TPaginationData,
  TLoader,
} from "@plane/types";
// store
import { useStates, useLabels, useMembers, useSprints, useEpics } from "@/store/queries";
//
import { getGroupByColumns } from "../utils";
// components
import { HeaderGroupByCard } from "./headers/group-by-card";
import { KanbanGroup } from "./kanban-group";

export interface IKanBan {
  anchor: string;
  groupedIssueIds: TGroupedIssues | TSubGroupedIssues;
  displayProperties: IIssueDisplayProperties | undefined;
  subGroupBy: TIssueGroupByOptions | undefined;
  groupBy: TIssueGroupByOptions | undefined;
  subGroupId?: string;
  loadMoreIssues: (groupId?: string, subGroupId?: string) => void;
  getGroupIssueCount: (
    groupId: string | undefined,
    subGroupId: string | undefined,
    isSubGroupCumulative: boolean
  ) => number | undefined;
  getPaginationData: (groupId: string | undefined, subGroupId: string | undefined) => TPaginationData | undefined;
  getIssueLoader: (groupId?: string, subGroupId?: string) => TLoader;
  scrollableContainerRef?: MutableRefObject<HTMLDivElement | null>;
  showEmptyGroup?: boolean;
}

export function KanBan(props: IKanBan) {
  const {
    anchor,
    groupedIssueIds,
    displayProperties,
    subGroupBy,
    groupBy,
    subGroupId = "null",
    loadMoreIssues,
    getGroupIssueCount,
    getPaginationData,
    getIssueLoader,
    scrollableContainerRef,
    showEmptyGroup = true,
  } = props;

  const { data: members } = useMembers(anchor);
  const { data: labels } = useLabels(anchor);
  const { data: sprints } = useSprints(anchor);
  const { data: epics } = useEpics(anchor);
  const { sortedStates } = useStates(anchor);

  const groupList = getGroupByColumns(groupBy as GroupByColumnTypes, sprints, epics, labels, sortedStates, members);

  if (!groupList) return null;

  const visibilityGroupBy = (_list: IGroupByColumn): { showGroup: boolean; showIssues: boolean } => {
    const groupVisibility = {
      showGroup: true,
      showIssues: true,
    };

    if (!showEmptyGroup) {
      groupVisibility.showGroup = (getGroupIssueCount(_list.id, undefined, false) ?? 0) > 0;
    }
    return groupVisibility;
  };

  return (
    <div className="relative size-full flex gap-2 px-2">
      {groupList?.map((subList) => {
        const groupByVisibilityToggle = visibilityGroupBy(subList);

        if (groupByVisibilityToggle.showGroup === false) return <></>;
        return (
          <div
            key={subList.id}
            className={`group relative flex shrink-0 flex-col ${
              groupByVisibilityToggle.showIssues ? `w-[350px]` : ``
            } `}
          >
            {isNil(subGroupBy) && (
              <div className="sticky top-0 z-2 w-full shrink-0 py-1">
                <HeaderGroupByCard
                  groupBy={groupBy}
                  icon={subList.icon as any}
                  title={subList.name}
                  count={getGroupIssueCount(subList.id, undefined, false) ?? 0}
                />
              </div>
            )}

            {groupByVisibilityToggle.showIssues && (
              <KanbanGroup
                anchor={anchor}
                groupId={subList.id}
                groupedIssueIds={groupedIssueIds}
                displayProperties={displayProperties}
                subGroupBy={subGroupBy}
                subGroupId={subGroupId}
                scrollableContainerRef={scrollableContainerRef}
                loadMoreIssues={loadMoreIssues}
                getGroupIssueCount={getGroupIssueCount}
                getPaginationData={getPaginationData}
                getIssueLoader={getIssueLoader}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
