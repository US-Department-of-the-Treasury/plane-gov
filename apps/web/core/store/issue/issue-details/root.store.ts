// types
import type {
  TIssue,
  TIssueAttachment,
  TIssueComment,
  TIssueCommentReaction,
  TIssueLink,
  TIssueReaction,
  TIssueServiceType,
  TIssueSubIssues,
  TWorkItemWidgets,
} from "@plane/types";
// Zustand stores
import { useStateStore } from "@/store/client";
import { useUserStore } from "@/store/user";
// plane web store
import { IssueActivityStore } from "@/plane-web/store/issue/issue-details/activity.store";
import type {
  IIssueActivityStore,
  IIssueActivityStoreActions,
  TActivityLoader,
} from "@/plane-web/store/issue/issue-details/activity.store";
import type { RootStore as _RootStore } from "@/plane-web/store/root.store";
import type { TIssueRelationTypes } from "@/plane-web/types";
import type { IIssueRootStore } from "../root.store";
// Zustand stores
import { useIssueAttachmentStore } from "./attachment.store";
import type { IIssueAttachmentStore } from "./attachment.store";
import { useIssueCommentStore } from "./comment.store";
import type { IIssueCommentStore, TCommentLoader } from "./comment.store";
import { useIssueCommentReactionStore } from "@/plane-web/store/client/issue-comment-reaction.store";
import type { IIssueCommentReactionStore } from "@/plane-web/store/client/issue-comment-reaction.store";
import { IssueStore } from "./issue.store";
import type { IIssueStore, IIssueStoreActions } from "./issue.store";
import { useIssueLinkStore } from "./link.store";
import type { IIssueLinkStore } from "./link.store";
import { useIssueReactionStore } from "./reaction.store";
import type { IIssueReactionStore } from "./reaction.store";
import { useIssueRelationStore } from "./relation.store";
import type { IIssueRelationStore } from "./relation.store";
import { useIssueSubIssuesStore } from "./sub_issues.store";
import type { IIssueSubIssuesStore } from "./sub_issues.store";
import { useIssueSubscriptionStore } from "./subscription.store";
import type { IIssueSubscriptionStore } from "./subscription.store";
// Import the canonical UI store (consolidating duplicate state)
import { useIssueDetailUIStore } from "./ui.store";
import type {
  IssueDetailUIState,
  TPeekIssue,
  TIssueRelationModal,
  TIssueCrudState,
  TIssueCrudOperationState,
} from "./ui.store";
// Re-export types for backward compatibility
export type { IssueDetailUIState, TPeekIssue, TIssueRelationModal, TIssueCrudState, TIssueCrudOperationState };
// Re-export store for backward compatibility
export { useIssueDetailUIStore };

// Action interfaces (kept for backward compatibility)
export interface IIssueAttachmentStoreActions {
  addAttachments: (issueId: string, attachments: TIssueAttachment[]) => void;
  fetchAttachments: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueAttachment[]>;
  createAttachment: (workspaceSlug: string, projectId: string, issueId: string, file: File) => Promise<TIssueAttachment>;
  removeAttachment: (workspaceSlug: string, projectId: string, issueId: string, attachmentId: string) => Promise<TIssueAttachment>;
}

export interface IIssueReactionStoreActions {
  addReactions: (issueId: string, reactions: TIssueReaction[]) => void;
  fetchReactions: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueReaction[]>;
  createReaction: (workspaceSlug: string, projectId: string, issueId: string, reaction: string) => Promise<TIssueReaction>;
  removeReaction: (workspaceSlug: string, projectId: string, issueId: string, reaction: string, userId: string) => Promise<void>;
}

export interface IIssueLinkStoreActions {
  addLinks: (issueId: string, links: TIssueLink[]) => void;
  fetchLinks: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueLink[]>;
  createLink: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssueLink>) => Promise<TIssueLink>;
  updateLink: (workspaceSlug: string, projectId: string, issueId: string, linkId: string, data: Partial<TIssueLink>) => Promise<TIssueLink>;
  removeLink: (workspaceSlug: string, projectId: string, issueId: string, linkId: string) => Promise<void>;
}

