import { useCallback, useMemo } from "react";
import { AtSign, Briefcase, Calendar } from "lucide-react";
// plane imports
import { Logo } from "@plane/propel/emoji-icon-picker";
import {
  SprintGroupIcon,
  SprintIcon,
  EpicIcon,
  StatePropertyIcon,
  PriorityIcon,
  StateGroupIcon,
  MembersPropertyIcon,
  LabelPropertyIcon,
  StartDatePropertyIcon,
  DueDatePropertyIcon,
  UserCirclePropertyIcon,
  PriorityPropertyIcon,
} from "@plane/propel/icons";
import type {
  ISprint,
  IState,
  IUserLite,
  TFilterConfig,
  TFilterValue,
  IIssueLabel,
  IEpic,
  IProject,
  TWorkItemFilterProperty,
} from "@plane/types";
import { Avatar } from "@plane/ui";
import {
  getAssigneeFilterConfig,
  getCreatedAtFilterConfig,
  getCreatedByFilterConfig,
  getSprintFilterConfig,
  getFileURL,
  getLabelFilterConfig,
  getMentionFilterConfig,
  getEpicFilterConfig,
  getPriorityFilterConfig,
  getProjectFilterConfig,
  getStartDateFilterConfig,
  getStateFilterConfig,
  getStateGroupFilterConfig,
  getSubscriberFilterConfig,
  getTargetDateFilterConfig,
  getUpdatedAtFilterConfig,
  isLoaderReady,
} from "@plane/utils";
// store hooks
import { useProjectLabels } from "@/store/queries/label";
import { useProjectMembers, useWorkspaceMembers, getWorkspaceMemberByUserId } from "@/store/queries/member";
import { useProjects, getProjectById } from "@/store/queries/project";
import { useProjectStates, getStateById } from "@/store/queries/state";
import { useProjectSprints, getSprintById } from "@/store/queries/sprint";
import { useProjectEpics, getEpicById } from "@/store/queries/epic";
// plane web imports
import { useFiltersOperatorConfigs } from "@/plane-web/hooks/rich-filters/use-filters-operator-configs";

export type TWorkItemFiltersEntityProps = {
  workspaceSlug: string;
  sprintIds?: string[];
  labelIds?: string[];
  memberIds?: string[];
  epicIds?: string[];
  projectId?: string;
  projectIds?: string[];
  stateIds?: string[];
};

export type TUseWorkItemFiltersConfigProps = {
  allowedFilters: TWorkItemFilterProperty[];
} & TWorkItemFiltersEntityProps;

export type TWorkItemFiltersConfig = {
  areAllConfigsInitialized: boolean;
  configs: TFilterConfig<TWorkItemFilterProperty, TFilterValue>[];
  configMap: {
    [key in TWorkItemFilterProperty]?: TFilterConfig<TWorkItemFilterProperty, TFilterValue>;
  };
  isFilterEnabled: (key: TWorkItemFilterProperty) => boolean;
  members: IUserLite[];
};

