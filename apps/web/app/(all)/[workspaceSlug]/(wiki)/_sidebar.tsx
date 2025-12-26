import { useState, useMemo, memo, useCallback } from "react";
import { useParams } from "react-router";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, FileText, FolderClosed, Lock, MoreHorizontal, Trash2, Copy, Clock, Star } from "lucide-react";
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
import { ChevronRightIcon, HomeIcon } from "@plane/propel/icons";
import { cn } from "@plane/utils";
import { Tooltip } from "@plane/ui";
import { SidebarNavItem } from "@/components/sidebar/sidebar-navigation";
// components
import { ResizableSidebar } from "@/components/sidebar/resizable-sidebar";
import { SidebarWrapper } from "@/components/sidebar/sidebar-wrapper";
import { WikiEmptyState, WikiSidebarSkeleton } from "@/components/wiki/empty-states";
import { CreateWikiPageModal } from "@/components/wiki/modals";
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
            "group flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-13 cursor-pointer hover:bg-layer-transparent-hover",
            {
              "bg-layer-transparent-hover": isActive,
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
                className="flex-shrink-0 p-0.5 rounded-sm hover:bg-layer-1"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronRightIcon
                  className={cn("size-3.5 text-tertiary transition-transform duration-200", {
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
            <FileText className="size-4 flex-shrink-0 text-tertiary" />
          )}

          {/* Page name */}
          <span className="flex-1 truncate text-primary">{page.name || "Untitled"}</span>

          {/* Lock indicator */}
          {page.is_locked && <Lock className="size-3 flex-shrink-0 text-placeholder" />}

          {/* Hover actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Add child page */}
            <Tooltip tooltipContent="Add sub-page">
              <button
                type="button"
                className="p-0.5 rounded-sm hover:bg-layer-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateChildPage?.(page.id);
                }}
              >
                <Plus className="size-3.5 text-tertiary" />
              </button>
            </Tooltip>

            {/* More options menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-0.5 rounded-sm hover:bg-layer-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-3.5 text-tertiary" />
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
            "group w-full flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-13 cursor-pointer hover:bg-layer-transparent-hover"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <CollapsibleTrigger asChild>
            <button type="button" className="flex-shrink-0 p-0.5 rounded-sm hover:bg-layer-1">
              <ChevronRightIcon
                className={cn("size-3.5 text-tertiary transition-transform duration-200", {
                  "rotate-90": isOpen,
                })}
              />
            </button>
          </CollapsibleTrigger>
          <FolderClosed className="size-4 flex-shrink-0 text-tertiary" />
          <span className="flex-1 truncate text-left font-medium text-primary">{collection.name}</span>

          {/* Hover actions for collection */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Tooltip tooltipContent="Add page to collection">
              <button type="button" className="p-0.5 rounded-sm hover:bg-layer-1" onClick={(e) => e.stopPropagation()}>
                <Plus className="size-3.5 text-tertiary" />
              </button>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-0.5 rounded-sm hover:bg-layer-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-3.5 text-tertiary" />
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
 * Header action button for creating new pages - Notion-style icon button
 */
const WikiHeaderActions = memo(function WikiHeaderActions({ onCreatePage }: { onCreatePage: () => void }) {
  return (
    <Tooltip tooltipContent="New page">
      <button
        type="button"
        className="p-1 rounded-sm text-tertiary hover:bg-layer-transparent-hover hover:text-primary transition-colors"
        onClick={onCreatePage}
      >
        <Plus className="size-4" />
      </button>
    </Tooltip>
  );
});

/**
 * Wiki navigation items - matches Projects sidebar pattern with Home, Your work, Drafts
 */
const WikiNavigationItems = memo(function WikiNavigationItems({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();

  const navItems = [
    {
      key: "all-pages",
      label: "All pages",
      href: `/${workspaceSlug}/wiki`,
      icon: HomeIcon,
      isActive: (path: string) => path === `/${workspaceSlug}/wiki` || path === `/${workspaceSlug}/wiki/`,
    },
    {
      key: "recent",
      label: "Recent",
      href: `/${workspaceSlug}/wiki/recent`,
      icon: Clock,
      isActive: (path: string) => path.includes("/wiki/recent"),
    },
    {
      key: "starred",
      label: "Starred",
      href: `/${workspaceSlug}/wiki/starred`,
      icon: Star,
      isActive: (path: string) => path.includes("/wiki/starred"),
    },
  ];

  return (
    <div className="flex flex-col gap-0.5">
      {navItems.map((item) => (
        <Link key={item.key} href={item.href}>
          <SidebarNavItem isActive={item.isActive(pathname)}>
            <div className="flex items-center gap-1.5 py-[1px]">
              <item.icon className="size-4 flex-shrink-0" />
              <span className="text-13 font-medium">{item.label}</span>
            </div>
          </SidebarNavItem>
        </Link>
      ))}
    </div>
  );
});

/**
 * Pages section - collapsible like Projects section in Projects sidebar
 */
const WikiPagesSection = memo(function WikiPagesSection({
  pages,
  collections,
  workspaceSlug,
  activePageId,
  onCreateChildPage,
  isLoading,
  onCreatePage,
}: {
  pages: TWikiPageTreeNode[];
  collections: TWikiCollectionTreeNode[];
  workspaceSlug: string;
  activePageId?: string;
  onCreateChildPage: (parentId: string) => void;
  isLoading: boolean;
  onCreatePage: () => void;
}) {
  const { storedValue: isPagesOpen, setValue: togglePagesOpen } = useLocalStorage<boolean>("is_wiki_pages_open", true);

  // Filter root pages (no collection)
  const rootPages = useMemo(() => pages.filter((p) => !p.collection), [pages]);

  if (isLoading) {
    return <WikiSidebarSkeleton />;
  }

  const isEmpty = rootPages.length === 0 && collections.length === 0;

  if (isEmpty) {
    return (
      <WikiEmptyState type="no-pages" onAction={onCreatePage} actionLabel="Create your first page" className="py-8" />
    );
  }

  return (
    <Collapsible open={!!isPagesOpen} onOpenChange={togglePagesOpen} className="flex flex-col">
      <div className="group w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-placeholder hover:bg-layer-transparent-hover">
        <CollapsibleTrigger
          className="w-full flex items-center gap-1 whitespace-nowrap text-left text-13 font-semibold text-placeholder"
          aria-label={isPagesOpen ? "Close pages menu" : "Open pages menu"}
        >
          <span className="text-13 font-semibold">Pages</span>
        </CollapsibleTrigger>
        <div className="flex items-center opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto">
          <CollapsibleTrigger
            className="p-0.5 rounded-sm hover:bg-layer-1 flex-shrink-0"
            aria-label={isPagesOpen ? "Close pages menu" : "Open pages menu"}
          >
            <ChevronRightIcon
              className={cn("flex-shrink-0 size-3 transition-all", {
                "rotate-90": isPagesOpen,
              })}
            />
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="flex flex-col gap-0.5">
          {/* Collections */}
          {collections.map((collection) => (
            <WikiCollectionItem
              key={collection.id}
              collection={collection}
              pages={pages}
              workspaceSlug={workspaceSlug}
              activePageId={activePageId}
              onCreateChildPage={onCreateChildPage}
            />
          ))}

          {/* Root pages (no collection) */}
          {rootPages.map((page) => (
            <WikiPageItem
              key={page.id}
              page={page}
              workspaceSlug={workspaceSlug}
              activePageId={activePageId}
              onCreateChildPage={onCreateChildPage}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

/**
 * Wiki mode sidebar with page tree and collections
 * Uses SidebarWrapper to match Projects sidebar pattern
 */
export function WikiSidebar() {
  const { workspaceSlug, pageId } = useParams<{ workspaceSlug: string; pageId?: string }>();
  const router = useAppRouter();

  // store hooks - using wiki-specific collapse state
  const { wikiSidebarCollapsed, toggleWikiSidebar, sidebarPeek, toggleSidebarPeek, isAnySidebarDropdownOpen } =
    useAppTheme();
  const { storedValue, setValue } = useLocalStorage("wikiSidebarWidth", SIDEBAR_WIDTH);

  // states
  const [sidebarWidth, setSidebarWidth] = useState<number>(storedValue ?? SIDEBAR_WIDTH);
  const [isCreatePageModalOpen, setIsCreatePageModalOpen] = useState(false);

  // Queries
  const { data: pages, isLoading: pagesLoading } = useWikiPages(workspaceSlug || "");
  const { data: collections, isLoading: collectionsLoading } = useWikiCollections(workspaceSlug || "");

  // Build tree structures
  const pageTree = useMemo(() => buildWikiPageTree(pages), [pages]);
  const collectionTree = useMemo(() => buildWikiCollectionTree(collections), [collections]);

  const isLoading = pagesLoading || collectionsLoading;

  // handlers
  const handleWidthChange = (width: number) => setValue(width);
  const handleCreatePage = useCallback(() => {
    setIsCreatePageModalOpen(true);
  }, []);

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
      <SidebarWrapper
        title="Wiki"
        headerActions={<WikiHeaderActions onCreatePage={handleCreatePage} />}
        onToggle={toggleWikiSidebar}
      >
        {/* Navigation items - matches Projects sidebar pattern */}
        <WikiNavigationItems workspaceSlug={workspaceSlug || ""} />

        {/* Pages section - collapsible like Projects section */}
        <WikiPagesSection
          pages={pageTree}
          collections={collectionTree}
          workspaceSlug={workspaceSlug || ""}
          activePageId={pageId}
          onCreateChildPage={handleCreateChildPage}
          isLoading={isLoading}
          onCreatePage={handleCreatePage}
        />
      </SidebarWrapper>

      {/* Create page modal */}
      <CreateWikiPageModal
        workspaceSlug={workspaceSlug || ""}
        isOpen={isCreatePageModalOpen}
        onClose={() => setIsCreatePageModalOpen(false)}
      />
    </ResizableSidebar>
  );
}
