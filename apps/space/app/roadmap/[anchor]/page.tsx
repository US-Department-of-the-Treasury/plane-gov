import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
// plane imports
import { SitesRoadmapService } from "@plane/services";
import type { TRoadmapResponse } from "@plane/services";
// components
import { LogoSpinner } from "@/components/common/logo-spinner";
import { SomethingWentWrongError } from "@/components/issues/issue-layouts/error";
import { RoadmapHeader } from "@/components/roadmap/header";
import { RoadmapKanbanView } from "@/components/roadmap/kanban-view";
import { RoadmapListView } from "@/components/roadmap/list-view";
// hooks
import { usePublish } from "@/hooks/store/publish";

const roadmapService = new SitesRoadmapService();

type RoadmapViewMode = "kanban" | "list";

const RoadmapPage = observer(function RoadmapPage() {
  // params
  const params = useParams<{ anchor: string }>();
  const { anchor } = params;
  // state
  const [viewMode, setViewMode] = useState<RoadmapViewMode>("kanban");
  // store
  const publishSettings = usePublish(anchor);

  // Fetch roadmap data
  const {
    data: roadmapData,
    error,
    isLoading,
  } = useSWR<TRoadmapResponse, Error>(
    anchor ? `ROADMAP_${anchor}` : null,
    anchor ? () => roadmapService.getRoadmap(anchor) : null
  );

  if (isLoading) {
    return (
      <div className="bg-surface-1 flex items-center justify-center h-full w-full">
        <LogoSpinner />
      </div>
    );
  }

  if (error) {
    return <SomethingWentWrongError />;
  }

  if (!roadmapData || !publishSettings) return null;

  return (
    <div className="flex flex-col h-full">
      <RoadmapHeader
        projectName={publishSettings.project_details?.name || "Product Roadmap"}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        counts={roadmapData.counts}
      />
      <div className="flex-1 overflow-auto p-4">
        {viewMode === "kanban" ? (
          <RoadmapKanbanView
            issues={roadmapData.issues}
            states={roadmapData.states}
            settings={roadmapData.settings}
            anchor={anchor}
          />
        ) : (
          <RoadmapListView
            issues={roadmapData.issues}
            states={roadmapData.states}
            settings={roadmapData.settings}
            anchor={anchor}
          />
        )}
      </div>
    </div>
  );
});

export default RoadmapPage;
