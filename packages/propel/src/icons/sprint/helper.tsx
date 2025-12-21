export interface ISprintGroupIcon {
  className?: string;
  color?: string;
  sprintGroup: TSprintGroups;
  height?: string;
  width?: string;
}

export type TSprintGroups = "current" | "upcoming" | "completed" | "draft";

export const SPRINT_GROUP_COLORS: {
  [key in TSprintGroups]: string;
} = {
  current: "#F59E0B",
  upcoming: "#3F76FF",
  completed: "#16A34A",
  draft: "#525252",
};

export const SPRINT_GROUP_I18N_LABELS: {
  [key in TSprintGroups]: string;
} = {
  current: "current",
  upcoming: "common.upcoming",
  completed: "common.completed",
  draft: "project_sprints.status.draft",
};
