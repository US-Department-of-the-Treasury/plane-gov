import React, { useCallback } from "react";
import { useParams } from "next/navigation";
// plane imports
import { useTranslation } from "@plane/i18n";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
import type { TEpicFilters } from "@plane/types";
// components
import { calculateTotalFilters } from "@plane/utils";
import { ArchivedEpicsView, EpicAppliedFiltersList } from "@/components/epics";
import { SprintEpicListLayoutLoader } from "@/components/ui/loader/sprint-epic-list-loader";
// helpers
// hooks
import { useEpicFilter } from "@/hooks/store/use-epic-filter";
// queries
import { useArchivedEpics } from "@/store/queries/epic";

export function ArchivedEpicLayoutRoot() {
  // router
  const { workspaceSlug, projectId } = useParams();
  // plane hooks
  const { t } = useTranslation();
  // hooks
  const { clearAllFilters, currentProjectArchivedFilters, updateFilters } = useEpicFilter();
  // queries
  const { data: archivedEpics, isLoading } = useArchivedEpics(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );
  // derived values
  const totalArchivedEpics = archivedEpics?.length ?? 0;

  const handleRemoveFilter = useCallback(
    (key: keyof TEpicFilters, value: string | null) => {
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
    return <SprintEpicListLayoutLoader />;
  }

  return (
    <>
      {calculateTotalFilters(currentProjectArchivedFilters ?? {}) !== 0 && (
        <div className="border-b border-subtle px-5 py-3">
          <EpicAppliedFiltersList
            appliedFilters={currentProjectArchivedFilters ?? {}}
            handleClearAllFilters={() => clearAllFilters(projectId.toString(), "archived")}
            handleRemoveFilter={handleRemoveFilter}
            alwaysAllowEditing
            isArchived
          />
        </div>
      )}
      {totalArchivedEpics === 0 ? (
        <div className="h-full place-items-center">
          <EmptyStateDetailed
            assetKey="archived-epic"
            title={t("workspace_empty_state.archive_epics.title")}
            description={t("workspace_empty_state.archive_epics.description")}
          />
        </div>
      ) : (
        <div className="relative h-full w-full overflow-auto">
          <ArchivedEpicsView workspaceSlug={workspaceSlug.toString()} projectId={projectId.toString()} />
        </div>
      )}
    </>
  );
}
