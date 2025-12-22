import type { FC } from "react";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { sortBy } from "lodash-es";
import { observer } from "mobx-react";
// plane types
import type { TInboxIssueFilterMemberKeys } from "@plane/types";
// plane ui
import { Avatar, Loader } from "@plane/ui";
// components
import { getFileURL } from "@plane/utils";
import { FilterHeader, FilterOption } from "@/components/issues/issue-layouts/filters";
// helpers
// hooks
import { useProjectInbox } from "@/hooks/store/use-project-inbox";
import { useUser } from "@/hooks/store/user";
import { useWorkspaceMembers, getWorkspaceMembersMap } from "@/store/queries/member";

type Props = {
  filterKey: TInboxIssueFilterMemberKeys;
  label?: string;
  memberIds: string[] | undefined;
  searchQuery: string;
};

export const FilterMember = observer(function FilterMember(props: Props) {
  const { filterKey, label = "Members", memberIds, searchQuery } = props;
  // router
  const { workspaceSlug } = useParams();
  // hooks
  const { inboxFilters, handleInboxIssueFilters } = useProjectInbox();
  const { data: currentUser } = useUser();
  const { data: workspaceMembers, isLoading } = useWorkspaceMembers(workspaceSlug?.toString());
  // states
  const [itemsToRender, setItemsToRender] = useState(5);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  // derived values
  const filterValue = inboxFilters?.[filterKey] || [];
  const appliedFiltersCount = filterValue?.length ?? 0;

  // create members map for quick lookup
  const membersMap = useMemo(() => {
    if (!workspaceMembers) return new Map();
    return getWorkspaceMembersMap(workspaceMembers);
  }, [workspaceMembers]);

  const sortedOptions = useMemo(() => {
    const filteredOptions = (memberIds || []).filter((memberId) => {
      const member = membersMap.get(memberId);
      return member?.member?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return sortBy(filteredOptions, [
      (memberId) => !filterValue.includes(memberId),
      (memberId) => memberId !== currentUser?.id,
      (memberId) => membersMap.get(memberId)?.member?.display_name?.toLowerCase() || "",
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, membersMap, memberIds, filterValue, currentUser?.id]);

  const handleViewToggle = () => {
    if (!sortedOptions) return;

    if (itemsToRender === sortedOptions.length) setItemsToRender(5);
    else setItemsToRender(sortedOptions.length);
  };

  const handleFilterValue = (value: string): string[] =>
    filterValue?.includes(value) ? filterValue.filter((v) => v !== value) : [...filterValue, value];

  return (
    <>
      <FilterHeader
        title={`${label} ${appliedFiltersCount > 0 ? ` (${appliedFiltersCount})` : ""}`}
        isPreviewEnabled={previewEnabled}
        handleIsPreviewEnabled={() => setPreviewEnabled(!previewEnabled)}
      />
      {previewEnabled && (
        <div>
          {!isLoading && sortedOptions ? (
            sortedOptions.length > 0 ? (
              <>
                {sortedOptions.slice(0, itemsToRender).map((memberId) => {
                  const workspaceMember = membersMap.get(memberId);
                  const member = workspaceMember?.member;

                  if (!member) return null;
                  return (
                    <FilterOption
                      key={`members-${memberId}`}
                      isChecked={filterValue?.includes(memberId) ? true : false}
                      onClick={() => handleInboxIssueFilters(filterKey, handleFilterValue(memberId))}
                      icon={
                        <Avatar
                          name={member.display_name}
                          src={getFileURL(member.avatar_url)}
                          showTooltip={false}
                          size="md"
                        />
                      }
                      title={currentUser?.id === memberId ? "You" : member?.display_name}
                    />
                  );
                })}
                {sortedOptions.length > 5 && (
                  <button
                    type="button"
                    className="ml-8 text-11 font-medium text-accent-primary"
                    onClick={handleViewToggle}
                  >
                    {itemsToRender === sortedOptions.length ? "View less" : "View all"}
                  </button>
                )}
              </>
            ) : (
              <p className="text-11 italic text-placeholder">No matches found</p>
            )
          ) : (
            <Loader className="space-y-2">
              <Loader.Item height="20px" />
              <Loader.Item height="20px" />
              <Loader.Item height="20px" />
            </Loader>
          )}
        </div>
      )}
    </>
  );
});
