import type { MutableRefObject } from "react";
//types
import type { IIssueDisplayProperties } from "@plane/types";
// components
import { KanbanIssueBlock } from "./block";

interface IssueBlocksListProps {
  anchor: string;
  subGroupId: string;
  groupId: string;
  issueIds: string[];
  displayProperties: IIssueDisplayProperties | undefined;
  scrollableContainerRef?: MutableRefObject<HTMLDivElement | null>;
}

export function KanbanIssueBlocksList(props: IssueBlocksListProps) {
  const { anchor, subGroupId, groupId, issueIds, displayProperties, scrollableContainerRef } = props;

  return (
    <>
      {issueIds && issueIds.length > 0
        ? issueIds.map((issueId) => {
            if (!issueId) return null;

            let draggableId = issueId;
            if (groupId) draggableId = `${draggableId}__${groupId}`;
            if (subGroupId) draggableId = `${draggableId}__${subGroupId}`;

            return (
              <KanbanIssueBlock
                key={draggableId}
                anchor={anchor}
                issueId={issueId}
                groupId={groupId}
                subGroupId={subGroupId}
                displayProperties={displayProperties}
                scrollableContainerRef={scrollableContainerRef}
              />
            );
          })
        : null}
    </>
  );
}
