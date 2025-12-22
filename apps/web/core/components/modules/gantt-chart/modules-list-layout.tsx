import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// PLane
import { GANTT_TIMELINE_TYPE } from "@plane/types";
import type { IBlockUpdateData, IBlockUpdateDependencyData, IModule } from "@plane/types";
// components
import { GanttChartRoot, ModuleGanttSidebar } from "@/components/gantt-chart";
import { TimeLineTypeContext } from "@/components/gantt-chart/contexts";
import { ModuleGanttBlock } from "@/components/modules";
// hooks
import { useModule } from "@/hooks/store/use-module";
import { useModuleFilter } from "@/hooks/store/use-module-filter";
import { useUpdateModule } from "@/store/queries/module";
import { useProjectDetails } from "@/store/queries/project";

export const ModulesListGanttChartView = observer(function ModulesListGanttChartView() {
  // router
  const { workspaceSlug, projectId } = useParams();
  // store
  const { getFilteredModuleIds } = useModule();
  const { currentProjectDisplayFilters: displayFilters } = useModuleFilter();
  // mutation hooks
  const { mutate: updateModule } = useUpdateModule();
  // query hooks
  const { data: currentProjectDetails } = useProjectDetails(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );

  // derived values
  const filteredModuleIds = projectId ? getFilteredModuleIds(projectId.toString()) : undefined;

  const handleModuleUpdate = (module: IModule, data: IBlockUpdateData) => {
    if (!workspaceSlug || !module) return;

    const payload: any = { ...data };
    if (data.sort_order) payload.sort_order = data.sort_order.newSortOrder;

    updateModule({
      workspaceSlug: workspaceSlug.toString(),
      projectId: module.project_id,
      moduleId: module.id,
      data: payload,
    });
  };

  const updateBlockDates = (blockUpdates: IBlockUpdateDependencyData[]) => {
    const blockUpdate = blockUpdates[0];

    if (!blockUpdate) return;

    const payload: Partial<IModule> = {};

    if (blockUpdate.start_date) payload.start_date = blockUpdate.start_date;
    if (blockUpdate.target_date) payload.target_date = blockUpdate.target_date;

    updateModule({
      workspaceSlug: workspaceSlug.toString(),
      projectId: projectId.toString(),
      moduleId: blockUpdate.id,
      data: payload,
    });
  };

  const isAllowed = currentProjectDetails?.member_role === 20 || currentProjectDetails?.member_role === 15;

  if (!filteredModuleIds) return null;

  return (
    <TimeLineTypeContext.Provider value={GANTT_TIMELINE_TYPE.MODULE}>
      <GanttChartRoot
        title="Modules"
        loaderTitle="Modules"
        blockIds={filteredModuleIds}
        sidebarToRender={(props) => <ModuleGanttSidebar {...props} />}
        blockUpdateHandler={(block, payload) => handleModuleUpdate(block, payload)}
        blockToRender={(data: IModule) => <ModuleGanttBlock moduleId={data.id} />}
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
