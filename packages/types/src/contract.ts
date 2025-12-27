// Contract Types for Government Resource Management

// Contract type choices matching Django model
export type TContractType =
  | "idiq" // Indefinite Delivery/Indefinite Quantity
  | "bpa" // Blanket Purchase Agreement
  | "ffp" // Firm Fixed Price
  | "tm" // Time & Materials
  | "cpff" // Cost Plus Fixed Fee
  | "task_order" // Task Order (under IDIQ)
  | "call_order"; // Call Order (under BPA)

// Contract hierarchy choices
export type TContractHierarchyType =
  | "master" // Master Contract (IDIQ or BPA umbrella)
  | "task_order" // Work order under IDIQ
  | "call_order" // Order under BPA
  | "standalone"; // FFP, T&M, CPFF not under umbrella

// Contract status choices
export type TContractStatus = "active" | "completed" | "expired" | "cancelled";

// Main Contract type
export type TContract = {
  id: string;
  workspace: string;
  name: string;
  contract_number: string;
  description: string;
  contract_type: TContractType;
  hierarchy_type: TContractHierarchyType;
  parent_contract: string | null;
  vendor_name: string;
  vendor_contact: string;
  // All amounts stored in cents (integer)
  ceiling_amount: number;
  obligated_amount: number;
  expended_amount: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  pop_start: string | null;
  pop_end: string | null;
  status: TContractStatus;
  metadata: Record<string, unknown>;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Computed fields from serializer
  remaining_amount?: number;
  available_amount?: number;
  utilization_percentage?: number;
  child_contracts_count?: number;
  project_allocations_count?: number;
};

// Lite version for lists and references
export type TContractLite = Pick<
  TContract,
  | "id"
  | "name"
  | "contract_number"
  | "contract_type"
  | "hierarchy_type"
  | "status"
  | "ceiling_amount"
  | "obligated_amount"
  | "expended_amount"
  | "start_date"
  | "end_date"
>;

// Form data for creating/updating contracts
export type TContractFormData = {
  name: string;
  contract_number?: string;
  description?: string;
  contract_type?: TContractType;
  hierarchy_type?: TContractHierarchyType;
  parent_contract?: string | null;
  vendor_name?: string;
  vendor_contact?: string;
  ceiling_amount?: number;
  obligated_amount?: number;
  expended_amount?: number;
  currency?: string;
  start_date?: string | null;
  end_date?: string | null;
  pop_start?: string | null;
  pop_end?: string | null;
  status?: TContractStatus;
  metadata?: Record<string, unknown>;
};

// Contract-Project Allocation types
export type TContractProjectAllocation = {
  id: string;
  contract: string;
  project: string;
  allocated_amount: number;
  actual_spend: number;
  fiscal_year: string;
  description: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Computed fields
  remaining_allocation?: number;
  // Expanded fields
  contract_detail?: TContractLite;
};

// Form data for creating/updating allocations
export type TContractProjectAllocationFormData = {
  project: string;
  allocated_amount: number;
  actual_spend?: number;
  fiscal_year?: string;
  description?: string;
};

// Filter options for contract list
export type TContractFilters = {
  status?: TContractStatus;
  contract_type?: TContractType;
  hierarchy_type?: TContractHierarchyType;
  parent_contract?: string;
};

// Summary stats for dashboard
export type TContractSummary = {
  total_contracts: number;
  total_ceiling: number;
  total_obligated: number;
  total_expended: number;
  by_status: Record<TContractStatus, number>;
  by_type: Record<TContractType, number>;
};

// Display labels for contract types
export const CONTRACT_TYPE_LABELS: Record<TContractType, string> = {
  idiq: "IDIQ",
  bpa: "BPA",
  ffp: "Firm Fixed Price",
  tm: "Time & Materials",
  cpff: "Cost Plus Fixed Fee",
  task_order: "Task Order",
  call_order: "Call Order",
};

// Display labels for hierarchy types
export const CONTRACT_HIERARCHY_LABELS: Record<TContractHierarchyType, string> = {
  master: "Master Contract",
  task_order: "Task Order",
  call_order: "Call Order",
  standalone: "Standalone",
};

// Display labels for status
export const CONTRACT_STATUS_LABELS: Record<TContractStatus, string> = {
  active: "Active",
  completed: "Completed",
  expired: "Expired",
  cancelled: "Cancelled",
};
