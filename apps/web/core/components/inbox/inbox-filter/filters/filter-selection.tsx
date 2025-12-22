import type { FC } from "react";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Search } from "lucide-react";
import { CloseIcon } from "@plane/propel/icons";
// hooks
import { useProjectLabels } from "@/store/queries/label";
import { useProjectStates } from "@/store/queries/state";
import { useProjectMembers, getProjectUserIds } from "@/store/queries/member";
import { usePlatformOS } from "@/hooks/use-platform-os";
// local imports
import { FilterDate } from "./date";
import { FilterLabels } from "./labels";
import { FilterMember } from "./members";
import { FilterPriority } from "./priority";
import { FilterState } from "./state";
import { FilterStatus } from "./status";

export function InboxIssueFilterSelection() {
  // hooks
  const { workspaceSlug, projectId } = useParams();
  const { isMobile } = usePlatformOS();
  const { data: projectMembers } = useProjectMembers(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );
  const { data: projectLabels } = useProjectLabels(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );
  const { data: projectStates } = useProjectStates(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );
  // states
  const [filtersSearchQuery, setFiltersSearchQuery] = useState("");

  const projectMemberIds = getProjectUserIds(projectMembers);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="bg-surface-1 p-2.5 pb-0">
        <div className="flex items-center gap-1.5 rounded-sm border-[0.5px] border-subtle bg-surface-2 px-1.5 py-1 text-11">
          <Search className="text-placeholder" size={12} strokeWidth={2} />
          <input
            type="text"
            className="w-full bg-surface-2 outline-none placeholder:text-placeholder"
            placeholder="Search"
            value={filtersSearchQuery}
            onChange={(e) => setFiltersSearchQuery(e.target.value)}
            autoFocus={!isMobile}
          />
          {filtersSearchQuery !== "" && (
            <button type="button" className="grid place-items-center" onClick={() => setFiltersSearchQuery("")}>
              <CloseIcon className="text-tertiary" height={12} width={12} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <div className="h-full w-full divide-y divide-subtle-1 overflow-y-auto px-2.5 vertical-scrollbar scrollbar-sm">
        {/* status */}
        <div className="py-2">
          <FilterStatus searchQuery={filtersSearchQuery} />
        </div>
        {/* Priority */}
        <div className="py-2">
          <FilterPriority searchQuery={filtersSearchQuery} />
        </div>
        {/* assignees */}
        <div className="py-2">
          <FilterMember
            filterKey="assignees"
            label="Assignees"
            searchQuery={filtersSearchQuery}
            memberIds={projectMemberIds ?? []}
          />
        </div>
        {/* Created By */}
        <div className="py-2">
          <FilterMember
            filterKey="created_by"
            label="Created By"
            searchQuery={filtersSearchQuery}
            memberIds={projectMemberIds ?? []}
          />
        </div>
        {/* Labels */}
        <div className="py-2">
          <FilterLabels searchQuery={filtersSearchQuery} labels={projectLabels ?? []} />
        </div>
        {/* Created at */}
        <div className="py-2">
          <FilterDate filterKey="created_at" label="Created date" searchQuery={filtersSearchQuery} />
        </div>
        {/* Updated at */}
        <div className="py-2">
          <FilterDate filterKey="updated_at" label="Last updated date" searchQuery={filtersSearchQuery} />
        </div>
      </div>
    </div>
  );
}
