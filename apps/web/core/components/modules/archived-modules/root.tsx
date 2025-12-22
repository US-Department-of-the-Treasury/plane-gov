import React, { useCallback } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane imports
import { useTranslation } from "@plane/i18n";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
import type { TModuleFilters } from "@plane/types";
// helpers
import { calculateTotalFilters } from "@plane/utils";
// components
import { ArchivedModulesView, ModuleAppliedFiltersList } from "@/components/modules";
import { SprintModuleListLayoutLoader } from "@/components/ui/loader/sprint-module-list-loader";
// hooks
import { useModuleFilter } from "@/hooks/store/use-module-filter";
// queries
import { useArchivedModules } from "@/store/queries/module";

export const ArchivedModuleLayoutRoot = observer(function ArchivedModuleLayoutRoot() {
  // router
  const { workspaceSlug, projectId } = useParams();
  // plane hooks
  const { t } = useTranslation();
  // hooks
  const { clearAllFilters, currentProjectArchivedFilters, updateFilters } = useModuleFilter();
  // queries
  const { data: archivedModules, isLoading } = useArchivedModules(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );
  // derived values
  const totalArchivedModules = archivedModules?.length ?? 0;

  const handleRemoveFilter = useCallback(
    (key: keyof TModuleFilters, value: string | null) => {
      if (!projectId) return;
      let newValues = currentProjectArchivedFilters?.[key] ?? [];

      if (!value) newValues = [];
      else newValues = newValues.filter((val) => val !== value);

      updateFilters(projectId.toString(), { [key]: newValues }, "archived");
    },
    [currentProjectArchivedFilters, projectId, updateFilters]
  );

  if (!workspaceSlug || !projectId) return <></>;

  if (isLoading) {
    return <SprintModuleListLayoutLoader />;
  }

  return (
    <>
      {calculateTotalFilters(currentProjectArchivedFilters ?? {}) !== 0 && (
        <div className="border-b border-subtle px-5 py-3">
          <ModuleAppliedFiltersList
            appliedFilters={currentProjectArchivedFilters ?? {}}
            handleClearAllFilters={() => clearAllFilters(projectId.toString(), "archived")}
            handleRemoveFilter={handleRemoveFilter}
            alwaysAllowEditing
            isArchived
          />
        </div>
      )}
      {totalArchivedModules === 0 ? (
        <div className="h-full place-items-center">
          <EmptyStateDetailed
            assetKey="archived-module"
            title={t("workspace_empty_state.archive_modules.title")}
            description={t("workspace_empty_state.archive_modules.description")}
          />
        </div>
      ) : (
        <div className="relative h-full w-full overflow-auto">
          <ArchivedModulesView workspaceSlug={workspaceSlug.toString()} projectId={projectId.toString()} />
        </div>
      )}
    </>
  );
});
