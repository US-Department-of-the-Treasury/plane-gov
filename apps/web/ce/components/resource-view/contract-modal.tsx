"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
// plane imports
import { Button } from "@plane/propel/button";
import { EModalWidth, Input, ModalCore, CustomSelect, TextArea } from "@plane/ui";
import type {
  TContract,
  TContractFormData,
  TContractType,
  TContractHierarchyType,
  TContractStatus,
} from "@plane/types";
import { CONTRACT_TYPE_LABELS, CONTRACT_HIERARCHY_LABELS, CONTRACT_STATUS_LABELS } from "@plane/types";
// store
import { useContractStore } from "@/store/workspace/contract.store";

type ContractModalProps = {
  isOpen: boolean;
  onClose: () => void;
  contract?: TContract;
  workspaceSlug: string;
};

const CONTRACT_TYPE_OPTIONS = Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => ({
  value: value as TContractType,
  label,
}));

const HIERARCHY_TYPE_OPTIONS = Object.entries(CONTRACT_HIERARCHY_LABELS).map(([value, label]) => ({
  value: value as TContractHierarchyType,
  label,
}));

const STATUS_OPTIONS = Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => ({
  value: value as TContractStatus,
  label,
}));

const defaultValues: TContractFormData = {
  name: "",
  contract_number: "",
  description: "",
  contract_type: "ffp",
  hierarchy_type: "standalone",
  vendor_name: "",
  vendor_contact: "",
  ceiling_amount: 0,
  obligated_amount: 0,
  expended_amount: 0,
  currency: "USD",
  start_date: null,
  end_date: null,
  pop_start: null,
  pop_end: null,
  status: "active",
};

