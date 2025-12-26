import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
// plane imports
import { GLOBAL_VIEW_TRACKER_ELEMENTS, ISSUE_DISPLAY_FILTERS_BY_PAGE } from "@plane/constants";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
import type { EIssueLayoutTypes } from "@plane/types";
import { EIssuesStoreType, STATIC_VIEW_TYPES } from "@plane/types";
// components
import { IssuePeekOverview } from "@/components/issues/peek-overview";
import { WorkspaceActiveLayout } from "@/components/views/helper";
import { WorkspaceLevelWorkItemFiltersHOC } from "@/components/work-item-filters/filters-hoc/workspace-level";
import { WorkItemFiltersRow } from "@/components/work-item-filters/filters-row";
// hooks
import { useGlobalView } from "@/hooks/store/use-global-view";
import { useWorkspaceViewIssueFilters } from "@/hooks/store/use-issue-store-reactive";
import { useIssues } from "@/hooks/store/use-issues";
import { useAppRouter } from "@/hooks/use-app-router";
import { IssuesStoreContext } from "@/hooks/use-issue-layout-store";
import { useWorkspaceViewIssuesQuery } from "@/hooks/use-issues-query";
import { useWorkspaceIssueProperties } from "@/hooks/use-workspace-issue-properties";
import { queryKeys } from "@/store/queries/query-keys";

type Props = {
  isDefaultView: boolean;
  isLoading?: boolean;
  toggleLoading: (value: boolean) => void;
};

export function AllIssueLayoutRoot(props: Props) {
  const { isDefaultView, isLoading = false, toggleLoading } = props;
  // router
  const router = useAppRouter();
  const { workspaceSlug: routerWorkspaceSlug, globalViewId: routerGlobalViewId } = useParams();
  const workspaceSlug = routerWorkspaceSlug ? routerWorkspaceSlug.toString() : undefined;
  const globalViewId = routerGlobalViewId ? routerGlobalViewId.toString() : undefined;
  // search params
  const searchParams = useSearchParams();
  // store hooks - use reactive hooks for filters, TanStack Query for data
  const { fetchAllGlobalViews, getViewDetailsById } = useGlobalView();
  // Get filter methods from MobX store (for filter initialization and updates)
  const { issuesFilter: { fetchFilters, updateFilterExpression } } = useIssues(EIssuesStoreType.GLOBAL);
  // Get filters reactively from Zustand store
  const workItemFilters = useWorkspaceViewIssueFilters(globalViewId);
  // Derived values
  const viewDetails = globalViewId ? getViewDetailsById(globalViewId) : undefined;
  const activeLayout: EIssueLayoutTypes | undefined = workItemFilters?.displayFilters?.layout;
  // Determine initial work item filters based on view type and availability
  const initialWorkItemFilters = useMemo(() => {
    if (!globalViewId) return undefined;

    const isStaticView = STATIC_VIEW_TYPES.includes(globalViewId);
    const hasViewDetails = Boolean(viewDetails);

    if (!isStaticView && !hasViewDetails) return undefined;

    return {
      displayFilters: workItemFilters?.displayFilters,
      displayProperties: workItemFilters?.displayProperties,
      kanbanFilters: workItemFilters?.kanbanFilters,
      richFilters: viewDetails?.rich_filters ?? {},
    };
  }, [globalViewId, viewDetails, workItemFilters]);

  // Custom hooks
  useWorkspaceIssueProperties(workspaceSlug);

  // Route filters
  const routeFilters: { [key: string]: string } = {};
  searchParams.forEach((value: string, key: string) => {
    routeFilters[key] = value;
  });

  // Initialize filters in Zustand store (must happen before issues query)
  const { isPending: filtersLoading } = useQuery({
    queryKey: workspaceSlug && globalViewId ? ["workspace-view-filters", workspaceSlug, globalViewId] : [],
    queryFn: async () => {
      if (workspaceSlug && globalViewId) {
        await fetchFilters(workspaceSlug, globalViewId);
      }
      return null;
    },
    enabled: !!workspaceSlug && !!globalViewId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // TanStack Query for issues - uses reactive filters from Zustand store
  const issuesQuery = useWorkspaceViewIssuesQuery();

  // Fetch global views
  const { isPending: globalViewsLoading } = useQuery({
    queryKey: workspaceSlug ? queryKeys.workspaceViews.all(workspaceSlug) : [],
    queryFn: async () => {
      if (workspaceSlug) {
        await fetchAllGlobalViews();
      }
      return null;
    },
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Derive loading state from TanStack Query
  const issuesLoading = filtersLoading || issuesQuery.isLoading;

  // Empty state
  if (!isLoading && !globalViewsLoading && !issuesLoading && !viewDetails && !isDefaultView) {
    return (
      <EmptyStateDetailed
        title="View does not exist"
        description="The view you are looking for does not exist or you don't have permission to view it."
        assetKey="view"
        actions={[
          {
            label: "Go to All work items",
            onClick: () => router.push(`/${workspaceSlug}/workspace-views/all-issues`),
            variant: "primary",
          },
        ]}
      />
    );
  }

  if (!workspaceSlug || !globalViewId) return null;
  return (
    <IssuesStoreContext.Provider value={EIssuesStoreType.GLOBAL}>
      <WorkspaceLevelWorkItemFiltersHOC
        enableSaveView
        saveViewOptions={{
          label: "Save as",
        }}
        enableUpdateView
        entityId={globalViewId}
        entityType={EIssuesStoreType.GLOBAL}
        filtersToShowByLayout={ISSUE_DISPLAY_FILTERS_BY_PAGE.my_issues.filters}
        initialWorkItemFilters={initialWorkItemFilters}
        updateFilters={updateFilterExpression.bind(updateFilterExpression, workspaceSlug, globalViewId)}
        workspaceSlug={workspaceSlug}
      >
        {({ filter: globalWorkItemsFilter }) => (
          <div className="h-full overflow-hidden bg-surface-1">
            <div className="flex h-full w-full flex-col border-b border-strong">
              {globalWorkItemsFilter && (
                <WorkItemFiltersRow
                  filter={globalWorkItemsFilter}
                  trackerElements={{
                    saveView: GLOBAL_VIEW_TRACKER_ELEMENTS.HEADER_SAVE_VIEW_BUTTON,
                  }}
                />
              )}
              <WorkspaceActiveLayout
                activeLayout={activeLayout}
                isDefaultView={isDefaultView}
                isLoading={isLoading}
                toggleLoading={toggleLoading}
                workspaceSlug={workspaceSlug}
                globalViewId={globalViewId}
                routeFilters={routeFilters}
                fetchNextPages={issuesQuery.fetchNextPage}
                globalViewsLoading={globalViewsLoading}
                issuesLoading={issuesLoading}
              />
            </div>
            {/* peek overview */}
            <IssuePeekOverview />
          </div>
        )}
      </WorkspaceLevelWorkItemFiltersHOC>
    </IssuesStoreContext.Provider>
  );
}
