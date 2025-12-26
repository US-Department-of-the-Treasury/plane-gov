import { uniq, pull, concat, debounce } from "lodash-es";
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
// types
import type { TIssueAttachment, TIssueAttachmentMap, TIssueAttachmentIdMap, TIssueServiceType } from "@plane/types";
// services
import { IssueAttachmentService } from "@/services/issue";
// types
import type { IIssueRootStore } from "@/store/issue/root.store";
import type { IIssueDetail } from "@/store/issue/issue-details/root.store";

export type TAttachmentUploadStatus = {
  id: string;
  name: string;
  progress: number;
  size: number;
  type: string;
};

// Helper to get service instance based on service type
const getAttachmentService = (serviceType: TIssueServiceType) => new IssueAttachmentService(serviceType);

// ============================================================================
// State Interface
// ============================================================================

interface IssueAttachmentStoreState {
  // observables
  attachments: TIssueAttachmentIdMap;
  attachmentMap: TIssueAttachmentMap;
  attachmentsUploadStatusMap: Record<string, Record<string, TAttachmentUploadStatus>>;
  // root store references
  rootIssueStore: IIssueRootStore | null;
  rootIssueDetailStore: IIssueDetail | null;
  serviceType: TIssueServiceType;
}

// ============================================================================
// Actions Interface
// ============================================================================

interface IssueAttachmentStoreActions {
  // initialization
  initialize: (rootStore: IIssueRootStore, serviceType: TIssueServiceType) => void;
  // actions
  addAttachments: (issueId: string, attachments: TIssueAttachment[]) => void;
  fetchAttachments: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueAttachment[]>;
  createAttachment: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    file: File
  ) => Promise<TIssueAttachment>;
  removeAttachment: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    attachmentId: string
  ) => Promise<TIssueAttachment>;
  // helper methods
  getAttachmentsUploadStatusByIssueId: (issueId: string) => TAttachmentUploadStatus[] | undefined;
  getAttachmentsByIssueId: (issueId: string) => string[] | undefined;
  getAttachmentById: (attachmentId: string) => TIssueAttachment | undefined;
  getAttachmentsCountByIssueId: (issueId: string) => number;
  // computed getter
  getIssueAttachments: () => string[] | undefined;
}

// ============================================================================
// Combined Store Type
// ============================================================================

export type IssueAttachmentStore = IssueAttachmentStoreState & IssueAttachmentStoreActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: IssueAttachmentStoreState = {
  attachments: {},
  attachmentMap: {},
  attachmentsUploadStatusMap: {},
  rootIssueStore: null,
  rootIssueDetailStore: null,
  serviceType: "issue",
};

// ============================================================================
// Zustand Store
// ============================================================================

/**
 * Issue Attachment Store (Zustand)
 *
 * Manages issue attachments with upload progress tracking.
 * Migrated from MobX IssueAttachmentStore to Zustand.
 */
