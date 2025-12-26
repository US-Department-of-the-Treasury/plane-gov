import { create } from "zustand";
import { debounce, set as lodashSet } from "lodash-es";
import { v4 as uuidv4 } from "uuid";
// plane types
import type { EFileAssetType, TFileEntityInfo, TFileSignedURLResponse } from "@plane/types";
// services
import { FileService } from "@/services/file.service";
import type { TAttachmentUploadStatus } from "@/store/issue/issue-details/attachment.store";

interface EditorAssetState {
  assetsUploadStatus: Record<string, TAttachmentUploadStatus>;
}

interface EditorAssetActions {
  // Helper methods
  getAssetUploadStatusByEditorBlockId: (blockId: string) => TAttachmentUploadStatus | undefined;
  // Actions
  uploadEditorAsset: (args: {
    blockId: string;
    data: TFileEntityInfo;
    file: File;
    projectId?: string;
    workspaceSlug: string;
  }) => Promise<TFileSignedURLResponse>;
  duplicateEditorAsset: (args: {
    assetId: string;
    entityId?: string;
    entityType: EFileAssetType;
    projectId?: string;
    workspaceSlug: string;
  }) => Promise<{ asset_id: string }>;
  // Internal state updates
  _setAssetUploadStatus: (blockId: string, status: TAttachmentUploadStatus) => void;
  _updateAssetUploadProgress: (blockId: string, progress: number) => void;
  _deleteAssetUploadStatus: (blockId: string) => void;
}

export type EditorAssetStore = EditorAssetState & EditorAssetActions;

// Legacy interface for backward compatibility with MobX store
export interface IEditorAssetStore {
  assetsUploadPercentage: Record<string, number>;
  getAssetUploadStatusByEditorBlockId: (blockId: string) => TAttachmentUploadStatus | undefined;
  uploadEditorAsset: (args: {
    blockId: string;
    data: TFileEntityInfo;
    file: File;
    projectId?: string;
    workspaceSlug: string;
  }) => Promise<TFileSignedURLResponse>;
  duplicateEditorAsset: (args: {
    assetId: string;
    entityId?: string;
    entityType: EFileAssetType;
    projectId?: string;
    workspaceSlug: string;
  }) => Promise<{ asset_id: string }>;
}

// Selector for computed percentage values
export const selectAssetsUploadPercentage = (state: EditorAssetStore): Record<string, number> => {
  const assetsStatus = state.assetsUploadStatus;
  const assetsPercentage: Record<string, number> = {};
  Object.keys(assetsStatus).forEach((blockId) => {
    const asset = assetsStatus[blockId];
    if (asset) assetsPercentage[blockId] = asset.progress;
  });
  return assetsPercentage;
};

// Create a single FileService instance
const fileService = new FileService();

// Debounced progress updater (outside the store to maintain single instance)
const debouncedProgressUpdaters = new Map<
  string,
  ReturnType<typeof debounce>
>();

const getDebouncedProgressUpdater = (
  blockId: string,
  updateFn: (progress: number) => void
) => {
  if (!debouncedProgressUpdaters.has(blockId)) {
    debouncedProgressUpdaters.set(
      blockId,
      debounce((progress: number) => updateFn(progress), 16)
    );
  }
  return debouncedProgressUpdaters.get(blockId)!;
};

export const useEditorAssetStore = create<EditorAssetStore>()((set, get) => ({
  assetsUploadStatus: {},

  getAssetUploadStatusByEditorBlockId: (blockId) => {
    const blockDetails = get().assetsUploadStatus[blockId];
    return blockDetails;
  },

  // Internal state updates
  _setAssetUploadStatus: (blockId, status) => {
    set((state) => ({
      assetsUploadStatus: {
        ...state.assetsUploadStatus,
        [blockId]: status,
      },
    }));
  },

  _updateAssetUploadProgress: (blockId, progress) => {
    set((state) => {
      const newStatus = { ...state.assetsUploadStatus };
      // Use string path for proper Zustand reactivity
      lodashSet(newStatus, `${blockId}.progress`, progress);
      return { assetsUploadStatus: newStatus };
    });
  },

  _deleteAssetUploadStatus: (blockId) => {
    set((state) => {
      const newStatus = { ...state.assetsUploadStatus };
      delete newStatus[blockId];
      return { assetsUploadStatus: newStatus };
    });
    // Clean up debouncer
    debouncedProgressUpdaters.delete(blockId);
  },

  // Actions
  uploadEditorAsset: async (args) => {
    const { blockId, data, file, projectId, workspaceSlug } = args;
    const tempId = uuidv4();

    try {
      // Update attachment upload status
      get()._setAssetUploadStatus(blockId, {
        id: tempId,
        name: file.name,
        progress: 0,
        size: file.size,
        type: file.type,
      });

      // Get debounced updater for this block
      const updateProgress = getDebouncedProgressUpdater(blockId, (progress) => {
        get()._updateAssetUploadProgress(blockId, progress);
      });

      if (projectId) {
        const response = await fileService.uploadProjectAsset(
          workspaceSlug,
          projectId,
          data,
          file,
          (progressEvent) => {
            const progressPercentage = Math.round((progressEvent.progress ?? 0) * 100);
            updateProgress(progressPercentage);
          }
        );
        return response;
      } else {
        const response = await fileService.uploadWorkspaceAsset(
          workspaceSlug,
          data,
          file,
          (progressEvent) => {
            const progressPercentage = Math.round((progressEvent.progress ?? 0) * 100);
            updateProgress(progressPercentage);
          }
        );
        return response;
      }
    } catch (error) {
      console.error("Error in uploading page asset:", error);
      throw error;
    } finally {
      get()._deleteAssetUploadStatus(blockId);
    }
  },

  duplicateEditorAsset: async (args) => {
    const { assetId, entityId, entityType, projectId, workspaceSlug } = args;
    const { asset_id } = await fileService.duplicateAsset(workspaceSlug, assetId, {
      entity_id: entityId,
      entity_type: entityType,
      project_id: projectId,
    });
    return { asset_id };
  },
}));

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use useEditorAssetStore hook directly in React components
 */
export class EditorAssetStoreLegacy implements IEditorAssetStore {
  get assetsUploadPercentage() {
    return selectAssetsUploadPercentage(useEditorAssetStore.getState());
  }

  getAssetUploadStatusByEditorBlockId = (blockId: string) =>
    useEditorAssetStore.getState().getAssetUploadStatusByEditorBlockId(blockId);

  uploadEditorAsset = (args: {
    blockId: string;
    data: TFileEntityInfo;
    file: File;
    projectId?: string;
    workspaceSlug: string;
  }) => useEditorAssetStore.getState().uploadEditorAsset(args);

  duplicateEditorAsset = (args: {
    assetId: string;
    entityId?: string;
    entityType: EFileAssetType;
    projectId?: string;
    workspaceSlug: string;
  }) => useEditorAssetStore.getState().duplicateEditorAsset(args);
}
