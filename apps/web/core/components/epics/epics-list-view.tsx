import { useParams, useSearchParams } from "next/navigation";
// components
import { EUserPermissionsLevel, EPIC_TRACKER_ELEMENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
import { EUserProjectRoles } from "@plane/types";
import { ContentWrapper, Row, ERowVariant } from "@plane/ui";
// components
import { ListLayout } from "@/components/core/list";
import { EpicCardItem, EpicListItem, EpicPeekOverview, EpicsListGanttChartView } from "@/components/epics";
import { SprintEpicBoardLayoutLoader } from "@/components/ui/loader/sprint-epic-board-loader";
import { SprintEpicListLayoutLoader } from "@/components/ui/loader/sprint-epic-list-loader";
import { GanttLayoutLoader } from "@/components/ui/loader/layouts/gantt-layout-loader";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useEpicFilter } from "@/hooks/store/use-epic-filter";
import { useUserPermissions } from "@/hooks/store/user";
import { useProjectEpics } from "@/store/queries/epic";

export function EpicsListView() {
  // router
  const { workspaceSlug, projectId } = useParams();
  const searchParams = useSearchParams();
  const peekEpic = searchParams.get("peekEpic");
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { toggleCreateEpicModal } = useCommandPalette();
  const { currentProjectDisplayFilters: displayFilters } = useEpicFilter();
  const { allowPermissions } = useUserPermissions();
  // query hooks
  const { data: epics, isLoading } = useProjectEpics(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "");

  // derived values
  const projectEpicIds = epics?.map((epic) => epic.id);
  const filteredEpicIds = epics?.map((epic) => epic.id);
  const canPerformEmptyStateActions = allowPermissions(
    [EUserProjectRoles.ADMIN, EUserProjectRoles.MEMBER],
    EUserPermissionsLevel.PROJECT
  );

  if (isLoading || !projectEpicIds || !filteredEpicIds)
    return (
      <>
        {displayFilters?.layout === "list" && <SprintEpicListLayoutLoader />}
        {displayFilters?.layout === "board" && <SprintEpicBoardLayoutLoader />}
        {displayFilters?.layout === "gantt" && <GanttLayoutLoader />}
      </>
    );

  if (projectEpicIds.length === 0)
    return (
      <EmptyStateDetailed
        assetKey="epic"
        title={t("project_empty_state.epics.title")}
        description={t("project_empty_state.epics.description")}
        actions={[
          {
            label: t("project_empty_state.epics.cta_primary"),
            onClick: () => toggleCreateEpicModal(true),
            disabled: !canPerformEmptyStateActions,
            variant: "primary",
            "data-ph-element": EPIC_TRACKER_ELEMENTS.EMPTY_STATE_ADD_BUTTON,
          },
        ]}
      />
    );

  if (filteredEpicIds.length === 0)
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
            {filteredEpicIds.map((epicId) => (
              <EpicListItem key={epicId} epicId={epicId} />
            ))}
          </ListLayout>
        )}
        {displayFilters?.layout === "board" && (
          <Row
            className={`size-full py-page-y grid grid-cols-1 gap-6 overflow-y-auto ${
              peekEpic
                ? "lg:grid-cols-1 xl:grid-cols-2 3xl:grid-cols-3"
                : "lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4"
            } auto-rows-max transition-all vertical-scrollbar scrollbar-lg`}
          >
            {filteredEpicIds.map((epicId) => (
              <EpicCardItem key={epicId} epicId={epicId} />
            ))}
          </Row>
        )}
        {displayFilters?.layout === "gantt" && (
          <div className="size-full overflow-hidden">
            <EpicsListGanttChartView />
          </div>
        )}
        <div className="flex-shrink-0">
          <EpicPeekOverview projectId={projectId?.toString() ?? ""} workspaceSlug={workspaceSlug?.toString() ?? ""} />
        </div>
      </div>
    </ContentWrapper>
  );
}
