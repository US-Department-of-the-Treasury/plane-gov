import type { MutableRefObject } from "react";
// types
import type { IIssueDisplayProperties } from "@plane/types";
import { IssueBlock } from "./block";

interface Props {
  anchor: string;
  issueIds: string[] | undefined;
  groupId: string;
  displayProperties?: IIssueDisplayProperties;
  containerRef: MutableRefObject<HTMLDivElement | null>;
}

export function IssueBlocksList(props: Props) {
  const { anchor, issueIds = [], groupId, displayProperties } = props;

  return (
    <div className="relative size-full">
      {issueIds?.map((issueId) => (
        <IssueBlock key={issueId} anchor={anchor} issueId={issueId} displayProperties={displayProperties} groupId={groupId} />
      ))}
    </div>
  );
}
