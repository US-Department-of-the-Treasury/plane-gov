import React, { useCallback } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
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
import { useEpic } from "@/hooks/store/use-epic";
import { useEpicFilter } from "@/hooks/store/use-epic-filter";

export const ArchivedEpicLayoutRoot = observer(function ArchivedEpicLayoutRoot() {
  // router
  const { workspaceSlug, projectId } = useParams();
  // plane hooks
  const { t } = useTranslation();
  // hooks
  const { fetchArchivedEpics, projectArchivedEpicIds, loader } = useEpic();
  const { clearAllFilters, currentProjectArchivedFilters, updateFilters } = useEpicFilter();
  // derived values
  const totalArchivedEpics = projectArchivedEpicIds?.length ?? 0;

  useSWR(
    workspaceSlug && projectId ? `ARCHIVED_EPICS_${workspaceSlug.toString()}_${projectId.toString()}` : null,
    async () => {
      if (workspaceSlug && projectId) {
        await fetchArchivedEpics(workspaceSlug.toString(), projectId.toString());
      }
    },
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

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

  if (loader || !projectArchivedEpicIds) {
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
});
