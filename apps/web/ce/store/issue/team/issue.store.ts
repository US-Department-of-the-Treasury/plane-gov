import type { IProjectIssues } from "@/store/issue/project/issue.store";
import { ProjectIssues } from "@/store/issue/project/issue.store";
import type { IIssueRootStore } from "@/store/issue/root.store";
import type { ITeamIssuesFilter } from "./filter.store";

// @ts-nocheck - This class will never be used, extending similar class to avoid type errors
export type ITeamIssues = IProjectIssues;

// @ts-nocheck - This class will never be used, extending similar class to avoid type errors
export class TeamIssues extends ProjectIssues implements IProjectIssues {
  constructor(_rootStore: IIssueRootStore, teamIssueFilterStore: ITeamIssuesFilter) {
    super(_rootStore, teamIssueFilterStore);
  }
}
