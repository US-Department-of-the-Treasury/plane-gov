import { set as lodashSet } from "lodash-es";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
// types
import type {
  TContract,
  TContractFormData,
  TContractProjectAllocation,
  TContractProjectAllocationFormData,
  TContractFilters,
} from "@plane/types";
// services
import { ContractService } from "@/services/contract.service";

// Type definitions
type TContractIdMap = Record<string, string[]>; // workspaceSlug -> contractIds
type TContractMap = Record<string, TContract>; // contractId -> contract
type TAllocationIdMap = Record<string, string[]>; // contractId -> allocationIds
type TAllocationMap = Record<string, TContractProjectAllocation>; // allocationId -> allocation

// Zustand Store
interface ContractState {
  // Contracts
  contracts: TContractIdMap;
  contractMap: TContractMap;
  // Allocations
  allocations: TAllocationIdMap;
  allocationMap: TAllocationMap;
  // UI State
  contractData: TContract | undefined;
  isContractModalOpen: boolean;
  isAllocationModalOpen: boolean;
  filters: TContractFilters;
  isLoading: boolean;
}

interface ContractActions {
  // Contract CRUD
  addContracts: (workspaceSlug: string, contracts: TContract[]) => void;
  fetchContracts: (workspaceSlug: string, filters?: TContractFilters) => Promise<TContract[]>;
  fetchContract: (workspaceSlug: string, contractId: string) => Promise<TContract>;
  createContract: (workspaceSlug: string, data: TContractFormData) => Promise<TContract>;
  updateContract: (workspaceSlug: string, contractId: string, data: Partial<TContractFormData>) => Promise<TContract>;
  removeContract: (workspaceSlug: string, contractId: string) => Promise<void>;
  // Allocation CRUD
  addAllocations: (contractId: string, allocations: TContractProjectAllocation[]) => void;
  fetchAllocations: (workspaceSlug: string, contractId: string) => Promise<TContractProjectAllocation[]>;
  createAllocation: (
    workspaceSlug: string,
    contractId: string,
    data: TContractProjectAllocationFormData
  ) => Promise<TContractProjectAllocation>;
  updateAllocation: (
    workspaceSlug: string,
    contractId: string,
    allocationId: string,
    data: Partial<TContractProjectAllocationFormData>
  ) => Promise<TContractProjectAllocation>;
  removeAllocation: (workspaceSlug: string, contractId: string, allocationId: string) => Promise<void>;
  // UI Actions
  setContractData: (contract: TContract | undefined) => void;
  toggleContractModal: (isOpen: boolean) => void;
  toggleAllocationModal: (isOpen: boolean) => void;
  setFilters: (filters: TContractFilters) => void;
  setLoading: (isLoading: boolean) => void;
}

type ContractStoreType = ContractState & ContractActions;

const contractService = new ContractService();

