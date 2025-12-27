// plane imports
import { FALLBACK_LANGUAGE, LANGUAGE_STORAGE_KEY } from "@plane/i18n";
// plane web store
import type { RootStore } from "@/plane-web/store/root.store";
import { WorkspaceRootStore } from "@/plane-web/store/workspace";
// stores
import type { IProjectEstimateStore } from "./estimates/project-estimate.store";
import { ProjectEstimateStore } from "./estimates/project-estimate.store";
import type { IIssueRootStore } from "./issue/root.store";
import { IssueRootStore } from "./issue/root.store";
import type { IMemberRootStore } from "./member";
import { MemberRootStore } from "./member";
import type { IProjectRootStore } from "./project";
import { ProjectRootStore } from "./project";
import type { IUserStore } from "./user";
import { UserStore } from "./user";
import type { IWorkspaceRootStore } from "./workspace";

export class CoreRootStore {
  workspaceRoot: IWorkspaceRootStore;
  projectRoot: IProjectRootStore;
  memberRoot: IMemberRootStore;
  issue: IIssueRootStore;
  user: IUserStore;
  projectEstimate: IProjectEstimateStore;

  constructor() {
    this.user = new UserStore(this as unknown as RootStore);
    this.workspaceRoot = new WorkspaceRootStore(this as unknown as RootStore);
    this.projectRoot = new ProjectRootStore(this);
    this.memberRoot = new MemberRootStore(this as unknown as RootStore);
    this.issue = new IssueRootStore(this as unknown as RootStore);
    this.projectEstimate = new ProjectEstimateStore(this);
  }

  resetOnSignOut() {
    // handling the system theme when user logged out from the app
    localStorage.setItem("theme", "system");
    localStorage.setItem(LANGUAGE_STORAGE_KEY, FALLBACK_LANGUAGE);
    this.user = new UserStore(this as unknown as RootStore);
    this.workspaceRoot = new WorkspaceRootStore(this as unknown as RootStore);
    this.projectRoot = new ProjectRootStore(this);
    this.memberRoot = new MemberRootStore(this as unknown as RootStore);
    this.issue = new IssueRootStore(this as unknown as RootStore);
    this.projectEstimate = new ProjectEstimateStore(this);
  }
}
