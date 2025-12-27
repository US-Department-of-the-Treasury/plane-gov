"use client";

import { memo } from "react";
import { FileText, FolderOpen, Search, Archive, Lock, Users } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { cn } from "@plane/utils";

type EmptyStateType =
  | "no-documents"
  | "no-collections"
  | "no-search-results"
  | "no-archived-documents"
  | "no-shared-documents"
  | "no-private-documents"
  | "access-denied";

interface DocumentEmptyStateProps {
  type: EmptyStateType;
  searchQuery?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

const emptyStateConfig: Record<
  EmptyStateType,
  {
    icon: typeof FileText;
    title: string;
    description: string;
    defaultActionLabel?: string;
  }
> = {
  "no-documents": {
    icon: FileText,
    title: "No documents yet",
    description: "Create your first document to start documenting and sharing knowledge with your team.",
    defaultActionLabel: "Create your first document",
  },
  "no-collections": {
    icon: FolderOpen,
    title: "No collections yet",
    description: "Organize your documents into collections for better navigation and discoverability.",
    defaultActionLabel: "Create a collection",
  },
  "no-search-results": {
    icon: Search,
    title: "No results found",
    description: "We couldn't find any documents matching your search. Try a different query or create a new document.",
  },
  "no-archived-documents": {
    icon: Archive,
    title: "No archived documents",
    description:
      "Archived documents will appear here. Archive documents you no longer need to keep your workspace organized.",
  },
  "no-shared-documents": {
    icon: Users,
    title: "No shared documents",
    description: "Documents shared with you by your teammates will appear here.",
  },
  "no-private-documents": {
    icon: Lock,
    title: "No private documents",
    description: "Your private documents that only you can see will appear here.",
    defaultActionLabel: "Create a private document",
  },
  "access-denied": {
    icon: Lock,
    title: "Access denied",
    description: "You don't have permission to view this document. Request access from the document owner.",
  },
};

export const DocumentEmptyState = memo(function DocumentEmptyState({
  type,
  searchQuery,
  onAction,
  actionLabel,
  className,
}: DocumentEmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      <div className="w-16 h-16 rounded-full bg-custom-background-80 flex items-center justify-center mb-4">
        <Icon className="size-8 text-custom-text-400" />
      </div>

      <h3 className="text-lg font-medium mb-2">{config.title}</h3>

      <p className="text-sm text-custom-text-400 max-w-md mb-6">
        {type === "no-search-results" && searchQuery
          ? `We couldn't find any documents matching "${searchQuery}". Try a different query or create a new document.`
          : config.description}
      </p>

      {onAction && (actionLabel || config.defaultActionLabel) && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel || config.defaultActionLabel}
        </Button>
      )}
    </div>
  );
});

/**
 * Loading skeleton for document list
 */
export const DocumentListSkeleton = memo(function DocumentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3 rounded-md animate-pulse">
          <div className="w-10 h-10 bg-custom-background-80 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-custom-background-80 rounded w-3/4" />
            <div className="h-3 bg-custom-background-80 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
});

/**
 * Loading skeleton for document editor
 */
export const DocumentEditorSkeleton = memo(function DocumentEditorSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-custom-border-200">
        <div className="h-6 bg-custom-background-80 rounded w-20" />
        <div className="flex items-center gap-2">
          <div className="h-8 bg-custom-background-80 rounded w-24" />
          <div className="h-8 bg-custom-background-80 rounded w-20" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Title skeleton */}
          <div className="h-10 bg-custom-background-80 rounded w-2/3 mb-8" />

          {/* Content lines skeleton */}
          <div className="space-y-4">
            <div className="h-4 bg-custom-background-80 rounded w-full" />
            <div className="h-4 bg-custom-background-80 rounded w-5/6" />
            <div className="h-4 bg-custom-background-80 rounded w-4/5" />
            <div className="h-4 bg-custom-background-80 rounded w-full" />
            <div className="h-4 bg-custom-background-80 rounded w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Loading skeleton for document sidebar
 */
export const DocumentSidebarSkeleton = memo(function DocumentSidebarSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-custom-border-200">
        <div className="h-6 bg-custom-background-80 rounded w-16" />
        <div className="h-6 w-6 bg-custom-background-80 rounded" />
      </div>

      {/* Search skeleton */}
      <div className="px-3 py-2">
        <div className="h-9 bg-custom-background-80 rounded" />
      </div>

      {/* Items skeleton */}
      <div className="flex-1 px-2 py-2 space-y-1">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-2 px-2 py-2">
            <div className="w-4 h-4 bg-custom-background-80 rounded" />
            <div className="h-4 bg-custom-background-80 rounded flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
});
