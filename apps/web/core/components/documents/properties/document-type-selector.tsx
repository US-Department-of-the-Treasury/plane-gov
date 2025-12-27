"use client";

import { memo } from "react";
import { FileText, Bug, Milestone, CheckSquare, ChevronDown } from "lucide-react";
// plane imports
import { cn } from "@plane/utils";
// components
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@plane/propel/primitives";
// types
import type { TDocumentType } from "@plane/types";

type DocumentTypeConfig = {
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  description: string;
};

const DOCUMENT_TYPE_CONFIG: Record<TDocumentType, DocumentTypeConfig> = {
  page: {
    label: "Page",
    icon: FileText,
    color: "text-custom-text-300",
    description: "A standard document for documentation",
  },
  issue: {
    label: "Issue",
    icon: Bug,
    color: "text-orange-500",
    description: "A trackable work item with status and priority",
  },
  epic: {
    label: "Epic",
    icon: Milestone,
    color: "text-purple-500",
    description: "A large body of work that spans multiple issues",
  },
  task: {
    label: "Task",
    icon: CheckSquare,
    color: "text-blue-500",
    description: "A simple task or to-do item",
  },
};

interface DocumentTypeSelectorProps {
  value: TDocumentType;
  onChange: (type: TDocumentType) => void;
  disabled?: boolean;
  className?: string;
}

export const DocumentTypeSelector = memo(function DocumentTypeSelector({
  value,
  onChange,
  disabled = false,
  className,
}: DocumentTypeSelectorProps) {
  const config = DOCUMENT_TYPE_CONFIG[value];
  const Icon = config.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-custom-background-80 transition-colors",
            { "cursor-not-allowed opacity-60": disabled },
            className
          )}
        >
          <Icon className={cn("size-4", config.color)} />
          <span className="text-custom-text-200">{config.label}</span>
          {!disabled && <ChevronDown className="size-3 text-custom-text-400" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {(Object.keys(DOCUMENT_TYPE_CONFIG) as TDocumentType[]).map((type) => {
          const typeConfig = DOCUMENT_TYPE_CONFIG[type];
          const TypeIcon = typeConfig.icon;
          const isSelected = type === value;
          return (
            <DropdownMenuItem
              key={type}
              onClick={() => onChange(type)}
              className={cn("flex flex-col items-start gap-0.5 py-2", {
                "bg-custom-primary-100/10": isSelected,
              })}
            >
              <div className="flex items-center gap-2">
                <TypeIcon className={cn("size-4", typeConfig.color)} />
                <span className="font-medium">{typeConfig.label}</span>
              </div>
              <span className="text-xs text-custom-text-400 pl-6">{typeConfig.description}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
