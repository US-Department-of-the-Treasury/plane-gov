import React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
// plane package imports
import { useTranslation } from "@plane/i18n";
import { Loader } from "@plane/ui";
// plane web hooks
import { useAnalytics } from "@/hooks/store/use-analytics";
// services
import { ProjectService } from "@/services/project";
import { queryKeys } from "@/store/queries/query-keys";
// plane web components
import AnalyticsSectionWrapper from "../analytics-section-wrapper";
import ActiveProjectItem from "./active-project-item";

const projectService = new ProjectService();

function ActiveProjects() {
  const { t } = useTranslation();
  const { workspaceSlug } = useParams();
  const { selectedDurationLabel } = useAnalytics();
  const { data: projectAnalyticsCount, isPending: isProjectAnalyticsCountLoading } = useQuery({
    queryKey: [...queryKeys.projects.analytics(workspaceSlug?.toString() ?? ""), "count"],
    queryFn: () =>
      projectService.getProjectAnalyticsCount(workspaceSlug.toString(), {
        fields: "total_work_items,total_completed_work_items",
      }),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  return (
    <AnalyticsSectionWrapper
      title={`${t("workspace_analytics.active_projects")}`}
      subtitle={selectedDurationLabel}
      className="md:col-span-2"
    >
      <div className="flex flex-col gap-4 h-[350px] overflow-auto">
        {isProjectAnalyticsCountLoading &&
          Array.from({ length: 5 }).map((_, index) => <Loader.Item key={index} height="40px" width="100%" />)}
        {!isProjectAnalyticsCountLoading &&
          projectAnalyticsCount?.map((project) => <ActiveProjectItem key={project.id} project={project} />)}
      </div>
    </AnalyticsSectionWrapper>
  );
}

export default ActiveProjects;
