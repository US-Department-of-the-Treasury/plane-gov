import { observable, action, makeObservable } from "mobx";
import { computedFn } from "mobx-utils";
import type { TCreateModalStoreTypes, TCreatePageModal } from "@plane/constants";
import { DEFAULT_CREATE_PAGE_MODAL_DATA, EPageAccess } from "@plane/constants";
import { EIssuesStoreType } from "@plane/types";
import { store } from "@/lib/store-context";

export interface ModalData {
  store: EIssuesStoreType;
  viewId: string;
}

export interface IBaseCommandPaletteStore {
  // observables
  isCreateProjectModalOpen: boolean;
  isCreateSprintModalOpen: boolean;
  isCreateEpicModalOpen: boolean;
  isCreateViewModalOpen: boolean;
  createPageModal: TCreatePageModal;
  isCreateIssueModalOpen: boolean;
  isDeleteIssueModalOpen: boolean;
  isBulkDeleteIssueModalOpen: boolean;
  createIssueStoreType: TCreateModalStoreTypes;
  createWorkItemAllowedProjectIds: string[] | undefined;
  allStickiesModal: boolean;
  projectListOpenMap: Record<string, boolean>;
  getIsProjectListOpen: (projectId: string) => boolean;
  // toggle actions
  toggleCreateProjectModal: (value?: boolean) => void;
  toggleCreateSprintModal: (value?: boolean) => void;
  toggleCreateViewModal: (value?: boolean) => void;
  toggleCreatePageModal: (value?: TCreatePageModal) => void;
  toggleCreateIssueModal: (value?: boolean, storeType?: TCreateModalStoreTypes, allowedProjectIds?: string[]) => void;
  toggleCreateEpicModal: (value?: boolean) => void;
  toggleDeleteIssueModal: (value?: boolean) => void;
  toggleBulkDeleteIssueModal: (value?: boolean) => void;
  toggleAllStickiesModal: (value?: boolean) => void;
  toggleProjectListOpen: (projectId: string, value?: boolean) => void;
}

export abstract class BaseCommandPaletteStore implements IBaseCommandPaletteStore {
  // observables
  isCreateProjectModalOpen: boolean = false;
  isCreateSprintModalOpen: boolean = false;
  isCreateEpicModalOpen: boolean = false;
  isCreateViewModalOpen: boolean = false;
  isCreateIssueModalOpen: boolean = false;
  isDeleteIssueModalOpen: boolean = false;
  isBulkDeleteIssueModalOpen: boolean = false;
  createPageModal: TCreatePageModal = DEFAULT_CREATE_PAGE_MODAL_DATA;
  createIssueStoreType: TCreateModalStoreTypes = EIssuesStoreType.PROJECT;
  createWorkItemAllowedProjectIds: IBaseCommandPaletteStore["createWorkItemAllowedProjectIds"] = undefined;
  allStickiesModal: boolean = false;
  projectListOpenMap: Record<string, boolean> = {};

  constructor() {
    makeObservable(this, {
      // observable
      isCreateProjectModalOpen: observable.ref,
      isCreateSprintModalOpen: observable.ref,
      isCreateEpicModalOpen: observable.ref,
      isCreateViewModalOpen: observable.ref,
      isCreateIssueModalOpen: observable.ref,
      isDeleteIssueModalOpen: observable.ref,
      isBulkDeleteIssueModalOpen: observable.ref,
      createPageModal: observable,
      createIssueStoreType: observable,
      createWorkItemAllowedProjectIds: observable,
      allStickiesModal: observable,
      projectListOpenMap: observable,
      // toggle actions
      toggleCreateProjectModal: action,
      toggleCreateSprintModal: action,
      toggleCreateViewModal: action,
      toggleCreatePageModal: action,
      toggleCreateIssueModal: action,
      toggleCreateEpicModal: action,
      toggleDeleteIssueModal: action,
      toggleBulkDeleteIssueModal: action,
      toggleAllStickiesModal: action,
      toggleProjectListOpen: action,
    });
  }