export const useWorkItemFiltersConfig = (props: TUseWorkItemFiltersConfigProps): TWorkItemFiltersConfig => {
  const { allowedFilters, sprintIds, labelIds, memberIds, epicIds, projectId, projectIds, stateIds, workspaceSlug } =
    props;
  // TanStack Query
  const { data: allProjects, isLoading: isProjectsLoading } = useProjects(workspaceSlug);
  const { data: allLabels } = useProjectLabels(workspaceSlug, projectId || "");
  const { data: allStates } = useProjectStates(workspaceSlug, projectId || "");
  const { data: projectSprints } = useProjectSprints(workspaceSlug, projectId || "");
  const { data: projectMembers = [] } = useProjectMembers(workspaceSlug, projectId || "");
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug);
  const { data: projectEpics } = useProjectEpics(workspaceSlug, projectId || "");
  // derived values
  const operatorConfigs = useFiltersOperatorConfigs({ workspaceSlug });
  const filtersToShow = useMemo(() => new Set(allowedFilters), [allowedFilters]);
  const project = useMemo(
    () => (projectId ? getProjectById(allProjects, projectId) : undefined),
    [projectId, allProjects]
  );
  const members: IUserLite[] | undefined = useMemo(
    () =>
      memberIds
        ? (memberIds
            .map((memberId) => {
              const workspaceMember = getWorkspaceMemberByUserId(workspaceMembers, memberId);
              if (!workspaceMember?.member) return undefined;
              return workspaceMember.member;
            })
            .filter((member) => member) as IUserLite[])
        : undefined,
    [memberIds, workspaceMembers]
  );
  const workItemStates: IState[] | undefined = useMemo(
    () =>
      stateIds
        ? (stateIds.map((stateId) => getStateById(allStates, stateId)).filter((state) => state) as IState[])
        : undefined,
    [stateIds, allStates]
  );
  const workItemLabels: IIssueLabel[] | undefined = useMemo(
    () =>
      labelIds && allLabels
        ? (labelIds.map((labelId) => allLabels.find((l) => l.id === labelId)).filter((label) => label) as IIssueLabel[])
        : undefined,
    [labelIds, allLabels]
  );
  const sprints = useMemo(
    () =>
      sprintIds && projectSprints
        ? (sprintIds.map((sprintId) => getSprintById(projectSprints, sprintId)).filter((sprint) => sprint) as ISprint[])
        : [],
    [sprintIds, projectSprints]
  );
  const epics = useMemo(
    () =>
      epicIds && projectEpics
        ? (epicIds.map((epicId) => getEpicById(projectEpics, epicId)).filter((epic) => epic) as IEpic[])
        : [],
    [epicIds, projectEpics]
  );
  const projects = useMemo(
    () =>
      projectIds && allProjects
        ? (projectIds
            .map((projectId) => getProjectById(allProjects, projectId))
            .filter((project) => project) as IProject[])
        : [],
    [projectIds, allProjects]
  );
  const areAllConfigsInitialized = useMemo(() => !isProjectsLoading, [isProjectsLoading]);

  /**
   * Checks if a filter is enabled based on the filters to show.
   * @param key - The filter key.
   * @param level - The level of the filter.
   * @returns True if the filter is enabled, false otherwise.
   */
  const isFilterEnabled = useCallback((key: TWorkItemFilterProperty) => filtersToShow.has(key), [filtersToShow]);

  // state group filter config
  const stateGroupFilterConfig = useMemo(
    () =>
      getStateGroupFilterConfig<TWorkItemFilterProperty>("state_group")({
        isEnabled: isFilterEnabled("state_group"),
        filterIcon: StatePropertyIcon,
        getOptionIcon: (stateGroupKey) => <StateGroupIcon stateGroup={stateGroupKey} />,
        ...operatorConfigs,
      }),
    [isFilterEnabled, operatorConfigs]
  );

  // state filter config
  const stateFilterConfig = useMemo(
    () =>
      getStateFilterConfig<TWorkItemFilterProperty>("state_id")({
        isEnabled: isFilterEnabled("state_id") && workItemStates !== undefined,
        filterIcon: StatePropertyIcon,
        getOptionIcon: (state) => <StateGroupIcon stateGroup={state.group} color={state.color} />,
        states: workItemStates ?? [],
        ...operatorConfigs,
      }),
    [isFilterEnabled, workItemStates, operatorConfigs]
  );

  // label filter config
  const labelFilterConfig = useMemo(
    () =>
      getLabelFilterConfig<TWorkItemFilterProperty>("label_id")({
        isEnabled: isFilterEnabled("label_id") && workItemLabels !== undefined,
        filterIcon: LabelPropertyIcon,
        labels: workItemLabels ?? [],
        getOptionIcon: (color) => (
          <span className="flex flex-shrink-0 size-2.5 rounded-full" style={{ backgroundColor: color }} />
        ),
        ...operatorConfigs,
      }),
    [isFilterEnabled, workItemLabels, operatorConfigs]
  );

  // sprint filter config
  const sprintFilterConfig = useMemo(
    () =>
      getSprintFilterConfig<TWorkItemFilterProperty>("sprint_id")({
        isEnabled: isFilterEnabled("sprint_id") && project?.sprint_view === true && sprints !== undefined,
        filterIcon: SprintIcon,
        getOptionIcon: (sprintGroup) => (
          <SprintGroupIcon sprintGroup={sprintGroup} className="h-3.5 w-3.5 flex-shrink-0" />
        ),
        sprints: sprints ?? [],
        ...operatorConfigs,
      }),
    [isFilterEnabled, project?.sprint_view, sprints, operatorConfigs]
  );

  // epic filter config
  const epicFilterConfig = useMemo(
    () =>
      getEpicFilterConfig<TWorkItemFilterProperty>("epic_id")({
        isEnabled: isFilterEnabled("epic_id") && project?.epic_view === true && epics !== undefined,
        filterIcon: EpicIcon,
        getOptionIcon: () => <EpicIcon className="h-3 w-3 flex-shrink-0" />,
        epics: epics ?? [],
        ...operatorConfigs,
      }),
    [isFilterEnabled, project?.epic_view, epics, operatorConfigs]
  );

  // assignee filter config
  const assigneeFilterConfig = useMemo(
    () =>
      getAssigneeFilterConfig<TWorkItemFilterProperty>("assignee_id")({
        isEnabled: isFilterEnabled("assignee_id") && members !== undefined,
        filterIcon: MembersPropertyIcon,
        members: members ?? [],
        getOptionIcon: (memberDetails) => (
          <Avatar
            name={memberDetails.display_name}
            src={getFileURL(memberDetails.avatar_url)}
            showTooltip={false}
            size="sm"
          />
        ),
        ...operatorConfigs,
      }),
    [isFilterEnabled, members, operatorConfigs]
  );

  // mention filter config
  const mentionFilterConfig = useMemo(
    () =>
      getMentionFilterConfig<TWorkItemFilterProperty>("mention_id")({
        isEnabled: isFilterEnabled("mention_id") && members !== undefined,
        filterIcon: AtSign,
        members: members ?? [],
        getOptionIcon: (memberDetails) => (
          <Avatar
            name={memberDetails.display_name}
            src={getFileURL(memberDetails.avatar_url)}
            showTooltip={false}
            size="sm"
          />
        ),
        ...operatorConfigs,
      }),
    [isFilterEnabled, members, operatorConfigs]
  );

  // created by filter config
  const createdByFilterConfig = useMemo(
    () =>
      getCreatedByFilterConfig<TWorkItemFilterProperty>("created_by_id")({
        isEnabled: isFilterEnabled("created_by_id") && members !== undefined,
        filterIcon: UserCirclePropertyIcon,
        members: members ?? [],
        getOptionIcon: (memberDetails) => (
          <Avatar
            name={memberDetails.display_name}
            src={getFileURL(memberDetails.avatar_url)}
            showTooltip={false}
            size="sm"
          />
        ),
        ...operatorConfigs,
      }),
    [isFilterEnabled, members, operatorConfigs]
  );

  // subscriber filter config
  const subscriberFilterConfig = useMemo(
    () =>
      getSubscriberFilterConfig<TWorkItemFilterProperty>("subscriber_id")({
        isEnabled: isFilterEnabled("subscriber_id") && members !== undefined,
        filterIcon: MembersPropertyIcon,
        members: members ?? [],
        getOptionIcon: (memberDetails) => (
          <Avatar
            name={memberDetails.display_name}
            src={getFileURL(memberDetails.avatar_url)}
            showTooltip={false}
            size="sm"
          />
        ),
        ...operatorConfigs,
      }),
    [isFilterEnabled, members, operatorConfigs]
  );

  // priority filter config
  const priorityFilterConfig = useMemo(
    () =>
      getPriorityFilterConfig<TWorkItemFilterProperty>("priority")({
        isEnabled: isFilterEnabled("priority"),
        filterIcon: PriorityPropertyIcon,
        getOptionIcon: (priority) => <PriorityIcon priority={priority} />,
        ...operatorConfigs,
      }),
    [isFilterEnabled, operatorConfigs]
  );

  // start date filter config
  const startDateFilterConfig = useMemo(
    () =>
      getStartDateFilterConfig<TWorkItemFilterProperty>("start_date")({
        isEnabled: true,
        filterIcon: StartDatePropertyIcon,
        ...operatorConfigs,
      }),
    [operatorConfigs]
  );

  // target date filter config
  const targetDateFilterConfig = useMemo(
    () =>
      getTargetDateFilterConfig<TWorkItemFilterProperty>("target_date")({
        isEnabled: true,
        filterIcon: DueDatePropertyIcon,
        ...operatorConfigs,
      }),
    [operatorConfigs]
  );

  // created at filter config
  const createdAtFilterConfig = useMemo(
    () =>
      getCreatedAtFilterConfig<TWorkItemFilterProperty>("created_at")({
        isEnabled: true,
        filterIcon: Calendar,
        ...operatorConfigs,
      }),
    [operatorConfigs]
  );

  // updated at filter config
  const updatedAtFilterConfig = useMemo(
    () =>
      getUpdatedAtFilterConfig<TWorkItemFilterProperty>("updated_at")({
        isEnabled: true,
        filterIcon: Calendar,
        ...operatorConfigs,
      }),
    [operatorConfigs]
  );

  // project filter config
  const projectFilterConfig = useMemo(
    () =>
      getProjectFilterConfig<TWorkItemFilterProperty>("project_id")({
        isEnabled: isFilterEnabled("project_id") && projects !== undefined,
        filterIcon: Briefcase,
        projects: projects,
        getOptionIcon: (project) => <Logo logo={project.logo_props} size={12} />,
        ...operatorConfigs,
      }),
    [isFilterEnabled, projects, operatorConfigs]
  );

  return {
    areAllConfigsInitialized,
    configs: [
      stateFilterConfig,
      stateGroupFilterConfig,
      assigneeFilterConfig,
      priorityFilterConfig,
      projectFilterConfig,
      mentionFilterConfig,
      labelFilterConfig,
      sprintFilterConfig,
      epicFilterConfig,
      startDateFilterConfig,
      targetDateFilterConfig,
      createdAtFilterConfig,
      updatedAtFilterConfig,
      createdByFilterConfig,
      subscriberFilterConfig,
    ],
    configMap: {
      project_id: projectFilterConfig,
      state_group: stateGroupFilterConfig,
      state_id: stateFilterConfig,
      label_id: labelFilterConfig,
      sprint_id: sprintFilterConfig,
      epic_id: epicFilterConfig,
      assignee_id: assigneeFilterConfig,
      mention_id: mentionFilterConfig,
      created_by_id: createdByFilterConfig,
      subscriber_id: subscriberFilterConfig,
      priority: priorityFilterConfig,
      start_date: startDateFilterConfig,
      target_date: targetDateFilterConfig,
      created_at: createdAtFilterConfig,
      updated_at: updatedAtFilterConfig,
    },
    isFilterEnabled,
    members: members ?? [],
  };
};
