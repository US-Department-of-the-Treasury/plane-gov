import { set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type { IUserAccount } from "@plane/types";
// services
import { UserService } from "@/services/user.service";
// store
import type { CoreRootStore } from "../root.store";

export interface IAccountStore {
  // observables
  isLoading: boolean;
  error: any | undefined;
  // model observables
  provider_account_id: string | undefined;
  provider: string | undefined;
}

// Zustand Store
interface AccountState {
  isLoading: boolean;
  error: any | undefined;
  provider_account_id: string | undefined;
  provider: string | undefined;
}

interface AccountActions {
  setAccountData: (account: IUserAccount) => void;
}

type AccountStoreType = AccountState & AccountActions;

export const useAccountStore = create<AccountStoreType>()(
  immer((set) => ({
    // State
    isLoading: false,
    error: undefined,
    provider_account_id: undefined,
    provider: undefined,

    // Actions
    setAccountData: (account) => {
      set((state) => {
        Object.entries(account).forEach(([key, value]) => {
          lodashSet(state, [key], value ?? undefined);
        });
      });
    },
  }))
);

// Legacy class wrapper for backward compatibility
export class AccountStore implements IAccountStore {
  private storeId: string;
  userService: UserService;

  constructor(
    private store: CoreRootStore,
    private _account: IUserAccount
  ) {
    // Generate unique store ID for this instance
    this.storeId = `account-${_account.provider_account_id || Math.random()}`;

    // service
    this.userService = new UserService();

    // Initialize account data
    useAccountStore.getState().setAccountData(_account);
  }

  private get accountStore() {
    return useAccountStore.getState();
  }

  get isLoading() {
    return this.accountStore.isLoading;
  }

  get error() {
    return this.accountStore.error;
  }

  get provider_account_id() {
    return this.accountStore.provider_account_id;
  }

  get provider() {
    return this.accountStore.provider;
  }
}