  /**
   * Returns whether any base modal is open
   * @protected - allows access from child classes
   */
  protected getCoreModalsState(): boolean {
    return Boolean(
      this.isCreateIssueModalOpen ||
      this.isCreateSprintModalOpen ||
      this.isCreateProjectModalOpen ||
      this.isCreateEpicModalOpen ||
      this.isCreateViewModalOpen ||
      store.powerK.isShortcutsListModalOpen ||
      this.isBulkDeleteIssueModalOpen ||
      this.isDeleteIssueModalOpen ||
      this.createPageModal.isOpen ||
      this.allStickiesModal
    );
  }
  // computedFn
  getIsProjectListOpen = computedFn((projectId: string) => this.projectListOpenMap[projectId]);

  /**
   * Toggles the project list open state
   * @param projectId
   * @param value
   */
  toggleProjectListOpen = (projectId: string, value?: boolean) => {
    if (value !== undefined) this.projectListOpenMap[projectId] = value;
    else this.projectListOpenMap[projectId] = !this.projectListOpenMap[projectId];
  };

  /**
   * Toggles the create project modal
   * @param value
   * @returns
   */
  toggleCreateProjectModal = (value?: boolean) => {
    if (value !== undefined) {
      this.isCreateProjectModalOpen = value;
    } else {
      this.isCreateProjectModalOpen = !this.isCreateProjectModalOpen;
    }
  };

  /**
   * Toggles the create sprint modal
   * @param value
   * @returns
   */
  toggleCreateSprintModal = (value?: boolean) => {
    if (value !== undefined) {
      this.isCreateSprintModalOpen = value;
    } else {
      this.isCreateSprintModalOpen = !this.isCreateSprintModalOpen;
    }
  };

  /**
   * Toggles the create view modal
   * @param value
   * @returns
   */
  toggleCreateViewModal = (value?: boolean) => {
    if (value !== undefined) {
      this.isCreateViewModalOpen = value;
    } else {
      this.isCreateViewModalOpen = !this.isCreateViewModalOpen;
    }
  };

  /**
   * Toggles the create page modal along with the page access
   * @param value
   * @returns
   */
  toggleCreatePageModal = (value?: TCreatePageModal) => {
    if (value) {
      this.createPageModal = {
        isOpen: value.isOpen,
        pageAccess: value.pageAccess || EPageAccess.PUBLIC,
      };
    } else {
      this.createPageModal = {
        isOpen: !this.createPageModal.isOpen,
        pageAccess: EPageAccess.PUBLIC,
      };
    }
  };

  /**
   * Toggles the create issue modal
   * @param value
   * @param storeType
   * @returns
   */
  toggleCreateIssueModal = (value?: boolean, storeType?: TCreateModalStoreTypes, allowedProjectIds?: string[]) => {
    if (value !== undefined) {
      this.isCreateIssueModalOpen = value;
      this.createIssueStoreType = storeType || EIssuesStoreType.PROJECT;
      this.createWorkItemAllowedProjectIds = allowedProjectIds ?? undefined;
    } else {
      this.isCreateIssueModalOpen = !this.isCreateIssueModalOpen;
      this.createIssueStoreType = EIssuesStoreType.PROJECT;
      this.createWorkItemAllowedProjectIds = undefined;
    }
  };

  /**
   * Toggles the delete issue modal
   * @param value
   * @returns
   */
  toggleDeleteIssueModal = (value?: boolean) => {
    if (value !== undefined) {
      this.isDeleteIssueModalOpen = value;
    } else {
      this.isDeleteIssueModalOpen = !this.isDeleteIssueModalOpen;
    }
  };

  /**
   * Toggles the create module modal
   * @param value
   * @returns
   */
  toggleCreateEpicModal = (value?: boolean) => {
    if (value !== undefined) {
      this.isCreateEpicModalOpen = value;
    } else {
      this.isCreateEpicModalOpen = !this.isCreateEpicModalOpen;
    }
  };

  /**
   * Toggles the bulk delete issue modal
   * @param value
   * @returns
   */
  toggleBulkDeleteIssueModal = (value?: boolean) => {
    if (value !== undefined) {
      this.isBulkDeleteIssueModalOpen = value;
    } else {
      this.isBulkDeleteIssueModalOpen = !this.isBulkDeleteIssueModalOpen;
    }
  };

  /**
   * Toggles the all stickies modal
   * @param value
   * @returns
   */
  toggleAllStickiesModal = (value?: boolean) => {
    if (value) {
      this.allStickiesModal = value;
    } else {
      this.allStickiesModal = !this.allStickiesModal;
    }
  };
}
