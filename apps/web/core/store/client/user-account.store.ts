import { create } from "zustand";
import type { IUserAccount } from "@plane/types";
import { UserService } from "@/services/user.service";
import type { CoreRootStore } from "../root.store";

// State interface
interface UserAccountStoreState {
  isLoading: boolean;
  error: any | undefined;
  provider_account_id: string | undefined;
  provider: string | undefined;
}

// Actions interface
interface UserAccountStoreActions {
  setAccountData: (account: IUserAccount) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: any | undefined) => void;
  reset: () => void;
}

// Combined type export
export type UserAccountStore = UserAccountStoreState & UserAccountStoreActions;

// Initial state
const initialState: UserAccountStoreState = {
  isLoading: false,
  error: undefined,
  provider_account_id: undefined,
  provider: undefined,
};

// Service instance (shared across all store instances)
const userService = new UserService();

// Zustand store
export const useUserAccountStore = create<UserAccountStore>()((set) => ({
  ...initialState,

  setAccountData: (account) =>
    set({
      provider_account_id: account.provider_account_id ?? undefined,
      provider: account.provider ?? undefined,
    }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));

// Legacy interface (matching original IAccountStore)
export interface IAccountStore {
  // observables
  isLoading: boolean;
  error: any | undefined;
  // model observables
  provider_account_id: string | undefined;
  provider: string | undefined;
  // service
  userService: UserService;
}

/**
 * Legacy class wrapper for backward compatibility with MobX patterns.
 * Used by root.store.ts to maintain API compatibility during migration.
 * @deprecated Use useUserAccountStore hook directly in React components
 */
export class AccountStore implements IAccountStore {
  userService: UserService;

  constructor(
    private store: CoreRootStore,
    private _account: IUserAccount
  ) {
    this.userService = new UserService();

    // Initialize the Zustand store with account data
    useUserAccountStore.getState().setAccountData(_account);
  }

  get isLoading() {
    return useUserAccountStore.getState().isLoading;
  }

  get error() {
    return useUserAccountStore.getState().error;
  }

  get provider_account_id() {
    return useUserAccountStore.getState().provider_account_id;
  }

  get provider() {
    return useUserAccountStore.getState().provider;
  }
}
