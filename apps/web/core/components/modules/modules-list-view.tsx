import { observer } from "mobx-react";
import { useParams, useSearchParams } from "next/navigation";
// components
import { EUserPermissionsLevel, MODULE_TRACKER_ELEMENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
import { EUserProjectRoles } from "@plane/types";
import { ContentWrapper, Row, ERowVariant } from "@plane/ui";
// components
import { ListLayout } from "@/components/core/list";
import { ModuleCardItem, ModuleListItem, ModulePeekOverview, ModulesListGanttChartView } from "@/components/modules";
import { SprintModuleBoardLayoutLoader } from "@/components/ui/loader/sprint-module-board-loader";
import { SprintModuleListLayoutLoader } from "@/components/ui/loader/sprint-module-list-loader";
import { GanttLayoutLoader } from "@/components/ui/loader/layouts/gantt-layout-loader";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useModuleFilter } from "@/hooks/store/use-module-filter";
import { useUserPermissions } from "@/hooks/store/user";
import { useProjectModules, getModuleIds } from "@/store/queries/module";
import type { IModule } from "@plane/types";
import { useMemo } from "react";

// Helper function to filter modules based on filters and search
function filterModules(modules: IModule[] | undefined, filters: any, searchQuery: string): IModule[] {
  if (!modules) return [];

  let filtered = modules;

  // Apply search query
  if (searchQuery && searchQuery.trim() !== "") {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (module) =>
        module.name.toLowerCase().includes(query) ||
        module.description?.toLowerCase().includes(query)
    );
  }

  // Apply status filter
  if (filters?.status && filters.status.length > 0) {
    filtered = filtered.filter((module) => filters.status.includes(module.status));
  }

  // Apply lead filter
  if (filters?.lead && filters.lead.length > 0) {
    filtered = filtered.filter((module) => module.lead_id && filters.lead.includes(module.lead_id));
  }

  // Apply members filter
  if (filters?.members && filters.members.length > 0) {
    filtered = filtered.filter((module) =>
      module.member_ids?.some((memberId) => filters.members.includes(memberId))
    );
  }

  return filtered;
}

export const ModulesListView = observer(function ModulesListView() {
  // router
  const { workspaceSlug, projectId } = useParams();
  const searchParams = useSearchParams();
  const peekModule = searchParams.get("peekModule");
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { toggleCreateModuleModal } = useCommandPalette();
  const { currentProjectDisplayFilters: displayFilters, currentProjectFilters: filters, searchQuery } = useModuleFilter();
  const { allowPermissions } = useUserPermissions();

  // TanStack Query hooks
  const { data: modules, isLoading } = useProjectModules(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );

  // derived values
  const projectModuleIds = useMemo(() => (modules ? getModuleIds(modules) : undefined), [modules]);
  const filteredModuleIds = useMemo(() => {
    const filteredModules = filterModules(modules, filters, searchQuery);
    // Apply favorites filter
    const finalModules = displayFilters?.favorites
      ? filteredModules.filter((m) => m.is_favorite)
      : filteredModules;
    return finalModules.map((m) => m.id);
  }, [modules, filters, searchQuery, displayFilters?.favorites]);
  const canPerformEmptyStateActions = allowPermissions(
    [EUserProjectRoles.ADMIN, EUserProjectRoles.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  if (isLoading || !projectModuleIds || !filteredModuleIds)
    return (
      <>
        {displayFilters?.layout === "list" && <SprintModuleListLayoutLoader />}
        {displayFilters?.layout === "board" && <SprintModuleBoardLayoutLoader />}
        {displayFilters?.layout === "gantt" && <GanttLayoutLoader />}
      </>
    );

  if (projectModuleIds.length === 0)
    return (
      <EmptyStateDetailed
        assetKey="module"
        title={t("project_empty_state.modules.title")}
        description={t("project_empty_state.modules.description")}
        actions={[
          {
            label: t("project_empty_state.modules.cta_primary"),
            onClick: () => toggleCreateModuleModal(true),
            disabled: !canPerformEmptyStateActions,
            variant: "primary",
            "data-ph-element": MODULE_TRACKER_ELEMENTS.EMPTY_STATE_ADD_BUTTON,
          },
        ]}
      />
    );

  if (filteredModuleIds.length === 0)
    return (
      <EmptyStateDetailed
        assetKey="search"
        title={t("common_empty_state.search.title")}
        description={t("common_empty_state.search.description")}
      />
    );

  return (
    <ContentWrapper variant={ERowVariant.HUGGING}>
      <div className="size-full flex justify-between">
        {displayFilters?.layout === "list" && (
          <ListLayout>
            {filteredModuleIds.map((moduleId) => (
              <ModuleListItem key={moduleId} moduleId={moduleId} />
            ))}
          </ListLayout>
        )}
        {displayFilters?.layout === "board" && (
          <Row
            className={`size-full py-page-y grid grid-cols-1 gap-6 overflow-y-auto ${
              peekModule
                ? "lg:grid-cols-1 xl:grid-cols-2 3xl:grid-cols-3"
                : "lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4"
            } auto-rows-max transition-all vertical-scrollbar scrollbar-lg`}
          >
            {filteredModuleIds.map((moduleId) => (
              <ModuleCardItem key={moduleId} moduleId={moduleId} />
            ))}
          </Row>
        )}
        {displayFilters?.layout === "gantt" && (
          <div className="size-full overflow-hidden">
            <ModulesListGanttChartView />
          </div>
        )}
        <div className="flex-shrink-0">
          <ModulePeekOverview projectId={projectId?.toString() ?? ""} workspaceSlug={workspaceSlug?.toString() ?? ""} />
        </div>
      </div>
    </ContentWrapper>
  );
});