export interface IIssueSubscriptionStoreActions {
  addSubscription: (issueId: string, isSubscribed: boolean | undefined | null) => void;
  fetchSubscriptions: (workspaceSlug: string, projectId: string, issueId: string) => Promise<boolean>;
  createSubscription: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
  removeSubscription: (workspaceSlug: string, projectId: string, issueId: string) => Promise<void>;
}

export interface IIssueRelationStoreActions {
  fetchRelations: (workspaceSlug: string, projectId: string, issueId: string) => Promise<unknown>;
  createRelation: (workspaceSlug: string, projectId: string, issueId: string, relationType: TIssueRelationTypes, issues: string[]) => Promise<TIssue[]>;
  removeRelation: (workspaceSlug: string, projectId: string, issueId: string, relationType: TIssueRelationTypes, relatedIssue: string, updateLocally?: boolean) => Promise<void>;
}

export interface IIssueSubIssuesStoreActions {
  fetchSubIssues: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueSubIssues>;
  createSubIssues: (workspaceSlug: string, projectId: string, parentIssueId: string, data: string[]) => Promise<void>;
  updateSubIssue: (workspaceSlug: string, projectId: string, parentIssueId: string, issueId: string, issueData: Partial<TIssue>, oldIssue?: Partial<TIssue>, fromModal?: boolean) => Promise<void>;
  removeSubIssue: (workspaceSlug: string, projectId: string, parentIssueId: string, issueId: string) => Promise<void>;
  deleteSubIssue: (workspaceSlug: string, projectId: string, parentIssueId: string, issueId: string) => Promise<void>;
}

export interface IIssueCommentStoreActions {
  fetchComments: (workspaceSlug: string, projectId: string, issueId: string, loaderType?: TCommentLoader) => Promise<TIssueComment[]>;
  createComment: (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssueComment>) => Promise<TIssueComment>;
  updateComment: (workspaceSlug: string, projectId: string, issueId: string, commentId: string, data: Partial<TIssueComment>) => Promise<TIssueComment>;
  removeComment: (workspaceSlug: string, projectId: string, issueId: string, commentId: string) => Promise<void>;
}

export interface IIssueCommentReactionStoreActions {
  fetchCommentReactions: (workspaceSlug: string, projectId: string, commentId: string) => Promise<TIssueCommentReaction[]>;
  applyCommentReactions: (commentId: string, commentReactions: TIssueCommentReaction[]) => void;
  createCommentReaction: (workspaceSlug: string, projectId: string, commentId: string, reaction: string) => Promise<TIssueCommentReaction>;
  removeCommentReaction: (workspaceSlug: string, projectId: string, commentId: string, reaction: string, userId: string) => Promise<void>;
}

// Types imported from ui.store.ts - these are re-exported above
// Backward compatible alias - useIssueDetailRootStore is now useIssueDetailUIStore
export const useIssueDetailRootStore = useIssueDetailUIStore;

export interface IIssueDetail
  extends
    IIssueStoreActions,
    IIssueReactionStoreActions,
    IIssueLinkStoreActions,
    IIssueSubIssuesStoreActions,
    IIssueSubscriptionStoreActions,
    IIssueAttachmentStoreActions,
    IIssueRelationStoreActions,
    IIssueActivityStoreActions,
    IIssueCommentStoreActions,
    IIssueCommentReactionStoreActions {
  // observables
  peekIssue: TPeekIssue | undefined;
  relationKey: TIssueRelationTypes | null;
  issueLinkData: TIssueLink | null;
  issueCrudOperationState: TIssueCrudOperationState;
  openWidgets: TWorkItemWidgets[];
  lastWidgetAction: TWorkItemWidgets | null;
  isCreateIssueModalOpen: boolean;
  isIssueLinkModalOpen: boolean;
  isParentIssueModalOpen: string | null;
  isDeleteIssueModalOpen: string | null;
  isArchiveIssueModalOpen: string | null;
  isRelationModalOpen: TIssueRelationModal | null;
  isSubIssuesModalOpen: string | null;
  attachmentDeleteModalId: string | null;
  // computed
  isAnyModalOpen: boolean;
  isPeekOpen: boolean;
  // helper actions
  getIsIssuePeeked: (issueId: string) => boolean;
  // actions
  setPeekIssue: (peekIssue: TPeekIssue | undefined) => void;
  setIssueLinkData: (issueLinkData: TIssueLink | null) => void;
  toggleCreateIssueModal: (value: boolean) => void;
  toggleIssueLinkModal: (value: boolean) => void;
  toggleParentIssueModal: (issueId: string | null) => void;
  toggleDeleteIssueModal: (issueId: string | null) => void;
  toggleArchiveIssueModal: (value: string | null) => void;
  toggleRelationModal: (issueId: string | null, relationType: TIssueRelationTypes | null) => void;
  toggleSubIssuesModal: (value: string | null) => void;
  toggleDeleteAttachmentModal: (attachmentId: string | null) => void;
  setOpenWidgets: (state: TWorkItemWidgets[]) => void;
  setLastWidgetAction: (action: TWorkItemWidgets) => void;
  toggleOpenWidget: (state: TWorkItemWidgets) => void;
  setRelationKey: (relationKey: TIssueRelationTypes | null) => void;
  setIssueCrudOperationState: (state: TIssueCrudOperationState) => void;
  // store
  rootIssueStore: IIssueRootStore;
  issue: IIssueStore;
  reaction: IIssueReactionStore;
  attachment: IIssueAttachmentStore;
  activity: IIssueActivityStore;
  comment: IIssueCommentStore;
  commentReaction: IIssueCommentReactionStore;
  subIssues: IIssueSubIssuesStore;
  link: IIssueLinkStore;
  subscription: IIssueSubscriptionStore;
  relation: IIssueRelationStore;
}

