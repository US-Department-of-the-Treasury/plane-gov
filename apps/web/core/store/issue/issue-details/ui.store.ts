import { create } from "zustand";
// types
import type { TIssue, TIssueLink, TWorkItemWidgets } from "@plane/types";
import type { TIssueRelationTypes } from "@/plane-web/types";

export type TPeekIssue = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  nestingLevel?: number;
  isArchived?: boolean;
};

export type TIssueRelationModal = {
  issueId: string | null;
  relationType: TIssueRelationTypes | null;
};

export type TIssueCrudState = { toggle: boolean; parentIssueId: string | undefined; issue: TIssue | undefined };

export type TIssueCrudOperationState = {
  create: TIssueCrudState;
  existing: TIssueCrudState;
};

interface IssueDetailUIState {
  // Modal states
  peekIssue: TPeekIssue | undefined;
  isCreateIssueModalOpen: boolean;
  isIssueLinkModalOpen: boolean;
  isParentIssueModalOpen: string | null;
  isDeleteIssueModalOpen: string | null;
  isArchiveIssueModalOpen: string | null;
  isRelationModalOpen: TIssueRelationModal | null;
  isSubIssuesModalOpen: string | null;
  attachmentDeleteModalId: string | null;

  // Widget states
  openWidgets: TWorkItemWidgets[];
  lastWidgetAction: TWorkItemWidgets | null;

  // Other UI state
  relationKey: TIssueRelationTypes | null;
  issueLinkData: TIssueLink | null;
  issueCrudOperationState: TIssueCrudOperationState;

  // Actions
  setPeekIssue: (peekIssue: TPeekIssue | undefined) => void;
  toggleCreateIssueModal: (value: boolean) => void;
  toggleIssueLinkModal: (value: boolean) => void;
  toggleParentIssueModal: (issueId: string | null) => void;
  toggleDeleteIssueModal: (issueId: string | null) => void;
  toggleArchiveIssueModal: (issueId: string | null) => void;
  toggleRelationModal: (issueId: string | null, relationType: TIssueRelationTypes | null) => void;
  toggleSubIssuesModal: (issueId: string | null) => void;
  toggleDeleteAttachmentModal: (attachmentId: string | null) => void;
  setOpenWidgets: (state: TWorkItemWidgets[]) => void;
  setLastWidgetAction: (action: TWorkItemWidgets) => void;
  toggleOpenWidget: (state: TWorkItemWidgets) => void;
  setRelationKey: (relationKey: TIssueRelationTypes | null) => void;
  setIssueLinkData: (issueLinkData: TIssueLink | null) => void;
  setIssueCrudOperationState: (state: TIssueCrudOperationState) => void;
}

export const useIssueDetailUIStore = create<IssueDetailUIState>((set, get) => ({
  // Initial state
  peekIssue: undefined,
  isCreateIssueModalOpen: false,
  isIssueLinkModalOpen: false,
  isParentIssueModalOpen: null,
  isDeleteIssueModalOpen: null,
  isArchiveIssueModalOpen: null,
  isRelationModalOpen: null,
  isSubIssuesModalOpen: null,
  attachmentDeleteModalId: null,
  openWidgets: ["sub-work-items", "links", "attachments"],
  lastWidgetAction: null,
  relationKey: null,
  issueLinkData: null,
  issueCrudOperationState: {
    create: {
      toggle: false,
      parentIssueId: undefined,
      issue: undefined,
    },
    existing: {
      toggle: false,
      parentIssueId: undefined,
      issue: undefined,
    },
  },

  // Actions
  setPeekIssue: (peekIssue) => set({ peekIssue }),

  toggleCreateIssueModal: (value) => set({ isCreateIssueModalOpen: value }),

  toggleIssueLinkModal: (value) => set({ isIssueLinkModalOpen: value }),

  toggleParentIssueModal: (issueId) => set({ isParentIssueModalOpen: issueId }),

  toggleDeleteIssueModal: (issueId) => set({ isDeleteIssueModalOpen: issueId }),

  toggleArchiveIssueModal: (issueId) => set({ isArchiveIssueModalOpen: issueId }),

  toggleRelationModal: (issueId, relationType) =>
    set({ isRelationModalOpen: { issueId, relationType } }),

  toggleSubIssuesModal: (issueId) => set({ isSubIssuesModalOpen: issueId }),

  toggleDeleteAttachmentModal: (attachmentId) => set({ attachmentDeleteModalId: attachmentId }),

  setOpenWidgets: (state) =>
    set({
      openWidgets: state,
      lastWidgetAction: null,
    }),

  setLastWidgetAction: (action) => set({ openWidgets: [action] }),

  toggleOpenWidget: (state) => {
    const { openWidgets } = get();
    if (openWidgets.includes(state)) {
      set({ openWidgets: openWidgets.filter((s) => s !== state) });
    } else {
      set({ openWidgets: [state, ...openWidgets] });
    }
  },

  setRelationKey: (relationKey) => set({ relationKey }),

  setIssueLinkData: (issueLinkData) => set({ issueLinkData }),

  setIssueCrudOperationState: (state) => set({ issueCrudOperationState: state }),
}));

// Selectors (for computed values)
export const useIsAnyModalOpen = () =>
  useIssueDetailUIStore((state) => {
    return (
      state.isCreateIssueModalOpen ||
      state.isIssueLinkModalOpen ||
      !!state.isParentIssueModalOpen ||
      !!state.isDeleteIssueModalOpen ||
      !!state.isArchiveIssueModalOpen ||
      !!state.isRelationModalOpen?.issueId ||
      !!state.isSubIssuesModalOpen ||
      !!state.attachmentDeleteModalId
    );
  });

export const useIsPeekOpen = () => useIssueDetailUIStore((state) => !!state.peekIssue);

export const useIsIssuePeeked = (issueId: string) =>
  useIssueDetailUIStore((state) => state.peekIssue?.issueId === issueId);
