import { uniq, pull, concat, update, set as lodashSet, debounce } from "lodash-es";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import { EIssueServiceType } from "@plane/types";
import type { TIssueAttachment, TIssueAttachmentMap, TIssueAttachmentIdMap, TIssueServiceType } from "@plane/types";
// services
import { IssueAttachmentService } from "@/services/issue";

export type TAttachmentUploadStatus = {
  id: string;
  name: string;
  progress: number;
  size: number;
  type: string;
};

export interface IIssueAttachmentStore {
  // state
  attachments: TIssueAttachmentIdMap;
  attachmentMap: TIssueAttachmentMap;
  attachmentsUploadStatusMap: Record<string, Record<string, TAttachmentUploadStatus>>;
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
    file: File,
    onIssueUpdate?: (issueId: string, data: { attachment_count: number }) => void
  ) => Promise<TIssueAttachment>;
  removeAttachment: (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    attachmentId: string,
    onIssueUpdate?: (issueId: string, data: { attachment_count: number }) => void
  ) => Promise<TIssueAttachment>;
  updateUploadProgress: (issueId: string, tempId: string, progress: number) => void;
  clearUploadStatus: (issueId: string, tempId: string) => void;
}

// Store factory for different service types
const attachmentServiceMap = new Map<TIssueServiceType, IssueAttachmentService>();

const getAttachmentService = (serviceType: TIssueServiceType): IssueAttachmentService => {
  if (!attachmentServiceMap.has(serviceType)) {
    attachmentServiceMap.set(serviceType, new IssueAttachmentService(serviceType));
  }
  return attachmentServiceMap.get(serviceType)!;
};

export const useIssueAttachmentStore = create<IIssueAttachmentStore>()(
  immer((set, get) => ({
    // state
    attachments: {},
    attachmentMap: {},
    attachmentsUploadStatusMap: {},

    // helper methods
    getAttachmentsUploadStatusByIssueId: (issueId: string) => {
      if (!issueId) return undefined;
      const state = get();
      const attachmentsUploadStatus = Object.values(state.attachmentsUploadStatusMap[issueId] ?? {});
      return attachmentsUploadStatus.length > 0 ? attachmentsUploadStatus : undefined;
    },

    getAttachmentsByIssueId: (issueId: string) => {
      if (!issueId) return undefined;
      return get().attachments[issueId] ?? undefined;
    },

    getAttachmentById: (attachmentId: string) => {
      if (!attachmentId) return undefined;
      return get().attachmentMap[attachmentId] ?? undefined;
    },

    getAttachmentsCountByIssueId: (issueId: string) => {
      const attachments = get().getAttachmentsByIssueId(issueId);
      return attachments?.length ?? 0;
    },

    // actions
    addAttachments: (issueId: string, attachments: TIssueAttachment[]) => {
      if (attachments && attachments.length > 0) {
        const newAttachmentIds = attachments.map((attachment) => attachment.id);
        set((state) => {
          update(state.attachments, [issueId], (attachmentIds = []) => uniq(concat(attachmentIds, newAttachmentIds)));
          attachments.forEach((attachment) => lodashSet(state.attachmentMap, attachment.id, attachment));
        });
      }
    },

    fetchAttachments: async (workspaceSlug: string, projectId: string, issueId: string) => {
      const service = getAttachmentService(EIssueServiceType.ISSUES);
      const response = await service.getIssueAttachments(workspaceSlug, projectId, issueId);
      get().addAttachments(issueId, response);
      return response;
    },

    updateUploadProgress: debounce((issueId: string, tempId: string, progress: number) => {
      set((state) => {
        if (state.attachmentsUploadStatusMap[issueId]?.[tempId]) {
          state.attachmentsUploadStatusMap[issueId][tempId].progress = progress;
        }
      });
    }, 16),

    clearUploadStatus: (issueId: string, tempId: string) => {
      set((state) => {
        if (state.attachmentsUploadStatusMap[issueId]) {
          delete state.attachmentsUploadStatusMap[issueId][tempId];
        }
      });
    },

    createAttachment: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      file: File,
      onIssueUpdate?: (issueId: string, data: { attachment_count: number }) => void
    ) => {
      const tempId = uuidv4();
      const service = getAttachmentService(EIssueServiceType.ISSUES);
      const store = get();

      try {
        // update attachment upload status
        set((state) => {
          if (!state.attachmentsUploadStatusMap[issueId]) {
            state.attachmentsUploadStatusMap[issueId] = {};
          }
          state.attachmentsUploadStatusMap[issueId][tempId] = {
            id: tempId,
            name: file.name,
            progress: 0,
            size: file.size,
            type: file.type,
          };
        });

        const response = await service.uploadIssueAttachment(
          workspaceSlug,
          projectId,
          issueId,
          file,
          (progressEvent) => {
            const progressPercentage = Math.round((progressEvent.progress ?? 0) * 100);
            store.updateUploadProgress(issueId, tempId, progressPercentage);
          }
        );

        if (response && response.id) {
          set((state) => {
            update(state.attachments, [issueId], (attachmentIds = []) => uniq(concat(attachmentIds, [response.id])));
            state.attachmentMap[response.id] = response;
          });

          if (onIssueUpdate) {
            onIssueUpdate(issueId, {
              attachment_count: get().getAttachmentsCountByIssueId(issueId),
            });
          }
        }

        return response;
      } catch (error) {
        console.error("Error in uploading issue attachment:", error);
        throw error;
      } finally {
        store.clearUploadStatus(issueId, tempId);
      }
    },

    removeAttachment: async (
      workspaceSlug: string,
      projectId: string,
      issueId: string,
      attachmentId: string,
      onIssueUpdate?: (issueId: string, data: { attachment_count: number }) => void
    ) => {
      const service = getAttachmentService(EIssueServiceType.ISSUES);
      const response = await service.deleteIssueAttachment(workspaceSlug, projectId, issueId, attachmentId);

      set((state) => {
        update(state.attachments, [issueId], (attachmentIds = []) => {
          if (attachmentIds.includes(attachmentId)) pull(attachmentIds, attachmentId);
          return attachmentIds;
        });
        delete state.attachmentMap[attachmentId];
      });

      if (onIssueUpdate) {
        onIssueUpdate(issueId, {
          attachment_count: get().getAttachmentsCountByIssueId(issueId),
        });
      }

      return response;
    },
  }))
);
