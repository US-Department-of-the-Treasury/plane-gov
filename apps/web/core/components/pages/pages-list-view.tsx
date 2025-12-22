import { useQuery } from "@tanstack/react-query";
import type { TPageNavigationTabs } from "@plane/types";
// plane web hooks
import type { EPageStoreType } from "@/plane-web/hooks/store";
import { usePageStore } from "@/plane-web/hooks/store";
// query keys
import { queryKeys } from "@/store/queries/query-keys";
// local imports
import { PagesListHeaderRoot } from "./header";
import { PagesListMainContent } from "./pages-list-main-content";

type TPageView = {
  children: React.ReactNode;
  pageType: TPageNavigationTabs;
  projectId: string;
  storeType: EPageStoreType;
  workspaceSlug: string;
};

export function PagesListView(props: TPageView) {
  const { children, pageType, projectId, storeType, workspaceSlug } = props;
  // store hooks
  const { isAnyPageAvailable, fetchPagesList } = usePageStore(storeType);
  // fetching pages list
  useQuery({
    queryKey: queryKeys.pages.list(workspaceSlug ?? "", projectId ?? "", pageType ?? "public"),
    queryFn: () => fetchPagesList(workspaceSlug!, projectId!, pageType!),
    enabled: !!(workspaceSlug && projectId && pageType),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // pages loader
  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col">
      {/* tab header */}
      {isAnyPageAvailable && (
        <PagesListHeaderRoot
          pageType={pageType}
          projectId={projectId}
          storeType={storeType}
          workspaceSlug={workspaceSlug}
        />
      )}
      <PagesListMainContent pageType={pageType} storeType={storeType}>
        {children}
      </PagesListMainContent>
    </div>
  );
}
