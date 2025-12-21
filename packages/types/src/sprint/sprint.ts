import type { TIssue } from "../issues/issue";
import type { IIssueFilterOptions } from "../view-props";

export type TSprintGroups = "current" | "upcoming" | "completed" | "draft";

export type TSprintCompletionChartDistribution = {
  [key: string]: number | null;
};

export type TSprintDistributionBase = {
  total_issues: number;
  pending_issues: number;
  completed_issues: number;
};

export type TSprintEstimateDistributionBase = {
  total_estimates: number;
  pending_estimates: number;
  completed_estimates: number;
};

export type TSprintAssigneesDistribution = {
  assignee_id: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
};

export type TSprintLabelsDistribution = {
  color: string | null;
  label_id: string | null;
  label_name: string | null;
};

export type TSprintDistribution = {
  assignees: (TSprintAssigneesDistribution & TSprintDistributionBase)[];
  completion_chart: TSprintCompletionChartDistribution;
  labels: (TSprintLabelsDistribution & TSprintDistributionBase)[];
};

export type TSprintEstimateDistribution = {
  assignees: (TSprintAssigneesDistribution & TSprintEstimateDistributionBase)[];
  completion_chart: TSprintCompletionChartDistribution;
  labels: (TSprintLabelsDistribution & TSprintEstimateDistributionBase)[];
};
export type TSprintProgress = {
  date: string;
  started: number;
  actual: number;
  pending: number;
  ideal: number | null;
  scope: number;
  completed: number;
  unstarted: number;
  backlog: number;
  cancelled: number;
};

export type TProgressSnapshot = {
  total_issues: number;
  completed_issues: number;
  backlog_issues: number;
  started_issues: number;
  unstarted_issues: number;
  cancelled_issues: number;
  total_estimate_points?: number;
  completed_estimate_points?: number;
  backlog_estimate_points: number;
  started_estimate_points: number;
  unstarted_estimate_points: number;
  cancelled_estimate_points: number;
  distribution?: TSprintDistribution;
  estimate_distribution?: TSprintEstimateDistribution;
};

export interface ISprint extends TProgressSnapshot {
  progress_snapshot: TProgressSnapshot | undefined;

  created_at?: string;
  created_by?: string;
  description: string;
  end_date: string | null;
  id: string;
  is_favorite?: boolean;
  name: string;
  number: number;
  status?: TSprintGroups;
  sort_order: number;
  start_date: string | null;
  sub_issues?: number;
  updated_at?: string;
  updated_by?: string;
  archived_at: string | null;
  assignee_ids?: string[];
  view_props: {
    filters: IIssueFilterOptions;
  };
  workspace_id: string;
  progress: any[];
  version: number;
  logo_props?: Record<string, any>;
  external_source?: string | null;
  external_id?: string | null;
}

export interface SprintIssueResponse {
  id: string;
  issue_detail: TIssue;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
  workspace: string;
  issue: string;
  sprint: string;
  sub_issues_count: number;
}

export type SelectSprintType = (ISprint & { actionType: "edit" | "delete" | "create-issue" }) | undefined;

export type SprintDateCheckData = {
  start_date: string;
  end_date: string;
  sprint_id?: string;
};

export type TSprintEstimateType = "issues" | "points";
export type TSprintPlotType = "burndown" | "burnup";

export type TPublicSprint = {
  id: string;
  name: string;
  status: string;
};

export type TProgressChartData = {
  date: string;
  scope: number;
  completed: number;
  backlog: number;
  started: number;
  unstarted: number;
  cancelled: number;
  pending: number;
  ideal: number;
  actual: number;
}[];
