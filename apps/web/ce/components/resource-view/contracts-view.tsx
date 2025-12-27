"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Plus, FileText, Pencil, Trash2 } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { Loader, CustomMenu } from "@plane/ui";
import { cn } from "@plane/utils";
import type { TContract, TContractStatus } from "@plane/types";
import { CONTRACT_TYPE_LABELS, CONTRACT_HIERARCHY_LABELS, CONTRACT_STATUS_LABELS } from "@plane/types";
// store
import { useContractStore, useContracts } from "@/store/workspace/contract.store";
// components
import { ContractModal } from "./contract-modal";

type ContractsViewProps = {
  className?: string;
};

// Status badge colors
const STATUS_COLORS: Record<TContractStatus, string> = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  expired: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};

// Format cents to currency display
function formatCurrency(cents: number, currency = "USD"): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

// Calculate utilization percentage
function calculateUtilization(expended: number, ceiling: number): number {
  if (ceiling === 0) return 0;
  return Math.round((expended / ceiling) * 100);
}

export function ContractsView({ className }: ContractsViewProps) {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const workspaceSlugStr = workspaceSlug || "";

  // Store hooks
  const { fetchContracts, removeContract, isLoading } = useContractStore();
  const contracts = useContracts(workspaceSlugStr);

  // Local state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<TContract | undefined>(undefined);
  const [deletingContractId, setDeletingContractId] = useState<string | null>(null);

  // Fetch contracts on mount
  useEffect(() => {
    if (workspaceSlugStr) {
      void fetchContracts(workspaceSlugStr);
    }
  }, [workspaceSlugStr, fetchContracts]);

  // Summary stats
  const summary = useMemo(() => {
    return contracts.reduce(
      (acc, contract) => ({
        totalCeiling: acc.totalCeiling + contract.ceiling_amount,
        totalObligated: acc.totalObligated + contract.obligated_amount,
        totalExpended: acc.totalExpended + contract.expended_amount,
        count: acc.count + 1,
      }),
      { totalCeiling: 0, totalObligated: 0, totalExpended: 0, count: 0 }
    );
  }, [contracts]);

  // Handlers
  const handleAddContract = () => {
    setEditingContract(undefined);
    setIsModalOpen(true);
  };

  const handleEditContract = (contract: TContract) => {
    setEditingContract(contract);
    setIsModalOpen(true);
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!workspaceSlugStr) return;
    setDeletingContractId(contractId);
    try {
      await removeContract(workspaceSlugStr, contractId);
    } finally {
      setDeletingContractId(null);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingContract(undefined);
  };

  if (isLoading && contracts.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <Loader className="flex flex-col gap-4 w-full max-w-4xl">
          <Loader.Item height="44px" width="100%" />
          <Loader.Item height="44px" width="100%" />
          <Loader.Item height="44px" width="100%" />
        </Loader>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      {/* Summary cards */}
      <div className="flex gap-4 px-page-x py-4 border-b border-subtle">
        <div className="flex flex-col rounded-lg border border-subtle bg-surface-1 px-4 py-3 min-w-[160px]">
          <span className="text-11 text-tertiary uppercase tracking-wider">Total Ceiling</span>
          <span className="text-lg font-semibold text-primary">{formatCurrency(summary.totalCeiling)}</span>
        </div>
        <div className="flex flex-col rounded-lg border border-subtle bg-surface-1 px-4 py-3 min-w-[160px]">
          <span className="text-11 text-tertiary uppercase tracking-wider">Obligated</span>
          <span className="text-lg font-semibold text-primary">{formatCurrency(summary.totalObligated)}</span>
        </div>
        <div className="flex flex-col rounded-lg border border-subtle bg-surface-1 px-4 py-3 min-w-[160px]">
          <span className="text-11 text-tertiary uppercase tracking-wider">Expended</span>
          <span className="text-lg font-semibold text-primary">{formatCurrency(summary.totalExpended)}</span>
        </div>
        <div className="flex flex-col rounded-lg border border-subtle bg-surface-1 px-4 py-3 min-w-[160px]">
          <span className="text-11 text-tertiary uppercase tracking-wider">Remaining</span>
          <span className="text-lg font-semibold text-green-600">
            {formatCurrency(summary.totalCeiling - summary.totalExpended)}
          </span>
        </div>
        <div className="ml-auto flex items-center">
          <Button variant="primary" size="lg" onClick={handleAddContract}>
            <Plus className="h-4 w-4" />
            <span>Add Contract</span>
          </Button>
        </div>
      </div>

      {/* Contracts table */}
      {contracts.length === 0 ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2">
          <FileText className="h-12 w-12 text-custom-text-400" />
          <p className="text-custom-text-300 text-sm">No contracts found</p>
          <p className="text-custom-text-400 text-xs">Add your first contract to start tracking</p>
          <Button variant="primary" size="sm" onClick={handleAddContract} className="mt-2">
            <Plus className="h-4 w-4" />
            Add Contract
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="sticky top-0 z-10 bg-surface-1 border-b border-subtle">
              <tr>
                <th className="px-4 py-3 text-left text-11 font-medium text-tertiary uppercase tracking-wider">
                  Contract
                </th>
                <th className="px-4 py-3 text-left text-11 font-medium text-tertiary uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-11 font-medium text-tertiary uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-4 py-3 text-right text-11 font-medium text-tertiary uppercase tracking-wider">
                  Ceiling
                </th>
                <th className="px-4 py-3 text-right text-11 font-medium text-tertiary uppercase tracking-wider">
                  Expended
                </th>
                <th className="px-4 py-3 text-center text-11 font-medium text-tertiary uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-4 py-3 text-left text-11 font-medium text-tertiary uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-11 font-medium text-tertiary uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const utilization = calculateUtilization(contract.expended_amount, contract.ceiling_amount);
                const isDeleting = deletingContractId === contract.id;

                return (
                  <tr
                    key={contract.id}
                    className={cn(
                      "border-b border-subtle hover:bg-layer-transparent-hover transition-colors",
                      isDeleting && "opacity-50"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-13 font-medium text-primary">{contract.name}</span>
                        {contract.contract_number && (
                          <span className="text-11 text-tertiary">{contract.contract_number}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-13 text-secondary">{CONTRACT_TYPE_LABELS[contract.contract_type]}</span>
                        <span className="text-11 text-placeholder">
                          {CONTRACT_HIERARCHY_LABELS[contract.hierarchy_type]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-13 text-secondary">{contract.vendor_name || "-"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-13 font-medium text-primary">
                        {formatCurrency(contract.ceiling_amount, contract.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-13 text-secondary">
                        {formatCurrency(contract.expended_amount, contract.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-custom-background-90 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", {
                              "bg-green-500": utilization < 70,
                              "bg-amber-500": utilization >= 70 && utilization < 90,
                              "bg-red-500": utilization >= 90,
                            })}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-11 text-tertiary w-8">{utilization}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 text-11 font-medium rounded border",
                          STATUS_COLORS[contract.status]
                        )}
                      >
                        {CONTRACT_STATUS_LABELS[contract.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-13 text-secondary">
                        {contract.end_date ? format(new Date(contract.end_date), "MMM d, yyyy") : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <CustomMenu placement="bottom-end" ellipsis closeOnSelect disabled={isDeleting}>
                        <CustomMenu.MenuItem onClick={() => handleEditContract(contract)}>
                          <div className="flex items-center gap-2">
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </div>
                        </CustomMenu.MenuItem>
                        <CustomMenu.MenuItem
                          onClick={() => void handleDeleteContract(contract.id)}
                          className="text-red-500"
                        >
                          <div className="flex items-center gap-2">
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </div>
                        </CustomMenu.MenuItem>
                      </CustomMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Contract Modal */}
      <ContractModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        contract={editingContract}
        workspaceSlug={workspaceSlugStr}
      />
    </div>
  );
}
