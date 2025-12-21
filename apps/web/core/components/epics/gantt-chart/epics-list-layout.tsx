import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// PLane
import { GANTT_TIMELINE_TYPE } from "@plane/types";
import type { IBlockUpdateData, IBlockUpdateDependencyData, IEpic } from "@plane/types";
// components
import { GanttChartRoot, ModuleGanttSidebar } from "@/components/gantt-chart";
import { TimeLineTypeContext } from "@/components/gantt-chart/contexts";
import { ModuleGanttBlock } from "@/components/epics";
// hooks
import { useEpic } from "@/hooks/store/use-epic";
import { useEpicFilter } from "@/hooks/store/use-epic-filter";
import { useProject } from "@/hooks/store/use-project";

export const ModulesListGanttChartView = observer(function ModulesListGanttChartView() {
  // router
  const { workspaceSlug, projectId } = useParams();
  // store
  const { currentProjectDetails } = useProject();
  const { getFilteredEpicIds, updateEpicDetails } = useEpic();
  const { currentProjectDisplayFilters: displayFilters } = useEpicFilter();

  // derived values
  const filteredModuleIds = projectId ? getFilteredEpicIds(projectId.toString()) : undefined;

  const handleEpicUpdate = async (epic: IEpic, data: IBlockUpdateData) => {
    if (!workspaceSlug || !epic) return;

    const payload: any = { ...data };
    if (data.sort_order) payload.sort_order = data.sort_order.newSortOrder;

    await updateEpicDetails(workspaceSlug.toString(), module.project_id, module.id, payload);
  };

  const updateBlockDates = async (blockUpdates: IBlockUpdateDependencyData[]) => {
    const blockUpdate = blockUpdates[0];

    if (!blockUpdate) return;

    const payload: Partial<IEpic> = {};

    if (blockUpdate.start_date) payload.start_date = blockUpdate.start_date;
    if (blockUpdate.target_date) payload.target_date = blockUpdate.target_date;

    await updateEpicDetails(workspaceSlug.toString(), projectId.toString(), blockUpdate.id, payload);
  };

  const isAllowed = currentProjectDetails?.member_role === 20 || currentProjectDetails?.member_role === 15;

  if (!filteredModuleIds) return null;

  return (
    <TimeLineTypeContext.Provider value={GANTT_TIMELINE_TYPE.MODULE}>
      <GanttChartRoot
        title="Epics"
        loaderTitle="Epics"
        blockIds={filteredModuleIds}
        sidebarToRender={(props) => <ModuleGanttSidebar {...props} />}
        blockUpdateHandler={(block, payload) => handleEpicUpdate(block, payload)}
        blockToRender={(data: IEpic) => <ModuleGanttBlock epicId={data.id} />}
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
});
