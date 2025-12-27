"use client";

import { memo } from "react";
import { Star } from "lucide-react";

interface StarredDocumentsViewProps {
  workspaceSlug: string;
}

export const StarredDocumentsView = memo(function StarredDocumentsView({
  workspaceSlug: _workspaceSlug,
}: StarredDocumentsViewProps) {
  // Note: Document starring/favoriting is not yet implemented in the backend.
  // This view will show an empty state until the feature is added.

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-page-x py-6">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="size-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
            <Star className="size-6 text-yellow-500" />
          </div>
          <h3 className="text-base font-medium text-primary mb-2">No starred documents</h3>
          <p className="text-13 text-tertiary max-w-sm">
            Star documents to quickly access them later. Click the star icon on any document to add it here.
          </p>
        </div>
      </div>
    </div>
  );
});
