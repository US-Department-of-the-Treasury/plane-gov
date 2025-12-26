import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { ISprint, IIssueLabel, IEpic, IProject, IState, IUserLite, TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
// store helpers
import {
  useRouterStore,
  useStateStore,
  useLabelStore,
  useEpicStore,
  useSprintStore,
  getRouterProjectId,
  getRouterWorkspaceSlug,
} from "@/store/client";
// member stores
import { useMemberRootStore } from "@/store/member";
import { useWorkspaceMemberStore } from "@/store/member/workspace/workspace-member.store";
// project store
import { useProjectStore } from "@/store/project/project.store";
// user store
import { useUserStore } from "@/store/user";
// state sorting utility
import { sortStates } from "@plane/utils";
// plane web store
import type { IProjectEpics, IProjectEpicsFilter } from "@/plane-web/store/issue/epic";
import { ProjectEpics, ProjectEpicsFilter } from "@/plane-web/store/issue/epic";
import type { IIssueDetail } from "@/plane-web/store/issue/issue-details/root.store";
import { IssueDetail } from "@/plane-web/store/issue/issue-details/root.store";
import type { ITeamIssuesFilter, ITeamIssues } from "@/plane-web/store/issue/team";
import { TeamIssues, TeamIssuesFilter } from "@/plane-web/store/issue/team";
import type { ITeamProjectWorkItemsFilter } from "@/plane-web/store/issue/team-project/filter.store";
import { TeamProjectWorkItemsFilter } from "@/plane-web/store/issue/team-project/filter.store";
import type { ITeamProjectWorkItems } from "@/plane-web/store/issue/team-project/issue.store";
import { TeamProjectWorkItems } from "@/plane-web/store/issue/team-project/issue.store";
import type { ITeamViewIssues, ITeamViewIssuesFilter } from "@/plane-web/store/issue/team-views";
import { TeamViewIssues, TeamViewIssuesFilter } from "@/plane-web/store/issue/team-views";
// root store
import type { IWorkspaceIssues } from "@/plane-web/store/issue/workspace/issue.store";
import { WorkspaceIssues } from "@/plane-web/store/issue/workspace/issue.store";
import type { RootStore } from "@/plane-web/store/root.store";
import type { IWorkspaceMembership } from "@/store/member/workspace/workspace-member.store";
// issues data store
import type { IArchivedIssuesFilter, IArchivedIssues } from "./archived";
import { ArchivedIssuesFilter, ArchivedIssues } from "./archived";
import type { ISprintIssuesFilter, ISprintIssues } from "./sprint";
import { SprintIssuesFilter, SprintIssues } from "./sprint";
import type { IIssueStore } from "./issue.store";
import { IssueStore } from "./issue.store";
import type { ICalendarStore } from "./issue_calendar_view.store";
import { CalendarStore } from "./issue_calendar_view.store";
import type { IIssueKanBanViewStore } from "./issue_kanban_view.store";
import { IssueKanBanViewStore } from "./issue_kanban_view.store";
import type { IEpicIssuesFilter, IEpicIssues } from "./epic";
import { EpicIssuesFilter, EpicIssues } from "./epic";
import type { IProfileIssuesFilter, IProfileIssues } from "./profile";
import { ProfileIssuesFilter, ProfileIssues } from "./profile";
import type { IProjectIssuesFilter, IProjectIssues } from "./project";
import { ProjectIssuesFilter, ProjectIssues } from "./project";
import type { IProjectViewIssuesFilter, IProjectViewIssues } from "./project-views";
import { ProjectViewIssuesFilter, ProjectViewIssues } from "./project-views";
import type { IWorkspaceIssuesFilter } from "./workspace";
import { WorkspaceIssuesFilter } from "./workspace";
import type { IWorkspaceDraftIssues, IWorkspaceDraftIssuesFilter } from "./workspace-draft";
import { WorkspaceDraftIssues, WorkspaceDraftIssuesFilter } from "./workspace-draft";

export interface IIssueRootStore {
  currentUserId: string | undefined;
  workspaceSlug: string | undefined;
  teamspaceId: string | undefined;
  projectId: string | undefined;
  sprintId: string | undefined;
  epicId: string | undefined;
  viewId: string | undefined;
  globalViewId: string | undefined; // all issues view id
  userId: string | undefined; // user profile detail Id
  stateMap: Record<string, IState> | undefined;
  stateDetails: IState[] | undefined;
  workspaceStateDetails: IState[] | undefined;
  labelMap: Record<string, IIssueLabel> | undefined;
  workSpaceMemberRolesMap: Record<string, IWorkspaceMembership> | undefined;
  memberMap: Record<string, IUserLite> | undefined;
  projectMap: Record<string, IProject> | undefined;
  epicMap: Record<string, IEpic> | undefined;
  sprintMap: Record<string, ISprint> | undefined;

  rootStore: RootStore;
  serviceType: TIssueServiceType;

  issues: IIssueStore;

  issueDetail: IIssueDetail;
  epicDetail: IIssueDetail;

  workspaceIssuesFilter: IWorkspaceIssuesFilter;
  workspaceIssues: IWorkspaceIssues;

  workspaceDraftIssuesFilter: IWorkspaceDraftIssuesFilter;
  workspaceDraftIssues: IWorkspaceDraftIssues;

  profileIssuesFilter: IProfileIssuesFilter;
  profileIssues: IProfileIssues;

  teamIssuesFilter: ITeamIssuesFilter;
  teamIssues: ITeamIssues;

  projectIssuesFilter: IProjectIssuesFilter;
  projectIssues: IProjectIssues;

  sprintIssuesFilter: ISprintIssuesFilter;
  sprintIssues: ISprintIssues;

  epicIssuesFilter: IEpicIssuesFilter;
  epicIssues: IEpicIssues;

  teamViewIssuesFilter: ITeamViewIssuesFilter;
  teamViewIssues: ITeamViewIssues;

  teamProjectWorkItemsFilter: ITeamProjectWorkItemsFilter;
  teamProjectWorkItems: ITeamProjectWorkItems;

  projectViewIssuesFilter: IProjectViewIssuesFilter;
  projectViewIssues: IProjectViewIssues;

  archivedIssuesFilter: IArchivedIssuesFilter;
  archivedIssues: IArchivedIssues;

  issueKanBanView: IIssueKanBanViewStore;
  issueCalendarView: ICalendarStore;

  projectEpicsFilter: IProjectEpicsFilter;
  projectEpics: IProjectEpics;
}

// Zustand Store - only stores router values, maps are accessed lazily from rootStore
interface IssueRootState {
  workspaceSlug: string | undefined;
  teamspaceId: string | undefined;
  projectId: string | undefined;
  sprintId: string | undefined;
  epicId: string | undefined;
  viewId: string | undefined;
  globalViewId: string | undefined;
  userId: string | undefined;
}

interface IssueRootActions {
  updateState: (updates: Partial<IssueRootState>) => void;
}

type IssueRootStoreType = IssueRootState & IssueRootActions;

export const createIssueRootStore = () =>
  create<IssueRootStoreType>()(
    immer((set) => ({
      // State - only router values, maps are accessed lazily from rootStore
      workspaceSlug: undefined,
      teamspaceId: undefined,
      projectId: undefined,
      sprintId: undefined,
      epicId: undefined,
      viewId: undefined,
      globalViewId: undefined,
      userId: undefined,

      // Actions
      updateState: (updates: Partial<IssueRootState>) => {
        set((state) => {
          Object.assign(state, updates);
        });
      },
    }))
  );

export class IssueRootStore implements IIssueRootStore {
  rootStore: RootStore;
  serviceType: TIssueServiceType;
  private issueRootStore: ReturnType<typeof createIssueRootStore>;
  private unsubscribe: (() => void) | null = null;

  issues: IIssueStore;

  issueDetail: IIssueDetail;
  epicDetail: IIssueDetail;

  workspaceIssuesFilter: IWorkspaceIssuesFilter;
  workspaceIssues: IWorkspaceIssues;

  workspaceDraftIssuesFilter: IWorkspaceDraftIssuesFilter;
  workspaceDraftIssues: IWorkspaceDraftIssues;

  profileIssuesFilter: IProfileIssuesFilter;
  profileIssues: IProfileIssues;

  teamIssuesFilter: ITeamIssuesFilter;
  teamIssues: ITeamIssues;

  projectIssuesFilter: IProjectIssuesFilter;
  projectIssues: IProjectIssues;

  sprintIssuesFilter: ISprintIssuesFilter;
  sprintIssues: ISprintIssues;

  epicIssuesFilter: IEpicIssuesFilter;
  epicIssues: IEpicIssues;

  teamViewIssuesFilter: ITeamViewIssuesFilter;
  teamViewIssues: ITeamViewIssues;

  projectViewIssuesFilter: IProjectViewIssuesFilter;
  projectViewIssues: IProjectViewIssues;

  teamProjectWorkItemsFilter: ITeamProjectWorkItemsFilter;
  teamProjectWorkItems: ITeamProjectWorkItems;

  archivedIssuesFilter: IArchivedIssuesFilter;
  archivedIssues: IArchivedIssues;

  issueKanBanView: IIssueKanBanViewStore;
  issueCalendarView: ICalendarStore;

  projectEpicsFilter: IProjectEpicsFilter;
  projectEpics: IProjectEpics;

  // Getters for router values (from Zustand store)
  get workspaceSlug() {
    return this.issueRootStore.getState().workspaceSlug;
  }
  get teamspaceId() {
    return this.issueRootStore.getState().teamspaceId;
  }
  get projectId() {
    return this.issueRootStore.getState().projectId;
  }
  get sprintId() {
    return this.issueRootStore.getState().sprintId;
  }
  get epicId() {
    return this.issueRootStore.getState().epicId;
  }
  get viewId() {
    return this.issueRootStore.getState().viewId;
  }
  get globalViewId() {
    return this.issueRootStore.getState().globalViewId;
  }
  get userId() {
    return this.issueRootStore.getState().userId;
  }

  // Lazy getters for store maps - all now use direct Zustand store access
  // This eliminates indirection through legacy class wrappers and ensures data is always fresh

  // User ID - now directly from Zustand store
  get currentUserId() {
    return useUserStore.getState().data?.id;
  }

  // State data - directly from Zustand store
  get stateMap() {
    return useStateStore.getState().stateMap;
  }
  get stateDetails() {
    const projectId = getRouterProjectId();
    return useStateStore.getState().getProjectStates(projectId);
  }
  get workspaceStateDetails() {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return undefined;
    const { stateMap, fetchedMap } = useStateStore.getState();
    if (!fetchedMap[workspaceSlug]) return undefined;
    return sortStates(Object.values(stateMap));
  }

  // Label data - directly from Zustand store
  get labelMap() {
    return useLabelStore.getState().labelMap;
  }

  // Member data - now directly from Zustand stores
  get workSpaceMemberRolesMap() {
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return undefined;
    return useWorkspaceMemberStore.getState().workspaceMemberMap[workspaceSlug] ?? undefined;
  }
  get memberMap() {
    return useMemberRootStore.getState().memberMap;
  }

  // Project data - now directly from Zustand store
  get projectMap() {
    return useProjectStore.getState().projectMap;
  }

  // Epic data - directly from Zustand store
  get epicMap() {
    return useEpicStore.getState().epicMap;
  }

  // Sprint data - directly from Zustand store
  get sprintMap() {
    return useSprintStore.getState().sprintMap;
  }

  constructor(rootStore: RootStore, serviceType: TIssueServiceType = EIssueServiceType.ISSUES) {
    this.serviceType = serviceType;
    this.rootStore = rootStore;
    this.issueRootStore = createIssueRootStore();

    // Setup router subscription for router values only
    // Store maps (stateMap, labelMap, epicMap, sprintMap) are now accessed lazily via getters
    // that read directly from Zustand stores, eliminating the indirection through legacy class wrappers
    const unsubscribeRouter = useRouterStore.subscribe((state: { query: Record<string, unknown> }) => {
      const updates: Partial<IssueRootState> = {};

      const workspaceSlug = state.query?.workspaceSlug?.toString();
      const teamspaceId = state.query?.teamspaceId?.toString();
      const projectId = state.query?.projectId?.toString();
      const sprintId = state.query?.sprintId?.toString();
      const epicId = state.query?.epicId?.toString();
      const viewId = state.query?.viewId?.toString();
      const globalViewId = state.query?.globalViewId?.toString();
      const userId = state.query?.userId?.toString();

      if (this.workspaceSlug !== workspaceSlug) updates.workspaceSlug = workspaceSlug;
      if (this.teamspaceId !== teamspaceId) updates.teamspaceId = teamspaceId;
      if (this.projectId !== projectId) updates.projectId = projectId;
      if (this.sprintId !== sprintId) updates.sprintId = sprintId;
      if (this.epicId !== epicId) updates.epicId = epicId;
      if (this.viewId !== viewId) updates.viewId = viewId;
      if (this.globalViewId !== globalViewId) updates.globalViewId = globalViewId;
      if (this.userId !== userId) updates.userId = userId;

      if (Object.keys(updates).length > 0) {
        this.issueRootStore.getState().updateState(updates);
      }
    });

    // Cleanup function for router subscription
    this.unsubscribe = () => {
      unsubscribeRouter();
    };

    this.issues = new IssueStore();

    this.issueDetail = new IssueDetail(this, EIssueServiceType.ISSUES);
    this.epicDetail = new IssueDetail(this, EIssueServiceType.EPICS);

    this.workspaceIssuesFilter = new WorkspaceIssuesFilter(this);
    this.workspaceIssues = new WorkspaceIssues(this, this.workspaceIssuesFilter);

    this.profileIssuesFilter = new ProfileIssuesFilter(this);
    this.profileIssues = new ProfileIssues(this, this.profileIssuesFilter);

    this.workspaceDraftIssuesFilter = new WorkspaceDraftIssuesFilter(this);
    this.workspaceDraftIssues = new WorkspaceDraftIssues(this);

    this.projectIssuesFilter = new ProjectIssuesFilter(this);
    this.projectIssues = new ProjectIssues(this, this.projectIssuesFilter);

    this.teamIssuesFilter = new TeamIssuesFilter(this);
    this.teamIssues = new TeamIssues(this, this.teamIssuesFilter);

    this.sprintIssuesFilter = new SprintIssuesFilter(this);
    this.sprintIssues = new SprintIssues(this, this.sprintIssuesFilter);

    this.epicIssuesFilter = new EpicIssuesFilter(this);
    this.epicIssues = new EpicIssues(this, this.epicIssuesFilter);

    this.teamViewIssuesFilter = new TeamViewIssuesFilter(this);
    this.teamViewIssues = new TeamViewIssues(this, this.teamViewIssuesFilter);

    this.projectViewIssuesFilter = new ProjectViewIssuesFilter(this);
    this.projectViewIssues = new ProjectViewIssues(this, this.projectViewIssuesFilter);

    this.teamProjectWorkItemsFilter = new TeamProjectWorkItemsFilter(this);
    this.teamProjectWorkItems = new TeamProjectWorkItems(this, this.teamProjectWorkItemsFilter);

    this.archivedIssuesFilter = new ArchivedIssuesFilter(this);
    this.archivedIssues = new ArchivedIssues(this, this.archivedIssuesFilter);

    this.issueKanBanView = new IssueKanBanViewStore(this);
    this.issueCalendarView = new CalendarStore(this);

    this.projectEpicsFilter = new ProjectEpicsFilter(this);
    this.projectEpics = new ProjectEpics(this, this.projectEpicsFilter);
  }
}
