import { API_BASE_URL } from "@plane/constants";
import type {
  TContract,
  TContractFormData,
  TContractProjectAllocation,
  TContractProjectAllocationFormData,
  TContractFilters,
} from "@plane/types";
import { APIService } from "@/services/api.service";

/**
 * ContractService for government contract management.
 *
 * Handles CRUD operations for contracts and contract-project allocations.
 * All monetary amounts are in cents (integer values).
 */
export class ContractService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  /**
   * Get all contracts for a workspace.
   */
  async getContracts(workspaceSlug: string, filters?: TContractFilters): Promise<TContract[]> {
    return this.get(`/api/v1/workspaces/${workspaceSlug}/contracts/`, {
      params: filters,
    })
      .then(
        (response: { data?: { results?: TContract[] } & TContract[] }) =>
          (response?.data?.results || response?.data) as TContract[]
      )
      .catch((error: { response?: { data?: unknown } }) => {
        throw error?.response?.data;
      });
  }

  /**
   * Get a single contract by ID.
   */
  async getContract(workspaceSlug: string, contractId: string): Promise<TContract> {
    return this.get(`/api/v1/workspaces/${workspaceSlug}/contracts/${contractId}/`)
      .then((response: { data?: TContract }) => response?.data as TContract)
      .catch((error: { response?: { data?: unknown } }) => {
        throw error?.response?.data;
      });
  }

  /**
   * Create a new contract.
   */
  async createContract(workspaceSlug: string, data: TContractFormData): Promise<TContract> {
    return this.post(`/api/v1/workspaces/${workspaceSlug}/contracts/`, data)
      .then((response: { data?: TContract }) => response?.data as TContract)
      .catch((error: { response?: { data?: unknown } }) => {
        throw error?.response?.data;
      });
  }

  /**
   * Update an existing contract.
   */
  async updateContract(
    workspaceSlug: string,
    contractId: string,
    data: Partial<TContractFormData>
  ): Promise<TContract> {
    return this.patch(`/api/v1/workspaces/${workspaceSlug}/contracts/${contractId}/`, data)
      .then((response: { data?: TContract }) => response?.data as TContract)
      .catch((error: { response?: { data?: unknown } }) => {
        throw error?.response?.data;
      });
  }

  /**
   * Delete a contract.
   */
  async deleteContract(workspaceSlug: string, contractId: string): Promise<void> {
    return this.delete(`/api/v1/workspaces/${workspaceSlug}/contracts/${contractId}/`)
      .then((response: { data?: void }) => response?.data)
      .catch((error: { response?: { data?: unknown } }) => {
        throw error?.response?.data;
      });
  }

  // Contract Project Allocations

  /**
   * Get all allocations for a contract.
   */
  async getContractAllocations(workspaceSlug: string, contractId: string): Promise<TContractProjectAllocation[]> {
    return this.get(`/api/v1/workspaces/${workspaceSlug}/contracts/${contractId}/allocations/`)
      .then(
        (response: { data?: { results?: TContractProjectAllocation[] } & TContractProjectAllocation[] }) =>
          (response?.data?.results || response?.data) as TContractProjectAllocation[]
      )
      .catch((error: { response?: { data?: unknown } }) => {
        throw error?.response?.data;
      });
  }

  /**
   * Get a single allocation by ID.
   */
  async getContractAllocation(
    workspaceSlug: string,
    contractId: string,
    allocationId: string
  ): Promise<TContractProjectAllocation> {
    return this.get(`/api/v1/workspaces/${workspaceSlug}/contracts/${contractId}/allocations/${allocationId}/`)
      .then((response: { data?: TContractProjectAllocation }) => response?.data as TContractProjectAllocation)
      .catch((error: { response?: { data?: unknown } }) => {
        throw error?.response?.data;
      });
  }

  /**
   * Create a new contract-project allocation.
   */
  async createContractAllocation(
    workspaceSlug: string,
    contractId: string,
    data: TContractProjectAllocationFormData
  ): Promise<TContractProjectAllocation> {
    return this.post(`/api/v1/workspaces/${workspaceSlug}/contracts/${contractId}/allocations/`, data)
      .then((response: { data?: TContractProjectAllocation }) => response?.data as TContractProjectAllocation)
      .catch((error: { response?: { data?: unknown } }) => {
        throw error?.response?.data;
      });
  }

  /**
   * Update an existing allocation.
   */
  async updateContractAllocation(
    workspaceSlug: string,
    contractId: string,
    allocationId: string,
    data: Partial<TContractProjectAllocationFormData>
  ): Promise<TContractProjectAllocation> {
    return this.patch(`/api/v1/workspaces/${workspaceSlug}/contracts/${contractId}/allocations/${allocationId}/`, data)
      .then((response: { data?: TContractProjectAllocation }) => response?.data as TContractProjectAllocation)
      .catch((error: { response?: { data?: unknown } }) => {
        throw error?.response?.data;
      });
  }

  /**
   * Delete an allocation.
   */
  async deleteContractAllocation(workspaceSlug: string, contractId: string, allocationId: string): Promise<void> {
    return this.delete(`/api/v1/workspaces/${workspaceSlug}/contracts/${contractId}/allocations/${allocationId}/`)
      .then((response: { data?: void }) => response?.data)
      .catch((error: { response?: { data?: unknown } }) => {
        throw error?.response?.data;
      });
  }
}