export const useContractStore = create<ContractStoreType>()(
  immer((set, get) => ({
    // State
    contracts: {},
    contractMap: {},
    allocations: {},
    allocationMap: {},
    contractData: undefined,
    isContractModalOpen: false,
    isAllocationModalOpen: false,
    filters: {},
    isLoading: false,

    // UI Actions
    setContractData: (contract) => {
      set((state) => {
        state.contractData = contract;
      });
    },

    toggleContractModal: (isOpen) => {
      set((state) => {
        state.isContractModalOpen = isOpen;
      });
    },

    toggleAllocationModal: (isOpen) => {
      set((state) => {
        state.isAllocationModalOpen = isOpen;
      });
    },

    setFilters: (filters) => {
      set((state) => {
        state.filters = filters;
      });
    },

    setLoading: (isLoading) => {
      set((state) => {
        state.isLoading = isLoading;
      });
    },

    // Contract Actions
    addContracts: (workspaceSlug, contracts) => {
      set((state) => {
        state.contracts[workspaceSlug] = contracts.map((contract) => contract.id);
        contracts.forEach((contract) => {
          state.contractMap[contract.id] = contract;
        });
      });
    },

    fetchContracts: async (workspaceSlug, filters) => {
      get().setLoading(true);
      try {
        const response = await contractService.getContracts(workspaceSlug, filters);
        get().addContracts(workspaceSlug, response);
        return response;
      } finally {
        get().setLoading(false);
      }
    },

    fetchContract: async (workspaceSlug, contractId) => {
      const response = await contractService.getContract(workspaceSlug, contractId);
      set((state) => {
        state.contractMap[contractId] = response;
        // Add to workspace list if not present
        if (!state.contracts[workspaceSlug]?.includes(contractId)) {
          state.contracts[workspaceSlug] = [...(state.contracts[workspaceSlug] ?? []), contractId];
        }
      });
      return response;
    },

    createContract: async (workspaceSlug, data) => {
      const response = await contractService.createContract(workspaceSlug, data);
      set((state) => {
        state.contracts[workspaceSlug] = [response.id, ...(state.contracts[workspaceSlug] ?? [])];
        state.contractMap[response.id] = response;
      });
      return response;
    },

    updateContract: async (workspaceSlug, contractId, data) => {
      // Optimistic update
      set((state) => {
        Object.keys(data).forEach((key) => {
          if (state.contractMap[contractId]) {
            lodashSet(state.contractMap[contractId], key, data[key as keyof TContractFormData]);
          }
        });
      });

      const response = await contractService.updateContract(workspaceSlug, contractId, data);
      set((state) => {
        state.contractMap[contractId] = response;
      });
      return response;
    },

    removeContract: async (workspaceSlug, contractId) => {
      await contractService.deleteContract(workspaceSlug, contractId);
      set((state) => {
        const contractIndex = state.contracts[workspaceSlug]?.findIndex((id) => id === contractId);
        if (contractIndex !== undefined && contractIndex >= 0) {
          state.contracts[workspaceSlug].splice(contractIndex, 1);
          delete state.contractMap[contractId];
          // Also remove associated allocations
          delete state.allocations[contractId];
        }
      });
    },

    // Allocation Actions
    addAllocations: (contractId, allocations) => {
      set((state) => {
        state.allocations[contractId] = allocations.map((allocation) => allocation.id);
        allocations.forEach((allocation) => {
          state.allocationMap[allocation.id] = allocation;
        });
      });
    },

    fetchAllocations: async (workspaceSlug, contractId) => {
      const response = await contractService.getContractAllocations(workspaceSlug, contractId);
      get().addAllocations(contractId, response);
      return response;
    },

    createAllocation: async (workspaceSlug, contractId, data) => {
      const response = await contractService.createContractAllocation(workspaceSlug, contractId, data);
      set((state) => {
        state.allocations[contractId] = [response.id, ...(state.allocations[contractId] ?? [])];
        state.allocationMap[response.id] = response;
      });
      return response;
    },

    updateAllocation: async (workspaceSlug, contractId, allocationId, data) => {
      // Optimistic update
      set((state) => {
        Object.keys(data).forEach((key) => {
          if (state.allocationMap[allocationId]) {
            lodashSet(state.allocationMap[allocationId], key, data[key as keyof TContractProjectAllocationFormData]);
          }
        });
      });

      const response = await contractService.updateContractAllocation(workspaceSlug, contractId, allocationId, data);
      set((state) => {
        state.allocationMap[allocationId] = response;
      });
      return response;
    },

    removeAllocation: async (workspaceSlug, contractId, allocationId) => {
      await contractService.deleteContractAllocation(workspaceSlug, contractId, allocationId);
      set((state) => {
        const allocationIndex = state.allocations[contractId]?.findIndex((id) => id === allocationId);
        if (allocationIndex !== undefined && allocationIndex >= 0) {
          state.allocations[contractId].splice(allocationIndex, 1);
          delete state.allocationMap[allocationId];
        }
      });
    },
  }))
);

// Helper hooks for accessing store data
export const useContracts = (workspaceSlug: string) => {
  const store = useContractStore();
  const contractIds = store.contracts[workspaceSlug] ?? [];
  return contractIds.map((id) => store.contractMap[id]).filter(Boolean);
};

export const useContract = (contractId: string) => {
  return useContractStore((state) => state.contractMap[contractId]);
};

export const useContractAllocations = (contractId: string) => {
  const store = useContractStore();
  const allocationIds = store.allocations[contractId] ?? [];
  return allocationIds.map((id) => store.allocationMap[id]).filter(Boolean);
};
