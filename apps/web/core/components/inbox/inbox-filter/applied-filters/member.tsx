import type { FC } from "react";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { observer } from "mobx-react";

// plane types
import { CloseIcon } from "@plane/propel/icons";
import type { TInboxIssueFilterMemberKeys } from "@plane/types";
// plane ui
import { Avatar, Tag } from "@plane/ui";
// helpers
import { getFileURL } from "@plane/utils";
// hooks
import { useProjectInbox } from "@/hooks/store/use-project-inbox";
import { useWorkspaceMembers, getWorkspaceMembersMap } from "@/store/queries/member";

type InboxIssueAppliedFiltersMember = {
  filterKey: TInboxIssueFilterMemberKeys;
  label: string;
};

export const InboxIssueAppliedFiltersMember = observer(function InboxIssueAppliedFiltersMember(
  props: InboxIssueAppliedFiltersMember
) {
  const { filterKey, label } = props;
  // router
  const { workspaceSlug } = useParams();
  // hooks
  const { inboxFilters, handleInboxIssueFilters } = useProjectInbox();
  const { data: workspaceMembers } = useWorkspaceMembers(workspaceSlug?.toString());
  // derived values
  const filteredValues = inboxFilters?.[filterKey] || [];

  const membersMap = useMemo(() => {
    if (!workspaceMembers) return new Map();
    return getWorkspaceMembersMap(workspaceMembers);
  }, [workspaceMembers]);

  const currentOptionDetail = (memberId: string) => membersMap.get(memberId)?.member || undefined;

  const handleFilterValue = (value: string): string[] =>
    filteredValues?.includes(value) ? filteredValues.filter((v) => v !== value) : [...filteredValues, value];

  const clearFilter = () => handleInboxIssueFilters(filterKey, undefined);

  if (filteredValues.length === 0) return <></>;
  return (
    <Tag>
      <div className="text-11 text-secondary">{label}</div>
      {filteredValues.map((value) => {
        const optionDetail = currentOptionDetail(value);
        if (!optionDetail) return <></>;
        return (
          <div key={value} className="relative flex items-center gap-1 rounded-sm bg-layer-1 p-1 text-11">
            <div className="flex-shrink-0 relative flex justify-center items-center overflow-hidden">
              <Avatar
                name={optionDetail.display_name}
                src={getFileURL(optionDetail.avatar_url)}
                showTooltip={false}
                size="sm"
              />
            </div>
            <div className="text-11 truncate">{optionDetail?.display_name}</div>
            <div
              className="w-3 h-3 flex-shrink-0 relative flex justify-center items-center overflow-hidden cursor-pointer text-tertiary hover:text-secondary transition-all"
              onClick={() => handleInboxIssueFilters(filterKey, handleFilterValue(value))}
            >
              <CloseIcon className={`w-3 h-3`} />
            </div>
          </div>
        );
      })}

      <div
        className="w-3 h-3 flex-shrink-0 relative flex justify-center items-center overflow-hidden cursor-pointer text-tertiary hover:text-secondary transition-all"
        onClick={clearFilter}
      >
        <CloseIcon className={`w-3 h-3`} />
      </div>
    </Tag>
  );
});
