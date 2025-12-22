import { isEmpty } from "lodash-es";
import { autorun, makeObservable, observable, runInAction } from "mobx";
// types
import type { ISprint, IIssueLabel, IEpic, IProject, IState, IUserLite, TIssueServiceType } from "@plane/types";
import { EIssueServiceType } from "@plane/types";
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

export class IssueRootStore implements IIssueRootStore {
  currentUserId: string | undefined = undefined;
  workspaceSlug: string | undefined = undefined;
  teamspaceId: string | undefined = undefined;
  projectId: string | undefined = undefined;
  sprintId: string | undefined = undefined;
  epicId: string | undefined = undefined;
  viewId: string | undefined = undefined;
  globalViewId: string | undefined = undefined;
  userId: string | undefined = undefined;
  stateMap: Record<string, IState> | undefined = undefined;
  stateDetails: IState[] | undefined = undefined;
  workspaceStateDetails: IState[] | undefined = undefined;
  labelMap: Record<string, IIssueLabel> | undefined = undefined;
  workSpaceMemberRolesMap: Record<string, IWorkspaceMembership> | undefined = undefined;
  memberMap: Record<string, IUserLite> | undefined = undefined;
  projectMap: Record<string, IProject> | undefined = undefined;
  epicMap: Record<string, IEpic> | undefined = undefined;
  sprintMap: Record<string, ISprint> | undefined = undefined;

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

  constructor(rootStore: RootStore, serviceType: TIssueServiceType = EIssueServiceType.ISSUES) {
    makeObservable(this, {
      workspaceSlug: observable.ref,
      teamspaceId: observable.ref,
      projectId: observable.ref,
      sprintId: observable.ref,
      epicId: observable.ref,
      viewId: observable.ref,
      userId: observable.ref,
      globalViewId: observable.ref,
      stateMap: observable,
      stateDetails: observable,
      workspaceStateDetails: observable,
      labelMap: observable,
      memberMap: observable,
      workSpaceMemberRolesMap: observable,
      projectMap: observable,
      epicMap: observable,
      sprintMap: observable,
    });

    this.serviceType = serviceType;
    this.rootStore = rootStore;

    autorun(() => {
      runInAction(() => {
        if (rootStore?.user?.data?.id) this.currentUserId = rootStore?.user?.data?.id;
        if (this.workspaceSlug !== rootStore.router.workspaceSlug) this.workspaceSlug = rootStore.router.workspaceSlug;
        if (this.teamspaceId !== rootStore.router.teamspaceId) this.teamspaceId = rootStore.router.teamspaceId;
        if (this.projectId !== rootStore.router.projectId) this.projectId = rootStore.router.projectId;
        if (this.sprintId !== rootStore.router.sprintId) this.sprintId = rootStore.router.sprintId;
        if (this.epicId !== rootStore.router.epicId) this.epicId = rootStore.router.epicId;
        if (this.viewId !== rootStore.router.viewId) this.viewId = rootStore.router.viewId;
        if (this.globalViewId !== rootStore.router.globalViewId) this.globalViewId = rootStore.router.globalViewId;
        if (this.userId !== rootStore.router.userId) this.userId = rootStore.router.userId;
        if (!isEmpty(rootStore?.state?.stateMap)) this.stateMap = rootStore?.state?.stateMap;
        if (!isEmpty(rootStore?.state?.projectStates)) this.stateDetails = rootStore?.state?.projectStates;
        if (!isEmpty(rootStore?.state?.workspaceStates)) this.workspaceStateDetails = rootStore?.state?.workspaceStates;
        if (!isEmpty(rootStore?.label?.labelMap)) this.labelMap = rootStore?.label?.labelMap;
        if (!isEmpty(rootStore?.memberRoot?.workspace?.workspaceMemberMap))
          this.workSpaceMemberRolesMap = rootStore?.memberRoot?.workspace?.memberMap || undefined;
        if (!isEmpty(rootStore?.memberRoot?.memberMap)) this.memberMap = rootStore?.memberRoot?.memberMap || undefined;
        if (!isEmpty(rootStore?.projectRoot?.project?.projectMap))
          this.projectMap = rootStore?.projectRoot?.project?.projectMap;
        if (!isEmpty(rootStore?.epic?.epicMap)) this.epicMap = rootStore?.epic?.epicMap;
        if (!isEmpty(rootStore?.sprint?.sprintMap)) this.sprintMap = rootStore?.sprint?.sprintMap;
      });
    });

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
