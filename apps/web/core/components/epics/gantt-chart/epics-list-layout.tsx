import { useParams } from "next/navigation";
// PLane
import { GANTT_TIMELINE_TYPE } from "@plane/types";
import type { IBlockUpdateData, IBlockUpdateDependencyData, IEpic } from "@plane/types";
// components
import { GanttChartRoot, EpicGanttSidebar } from "@/components/gantt-chart";
import { TimeLineTypeContext } from "@/components/gantt-chart/contexts";
import { EpicGanttBlock } from "@/components/epics";
// hooks
import { useEpicFilter } from "@/hooks/store/use-epic-filter";
import { useProject } from "@/hooks/store/use-project";
import { useProjectEpics, useUpdateEpic } from "@/store/queries/epic";

export function EpicsListGanttChartView() {
  // router
  const { workspaceSlug, projectId } = useParams();
  // store
  const { currentProjectDetails } = useProject();
  const { currentProjectDisplayFilters: displayFilters } = useEpicFilter();
  // query hooks
  const { data: epics } = useProjectEpics(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "");
  const { mutate: updateEpic } = useUpdateEpic();

  // derived values
  const filteredEpicIds = epics?.map((epic) => epic.id);

  const handleEpicUpdate = async (epic: IEpic, data: IBlockUpdateData) => {
    if (!workspaceSlug || !epic) return;

    const payload: any = { ...data };
    if (data.sort_order) payload.sort_order = data.sort_order.newSortOrder;

    return new Promise<void>((resolve, reject) => {
      updateEpic(
        {
          workspaceSlug: workspaceSlug.toString(),
          projectId: epic.project_id,
          epicId: epic.id,
          data: payload,
        },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        }
      );
    });
  };

  const updateBlockDates = async (blockUpdates: IBlockUpdateDependencyData[]) => {
    const blockUpdate = blockUpdates[0];

    if (!blockUpdate) return;

    const payload: Partial<IEpic> = {};

    if (blockUpdate.start_date) payload.start_date = blockUpdate.start_date;
    if (blockUpdate.target_date) payload.target_date = blockUpdate.target_date;

    return new Promise<void>((resolve, reject) => {
      updateEpic(
        {
          workspaceSlug: workspaceSlug.toString(),
          projectId: projectId.toString(),
          epicId: blockUpdate.id,
          data: payload,
        },
        {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        }
      );
    });
  };

  const isAllowed = currentProjectDetails?.member_role === 20 || currentProjectDetails?.member_role === 15;

  if (!filteredEpicIds) return null;

  return (
    <TimeLineTypeContext.Provider value={GANTT_TIMELINE_TYPE.EPIC}>
      <GanttChartRoot
        title="Epics"
        loaderTitle="Epics"
        blockIds={filteredEpicIds}
        sidebarToRender={(props) => <EpicGanttSidebar {...props} />}
        blockUpdateHandler={(block, payload) => handleEpicUpdate(block, payload)}
        blockToRender={(data: IEpic) => <EpicGanttBlock epicId={data.id} />}
        enableBlockLeftResize={isAllowed}
        enableBlockRightResize={isAllowed}
        enableBlockMove={isAllowed}
        enableReorder={isAllowed && displayFilters?.order_by === "sort_order"}
        enableAddBlock={isAllowed}
        updateBlockDates={updateBlockDates}
        showAllBlocks
      />
    </TimeLineTypeContext.Provider>
  );
}
