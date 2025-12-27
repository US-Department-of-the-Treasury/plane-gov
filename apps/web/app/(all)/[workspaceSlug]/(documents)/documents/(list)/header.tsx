"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, BookOpen, Grid, List, FolderClosed } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { cn } from "@plane/utils";
import { Breadcrumbs, Header, Tooltip } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { CreateDocumentModal, CreateDocumentCollectionModal } from "@/components/documents/modals";
// store
import { useDocumentViewStore } from "@/store/document-view.store";

export function DocumentListHeader() {
  const { workspaceSlug } = useParams();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateCollectionModalOpen, setIsCreateCollectionModalOpen] = useState(false);
  const { viewMode, setViewMode } = useDocumentViewStore();

  return (
    <>
      <Header>
        <Header.LeftItem>
          <div className="flex items-center gap-2.5">
            <Breadcrumbs>
              <Breadcrumbs.Item
                component={<BreadcrumbLink label="Documents" icon={<BookOpen className="size-5 text-secondary" />} />}
              />
            </Breadcrumbs>
          </div>
        </Header.LeftItem>

        <Header.RightItem>
          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center border border-subtle rounded-md">
              <Tooltip tooltipContent="Grid view">
                <button
                  type="button"
                  className={cn(
                    "p-1.5 rounded-l-md text-tertiary",
                    viewMode === "grid" ? "bg-layer-transparent-hover" : "hover:bg-layer-transparent-hover"
                  )}
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="size-4" />
                </button>
              </Tooltip>
              <Tooltip tooltipContent="List view">
                <button
                  type="button"
                  className={cn(
                    "p-1.5 rounded-r-md text-tertiary",
                    viewMode === "list" ? "bg-layer-transparent-hover" : "hover:bg-layer-transparent-hover"
                  )}
                  onClick={() => setViewMode("list")}
                >
                  <List className="size-4" />
                </button>
              </Tooltip>
            </div>

            {/* Create collection button */}
            <Tooltip tooltipContent="New collection">
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-13 text-tertiary border border-subtle rounded-md hover:bg-layer-transparent-hover"
                onClick={() => setIsCreateCollectionModalOpen(true)}
              >
                <FolderClosed className="size-4" />
                <span>Collection</span>
              </button>
            </Tooltip>

            {/* New Page button */}
            <Button variant="primary" size="lg" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="size-4 mr-1" />
              New Page
            </Button>
          </div>
        </Header.RightItem>
      </Header>

      <CreateDocumentModal
        workspaceSlug={workspaceSlug?.toString() ?? ""}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <CreateDocumentCollectionModal
        workspaceSlug={workspaceSlug?.toString() ?? ""}
        isOpen={isCreateCollectionModalOpen}
        onClose={() => setIsCreateCollectionModalOpen(false)}
      />
    </>
  );
}
