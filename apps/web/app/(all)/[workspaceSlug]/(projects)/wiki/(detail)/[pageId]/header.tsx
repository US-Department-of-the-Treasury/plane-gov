"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { BookOpen, Share2, MoreHorizontal, Lock, Archive, History, Copy, Trash2 } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { Breadcrumbs, Header, Tooltip, CustomMenu } from "@plane/ui";
import { cn } from "@plane/utils";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { ShareWikiPageModal, DeleteWikiPageModal } from "@/components/wiki/modals";
import { WikiVersionHistoryPanel } from "@/components/wiki/version-history";
// hooks
import { useAppRouter } from "@/hooks/use-app-router";
// queries
import {
  useWikiPageDetails,
  useLockWikiPage,
  useUnlockWikiPage,
  useArchiveWikiPage,
  useDuplicateWikiPage,
} from "@/store/queries";

export function WikiDetailHeader() {
  const router = useAppRouter();
  const { workspaceSlug, pageId } = useParams();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  // Queries
  const { data: page } = useWikiPageDetails(
    workspaceSlug?.toString() ?? "",
    pageId?.toString() ?? ""
  );

  // Mutations
  const lockMutation = useLockWikiPage();
  const unlockMutation = useUnlockWikiPage();
  const archiveMutation = useArchiveWikiPage();
  const duplicateMutation = useDuplicateWikiPage();

  const handleToggleLock = () => {
    if (!workspaceSlug || !pageId) return;
    const mutation = page?.is_locked ? unlockMutation : lockMutation;
    mutation.mutate({
      workspaceSlug: workspaceSlug.toString(),
      pageId: pageId.toString(),
    });
  };

  const handleArchive = () => {
    if (!workspaceSlug || !pageId) return;
    archiveMutation.mutate(
      {
        workspaceSlug: workspaceSlug.toString(),
        pageId: pageId.toString(),
      },
      {
        onSuccess: () => {
          router.push(`/${workspaceSlug}/wiki`);
        },
      }
    );
  };

  const handleDuplicate = () => {
    if (!workspaceSlug || !pageId) return;
    duplicateMutation.mutate(
      {
        workspaceSlug: workspaceSlug.toString(),
        pageId: pageId.toString(),
      },
      {
        onSuccess: (newPage) => {
          router.push(`/${workspaceSlug}/wiki/${newPage.id}`);
        },
      }
    );
  };

  const handleViewHistory = () => {
    setIsHistoryPanelOpen(true);
  };

  return (
    <>
      <Header>
        <Header.LeftItem>
          <div className="flex items-center gap-2.5">
            <Breadcrumbs>
              <Breadcrumbs.Item
                component={
                  <BreadcrumbLink
                    label="Wiki"
                    href={`/${workspaceSlug}/wiki`}
                    icon={<BookOpen className="size-4 text-secondary" />}
                  />
                }
              />
              <Breadcrumbs.Item
                component={
                  <BreadcrumbLink
                    label={page?.name || "Untitled"}
                    icon={
                      page?.is_locked ? (
                        <Lock className="size-4 text-custom-text-400" />
                      ) : undefined
                    }
                  />
                }
              />
            </Breadcrumbs>
          </div>
        </Header.LeftItem>

        <Header.RightItem>
          <Tooltip tooltipContent={page?.is_locked ? "Unlock page" : "Lock page"}>
            <button
              type="button"
              className={cn(
                "flex items-center justify-center p-1.5 rounded hover:bg-custom-background-80",
                page?.is_locked && "text-amber-500"
              )}
              onClick={handleToggleLock}
            >
              <Lock className="size-4" />
            </button>
          </Tooltip>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsShareModalOpen(true)}
          >
            <Share2 className="size-4 mr-1" />
            Share
          </Button>

          <CustomMenu
            ellipsis
            placement="bottom-end"
            customButton={
              <button
                type="button"
                className="flex items-center justify-center p-1.5 rounded hover:bg-custom-background-80"
              >
                <MoreHorizontal className="size-4" />
              </button>
            }
          >
            <CustomMenu.MenuItem onClick={handleDuplicate}>
              <div className="flex items-center gap-2">
                <Copy className="size-4" />
                <span>Duplicate</span>
              </div>
            </CustomMenu.MenuItem>
            <CustomMenu.MenuItem onClick={handleViewHistory}>
              <div className="flex items-center gap-2">
                <History className="size-4" />
                <span>Version history</span>
              </div>
            </CustomMenu.MenuItem>
            <CustomMenu.MenuItem onClick={handleArchive}>
              <div className="flex items-center gap-2">
                <Archive className="size-4" />
                <span>Archive</span>
              </div>
            </CustomMenu.MenuItem>
            <CustomMenu.MenuItem
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-red-500"
            >
              <div className="flex items-center gap-2">
                <Trash2 className="size-4" />
                <span>Delete</span>
              </div>
            </CustomMenu.MenuItem>
          </CustomMenu>
        </Header.RightItem>
      </Header>

      <ShareWikiPageModal
        workspaceSlug={workspaceSlug?.toString() ?? ""}
        pageId={pageId?.toString() ?? ""}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      <DeleteWikiPageModal
        workspaceSlug={workspaceSlug?.toString() ?? ""}
        pageId={pageId?.toString() ?? ""}
        pageName={page?.name ?? ""}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onSuccess={() => router.push(`/${workspaceSlug}/wiki`)}
      />

      <WikiVersionHistoryPanel
        workspaceSlug={workspaceSlug?.toString() ?? ""}
        pageId={pageId?.toString() ?? ""}
        isOpen={isHistoryPanelOpen}
        onClose={() => setIsHistoryPanelOpen(false)}
      />
    </>
  );
}
