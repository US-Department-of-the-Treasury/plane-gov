// CE Client-side Zustand stores
// These are migrated from MobX and provide Zustand hooks with legacy class wrappers

// Timeline store
export { useTimelineStore } from "./timeline.store";
export type { TimelineStore, TimelineState, TimelineActions, IBaseTimelineStore } from "./timeline.store";

// Inbox stores
export { useInboxIssueStore } from "./inbox-issue.store";
export type { InboxIssueStore, InboxIssueStore as InboxIssueStoreType, IInboxIssueStore } from "./inbox-issue.store";

export { useProjectInboxStore, ProjectInboxStoreLegacy } from "./project-inbox.store";
export type { ProjectInboxStore as ProjectInboxStoreType, IProjectInboxStore } from "./project-inbox.store";

// Page stores
export { usePageEditorInfoStore, PageEditorInfoStoreLegacy, PageEditorInstance } from "./page-editor-info.store";
export type {
  PageEditorInfoStore as PageEditorInfoStoreType,
  IPageEditorInfo,
  TPageEditorInstance,
} from "./page-editor-info.store";

export { createBasePageStore, BasePageStoreLegacy } from "./base-page.store";
export type { BasePageStore as BasePageStoreType, IBasePage, TBasePage } from "./base-page.store";
export type { TBasePageServices } from "./base-page.store";

export { useProjectPageStore, ProjectPageStoreLegacy, ROLE_PERMISSIONS_TO_CREATE_PAGE } from "./project-page.store";
export type { ProjectPageStore as ProjectPageStoreType, IProjectPageStore, TProjectPage } from "./project-page.store";

export {
  createProjectPageInstanceStore,
  ProjectPage,
  ProjectPageInstanceStoreLegacy,
} from "./project-page-instance.store";
export type {
  ProjectPageInstanceStore as ProjectPageInstanceStoreType,
  IProjectPage,
} from "./project-page-instance.store";

// Member stores
export { useWorkspaceMemberStore, WorkspaceMemberStoreLegacy } from "./workspace-member.store";
export type {
  WorkspaceMemberStore,
  WorkspaceMemberStore as WorkspaceMemberStoreType,
  IWorkspaceMemberStore,
  IWorkspaceMembership,
} from "./workspace-member.store";

export { useWorkspaceMemberFiltersStore, WorkspaceMemberFiltersStoreLegacy } from "./workspace-member-filters.store";
export type {
  WorkspaceMemberFiltersStore as WorkspaceMemberFiltersStoreType,
  IWorkspaceMemberFilters,
} from "./workspace-member-filters.store";

export { useBaseProjectMemberStore, BaseProjectMemberStoreLegacy } from "./base-project-member.store";
export type {
  BaseProjectMemberStore as BaseProjectMemberStoreType,
  IBaseProjectMemberStore,
  IProjectMemberDetails,
} from "./base-project-member.store";

export { useProjectMemberFiltersStore, ProjectMemberFiltersStoreLegacy } from "./project-member-filters.store";
export type { ProjectMemberFiltersStore as ProjectMemberFiltersStoreType } from "./project-member-filters.store";

// Issue reaction store
export { useIssueReactionStore } from "./issue-reaction.store";
export type {
  IssueReactionStore,
  IssueReactionStore as IssueReactionStoreType,
  IIssueReactionStore,
} from "./issue-reaction.store";

// Issue subscription store
export { useIssueSubscriptionStore, IssueSubscriptionStore } from "./issue-subscription.store";
export type {
  IssueSubscriptionStore as IssueSubscriptionStoreType,
  IIssueSubscriptionStore,
} from "./issue-subscription.store";

// Issue attachment store
export { useIssueAttachmentStore } from "./issue-attachment.store";
export type {
  IssueAttachmentStore,
  IssueAttachmentStore as IssueAttachmentStoreType,
  IIssueAttachmentStore,
  TAttachmentUploadStatus,
} from "./issue-attachment.store";

// Issue link store
export { useIssueLinkStore } from "./issue-link.store";
export type { IssueLinkStore as IssueLinkStoreType, IIssueLinkStore } from "./issue-link.store";

// Issue comment store
export { useIssueCommentStore } from "./issue-comment.store";
export type {
  IssueCommentStore,
  IssueCommentStore as IssueCommentStoreType,
  IIssueCommentStore,
  TCommentLoader,
} from "./issue-comment.store";

// Issue comment reaction store
export {
  useIssueCommentReactionStore,
  IssueCommentReactionStore,
  IssueCommentReactionStoreLegacy,
} from "./issue-comment-reaction.store";
export type { IIssueCommentReactionStore } from "./issue-comment-reaction.store";
