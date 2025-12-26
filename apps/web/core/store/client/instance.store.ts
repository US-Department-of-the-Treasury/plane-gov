import { create } from "zustand";
import type { IInstance, IInstanceConfig } from "@plane/types";
import { InstanceService } from "@/services/instance.service";

type TError = {
  status: string;
  message: string;
  data?: {
    is_activated: boolean;
    is_setup_done: boolean;
  };
};

interface InstanceState {
  isLoading: boolean;
  instance: IInstance | undefined;
  config: IInstanceConfig | undefined;
  error: TError | undefined;
}

interface InstanceActions {
  fetchInstanceInfo: () => Promise<void>;
  _setLoading: (loading: boolean) => void;
  _setInstance: (instance: IInstance | undefined) => void;
  _setConfig: (config: IInstanceConfig | undefined) => void;
  _setError: (error: TError | undefined) => void;
}

export type InstanceStore = InstanceState & InstanceActions;

// Legacy interface for backward compatibility with MobX store
export interface IInstanceStore {
  isLoading: boolean;
  instance: IInstance | undefined;
  config: IInstanceConfig | undefined;
  error: TError | undefined;
  fetchInstanceInfo: () => Promise<void>;
}

const initialState: InstanceState = {
  isLoading: true,
  instance: undefined,
  config: undefined,
  error: undefined,
};

// Service instance
const instanceService = new InstanceService();

export const useInstanceStore = create<InstanceStore>()((set) => ({
  ...initialState,

  _setLoading: (loading) => set({ isLoading: loading }),
  _setInstance: (instance) => set({ instance }),
  _setConfig: (config) => set({ config }),
  _setError: (error) => set({ error }),

  fetchInstanceInfo: async () => {
    try {
      set({ isLoading: true, error: undefined });
      const instanceInfo = await instanceService.getInstanceInfo();
      set({
        isLoading: false,
        instance: instanceInfo.instance,
        config: instanceInfo.config,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: {
          status: "error",
          message: "Failed to fetch instance info",
        },
      });
      throw error;
    }
  },
}));

