import type { ISprint } from "./sprint";
import type { TIssue } from "./issues/issue";
import type { IEpic } from "./epic";
import type { TPage } from "./page";
import type { IProject } from "./project";
import type { IUser } from "./users";
import type { IWorkspace } from "./workspace";

export type TSearchEntities = "user_mention" | "issue" | "project" | "sprint" | "epic" | "page";

export type TUserSearchResponse = {
  member__avatar_url: IUser["avatar_url"];
  member__display_name: IUser["display_name"];
  member__id: IUser["id"];
};

export type TProjectSearchResponse = {
  name: IProject["name"];
  id: IProject["id"];
  identifier: IProject["identifier"];
  logo_props: IProject["logo_props"];
  workspace__slug: IWorkspace["slug"];
};

export type TIssueSearchResponse = {
  name: TIssue["name"];
  id: TIssue["id"];
  sequence_id: TIssue["sequence_id"];
  project__identifier: IProject["identifier"];
  project_id: TIssue["project_id"];
  priority: TIssue["priority"];
  state_id: TIssue["state_id"];
  type_id: TIssue["type_id"];
};

export type TSprintSearchResponse = {
  name: ISprint["name"];
  id: ISprint["id"];
  project_id: string;
  project__identifier: IProject["identifier"];
  status: ISprint["status"];
  workspace__slug: IWorkspace["slug"];
};

export type TEpicSearchResponse = {
  name: IEpic["name"];
  id: IEpic["id"];
  project_id: IEpic["project_id"];
  project__identifier: IProject["identifier"];
  status: IEpic["status"];
  workspace__slug: IWorkspace["slug"];
};

export type TPageSearchResponse = {
  name: TPage["name"];
  id: TPage["id"];
  logo_props: TPage["logo_props"];
  projects__id: TPage["project_ids"];
  workspace__slug: IWorkspace["slug"];
};

export type TSearchResponse = {
  sprint?: TSprintSearchResponse[];
  issue?: TIssueSearchResponse[];
  epic?: TEpicSearchResponse[];
  page?: TPageSearchResponse[];
  project?: TProjectSearchResponse[];
  user_mention?: TUserSearchResponse[];
};

export type TSearchEntityRequestPayload = {
  count: number;
  project_id?: string;
  query_type: TSearchEntities[];
  query: string;
  team_id?: string;
  issue_id?: string;
};
