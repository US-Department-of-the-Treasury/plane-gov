// plane imports
import { FALLBACK_LANGUAGE, LANGUAGE_STORAGE_KEY } from "@plane/i18n";
// plane web store
import type { ICommandPaletteStore } from "@/plane-web/store/command-palette.store";
import { CommandPaletteStore } from "@/plane-web/store/command-palette.store";
import type { RootStore } from "@/plane-web/store/root.store";
import type { IStateStore } from "@/plane-web/store/state.store";
import { StateStore } from "@/plane-web/store/state.store";
import { WorkspaceRootStore } from "@/plane-web/store/workspace";
// stores
import type { ISprintStore, ISprintFilterStore } from "./client";
import { SprintStore, SprintFilterStore } from "./client";
import type { IDashboardStore } from "./client";
import { DashboardStore } from "./client";
import type { IInstanceStore, ILabelStore } from "./client";
import { InstanceStore, LabelStore } from "./client";
import type { IProjectEstimateStore } from "./estimates/project-estimate.store";
import { ProjectEstimateStore } from "./estimates/project-estimate.store";
import type { IFavoriteStore } from "./client";
import { FavoriteStore } from "./client";
import type { IGlobalViewStore, IProjectViewStore } from "./client";
import { GlobalViewStore, ProjectViewStore } from "./client";
import type { IProjectInboxStore } from "./inbox/project-inbox.store";
import { ProjectInboxStore } from "./inbox/project-inbox.store";
import type { IIssueRootStore } from "./issue/root.store";
import { IssueRootStore } from "./issue/root.store";
import type { IMemberRootStore } from "./member";
import { MemberRootStore } from "./member";
import type { IEpicStore, IEpicFilterStore } from "./client";
import { EpicsStore, EpicFilterStore } from "./client";
import type { IWorkspaceNotificationStore } from "./notifications/workspace-notifications.store";
import { WorkspaceNotificationStore } from "./notifications/workspace-notifications.store";
import type { IProjectPageStore } from "./pages/project-page.store";
import { ProjectPageStore } from "./pages/project-page.store";
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
  projectView: IProjectViewStore;
  globalView: IGlobalViewStore;
  issue: IIssueRootStore;
  state: IStateStore;
  label: ILabelStore;
  dashboard: IDashboardStore;
  projectPages: IProjectPageStore;
  router: IRouterStore;
  commandPalette: ICommandPaletteStore;
  instance: IInstanceStore;
  user: IUserStore;
  projectInbox: IProjectInboxStore;
  projectEstimate: IProjectEstimateStore;
  workspaceNotification: IWorkspaceNotificationStore;
  favorite: IFavoriteStore;

  constructor() {
    this.router = new RouterStore();
    this.commandPalette = new CommandPaletteStore();
    this.instance = new InstanceStore();
    this.user = new UserStore(this as unknown as RootStore);
    this.workspaceRoot = new WorkspaceRootStore(this as unknown as RootStore);
    this.projectRoot = new ProjectRootStore(this);
    this.memberRoot = new MemberRootStore(this as unknown as RootStore);
    this.sprint = new SprintStore(this);
    this.sprintFilter = new SprintFilterStore(this);
    this.epic = new EpicsStore(this);
    this.epicFilter = new EpicFilterStore(this);
    this.projectView = new ProjectViewStore(this);
    this.globalView = new GlobalViewStore(this);
    this.issue = new IssueRootStore(this as unknown as RootStore);
    this.state = new StateStore(this as unknown as RootStore);
    this.label = new LabelStore(this);
    this.dashboard = new DashboardStore(this);
    this.projectInbox = new ProjectInboxStore(this);
    this.projectPages = new ProjectPageStore(this as unknown as RootStore);
    this.projectEstimate = new ProjectEstimateStore(this);
    this.workspaceNotification = new WorkspaceNotificationStore(this);
    this.favorite = new FavoriteStore(this);
  }

  resetOnSignOut() {
    // handling the system theme when user logged out from the app
    localStorage.setItem("theme", "system");
    localStorage.setItem(LANGUAGE_STORAGE_KEY, FALLBACK_LANGUAGE);
    this.router = new RouterStore();
    this.commandPalette = new CommandPaletteStore();
    this.instance = new InstanceStore();
    this.user = new UserStore(this as unknown as RootStore);
    this.workspaceRoot = new WorkspaceRootStore(this as unknown as RootStore);
    this.projectRoot = new ProjectRootStore(this);
    this.memberRoot = new MemberRootStore(this as unknown as RootStore);
    this.sprint = new SprintStore(this);
    this.sprintFilter = new SprintFilterStore(this);
    this.epic = new EpicsStore(this);
    this.epicFilter = new EpicFilterStore(this);
    this.projectView = new ProjectViewStore(this);
    this.globalView = new GlobalViewStore(this);
    this.issue = new IssueRootStore(this as unknown as RootStore);
    this.state = new StateStore(this as unknown as RootStore);
    this.label = new LabelStore(this);
    this.dashboard = new DashboardStore(this);
    this.projectInbox = new ProjectInboxStore(this);
    this.projectPages = new ProjectPageStore(this as unknown as RootStore);
    this.projectEstimate = new ProjectEstimateStore(this);
    this.workspaceNotification = new WorkspaceNotificationStore(this);
    this.favorite = new FavoriteStore(this);
  }
}
