// plane imports
import { FALLBACK_LANGUAGE, LANGUAGE_STORAGE_KEY } from "@plane/i18n";
// plane web store
import type { RootStore } from "@/plane-web/store/root.store";
import type { IStateStore } from "@/plane-web/store/state.store";
import { StateStore } from "@/plane-web/store/state.store";
import { WorkspaceRootStore } from "@/plane-web/store/workspace";
// stores
import type { ISprintStore, ISprintFilterStore } from "./client";
import { SprintStore, SprintFilterStore } from "./client";
import type { ILabelStore } from "./client";
import { LabelStore } from "./client";
import type { IIssueRootStore } from "./issue/root.store";
import { IssueRootStore } from "./issue/root.store";
import type { IMemberRootStore } from "./member";
import { MemberRootStore } from "./member";
import type { IEpicStore, IEpicFilterStore } from "./client";
import { EpicsStore, EpicFilterStore } from "./client";
import type { IProjectRootStore } from "./project";
import { ProjectRootStore } from "./project";
import type { IRouterStore } from "./client";
import { RouterStore } from "./client";
import type { IUserStore } from "./user";
import { UserStore } from "./user";
import type { IWorkspaceRootStore } from "./workspace";

export class CoreRootStore {
  workspaceRoot: IWorkspaceRootStore;
  projectRoot: IProjectRootStore;
  memberRoot: IMemberRootStore;
  sprint: ISprintStore;
  sprintFilter: ISprintFilterStore;
  epic: IEpicStore;
  epicFilter: IEpicFilterStore;
  issue: IIssueRootStore;
  state: IStateStore;
  label: ILabelStore;
  router: IRouterStore;
  user: IUserStore;

  constructor() {
    this.router = new RouterStore();
    this.user = new UserStore(this as unknown as RootStore);
    this.workspaceRoot = new WorkspaceRootStore(this as unknown as RootStore);
    this.projectRoot = new ProjectRootStore(this);
    this.memberRoot = new MemberRootStore(this as unknown as RootStore);
    this.sprint = new SprintStore(this);
    this.sprintFilter = new SprintFilterStore(this);
    this.epic = new EpicsStore(this);
    this.epicFilter = new EpicFilterStore(this);
    this.issue = new IssueRootStore(this as unknown as RootStore);
    this.state = new StateStore(this as unknown as RootStore);
    this.label = new LabelStore(this);
  }

  resetOnSignOut() {
    // handling the system theme when user logged out from the app
    localStorage.setItem("theme", "system");
    localStorage.setItem(LANGUAGE_STORAGE_KEY, FALLBACK_LANGUAGE);
    this.router = new RouterStore();
    this.user = new UserStore(this as unknown as RootStore);
    this.workspaceRoot = new WorkspaceRootStore(this as unknown as RootStore);
    this.projectRoot = new ProjectRootStore(this);
    this.memberRoot = new MemberRootStore(this as unknown as RootStore);
    this.sprint = new SprintStore(this);
    this.sprintFilter = new SprintFilterStore(this);
    this.epic = new EpicsStore(this);
    this.epicFilter = new EpicFilterStore(this);
    this.issue = new IssueRootStore(this as unknown as RootStore);
    this.state = new StateStore(this as unknown as RootStore);
    this.label = new LabelStore(this);
  }
}
