import type { ILinkDetails } from "../issues";
import type { TIssue } from "../issues/issue";
import type { IIssueFilterOptions } from "../view-props";

export type TEpicStatus = "backlog" | "planned" | "in-progress" | "paused" | "completed" | "cancelled";

export type TEpicCompletionChartDistribution = {
  [key: string]: number | null;
};

export type TEpicDistributionBase = {
  total_issues: number;
  pending_issues: number;
  completed_issues: number;
};

export type TEpicEstimateDistributionBase = {
  total_estimates: number;
  pending_estimates: number;
  completed_estimates: number;
};

export type TEpicAssigneesDistribution = {
  assignee_id: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
};

export type TEpicLabelsDistribution = {
  color: string | null;
  label_id: string | null;
  label_name: string | null;
};

export type TEpicDistribution = {
  assignees: (TEpicAssigneesDistribution & TEpicDistributionBase)[];
  completion_chart: TEpicCompletionChartDistribution;
  labels: (TEpicLabelsDistribution & TEpicDistributionBase)[];
};

export type TEpicEstimateDistribution = {
  assignees: (TEpicAssigneesDistribution & TEpicEstimateDistributionBase)[];
  completion_chart: TEpicCompletionChartDistribution;
  labels: (TEpicLabelsDistribution & TEpicEstimateDistributionBase)[];
};

export interface IEpic {
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
  distribution?: TEpicDistribution;
  estimate_distribution?: TEpicEstimateDistribution;

  id: string;
  name: string;
  description: string;
  description_text: any;
  description_html: any;
  workspace_id: string;
  project_id: string;
  lead_id: string | null;
  member_ids: string[];
  link_epic?: ILinkDetails[];
  sub_issues?: number;
  is_favorite: boolean;
  sort_order: number;
  view_props: {
    filters: IIssueFilterOptions;
  };
  status?: TEpicStatus;
  archived_at: string | null;
  start_date: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface EpicIssueResponse {
  created_at: Date;
  created_by: string;
  id: string;
  issue: string;
  issue_detail: TIssue;
  epic: string;
  epic_detail: IEpic;
  project: string;
  updated_at: Date;
  updated_by: string;
  workspace: string;
  sub_issues_count: number;
}

export type EpicLink = {
  title: string;
  url: string;
};

export type SelectEpicType = (IEpic & { actionType: "edit" | "delete" | "create-issue" }) | undefined;

export type TEpicPlotType = "burndown" | "points";

export type TPublicEpic = {
  id: string;
  name: string;
};