export class IssueDetail implements IIssueDetail {
  // service type
  serviceType: TIssueServiceType;
  // store
  rootIssueStore: IIssueRootStore;
  issue: IIssueStore;
  // Zustand store accessors (using getState for direct access outside React)
  get reaction(): IIssueReactionStore {
    return useIssueReactionStore.getState();
  }
  get attachment(): IIssueAttachmentStore {
    return useIssueAttachmentStore.getState();
  }
  get subIssues(): IIssueSubIssuesStore {
    return useIssueSubIssuesStore.getState();
  }
  get link(): IIssueLinkStore {
    return useIssueLinkStore.getState();
  }
  get subscription(): IIssueSubscriptionStore {
    return useIssueSubscriptionStore.getState();
  }
  get relation(): IIssueRelationStore {
    return useIssueRelationStore.getState();
  }
  activity: IIssueActivityStore;
  get comment(): IIssueCommentStore {
    return useIssueCommentStore.getState();
  }
  get commentReaction(): IIssueCommentReactionStore {
    return useIssueCommentReactionStore.getState();
  }

  constructor(rootStore: IIssueRootStore, serviceType: TIssueServiceType) {
    // store
    this.serviceType = serviceType;
    this.rootIssueStore = rootStore;
    this.issue = new IssueStore(this, serviceType);
    this.activity = new IssueActivityStore(rootStore.rootStore, serviceType);
  }

  private get store() {
    return useIssueDetailRootStore.getState();
  }

  // observables (delegated to Zustand)
  get peekIssue() {
    return this.store.peekIssue;
  }
  get relationKey() {
    return this.store.relationKey;
  }
  get issueLinkData() {
    return this.store.issueLinkData;
  }
  get issueCrudOperationState() {
    return this.store.issueCrudOperationState;
  }
  get openWidgets() {
    return this.store.openWidgets;
  }
  get lastWidgetAction() {
    return this.store.lastWidgetAction;
  }
  get isCreateIssueModalOpen() {
    return this.store.isCreateIssueModalOpen;
  }
  get isIssueLinkModalOpen() {
    return this.store.isIssueLinkModalOpen;
  }
  get isParentIssueModalOpen() {
    return this.store.isParentIssueModalOpen;
  }
  get isDeleteIssueModalOpen() {
    return this.store.isDeleteIssueModalOpen;
  }
  get isArchiveIssueModalOpen() {
    return this.store.isArchiveIssueModalOpen;
  }
  get isRelationModalOpen() {
    return this.store.isRelationModalOpen;
  }
  get isSubIssuesModalOpen() {
    return this.store.isSubIssuesModalOpen;
  }
  get attachmentDeleteModalId() {
    return this.store.attachmentDeleteModalId;
  }

