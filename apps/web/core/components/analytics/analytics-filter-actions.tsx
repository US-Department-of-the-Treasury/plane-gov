// plane web components
import { useParams } from "next/navigation";
// hooks
import { useAnalytics } from "@/hooks/store/use-analytics";
import { useProjects, getJoinedProjectIds } from "@/store/queries/project";
// components
import { ProjectSelect } from "./select/project";

function AnalyticsFilterActions() {
  const { selectedProjects, updateSelectedProjects } = useAnalytics();
  const { workspaceSlug } = useParams();
  const { data: projects } = useProjects(workspaceSlug?.toString() ?? "");
  const joinedProjectIds = getJoinedProjectIds(projects);
  return (
    <div className="flex items-center justify-end gap-2">
      <ProjectSelect
        value={selectedProjects}
        onChange={(val) => {
          updateSelectedProjects(val ?? []);
        }}
        projectIds={joinedProjectIds}
      />
      {/* <DurationDropdown
        buttonVariant="border-with-text"
        value={selectedDuration}
        onChange={(val) => {
          updateSelectedDuration(val);
        }}
        dropdownArrow
      /> */}
    </div>
  );
}

export default AnalyticsFilterActions;
