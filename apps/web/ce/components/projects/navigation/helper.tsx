// plane imports
import { EUserPermissions, EProjectFeatureKey } from "@plane/constants";
import { SprintIcon, IntakeIcon, EpicIcon, PageIcon, ViewsIcon, WorkItemsIcon } from "@plane/propel/icons";
// components
import type { TNavigationItem } from "@/components/workspace/sidebar/project-navigation";

export const getProjectFeatureNavigation = (
  workspaceSlug: string,
  projectId: string,
  project: {
    sprint_view: boolean;
    epic_view: boolean;
    issue_views_view: boolean;
    page_view: boolean;
    inbox_view: boolean;
  }
): TNavigationItem[] => [
  {
    i18n_key: "sidebar.work_items",
    key: EProjectFeatureKey.WORK_ITEMS,
    name: "Work items",
    href: `/${workspaceSlug}/projects/${projectId}/issues`,
    icon: WorkItemsIcon,
    access: [EUserPermissions.ADMIN, EUserPermissions.MEMBER, EUserPermissions.GUEST],
    shouldRender: true,
    sortOrder: 1,
  },
  {
    i18n_key: "sidebar.sprints",
    key: EProjectFeatureKey.SPRINTS,
    name: "Sprints",
    href: `/${workspaceSlug}/projects/${projectId}/sprints`,
    icon: SprintIcon,
    access: [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    shouldRender: project.sprint_view,
    sortOrder: 2,
  },
  {
    i18n_key: "sidebar.epics",
    key: EProjectFeatureKey.EPICS,
    name: "Epics",
    href: `/${workspaceSlug}/projects/${projectId}/epics`,
    icon: EpicIcon,
    access: [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    shouldRender: project.epic_view,
    sortOrder: 3,
  },
  {
    i18n_key: "sidebar.views",
    key: EProjectFeatureKey.VIEWS,
    name: "Views",
    href: `/${workspaceSlug}/projects/${projectId}/views`,
    icon: ViewsIcon,
    access: [EUserPermissions.ADMIN, EUserPermissions.MEMBER, EUserPermissions.GUEST],
    shouldRender: project.issue_views_view,
    sortOrder: 4,
  },
  {
    i18n_key: "sidebar.pages",
    key: EProjectFeatureKey.PAGES,
    name: "Pages",
    href: `/${workspaceSlug}/projects/${projectId}/pages`,
    icon: PageIcon,
    access: [EUserPermissions.ADMIN, EUserPermissions.MEMBER, EUserPermissions.GUEST],
    shouldRender: project.page_view,
    sortOrder: 5,
  },
  {
    i18n_key: "sidebar.intake",
    key: EProjectFeatureKey.INTAKE,
    name: "Intake",
    href: `/${workspaceSlug}/projects/${projectId}/intake`,
    icon: IntakeIcon,
    access: [EUserPermissions.ADMIN, EUserPermissions.MEMBER, EUserPermissions.GUEST],
    shouldRender: project.inbox_view,
    sortOrder: 6,
  },
];
