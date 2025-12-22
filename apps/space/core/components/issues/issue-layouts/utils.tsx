import { isNil } from "lodash-es";
// types
import { EIconSize, ISSUE_PRIORITIES } from "@plane/constants";
import { SprintGroupIcon, SprintIcon, EpicIcon, PriorityIcon, StateGroupIcon } from "@plane/propel/icons";
import type {
  GroupByColumnTypes,
  IGroupByColumn,
  TSprintGroups,
  IIssueDisplayProperties,
  TGroupedIssues,
  IState,
  IIssueLabel,
} from "@plane/types";
// ui
import { Avatar } from "@plane/ui";

export const HIGHLIGHT_CLASS = "highlight";
export const HIGHLIGHT_WITH_LINE = "highlight-with-line";

// Type definitions for data inputs
interface SprintData {
  id: string;
  name: string;
  status?: string;
}

interface EpicData {
  id: string;
  name: string;
}

interface MemberData {
  id: string;
  member__display_name?: string;
}

export const getGroupByColumns = (
  groupBy: GroupByColumnTypes | null,
  sprints: SprintData[] | undefined,
  epics: EpicData[] | undefined,
  labels: IIssueLabel[] | undefined,
  states: IState[] | undefined,
  members: MemberData[] | undefined,
  includeNone?: boolean
): IGroupByColumn[] | undefined => {
  switch (groupBy) {
    case "sprint":
      return getSprintColumns(sprints);
    case "epic":
      return getEpicColumns(epics);
    case "state":
      return getStateColumns(states);
    case "priority":
      return getPriorityColumns();
    case "labels":
      return getLabelsColumns(labels) as any;
    case "assignees":
      return getAssigneeColumns(members);
    case "created_by":
      return getCreatedByColumns(members) as any;
    default:
      if (includeNone) return [{ id: `All Issues`, name: `All work items`, payload: {}, icon: undefined }];
  }
};

const getSprintColumns = (sprints: SprintData[] | undefined): IGroupByColumn[] | undefined => {
  if (!sprints) return;

  const sprintGroups: IGroupByColumn[] = [];

  sprints.map((sprint) => {
    if (sprint) {
      const sprintStatus = sprint?.status ? (sprint.status.toLocaleLowerCase() as TSprintGroups) : "draft";
      sprintGroups.push({
        id: sprint.id,
        name: sprint.name,
        icon: <SprintGroupIcon sprintGroup={sprintStatus} className="h-3.5 w-3.5" />,
        payload: { sprint_id: sprint.id },
      });
    }
  });
  sprintGroups.push({
    id: "None",
    name: "None",
    icon: <SprintIcon className="h-3.5 w-3.5" />,
    payload: { sprint_id: null },
  });

  return sprintGroups;
};

const getEpicColumns = (epics: EpicData[] | undefined): IGroupByColumn[] | undefined => {
  if (!epics) return;

  const epicGroups: IGroupByColumn[] = [];

  epics.map((epicInfo) => {
    if (epicInfo)
      epicGroups.push({
        id: epicInfo.id,
        name: epicInfo.name,
        icon: <EpicIcon className="h-3.5 w-3.5" />,
        payload: { epic_ids: [epicInfo.id] },
      });
  }) as any;
  epicGroups.push({
    id: "None",
    name: "None",
    icon: <EpicIcon className="h-3.5 w-3.5" />,
    payload: { epic_ids: [] },
  });

  return epicGroups as any;
};

const getStateColumns = (sortedStates: IState[] | undefined): IGroupByColumn[] | undefined => {
  if (!sortedStates) return;

  return sortedStates.map((state) => ({
    id: state.id,
    name: state.name,
    icon: (
      <div className="h-3.5 w-3.5 rounded-full">
        <StateGroupIcon stateGroup={state.group} color={state.color} size={EIconSize.MD} />
      </div>
    ),
    payload: { state_id: state.id },
  })) as any;
};

const getPriorityColumns = () => {
  const priorities = ISSUE_PRIORITIES;

  return priorities.map((priority) => ({
    id: priority.key,
    name: priority.title,
    icon: <PriorityIcon priority={priority?.key} />,
    payload: { priority: priority.key },
  }));
};

const getLabelsColumns = (labels: IIssueLabel[] | undefined) => {
  if (!labels) return;

  const labelsWithNone = [...labels, { id: "None", name: "None", color: "#666" }];

  return labelsWithNone.map((label) => ({
    id: label.id,
    name: label.name,
    icon: (
      <div className="h-[12px] w-[12px] rounded-full" style={{ backgroundColor: label.color ? label.color : "#666" }} />
    ),
    payload: label?.id === "None" ? {} : { label_ids: [label.id] },
  }));
};

const getAssigneeColumns = (members: MemberData[] | undefined) => {
  if (!members) return;

  const assigneeColumns: any = members.map((member) => ({
    id: member.id,
    name: member?.member__display_name || "",
    icon: <Avatar name={member?.member__display_name} src={undefined} size="md" />,
    payload: { assignee_ids: [member.id] },
  }));

  assigneeColumns.push({ id: "None", name: "None", icon: <Avatar size="md" />, payload: {} });

  return assigneeColumns;
};

const getCreatedByColumns = (members: MemberData[] | undefined) => {
  if (!members) return;

  return members.map((member) => ({
    id: member.id,
    name: member?.member__display_name || "",
    icon: <Avatar name={member?.member__display_name} src={undefined} size="md" />,
    payload: {},
  }));
};

export const getDisplayPropertiesCount = (
  displayProperties: IIssueDisplayProperties,
  ignoreFields?: (keyof IIssueDisplayProperties)[]
) => {
  const propertyKeys = Object.keys(displayProperties) as (keyof IIssueDisplayProperties)[];

  let count = 0;

  for (const propertyKey of propertyKeys) {
    if (ignoreFields && ignoreFields.includes(propertyKey)) continue;
    if (displayProperties[propertyKey]) count++;
  }

  return count;
};

export const getIssueBlockId = (issueId: string | undefined, groupId: string | undefined, subGroupId?: string) =>
  `issue_${issueId}_${groupId}_${subGroupId}`;

/**
 * returns empty Array if groupId is None
 * @param groupId
 * @returns
 */
export const getGroupId = (groupId: string) => {
  if (groupId === "None") return [];
  return [groupId];
};

/**
 * method that removes Null or undefined Keys from object
 * @param obj
 * @returns
 */
export const removeNillKeys = <T,>(obj: T) =>
  Object.fromEntries(Object.entries(obj ?? {}).filter(([key, value]) => key && !isNil(value)));

/**
 * This Method returns if the the grouped values are subGrouped
 * @param groupedIssueIds
 * @returns
 */
export const isSubGrouped = (groupedIssueIds: TGroupedIssues) => {
  if (!groupedIssueIds || Array.isArray(groupedIssueIds)) {
    return false;
  }

  if (Array.isArray(groupedIssueIds[Object.keys(groupedIssueIds)[0]])) {
    return false;
  }

  return true;
};
