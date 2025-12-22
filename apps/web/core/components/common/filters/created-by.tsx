import { useMemo, useState } from "react";
import { sortBy } from "lodash-es";
// ui
import { Avatar, Loader } from "@plane/ui";
// components
import { getFileURL } from "@plane/utils";
import { FilterHeader, FilterOption } from "@/components/issues/issue-layouts/filters";
// helpers
// hooks
import { useWorkspaceMembers, getWorkspaceMemberByUserId, getMemberDisplayName } from "@/store/queries/member";
import { useUser } from "@/hooks/store/user";

type Props = {
  appliedFilters: string[] | null;
  handleUpdate: (val: string) => void;
  memberIds: string[] | undefined;
  searchQuery: string;
  workspaceSlug: string;
};

export function FilterCreatedBy(props: Props) {
  const { appliedFilters, handleUpdate, memberIds, searchQuery, workspaceSlug } = props;
  // states
  const [itemsToRender, setItemsToRender] = useState(5);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  // store hooks
  const { data: members } = useWorkspaceMembers(workspaceSlug);
  const { data: currentUser } = useUser();

  const appliedFiltersCount = appliedFilters?.length ?? 0;

  const sortedOptions = useMemo(() => {
    const filteredOptions = (memberIds || []).filter((memberId) => {
      const member = getWorkspaceMemberByUserId(members, memberId);
      return member && getMemberDisplayName(member).toLowerCase().includes(searchQuery.toLowerCase());
    });

    return sortBy(filteredOptions, [
      (memberId) => !(appliedFilters ?? []).includes(memberId),
      (memberId) => memberId !== currentUser?.id,
      (memberId) => {
        const member = getWorkspaceMemberByUserId(members, memberId);
        return member ? getMemberDisplayName(member).toLowerCase() : "";
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, members]);

  const handleViewToggle = () => {
    if (!sortedOptions) return;

    if (itemsToRender === sortedOptions.length) setItemsToRender(5);
    else setItemsToRender(sortedOptions.length);
  };

  return (
    <>
      <FilterHeader
        title={`Created by${appliedFiltersCount > 0 ? ` (${appliedFiltersCount})` : ""}`}
        isPreviewEnabled={previewEnabled}
        handleIsPreviewEnabled={() => setPreviewEnabled(!previewEnabled)}
      />
      {previewEnabled && (
        <div>
          {sortedOptions ? (
            sortedOptions.length > 0 ? (
              <>
                {sortedOptions.slice(0, itemsToRender).map((memberId) => {
                  const member = getWorkspaceMemberByUserId(members, memberId);

                  if (!member) return null;

                  const displayName = getMemberDisplayName(member);

                  return (
                    <FilterOption
                      key={`member-${member.id}`}
                      isChecked={appliedFilters?.includes(member.id) ? true : false}
                      onClick={() => handleUpdate(member.id)}
                      icon={
                        <Avatar
                          name={displayName}
                          src={getFileURL(member.avatar_url)}
                          showTooltip={false}
                          size="md"
                        />
                      }
                      title={currentUser?.id === member.id ? "You" : displayName}
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
}
