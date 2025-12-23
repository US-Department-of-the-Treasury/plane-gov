import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// plane imports
import type { IUserLite } from "@plane/types";
// plane web imports
import type { IProjectMemberStore } from "@/plane-web/store/member/project-member.store";
import { ProjectMemberStore } from "@/plane-web/store/member/project-member.store";
import type { RootStore } from "@/plane-web/store/root.store";
// local imports
import type { IWorkspaceMemberStore } from "./workspace/workspace-member.store";
import { WorkspaceMemberStore } from "./workspace/workspace-member.store";

// Zustand Store
interface MemberRootState {
  memberMap: Record<string, IUserLite>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MemberRootActions {
  // Add any actions if needed in the future
}

type MemberRootStoreType = MemberRootState & MemberRootActions;

export const useMemberRootStore = create<MemberRootStoreType>()(
  immer((set, get) => ({
    // State
    memberMap: {},
  }))
);

// Legacy interface for backward compatibility
export interface IMemberRootStore {
  // observables
  memberMap: Record<string, IUserLite>;
  // computed actions
  getMemberIds: () => string[];
  getUserDetails: (userId: string) => IUserLite | undefined;
  // sub-stores
  workspace: IWorkspaceMemberStore;
  project: IProjectMemberStore;
}

// Legacy class wrapper for backward compatibility
export class MemberRootStore implements IMemberRootStore {
  // sub-stores
  workspace: IWorkspaceMemberStore;
  project: IProjectMemberStore;

  constructor(_rootStore: RootStore) {
    // sub-stores
    this.workspace = new WorkspaceMemberStore(this, _rootStore);
    this.project = new ProjectMemberStore(this, _rootStore);
  }

  private get store() {
    return useMemberRootStore.getState();
  }

  get memberMap() {
    return this.store.memberMap;
  }

  /**
   * @description get all member ids
   */
  getMemberIds = () => Object.keys(this.store.memberMap);

  /**
   * @description get user details from userId
   * @param userId
   */
  getUserDetails = (userId: string): IUserLite | undefined => this.store.memberMap?.[userId] ?? undefined;
}
