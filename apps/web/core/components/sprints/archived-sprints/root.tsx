import React from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
// plane imports
import { useTranslation } from "@plane/i18n";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
import type { TSprintFilters } from "@plane/types";
import { calculateTotalFilters } from "@plane/utils";
// components
import { SprintModuleListLayoutLoader } from "@/components/ui/loader/sprint-module-list-loader";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";
import { useSprintFilter } from "@/hooks/store/use-sprint-filter";
// local imports
import { SprintAppliedFiltersList } from "../applied-filters";
import { ArchivedSprintsView } from "./view";

export const ArchivedSprintLayoutRoot = observer(function ArchivedSprintLayoutRoot() {
  // router
  const { workspaceSlug, projectId } = useParams();
  // plane hooks
  const { t } = useTranslation();
  // hooks
  const { fetchArchivedSprints, currentProjectArchivedSprintIds, loader } = useSprint();
  // sprint filters hook
  const { clearAllFilters, currentProjectArchivedFilters, updateFilters } = useSprintFilter();
  // derived values
  const totalArchivedSprints = currentProjectArchivedSprintIds?.length ?? 0;

  useSWR(
    workspaceSlug && projectId ? `ARCHIVED_SPRINTS_${workspaceSlug.toString()}_${projectId.toString()}` : null,
    async () => {
      if (workspaceSlug && projectId) {
        await fetchArchivedSprints(workspaceSlug.toString(), projectId.toString());
      }
    },
    { revalidateIfStale: false, revalidateOnFocus: false }
  );

  const handleRemoveFilter = (key: keyof TSprintFilters, value: string | null) => {
    if (!projectId) return;
    let newValues = currentProjectArchivedFilters?.[key] ?? [];

    if (!value) newValues = [];
    else newValues = newValues.filter((val) => val !== value);

    updateFilters(projectId.toString(), { [key]: newValues }, "archived");
  };

  if (!workspaceSlug || !projectId) return <></>;

  if (loader || !currentProjectArchivedSprintIds) {
    return <SprintModuleListLayoutLoader />;
  }

  return (
    <>
      {calculateTotalFilters(currentProjectArchivedFilters ?? {}) !== 0 && (
        <div className="border-b border-subtle px-5 py-3">
          <SprintAppliedFiltersList
            appliedFilters={currentProjectArchivedFilters ?? {}}
            handleClearAllFilters={() => clearAllFilters(projectId.toString(), "archived")}
            handleRemoveFilter={handleRemoveFilter}
          />
        </div>
      )}
      {totalArchivedSprints === 0 ? (
        <div className="h-full place-items-center">
          <EmptyStateDetailed
            assetKey="archived-sprint"
            title={t("workspace_empty_state.archive_sprints.title")}
            description={t("workspace_empty_state.archive_sprints.description")}
          />
        </div>
      ) : (
        <div className="relative h-full w-full overflow-auto">
          <ArchivedSprintsView workspaceSlug={workspaceSlug.toString()} projectId={projectId.toString()} />
        </div>
      )}
    </>
  );
});
