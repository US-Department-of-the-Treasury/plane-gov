// types
import type { TEpicLayoutOptions, TEpicOrderByOptions, TEpicStatus } from "@plane/types";

export const EPIC_STATUS_COLORS: {
  [key in TEpicStatus]: string;
} = {
  backlog: "#a3a3a2",
  planned: "#3f76ff",
  paused: "#525252",
  completed: "#16a34a",
  cancelled: "#ef4444",
  "in-progress": "#f39e1f",
};

export const EPIC_STATUS: {
  i18n_label: string;
  value: TEpicStatus;
  color: string;
  textColor: string;
  bgColor: string;
}[] = [
  {
    i18n_label: "project_epics.status.backlog",
    value: "backlog",
    color: EPIC_STATUS_COLORS.backlog,
    textColor: "text-placeholder",
    bgColor: "bg-layer-1",
  },
  {
    i18n_label: "project_epics.status.planned",
    value: "planned",
    color: EPIC_STATUS_COLORS.planned,
    textColor: "text-blue-500",
    bgColor: "bg-indigo-50",
  },
  {
    i18n_label: "project_epics.status.in_progress",
    value: "in-progress",
    color: EPIC_STATUS_COLORS["in-progress"],
    textColor: "text-amber-500",
    bgColor: "bg-amber-50",
  },
  {
    i18n_label: "project_epics.status.paused",
    value: "paused",
    color: EPIC_STATUS_COLORS.paused,
    textColor: "text-tertiary",
    bgColor: "bg-surface-2",
  },
  {
    i18n_label: "project_epics.status.completed",
    value: "completed",
    color: EPIC_STATUS_COLORS.completed,
    textColor: "text-green-600",
    bgColor: "bg-green-100",
  },
  {
    i18n_label: "project_epics.status.cancelled",
    value: "cancelled",
    color: EPIC_STATUS_COLORS.cancelled,
    textColor: "text-red-500",
    bgColor: "bg-red-50",
  },
];

export const EPIC_VIEW_LAYOUTS: {
  key: TEpicLayoutOptions;
  i18n_title: string;
}[] = [
  {
    key: "list",
    i18n_title: "project_epics.layout.list",
  },
  {
    key: "board",
    i18n_title: "project_epics.layout.board",
  },
  {
    key: "gantt",
    i18n_title: "project_epics.layout.timeline",
  },
];

export const EPIC_ORDER_BY_OPTIONS: {
  key: TEpicOrderByOptions;
  i18n_label: string;
}[] = [
  {
    key: "name",
    i18n_label: "project_epics.order_by.name",
  },
  {
    key: "progress",
    i18n_label: "project_epics.order_by.progress",
  },
  {
    key: "issues_length",
    i18n_label: "project_epics.order_by.issues",
  },
  {
    key: "target_date",
    i18n_label: "project_epics.order_by.due_date",
  },
  {
    key: "created_at",
    i18n_label: "project_epics.order_by.created_at",
  },
  {
    key: "sort_order",
    i18n_label: "project_epics.order_by.manual",
  },
];