// Convert cents to dollars for display
function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Convert dollars to cents for storage
function dollarsToCents(dollars: string): number {
  const parsed = parseFloat(dollars);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function ContractModal({ isOpen, onClose, contract, workspaceSlug }: ContractModalProps) {
  const { createContract, updateContract } = useContractStore();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TContractFormData>({
    defaultValues,
  });

  // Reset form when modal opens/closes or contract changes
  useEffect(() => {
    if (isOpen) {
      if (contract) {
        reset({
          name: contract.name,
          contract_number: contract.contract_number,
          description: contract.description,
          contract_type: contract.contract_type,
          hierarchy_type: contract.hierarchy_type,
          vendor_name: contract.vendor_name,
          vendor_contact: contract.vendor_contact,
          ceiling_amount: contract.ceiling_amount,
          obligated_amount: contract.obligated_amount,
          expended_amount: contract.expended_amount,
          currency: contract.currency,
          start_date: contract.start_date,
          end_date: contract.end_date,
          pop_start: contract.pop_start,
          pop_end: contract.pop_end,
          status: contract.status,
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [isOpen, contract, reset]);

  const handleFormSubmit = async (data: TContractFormData) => {
    try {
      if (contract) {
        await updateContract(workspaceSlug, contract.id, data);
      } else {
        await createContract(workspaceSlug, data);
      }
      onClose();
    } catch (error) {
      console.error("Error saving contract:", error);
    }
  };

  const isEditing = !!contract;

  return (
    <ModalCore isOpen={isOpen} handleClose={onClose} width={EModalWidth.XXL}>
      <form onSubmit={(e) => void handleSubmit(handleFormSubmit)(e)}>
        <div className="space-y-5 p-5">
          <h3 className="text-18 font-medium text-secondary">{isEditing ? "Edit Contract" : "Add Contract"}</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Contract Name */}
            <div className="col-span-2">
              <label htmlFor="contract-name" className="mb-1.5 block text-13 font-medium text-secondary">
                Contract Name <span className="text-red-500">*</span>
              </label>
              <Controller
                control={control}
                name="name"
                rules={{ required: "Contract name is required" }}
                render={({ field: { value, onChange, ref } }) => (
                  <Input
                    id="contract-name"
                    type="text"
                    value={value}
                    onChange={onChange}
                    ref={ref}
                    hasError={!!errors.name}
                    placeholder="Enter contract name"
                    className="w-full"
                  />
                )}
              />
              {errors.name && <span className="text-11 text-red-500">{errors.name.message}</span>}
            </div>

            {/* Contract Number */}
            <div>
              <label htmlFor="contract-number" className="mb-1.5 block text-13 font-medium text-secondary">
                Contract Number
              </label>
              <Controller
                control={control}
                name="contract_number"
                render={({ field: { value, onChange, ref } }) => (
                  <Input
                    id="contract-number"
                    type="text"
                    value={value || ""}
                    onChange={onChange}
                    ref={ref}
                    placeholder="e.g., GS-35F-0001X"
                    className="w-full"
                  />
                )}
              />
            </div>

            {/* Contract Type */}
            <div>
              <span className="mb-1.5 block text-13 font-medium text-secondary">Contract Type</span>
              <Controller
                control={control}
                name="contract_type"
                render={({ field: { value, onChange } }) => (
                  <CustomSelect
                    value={value}
                    onChange={onChange}
                    label={CONTRACT_TYPE_LABELS[value || "ffp"]}
                    buttonClassName="w-full border border-subtle bg-surface-1 rounded-md px-3 py-2 text-13"
                  >
                    {CONTRACT_TYPE_OPTIONS.map((option) => (
                      <CustomSelect.Option key={option.value} value={option.value}>
                        {option.label}
                      </CustomSelect.Option>
                    ))}
                  </CustomSelect>
                )}
              />
            </div>

            {/* Hierarchy Type */}
            <div>
              <span className="mb-1.5 block text-13 font-medium text-secondary">Hierarchy Type</span>
              <Controller
                control={control}
                name="hierarchy_type"
                render={({ field: { value, onChange } }) => (
                  <CustomSelect
                    value={value}
                    onChange={onChange}
                    label={CONTRACT_HIERARCHY_LABELS[value || "standalone"]}
                    buttonClassName="w-full border border-subtle bg-surface-1 rounded-md px-3 py-2 text-13"
                  >
                    {HIERARCHY_TYPE_OPTIONS.map((option) => (
                      <CustomSelect.Option key={option.value} value={option.value}>
                        {option.label}
                      </CustomSelect.Option>
                    ))}
                  </CustomSelect>
                )}
              />
            </div>

            {/* Status */}
            <div>
              <span className="mb-1.5 block text-13 font-medium text-secondary">Status</span>
              <Controller
                control={control}
                name="status"
                render={({ field: { value, onChange } }) => (
                  <CustomSelect
                    value={value}
                    onChange={onChange}
                    label={CONTRACT_STATUS_LABELS[value || "active"]}
                    buttonClassName="w-full border border-subtle bg-surface-1 rounded-md px-3 py-2 text-13"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <CustomSelect.Option key={option.value} value={option.value}>
                        {option.label}
                      </CustomSelect.Option>
                    ))}
                  </CustomSelect>
                )}
              />
            </div>

            {/* Vendor Name */}
            <div>
              <label htmlFor="vendor-name" className="mb-1.5 block text-13 font-medium text-secondary">
                Vendor Name
              </label>
              <Controller
                control={control}
                name="vendor_name"
                render={({ field: { value, onChange, ref } }) => (
                  <Input
                    id="vendor-name"
                    type="text"
                    value={value || ""}
                    onChange={onChange}
                    ref={ref}
                    placeholder="Vendor name"
                    className="w-full"
                  />
                )}
              />
            </div>

            {/* Vendor Contact */}
            <div>
              <label htmlFor="vendor-contact" className="mb-1.5 block text-13 font-medium text-secondary">
                Vendor Contact
              </label>
              <Controller
                control={control}
                name="vendor_contact"
                render={({ field: { value, onChange, ref } }) => (
                  <Input
                    id="vendor-contact"
                    type="text"
                    value={value || ""}
                    onChange={onChange}
                    ref={ref}
                    placeholder="Contact email or phone"
                    className="w-full"
                  />
                )}
              />
            </div>

            {/* Financial Fields */}
            <div className="col-span-2 border-t border-subtle pt-4 mt-2">
              <h4 className="text-14 font-medium text-secondary mb-3">Financial Information</h4>
              <div className="grid grid-cols-3 gap-4">
                {/* Ceiling Amount */}
                <div>
                  <label htmlFor="ceiling-amount" className="mb-1.5 block text-13 font-medium text-secondary">
                    Ceiling Amount ($)
                  </label>
                  <Controller
                    control={control}
                    name="ceiling_amount"
                    render={({ field: { value, onChange, ref } }) => (
                      <Input
                        id="ceiling-amount"
                        type="number"
                        value={centsToDollars(value || 0)}
                        onChange={(e) => onChange(dollarsToCents(e.target.value))}
                        ref={ref}
                        placeholder="0.00"
                        className="w-full"
                        step="0.01"
                        min="0"
                      />
                    )}
                  />
                </div>

                {/* Obligated Amount */}
                <div>
                  <label htmlFor="obligated-amount" className="mb-1.5 block text-13 font-medium text-secondary">
                    Obligated Amount ($)
                  </label>
                  <Controller
                    control={control}
                    name="obligated_amount"
                    render={({ field: { value, onChange, ref } }) => (
                      <Input
                        id="obligated-amount"
                        type="number"
                        value={centsToDollars(value || 0)}
                        onChange={(e) => onChange(dollarsToCents(e.target.value))}
                        ref={ref}
                        placeholder="0.00"
                        className="w-full"
                        step="0.01"
                        min="0"
                      />
                    )}
                  />
                </div>

                {/* Expended Amount */}
                <div>
                  <label htmlFor="expended-amount" className="mb-1.5 block text-13 font-medium text-secondary">
                    Expended Amount ($)
                  </label>
                  <Controller
                    control={control}
                    name="expended_amount"
                    render={({ field: { value, onChange, ref } }) => (
                      <Input
                        id="expended-amount"
                        type="number"
                        value={centsToDollars(value || 0)}
                        onChange={(e) => onChange(dollarsToCents(e.target.value))}
                        ref={ref}
                        placeholder="0.00"
                        className="w-full"
                        step="0.01"
                        min="0"
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Date Fields */}
            <div className="col-span-2 border-t border-subtle pt-4 mt-2">
              <h4 className="text-14 font-medium text-secondary mb-3">Contract Dates</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label htmlFor="start-date" className="mb-1.5 block text-13 font-medium text-secondary">
                    Start Date
                  </label>
                  <Controller
                    control={control}
                    name="start_date"
                    render={({ field: { value, onChange, ref } }) => (
                      <Input
                        id="start-date"
                        type="date"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value || null)}
                        ref={ref}
                        className="w-full"
                      />
                    )}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label htmlFor="end-date" className="mb-1.5 block text-13 font-medium text-secondary">
                    End Date
                  </label>
                  <Controller
                    control={control}
                    name="end_date"
                    render={({ field: { value, onChange, ref } }) => (
                      <Input
                        id="end-date"
                        type="date"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value || null)}
                        ref={ref}
                        className="w-full"
                      />
                    )}
                  />
                </div>

                {/* POP Start */}
                <div>
                  <label htmlFor="pop-start" className="mb-1.5 block text-13 font-medium text-secondary">
                    Period of Performance Start
                  </label>
                  <Controller
                    control={control}
                    name="pop_start"
                    render={({ field: { value, onChange, ref } }) => (
                      <Input
                        id="pop-start"
                        type="date"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value || null)}
                        ref={ref}
                        className="w-full"
                      />
                    )}
                  />
                </div>

                {/* POP End */}
                <div>
                  <label htmlFor="pop-end" className="mb-1.5 block text-13 font-medium text-secondary">
                    Period of Performance End
                  </label>
                  <Controller
                    control={control}
                    name="pop_end"
                    render={({ field: { value, onChange, ref } }) => (
                      <Input
                        id="pop-end"
                        type="date"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value || null)}
                        ref={ref}
                        className="w-full"
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label htmlFor="description" className="mb-1.5 block text-13 font-medium text-secondary">
                Description
              </label>
              <Controller
                control={control}
                name="description"
                render={({ field: { value, onChange, ref } }) => (
                  <TextArea
                    id="description"
                    value={value || ""}
                    onChange={onChange}
                    ref={ref}
                    placeholder="Contract description..."
                    className="w-full min-h-[80px]"
                    rows={3}
                  />
                )}
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 flex items-center justify-end gap-2 border-t border-subtle">
          <Button variant="secondary" size="lg" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" type="submit" loading={isSubmitting}>
            {isEditing
              ? isSubmitting
                ? "Saving..."
                : "Save Changes"
              : isSubmitting
                ? "Creating..."
                : "Create Contract"}
          </Button>
        </div>
      </form>
    </ModalCore>
  );
}