  // computed
  get isAnyModalOpen() {
    const store = this.store;
    return (
      store.isCreateIssueModalOpen ||
      store.isIssueLinkModalOpen ||
      !!store.isParentIssueModalOpen ||
      !!store.isDeleteIssueModalOpen ||
      !!store.isArchiveIssueModalOpen ||
      !!store.isRelationModalOpen?.issueId ||
      !!store.isSubIssuesModalOpen ||
      !!store.attachmentDeleteModalId
    );
  }

  get isPeekOpen() {
    return !!this.store.peekIssue;
  }

  // helper actions
  getIsIssuePeeked = (issueId: string) => this.store.peekIssue?.issueId === issueId;

  // actions (delegated to Zustand)
  setRelationKey = (relationKey: TIssueRelationTypes | null) => this.store.setRelationKey(relationKey);
  setIssueCrudOperationState = (state: TIssueCrudOperationState) => this.store.setIssueCrudOperationState(state);
  setPeekIssue = (peekIssue: TPeekIssue | undefined) => this.store.setPeekIssue(peekIssue);
  toggleCreateIssueModal = (value: boolean) => this.store.toggleCreateIssueModal(value);
  toggleIssueLinkModal = (value: boolean) => this.store.toggleIssueLinkModal(value);
  toggleParentIssueModal = (issueId: string | null) => this.store.toggleParentIssueModal(issueId);
  toggleDeleteIssueModal = (issueId: string | null) => this.store.toggleDeleteIssueModal(issueId);
  toggleArchiveIssueModal = (issueId: string | null) => this.store.toggleArchiveIssueModal(issueId);
  toggleRelationModal = (issueId: string | null, relationType: TIssueRelationTypes | null) =>
    this.store.toggleRelationModal(issueId, relationType);
  toggleSubIssuesModal = (issueId: string | null) => this.store.toggleSubIssuesModal(issueId);
  toggleDeleteAttachmentModal = (attachmentId: string | null) => this.store.toggleDeleteAttachmentModal(attachmentId);
  setOpenWidgets = (state: TWorkItemWidgets[]) => this.store.setOpenWidgets(state);
  setLastWidgetAction = (action: TWorkItemWidgets) => this.store.setLastWidgetAction(action);
  toggleOpenWidget = (state: TWorkItemWidgets) => this.store.toggleOpenWidget(state);
  setIssueLinkData = (issueLinkData: TIssueLink | null) => this.store.setIssueLinkData(issueLinkData);