export const useIssueAttachmentStore = create<IssueAttachmentStore>()((set, get) => {
  // Debounced progress update helper
  const debouncedUpdateProgress = debounce((issueId: string, tempId: string, progress: number) => {
    set((state) => ({
      attachmentsUploadStatusMap: {
        ...state.attachmentsUploadStatusMap,
        [issueId]: {
          ...state.attachmentsUploadStatusMap[issueId],
          [tempId]: {
            ...state.attachmentsUploadStatusMap[issueId]?.[tempId],
            progress,
          },
        },
      },
    }));
  }, 16);

  return {
    ...initialState,

    // Initialize with root store and service type
    initialize: (rootStore: IIssueRootStore, serviceType: TIssueServiceType) => {
      set({
        rootIssueStore: rootStore,
        rootIssueDetailStore: rootStore.issueDetail,
        serviceType,
      });
    },

    // Actions
    addAttachments: (issueId: string, attachments: TIssueAttachment[]) => {
      if (attachments && attachments.length > 0) {
        const newAttachmentIds = attachments.map((attachment) => attachment.id);

        set((state) => {
          const existingIds = state.attachments[issueId] || [];
          const updatedIds = uniq(concat(existingIds, newAttachmentIds));

          const newAttachmentMap = { ...state.attachmentMap };
          attachments.forEach((attachment) => {
            newAttachmentMap[attachment.id] = attachment;
          });

          return {
            attachments: {
              ...state.attachments,
              [issueId]: updatedIds,
            },
            attachmentMap: newAttachmentMap,
          };
        });
      }
    },

    fetchAttachments: async (workspaceSlug: string, projectId: string, issueId: string) => {
      const state = get();
      const service = getAttachmentService(state.serviceType);
      const response = await service.getIssueAttachments(workspaceSlug, projectId, issueId);
      get().addAttachments(issueId, response);
      return response;
    },

    createAttachment: async (workspaceSlug: string, projectId: string, issueId: string, file: File) => {
      const tempId = uuidv4();
      const state = get();
      const service = getAttachmentService(state.serviceType);

      try {
        // Update attachment upload status
        set((state) => ({
          attachmentsUploadStatusMap: {
            ...state.attachmentsUploadStatusMap,
            [issueId]: {
              ...state.attachmentsUploadStatusMap[issueId],
              [tempId]: {
                id: tempId,
                name: file.name,
                progress: 0,
                size: file.size,
                type: file.type,
              },
            },
          },
        }));

        const response = await service.uploadIssueAttachment(
          workspaceSlug,
          projectId,
          issueId,
          file,
          (progressEvent) => {
            const progressPercentage = Math.round((progressEvent.progress ?? 0) * 100);
            debouncedUpdateProgress(issueId, tempId, progressPercentage);
          }
        );

        if (response && response.id) {
          set((state) => {
            const existingIds = state.attachments[issueId] || [];
            const updatedIds = uniq(concat(existingIds, [response.id]));

            return {
              attachments: {
                ...state.attachments,
                [issueId]: updatedIds,
              },
              attachmentMap: {
                ...state.attachmentMap,
                [response.id]: response,
              },
            };
          });

          // Update issue attachment count
          const currentState = get();
          if (currentState.rootIssueStore) {
            currentState.rootIssueStore.issues.updateIssue(issueId, {
              attachment_count: get().getAttachmentsCountByIssueId(issueId),
            });
          }
        }

        return response;
      } catch (error) {
        console.error("Error in uploading issue attachment:", error);
        throw error;
      } finally {
        // Remove upload status
        set((state) => {
          const newUploadStatusMap = { ...state.attachmentsUploadStatusMap };
          if (newUploadStatusMap[issueId]) {
            const issueUploadStatus = { ...newUploadStatusMap[issueId] };
            delete issueUploadStatus[tempId];
            newUploadStatusMap[issueId] = issueUploadStatus;
          }
          return {
            attachmentsUploadStatusMap: newUploadStatusMap,
          };
        });
      }
    },

    removeAttachment: async (workspaceSlug: string, projectId: string, issueId: string, attachmentId: string) => {
      const state = get();
      const service = getAttachmentService(state.serviceType);

      const response = await service.deleteIssueAttachment(workspaceSlug, projectId, issueId, attachmentId);

      set((state) => {
        const existingIds = state.attachments[issueId] || [];
        const updatedIds = existingIds.filter((id) => id !== attachmentId);

        const newAttachmentMap = { ...state.attachmentMap };
        delete newAttachmentMap[attachmentId];

        return {
          attachments: {
            ...state.attachments,
            [issueId]: updatedIds,
          },
          attachmentMap: newAttachmentMap,
        };
      });

      // Update issue attachment count
      const currentState = get();
      if (currentState.rootIssueStore) {
        currentState.rootIssueStore.issues.updateIssue(issueId, {
          attachment_count: get().getAttachmentsCountByIssueId(issueId),
        });
      }

      return response;
    },

    // Helper methods
    getAttachmentsUploadStatusByIssueId: (issueId: string) => {
      if (!issueId) return undefined;
      const state = get();
      const attachmentsUploadStatus = Object.values(state.attachmentsUploadStatusMap[issueId] ?? {});
      return attachmentsUploadStatus ?? undefined;
    },

    getAttachmentsByIssueId: (issueId: string) => {
      if (!issueId) return undefined;
      const state = get();
      return state.attachments[issueId] ?? undefined;
    },

    getAttachmentById: (attachmentId: string) => {
      if (!attachmentId) return undefined;
      const state = get();
      return state.attachmentMap[attachmentId] ?? undefined;
    },

    getAttachmentsCountByIssueId: (issueId: string) => {
      const attachments = get().getAttachmentsByIssueId(issueId);
      return attachments?.length ?? 0;
    },

    // Computed getter (was computed property in MobX)
    getIssueAttachments: () => {
      const state = get();
      const issueId = state.rootIssueDetailStore?.peekIssue?.issueId;
      if (!issueId) return undefined;
      return state.attachments[issueId] ?? undefined;
    },
  };
});

