// types
export const SPRINT_STATUS: {
  i18n_label: string;
  value: "current" | "upcoming" | "completed" | "draft";
  i18n_title: string;
  color: string;
  textColor: string;
  bgColor: string;
}[] = [
  {
    i18n_label: "project_sprints.status.days_left",
    value: "current",
    i18n_title: "project_sprints.status.in_progress",
    color: "#F59E0B",
    textColor: "text-amber-500",
    bgColor: "bg-amber-50",
  },
  {
    i18n_label: "project_sprints.status.yet_to_start",
    value: "upcoming",
    i18n_title: "project_sprints.status.yet_to_start",
    color: "#3F76FF",
    textColor: "text-blue-500",
    bgColor: "bg-indigo-50",
  },
  {
    i18n_label: "project_sprints.status.completed",
    value: "completed",
    i18n_title: "project_sprints.status.completed",
    color: "#16A34A",
    textColor: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    i18n_label: "project_sprints.status.draft",
    value: "draft",
    i18n_title: "project_sprints.status.draft",
    color: "#525252",
    textColor: "text-tertiary",
    bgColor: "bg-surface-2",
  },
];