  // issue
  fetchIssue = async (workspaceSlug: string, projectId: string, issueId: string) =>
    this.issue.fetchIssue(workspaceSlug, projectId, issueId);
  fetchIssueWithIdentifier = async (workspaceSlug: string, projectIdentifier: string, sequenceId: string) =>
    this.issue.fetchIssueWithIdentifier(workspaceSlug, projectIdentifier, sequenceId);
  updateIssue = async (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssue>) =>
    this.issue.updateIssue(workspaceSlug, projectId, issueId, data);
  removeIssue = async (workspaceSlug: string, projectId: string, issueId: string) =>
    this.issue.removeIssue(workspaceSlug, projectId, issueId);
  archiveIssue = async (workspaceSlug: string, projectId: string, issueId: string) =>
    this.issue.archiveIssue(workspaceSlug, projectId, issueId);
  addSprintToIssue = async (workspaceSlug: string, projectId: string, sprintId: string, issueId: string) =>
    this.issue.addSprintToIssue(workspaceSlug, projectId, sprintId, issueId);
  addIssueToSprint = async (workspaceSlug: string, projectId: string, sprintId: string, issueIds: string[]) =>
    this.issue.addIssueToSprint(workspaceSlug, projectId, sprintId, issueIds);
  removeIssueFromSprint = async (workspaceSlug: string, projectId: string, sprintId: string, issueId: string) =>
    this.issue.removeIssueFromSprint(workspaceSlug, projectId, sprintId, issueId);
  changeEpicsInIssue = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    addEpicIds: string[],
    removeEpicIds: string[]
  ) => this.issue.changeEpicsInIssue(workspaceSlug, projectId, issueId, addEpicIds, removeEpicIds);
  removeIssueFromEpic = async (workspaceSlug: string, projectId: string, epicId: string, issueId: string) =>
    this.issue.removeIssueFromEpic(workspaceSlug, projectId, epicId, issueId);

  // reactions
  addReactions = (issueId: string, reactions: TIssueReaction[]) => this.reaction.addReactions(issueId, reactions);
  fetchReactions = async (workspaceSlug: string, projectId: string, issueId: string) =>
    this.reaction.fetchReactions(workspaceSlug, projectId, issueId);
  createReaction = async (workspaceSlug: string, projectId: string, issueId: string, reaction: string) =>
    this.reaction.createReaction(workspaceSlug, projectId, issueId, reaction);
  removeReaction = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    reaction: string,
    userId: string
  ) => this.reaction.removeReaction(workspaceSlug, projectId, issueId, reaction, userId);

  // attachments
  addAttachments = (issueId: string, attachments: TIssueAttachment[]) =>
    this.attachment.addAttachments(issueId, attachments);
  fetchAttachments = async (workspaceSlug: string, projectId: string, issueId: string) =>
    this.attachment.fetchAttachments(workspaceSlug, projectId, issueId);
  createAttachment = async (workspaceSlug: string, projectId: string, issueId: string, file: File) =>
    this.attachment.createAttachment(workspaceSlug, projectId, issueId, file);
  removeAttachment = async (workspaceSlug: string, projectId: string, issueId: string, attachmentId: string) =>
    this.attachment.removeAttachment(workspaceSlug, projectId, issueId, attachmentId);

  // link
  addLinks = (issueId: string, links: TIssueLink[]) => this.link.addLinks(issueId, links);
  fetchLinks = async (workspaceSlug: string, projectId: string, issueId: string) =>
    this.link.fetchLinks(workspaceSlug, projectId, issueId);
  createLink = async (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssueLink>) =>
    this.link.createLink(workspaceSlug, projectId, issueId, data);
  updateLink = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    linkId: string,
    data: Partial<TIssueLink>
  ) => this.link.updateLink(workspaceSlug, projectId, issueId, linkId, data);
  removeLink = async (workspaceSlug: string, projectId: string, issueId: string, linkId: string) =>
    this.link.removeLink(workspaceSlug, projectId, issueId, linkId);

  // sub issues
  fetchSubIssues = async (workspaceSlug: string, projectId: string, issueId: string) =>
    this.subIssues.fetchSubIssues(
      workspaceSlug,
      projectId,
      issueId,
      (issues) => this.rootIssueStore.issues.addIssue(issues),
      (id, data) => this.rootIssueStore.issues.updateIssue(id, data),
      async (ws, pIds) => {
        // Fetch project details for each project ID
        for (const pId of pIds) {
          await this.rootIssueStore.rootStore.projectRoot.project.fetchProjectDetails(ws, pId);
        }
      }
    );
  createSubIssues = async (workspaceSlug: string, projectId: string, parentIssueId: string, data: string[]) =>
    this.subIssues.createSubIssues(
      workspaceSlug,
      projectId,
      parentIssueId,
      data,
      (issues) => this.rootIssueStore.issues.addIssue(issues),
      (id, d) => this.rootIssueStore.issues.updateIssue(id, d),
      async (ws, pIds) => {
        // Fetch project details for each project ID
        for (const pId of pIds) {
          await this.rootIssueStore.rootStore.projectRoot.project.fetchProjectDetails(ws, pId);
        }
      }
    );
  updateSubIssue = async (
    workspaceSlug: string,
    projectId: string,
    parentIssueId: string,
    issueId: string,
    issueData: Partial<TIssue>,
    oldIssue?: Partial<TIssue>,
    fromModal?: boolean
  ) =>
    this.subIssues.updateSubIssue(
      workspaceSlug,
      projectId,
      parentIssueId,
      issueId,
      issueData,
      oldIssue,
      fromModal,
      (ws, pId, iId, d) => this.rootIssueStore.issueDetail.updateIssue(ws, pId, iId, d),
      (stateId) => useStateStore.getState().getStateById(stateId)
    );
  removeSubIssue = async (workspaceSlug: string, projectId: string, parentIssueId: string, issueId: string) =>
    this.subIssues.removeSubIssue(
      workspaceSlug,
      projectId,
      parentIssueId,
      issueId,
      (ws, pId, iId, d) => this.rootIssueStore.issueDetail.updateIssue(ws, pId, iId, d),
      (iId) => this.rootIssueStore.issues.getIssueById(iId),
      (stateId) => useStateStore.getState().getStateById(stateId),
      (id, d) => this.rootIssueStore.issues.updateIssue(id, d)
    );
  deleteSubIssue = async (workspaceSlug: string, projectId: string, parentIssueId: string, issueId: string) =>
    this.subIssues.deleteSubIssue(
      workspaceSlug,
      projectId,
      parentIssueId,
      issueId,
      (ws, pId, iId) => this.rootIssueStore.issueDetail.removeIssue(ws, pId, iId),
      (iId) => this.rootIssueStore.issues.getIssueById(iId),
      (stateId) => useStateStore.getState().getStateById(stateId),
      (id, d) => this.rootIssueStore.issues.updateIssue(id, d)
    );

  // subscription
  addSubscription = (issueId: string, isSubscribed: boolean | undefined | null) => {
    const currentUserId = this.rootIssueStore.rootStore.user.data?.id;
    // Silently skip if user ID not available yet - subscription state is non-critical
    // and will be properly cached when user data loads
    if (!currentUserId) return;
    this.subscription.addSubscription(issueId, currentUserId, isSubscribed);
  };
  fetchSubscriptions = async (workspaceSlug: string, projectId: string, issueId: string) => {
    const currentUserId = useUserStore.getState().data?.id;
    if (!currentUserId) throw new Error("user id not available");
    return this.subscription.fetchSubscriptions(workspaceSlug, projectId, issueId, currentUserId);
  };
  createSubscription = async (workspaceSlug: string, projectId: string, issueId: string) => {
    const currentUserId = useUserStore.getState().data?.id;
    if (!currentUserId) throw new Error("user id not available");
    return this.subscription.createSubscription(workspaceSlug, projectId, issueId, currentUserId);
  };
  removeSubscription = async (workspaceSlug: string, projectId: string, issueId: string) => {
    const currentUserId = useUserStore.getState().data?.id;
    if (!currentUserId) throw new Error("user id not available");
    return this.subscription.removeSubscription(workspaceSlug, projectId, issueId, currentUserId);
  };

  // relations
  fetchRelations = async (workspaceSlug: string, projectId: string, issueId: string) =>
    this.relation.fetchRelations(workspaceSlug, projectId, issueId);
  createRelation = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    relationType: TIssueRelationTypes,
    issues: string[]
  ) => this.relation.createRelation(workspaceSlug, projectId, issueId, relationType, issues);
  removeRelation = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    relationType: TIssueRelationTypes,
    relatedIssue: string,
    updateLocally?: boolean
  ) => this.relation.removeRelation(workspaceSlug, projectId, issueId, relationType, relatedIssue, updateLocally);

  // activity
  fetchActivities = async (workspaceSlug: string, projectId: string, issueId: string, loaderType?: TActivityLoader) =>
    this.activity.fetchActivities(workspaceSlug, projectId, issueId, loaderType);

  // comment
  fetchComments = async (workspaceSlug: string, projectId: string, issueId: string, loaderType?: TCommentLoader) =>
    this.comment.fetchComments(workspaceSlug, projectId, issueId, loaderType);
  createComment = async (workspaceSlug: string, projectId: string, issueId: string, data: Partial<TIssueComment>) =>
    this.comment.createComment(workspaceSlug, projectId, issueId, data);
  updateComment = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    commentId: string,
    data: Partial<TIssueComment>
  ) => this.comment.updateComment(workspaceSlug, projectId, issueId, commentId, data);
  removeComment = async (workspaceSlug: string, projectId: string, issueId: string, commentId: string) =>
    this.comment.removeComment(workspaceSlug, projectId, issueId, commentId);

  // comment reaction
  fetchCommentReactions = async (workspaceSlug: string, projectId: string, commentId: string) =>
    this.commentReaction.fetchCommentReactions(workspaceSlug, projectId, commentId);
  applyCommentReactions = async (commentId: string, commentReactions: TIssueCommentReaction[]) =>
    this.commentReaction.applyCommentReactions(commentId, commentReactions);
  createCommentReaction = async (workspaceSlug: string, projectId: string, commentId: string, reaction: string) =>
    this.commentReaction.createCommentReaction(workspaceSlug, projectId, commentId, reaction);
  removeCommentReaction = async (
    workspaceSlug: string,
    projectId: string,
    commentId: string,
    reaction: string,
    userId: string
  ) => this.commentReaction.removeCommentReaction(workspaceSlug, projectId, commentId, reaction, userId);
}
