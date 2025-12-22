import { useMemo } from "react";
// assets
import AllFiltersImage from "@/app/assets/empty-state/epic/all-filters.svg?url";
import NameFilterImage from "@/app/assets/empty-state/epic/name-filter.svg?url";
// components
import { EpicListItem, EpicPeekOverview } from "@/components/epics";
// ui
import { SprintEpicListLayoutLoader } from "@/components/ui/loader/sprint-epic-list-loader";
// hooks
import { useEpicFilter } from "@/hooks/store/use-epic-filter";
// queries
import { useArchivedEpics } from "@/store/queries/epic";

export interface IArchivedEpicsView {
  workspaceSlug: string;
  projectId: string;
}

export function ArchivedEpicsView(props: IArchivedEpicsView) {
  const { workspaceSlug, projectId } = props;
  // queries
  const { data: archivedEpics, isLoading } = useArchivedEpics(workspaceSlug, projectId);
  const { archivedEpicsSearchQuery } = useEpicFilter();

  // derived values - filter epics based on search query
  const filteredArchivedEpicIds = useMemo(() => {
    if (!archivedEpics) return [];

    const searchQuery = archivedEpicsSearchQuery.trim().toLowerCase();
    if (!searchQuery) return archivedEpics.map(epic => epic.id);

    return archivedEpics
      .filter(epic => epic.name.toLowerCase().includes(searchQuery))
      .map(epic => epic.id);
  }, [archivedEpics, archivedEpicsSearchQuery]);

  if (isLoading || !filteredArchivedEpicIds) return <SprintEpicListLayoutLoader />;

  if (filteredArchivedEpicIds.length === 0)
    return (
      <div className="h-full w-full grid place-items-center">
        <div className="text-center">
          <img
            src={archivedEpicsSearchQuery.trim() === "" ? AllFiltersImage : NameFilterImage}
            className="h-36 sm:h-48 w-36 sm:w-48 mx-auto"
            alt="No matching epics"
          />
          <h5 className="text-18 font-medium mt-7 mb-1">No matching epics</h5>
          <p className="text-placeholder text-14">
            {archivedEpicsSearchQuery.trim() === ""
              ? "Remove the filters to see all epics"
              : "Remove the search criteria to see all epics"}
          </p>
        </div>
      </div>
    );

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex h-full w-full justify-between">
        <div className="flex h-full w-full flex-col overflow-y-auto vertical-scrollbar scrollbar-lg">
          {filteredArchivedEpicIds.map((epicId) => (
            <EpicListItem key={epicId} epicId={epicId} />
          ))}
        </div>
        <EpicPeekOverview
          projectId={projectId?.toString() ?? ""}
          workspaceSlug={workspaceSlug?.toString() ?? ""}
          isArchived
        />
      </div>
    </div>
  );
}
