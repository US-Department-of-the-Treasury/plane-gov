"use client";

import { memo, useState, useCallback } from "react";
import { Check } from "lucide-react";
// plane imports
import { cn } from "@plane/utils";
// components
import { Input } from "@plane/ui";
import { DateDropdown } from "@/components/dropdowns/date";
// types
import type { TPropertyDefinition } from "@plane/types";

interface PropertyValueEditorProps {
  definition: TPropertyDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

// Text input editor
const TextEditor = memo(function TextEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = useCallback(() => {
    if (localValue !== value) {
      onChange(localValue);
    }
  }, [localValue, value, onChange]);

  return (
    <Input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      className="h-7.5 text-sm"
      placeholder="Enter value..."
    />
  );
});

// Number input editor
const NumberEditor = memo(function NumberEditor({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value?.toString() ?? "");

  const handleBlur = useCallback(() => {
    const numValue = localValue === "" ? null : parseFloat(localValue);
    if (numValue !== value) {
      onChange(numValue);
    }
  }, [localValue, value, onChange]);

  return (
    <Input
      type="number"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      className="h-7.5 text-sm"
      placeholder="Enter number..."
    />
  );
});

// Checkbox editor
const CheckboxEditor = memo(function CheckboxEditor({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={cn(
        "size-5 rounded border flex items-center justify-center transition-colors",
        value
          ? "bg-custom-primary-100 border-custom-primary-100"
          : "bg-custom-background-100 border-custom-border-200 hover:border-custom-border-400",
        { "cursor-not-allowed opacity-60": disabled }
      )}
    >
      {value && <Check className="size-3 text-white" />}
    </button>
  );
});

// Select editor (single)
const SelectEditor = memo(function SelectEditor({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string | null;
  options: { id: string; value: string; color?: string }[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => {
        const isSelected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(isSelected ? null : option.id)}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded-md text-xs font-medium transition-colors",
              isSelected
                ? "bg-custom-primary-100/20 text-custom-primary-100"
                : "bg-custom-background-80 text-custom-text-200 hover:bg-custom-background-90",
              { "cursor-not-allowed opacity-60": disabled }
            )}
            style={option.color && isSelected ? { backgroundColor: `${option.color}20`, color: option.color } : {}}
          >
            {option.value}
          </button>
        );
      })}
    </div>
  );
});

// Multi-select editor
const MultiSelectEditor = memo(function MultiSelectEditor({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string[];
  options: { id: string; value: string; color?: string }[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const toggleOption = useCallback(
    (optionId: string) => {
      const newValue = value.includes(optionId) ? value.filter((id) => id !== optionId) : [...value, optionId];
      onChange(newValue);
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => {
        const isSelected = value.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggleOption(option.id)}
            disabled={disabled}
            className={cn(
              "px-2 py-1 rounded-md text-xs font-medium transition-colors",
              isSelected
                ? "bg-custom-primary-100/20 text-custom-primary-100"
                : "bg-custom-background-80 text-custom-text-200 hover:bg-custom-background-90",
              { "cursor-not-allowed opacity-60": disabled }
            )}
            style={option.color && isSelected ? { backgroundColor: `${option.color}20`, color: option.color } : {}}
          >
            {option.value}
          </button>
        );
      })}
    </div>
  );
});

// Date editor
const DateEditor = memo(function DateEditor({
  value,
  onChange,
  disabled,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  // Convert string value to Date for the dropdown
  const dateValue = value ? new Date(value) : null;

  // Convert Date back to ISO string for storage
  const handleDateChange = useCallback(
    (date: Date | null) => {
      onChange(date ? date.toISOString() : null);
    },
    [onChange]
  );

  return (
    <DateDropdown
      value={dateValue}
      onChange={handleDateChange}
      disabled={disabled}
      buttonVariant="transparent-with-text"
      className="w-full"
      buttonContainerClassName="w-full text-left h-7.5"
      buttonClassName={cn("text-body-xs-regular", { "text-placeholder": !value })}
      placeholder="Select date..."
      hideIcon
    />
  );
});

// URL editor
const UrlEditor = memo(function UrlEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = useCallback(() => {
    if (localValue !== value) {
      onChange(localValue);
    }
  }, [localValue, value, onChange]);

  return (
    <Input
      type="url"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      className="h-7.5 text-sm"
      placeholder="Enter URL..."
    />
  );
});

// Email editor
const EmailEditor = memo(function EmailEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = useCallback(() => {
    if (localValue !== value) {
      onChange(localValue);
    }
  }, [localValue, value, onChange]);

  return (
    <Input
      type="email"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      className="h-7.5 text-sm"
      placeholder="Enter email..."
    />
  );
});

// Phone editor
const PhoneEditor = memo(function PhoneEditor({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);

  const handleBlur = useCallback(() => {
    if (localValue !== value) {
      onChange(localValue);
    }
  }, [localValue, value, onChange]);

  return (
    <Input
      type="tel"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      disabled={disabled}
      className="h-7.5 text-sm"
      placeholder="Enter phone..."
    />
  );
});

// Main property value editor
export const PropertyValueEditor = memo(function PropertyValueEditor({
  definition,
  value,
  onChange,
  disabled = false,
}: PropertyValueEditorProps) {
  const propertyType = definition.property_type;

  switch (propertyType) {
    case "text":
      return <TextEditor value={(value as string) ?? ""} onChange={onChange} disabled={disabled} />;

    case "number":
      return <NumberEditor value={(value as number) ?? null} onChange={onChange} disabled={disabled} />;

    case "checkbox":
      return <CheckboxEditor value={(value as boolean) ?? false} onChange={onChange} disabled={disabled} />;

    case "select":
      return (
        <SelectEditor
          value={(value as string) ?? null}
          options={definition.options ?? []}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "multi_select":
      return (
        <MultiSelectEditor
          value={(value as string[]) ?? []}
          options={definition.options ?? []}
          onChange={onChange}
          disabled={disabled}
        />
      );

    case "date":
    case "datetime":
      return <DateEditor value={(value as string) ?? null} onChange={onChange} disabled={disabled} />;

    case "url":
      return <UrlEditor value={(value as string) ?? ""} onChange={onChange} disabled={disabled} />;

    case "email":
      return <EmailEditor value={(value as string) ?? ""} onChange={onChange} disabled={disabled} />;

    case "phone":
      return <PhoneEditor value={(value as string) ?? ""} onChange={onChange} disabled={disabled} />;

    case "relation":
    case "user":
    case "multi_user":
      // These need special handling with lookups - placeholder for now
      return <div className="text-xs text-custom-text-400 italic">{propertyType} editor coming soon</div>;

    default:
      return <div className="text-xs text-custom-text-400">Unsupported property type</div>;
  }
});