// ============================================================================
// Legacy Interface (matches original MobX interface)
// ============================================================================

export interface IIssueAttachmentStore {
  // observables
  attachments: TIssueAttachmentIdMap;
  attachmentMap: TIssueAttachmentMap;
  attachmentsUploadStatusMap: Record<string, Record<string, TAttachmentUploadStatus>>;
  // computed
  issueAttachments: string[] | undefined;
  // helper methods
  getAttachmentsUploadStatusByIssueId: (issueId: string) => TAttachmentUploadStatus[] | undefined;
  getAttachmentsByIssueId: (issueId: string) => string[] | undefined;
  getAttachmentById: (attachmentId: string) => TIssueAttachment | undefined;
  getAttachmentsCountByIssueId: (issueId: string) => number;
  // actions
  addAttachments: (issueId: string, attachments: TIssueAttachment[]) => void;
  fetchAttachments: (workspaceSlug: string, projectId: string, issueId: string) => Promise<TIssueAttachment[]>;
  createAttachment: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    file: File
  ) => Promise<TIssueAttachment>;
  removeAttachment: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    attachmentId: string
  ) => Promise<TIssueAttachment>;
}

// ============================================================================
// Legacy Class Wrapper (for backward compatibility)
// ============================================================================

export class IssueAttachmentStoreLegacy implements IIssueAttachmentStore {
  private storeInitialized = false;

  constructor(rootStore: IIssueRootStore, serviceType: TIssueServiceType) {
    // Initialize the Zustand store with root store and service type
    useIssueAttachmentStore.getState().initialize(rootStore, serviceType);
    this.storeInitialized = true;
  }

  // Getters that delegate to Zustand store
  get attachments(): TIssueAttachmentIdMap {
    return useIssueAttachmentStore.getState().attachments;
  }

  get attachmentMap(): TIssueAttachmentMap {
    return useIssueAttachmentStore.getState().attachmentMap;
  }

  get attachmentsUploadStatusMap(): Record<string, Record<string, TAttachmentUploadStatus>> {
    return useIssueAttachmentStore.getState().attachmentsUploadStatusMap;
  }

  get issueAttachments(): string[] | undefined {
    return useIssueAttachmentStore.getState().getIssueAttachments();
  }

  // Helper methods that delegate to Zustand store
  getAttachmentsUploadStatusByIssueId = (issueId: string): TAttachmentUploadStatus[] | undefined => {
    return useIssueAttachmentStore.getState().getAttachmentsUploadStatusByIssueId(issueId);
  };

  getAttachmentsByIssueId = (issueId: string): string[] | undefined => {
    return useIssueAttachmentStore.getState().getAttachmentsByIssueId(issueId);
  };

  getAttachmentById = (attachmentId: string): TIssueAttachment | undefined => {
    return useIssueAttachmentStore.getState().getAttachmentById(attachmentId);
  };

  getAttachmentsCountByIssueId = (issueId: string): number => {
    return useIssueAttachmentStore.getState().getAttachmentsCountByIssueId(issueId);
  };

  // Action methods that delegate to Zustand store
  addAttachments = (issueId: string, attachments: TIssueAttachment[]): void => {
    return useIssueAttachmentStore.getState().addAttachments(issueId, attachments);
  };

  fetchAttachments = async (workspaceSlug: string, projectId: string, issueId: string): Promise<TIssueAttachment[]> => {
    return useIssueAttachmentStore.getState().fetchAttachments(workspaceSlug, projectId, issueId);
  };

  createAttachment = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    file: File
  ): Promise<TIssueAttachment> => {
    return useIssueAttachmentStore.getState().createAttachment(workspaceSlug, projectId, issueId, file);
  };

  removeAttachment = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    attachmentId: string
  ): Promise<TIssueAttachment> => {
    return useIssueAttachmentStore.getState().removeAttachment(workspaceSlug, projectId, issueId, attachmentId);
  };
}
