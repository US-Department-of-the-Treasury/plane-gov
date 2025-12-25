import { useState, useMemo, memo, useCallback } from "react";
import { useParams } from "react-router";
import { Plus, Search, ChevronRight, FileText, FolderClosed, Lock, MoreHorizontal, Trash2, Copy } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@plane/propel/primitives";
import { Logo } from "@plane/propel/emoji-icon-picker";
import { SIDEBAR_WIDTH } from "@plane/constants";
import { useLocalStorage } from "@plane/hooks";
import { useTranslation } from "@plane/i18n";
import { cn } from "@plane/utils";
import { Tooltip } from "@plane/ui";
// components
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
import { WikiEmptyState, WikiSidebarSkeleton } from "@/components/wiki/empty-states";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
// queries
import { useWikiPages, useWikiCollections, buildWikiPageTree, buildWikiCollectionTree } from "@/store/queries";
import type { TWikiPageTreeNode, TWikiCollectionTreeNode } from "@/store/queries";
// router
import { useAppRouter } from "@/hooks/use-app-router";

const WikiPageItem = memo(function WikiPageItem({
  page,
  workspaceSlug,
  activePageId,
  depth = 0,
  onCreateChildPage,
}: {
  page: TWikiPageTreeNode;
  workspaceSlug: string;
  activePageId?: string;
  depth?: number;
  onCreateChildPage?: (parentId: string) => void;
}) {
  const router = useAppRouter();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = activePageId === page.id;
  const hasChildren = page.children.length > 0;
  const hasIcon = page.logo_props?.in_use;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div>
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "group flex items-center gap-1 rounded-md px-2 py-1 text-sm cursor-pointer hover:bg-custom-background-80",
            {
              "bg-custom-background-80": isActive,
            }
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => router.push(`/${workspaceSlug}/wiki/${page.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              router.push(`/${workspaceSlug}/wiki/${page.id}`);
            }
          }}
        >
          {/* Expand/collapse toggle */}
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex-shrink-0 p-0.5 rounded hover:bg-custom-background-90"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronRight
                  className={cn("size-3.5 text-custom-text-400 transition-transform duration-200", {
                    "rotate-90": isOpen,
                  })}
                />
              </button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-4.5" />
          )}

          {/* Page icon or default document icon */}
          {hasIcon ? (
            <div className="flex-shrink-0">
              <Logo logo={page.logo_props} size={16} type="lucide" />
            </div>
          ) : (
            <FileText className="size-4 flex-shrink-0 text-custom-text-400" />
          )}

          {/* Page name */}
          <span className="flex-1 truncate text-custom-text-200">{page.name || "Untitled"}</span>

          {/* Lock indicator */}
          {page.is_locked && <Lock className="size-3 flex-shrink-0 text-custom-text-400" />}

          {/* Hover actions - Notion-style */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Add child page */}
            <Tooltip tooltipContent="Add sub-page">
              <button
                type="button"
                className="p-0.5 rounded hover:bg-custom-background-90"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateChildPage?.(page.id);
                }}
              >
                <Plus className="size-3.5 text-custom-text-400" />
              </button>
            </Tooltip>

            {/* More options menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-custom-background-90"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-3.5 text-custom-text-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={() => void navigator.clipboard.writeText(page.id)}>
                  <Copy className="size-4 mr-2" />
                  Copy link
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-500">
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {hasChildren && (
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            {page.children.map((child) => (
              <WikiPageItem
                key={child.id}
                page={child}
                workspaceSlug={workspaceSlug}
                activePageId={activePageId}
                depth={depth + 1}
                onCreateChildPage={onCreateChildPage}
              />
            ))}
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
});

const WikiCollectionItem = memo(function WikiCollectionItem({
  collection,
  pages,
  workspaceSlug,
  activePageId,
  depth = 0,
  onCreateChildPage,
}: {
  collection: TWikiCollectionTreeNode;
  pages: TWikiPageTreeNode[];
  workspaceSlug: string;
  activePageId?: string;
  depth?: number;
  onCreateChildPage?: (parentId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const collectionPages = pages.filter((p) => p.collection === collection.id);
  const hasContent = collection.children.length > 0 || collectionPages.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div>
        <div
          className={cn(
            "group w-full flex items-center gap-1 rounded-md px-2 py-1 text-sm cursor-pointer hover:bg-custom-background-80"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <CollapsibleTrigger asChild>
            <button type="button" className="flex-shrink-0 p-0.5 rounded hover:bg-custom-background-90">
              <ChevronRight
                className={cn("size-3.5 text-custom-text-400 transition-transform duration-200", {
                  "rotate-90": isOpen,
                })}
              />
            </button>
          </CollapsibleTrigger>
          <FolderClosed className="size-4 flex-shrink-0 text-custom-text-400" />
          <span className="flex-1 truncate text-left font-medium text-custom-text-200">{collection.name}</span>

          {/* Hover actions for collection */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip tooltipContent="Add page to collection">
              <button
                type="button"
                className="p-0.5 rounded hover:bg-custom-background-90"
                onClick={(e) => e.stopPropagation()}
              >
                <Plus className="size-3.5 text-custom-text-400" />
              </button>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-custom-background-90"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-3.5 text-custom-text-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem>
                  <Copy className="size-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-500">
                  <Trash2 className="size-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {hasContent && (
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            {collection.children.map((child) => (
              <WikiCollectionItem
                key={child.id}
                collection={child}
                pages={pages}
                workspaceSlug={workspaceSlug}
                activePageId={activePageId}
                depth={depth + 1}
                onCreateChildPage={onCreateChildPage}
              />
            ))}
            {collectionPages.map((page) => (
              <WikiPageItem
                key={page.id}
                page={page}
                workspaceSlug={workspaceSlug}
                activePageId={activePageId}
                depth={depth + 1}
                onCreateChildPage={onCreateChildPage}
              />
            ))}
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
});

/**
 * Wiki mode sidebar with page tree and collections
 * Uses per-mode sidebar collapse state for independent collapse behavior
 */
export function WikiSidebar() {
  const { workspaceSlug, pageId } = useParams<{ workspaceSlug: string; pageId?: string }>();
  const { t } = useTranslation();
  const router = useAppRouter();

  // store hooks - using wiki-specific collapse state
  const { wikiSidebarCollapsed, toggleWikiSidebar, sidebarPeek, toggleSidebarPeek, isAnySidebarDropdownOpen } =
    useAppTheme();
  const { storedValue, setValue } = useLocalStorage("wikiSidebarWidth", SIDEBAR_WIDTH);

  // states
  const [sidebarWidth, setSidebarWidth] = useState<number>(storedValue ?? SIDEBAR_WIDTH);
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const { data: pages, isLoading: pagesLoading } = useWikiPages(workspaceSlug || "");
  const { data: collections, isLoading: collectionsLoading } = useWikiCollections(workspaceSlug || "");

  // Build tree structures
  const pageTree = useMemo(() => buildWikiPageTree(pages), [pages]);
  const collectionTree = useMemo(() => buildWikiCollectionTree(collections), [collections]);

  // Filter pages without collection (root pages)
  const rootPages = useMemo(() => pageTree.filter((p) => !p.collection), [pageTree]);

  // Filter by search
  const filteredPages = useMemo(() => {
    if (!searchQuery) return rootPages;
    const query = searchQuery.toLowerCase();
    return rootPages.filter((p) => p.name.toLowerCase().includes(query));
  }, [rootPages, searchQuery]);

  const isLoading = pagesLoading || collectionsLoading;

  // handlers
  const handleWidthChange = (width: number) => setValue(width);
  const handleCreatePage = useCallback(() => {
    router.push(`/${workspaceSlug}/wiki?create=true`);
  }, [router, workspaceSlug]);

  const handleCreateChildPage = useCallback(
    (parentId: string) => {
      router.push(`/${workspaceSlug}/wiki?create=true&parent=${parentId}`);
    },
    [router, workspaceSlug]
  );

  return (
    <ResizableSidebar
      showPeek={sidebarPeek}
      defaultWidth={storedValue ?? 250}
      width={sidebarWidth}
      setWidth={setSidebarWidth}
      defaultCollapsed={wikiSidebarCollapsed}
      peekDuration={1500}
      onWidthChange={handleWidthChange}
      onCollapsedChange={toggleWikiSidebar}
      isCollapsed={wikiSidebarCollapsed}
      toggleCollapsed={toggleWikiSidebar}
      togglePeek={toggleSidebarPeek}
      isAnyExtendedSidebarExpanded={false}
      isAnySidebarDropdownOpen={isAnySidebarDropdownOpen}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-custom-border-200">
          <h2 className="text-base font-semibold">{t("wiki") || "Wiki"}</h2>
          <div className="flex items-center gap-1">
            <Tooltip tooltipContent="Create page">
              <button type="button" className="p-1.5 rounded hover:bg-custom-background-80" onClick={handleCreatePage}>
                <Plus className="size-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-custom-background-80">
            <Search className="size-4 text-custom-text-400" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-custom-text-400"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <WikiSidebarSkeleton />
          ) : (
            <>
              {/* Collections */}
              {collectionTree.map((collection) => (
                <WikiCollectionItem
                  key={collection.id}
                  collection={collection}
                  pages={pageTree}
                  workspaceSlug={workspaceSlug || ""}
                  activePageId={pageId}
                  onCreateChildPage={handleCreateChildPage}
                />
              ))}

              {/* Root pages (no collection) */}
              {filteredPages.length > 0 && (
                <div className="mt-2">
                  {collectionTree.length > 0 && (
                    <div className="px-2 py-1 text-xs font-medium text-custom-text-400 uppercase">Pages</div>
                  )}
                  {filteredPages.map((page) => (
                    <WikiPageItem
                      key={page.id}
                      page={page}
                      workspaceSlug={workspaceSlug || ""}
                      activePageId={pageId}
                      onCreateChildPage={handleCreateChildPage}
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!isLoading && filteredPages.length === 0 && collectionTree.length === 0 && (
                <WikiEmptyState
                  type={searchQuery ? "no-search-results" : "no-pages"}
                  searchQuery={searchQuery}
                  onAction={searchQuery ? undefined : handleCreatePage}
                  actionLabel="Create your first page"
                  className="py-8"
                />
              )}
            </>
          )}
        </div>
      </div>
    </ResizableSidebar>
  );
}
