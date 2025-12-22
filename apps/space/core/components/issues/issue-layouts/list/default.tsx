import { useRef } from "react";
// types
import type {
  GroupByColumnTypes,
  TGroupedIssues,
  IIssueDisplayProperties,
  TIssueGroupByOptions,
  TPaginationData,
  TLoader,
} from "@plane/types";
// store
import { useStates, useLabels, useMembers, useSprints, useEpics } from "@/store/queries";
//
import { getGroupByColumns } from "../utils";
import { ListGroup } from "./list-group";

export interface IList {
  anchor: string;
  groupedIssueIds: TGroupedIssues;
  groupBy: TIssueGroupByOptions | undefined;
  displayProperties: IIssueDisplayProperties | undefined;
  showEmptyGroup?: boolean;
  loadMoreIssues: (groupId?: string) => void;
  getGroupIssueCount: (
    groupId: string | undefined,
    subGroupId: string | undefined,
    isSubGroupCumulative: boolean
  ) => number | undefined;
  getPaginationData: (groupId: string | undefined, subGroupId: string | undefined) => TPaginationData | undefined;
  getIssueLoader: (groupId?: string, subGroupId?: string) => TLoader;
}

export function List(props: IList) {
  const {
    anchor,
    groupedIssueIds,
    groupBy,
    displayProperties,
    showEmptyGroup,
    loadMoreIssues,
    getGroupIssueCount,
    getPaginationData,
    getIssueLoader,
  } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);

  const { data: members } = useMembers(anchor);
  const { data: labels } = useLabels(anchor);
  const { data: sprints } = useSprints(anchor);
  const { data: epics } = useEpics(anchor);
  const { sortedStates } = useStates(anchor);

  const groupList = getGroupByColumns(groupBy as GroupByColumnTypes, sprints, epics, labels, sortedStates, members, true);

  if (!groupList) return null;

  return (
    <div className="relative size-full flex flex-col">
      {groupList && (
        <>
          <div
            ref={containerRef}
            className="size-full vertical-scrollbar scrollbar-lg relative overflow-auto vertical-scrollbar-margin-top-md"
          >
            {groupList.map((group) => (
              <ListGroup
                key={group.id}
                anchor={anchor}
                groupIssueIds={groupedIssueIds?.[group.id]}
                groupBy={groupBy}
                group={group}
                displayProperties={displayProperties}
                showEmptyGroup={showEmptyGroup}
                loadMoreIssues={loadMoreIssues}
                getGroupIssueCount={getGroupIssueCount}
                getPaginationData={getPaginationData}
                getIssueLoader={getIssueLoader}
                containerRef={containerRef}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
