import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTheme } from "next-themes";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useWatch } from "react-hook-form";
import { Search } from "lucide-react";
import { Combobox, Dialog, Transition } from "@headlessui/react";
// plane imports
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { ISearchIssueResponse, IUser } from "@plane/types";
import { Loader } from "@plane/ui";
// assets
import darkIssuesAsset from "@/app/assets/empty-state/search/issues-dark.webp?url";
import lightIssuesAsset from "@/app/assets/empty-state/search/issues-light.webp?url";
import darkSearchAsset from "@/app/assets/empty-state/search/search-dark.webp?url";
import lightSearchAsset from "@/app/assets/empty-state/search/search-light.webp?url";
// components
import { SimpleEmptyState } from "@/components/empty-state/simple-empty-state-root";
// hooks
import useDebounce from "@/hooks/use-debounce";
// queries
import { useBulkDeleteIssues } from "@/store/queries/issue";
// services
import { ProjectService } from "@/services/project";
// local components
import { BulkDeleteIssuesModalItem } from "./bulk-delete-issues-modal-item";

type FormInput = {
  delete_issue_ids: string[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  user: IUser | undefined;
};

const projectService = new ProjectService();

// Note: observer() removed - this component uses TanStack Query, not MobX observables
export function BulkDeleteIssuesModal(props: Props) {
  const { isOpen, onClose } = props;
  // router params
  const { workspaceSlug, projectId } = useParams();
  // states
  const [query, setQuery] = useState("");
  const [issues, setIssues] = useState<ISearchIssueResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // theme hook
  const { resolvedTheme } = useTheme();
  // hooks
  const { t } = useTranslation();
  // mutations
  const { mutateAsync: bulkDeleteIssues } = useBulkDeleteIssues();
  // derived values
  const debouncedSearchTerm: string = useDebounce(query, 500);
  const searchResolvedPath = resolvedTheme === "light" ? lightSearchAsset : darkSearchAsset;
  const issuesResolvedPath = resolvedTheme === "light" ? lightIssuesAsset : darkIssuesAsset;

  useEffect(() => {
    if (!isOpen || !workspaceSlug || !projectId) return;

    let cancelled = false;

    setIsSearching(true);

    void (async () => {
      try {
        const res = await projectService.projectIssuesSearch(workspaceSlug.toString(), projectId.toString(), {
          search: debouncedSearchTerm,
          workspace_search: false,
        });
        if (!cancelled) {
          setIssues(res);
        }
      } catch {
        // Search failed - show empty state
        if (!cancelled) {
          setIssues([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearchTerm, isOpen, projectId, workspaceSlug]);

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormInput>({
    defaultValues: {
      delete_issue_ids: [],
    },
  });

  // Use useWatch hook for React Compiler compatibility
  const selectedIssueIds = useWatch({ control, name: "delete_issue_ids" }) ?? [];

  const handleClose = () => {
    setQuery("");
    reset();
    onClose();
  };

  const handleDelete: SubmitHandler<FormInput> = async (data) => {
    if (!workspaceSlug || !projectId) return;

    if (!data.delete_issue_ids || data.delete_issue_ids.length === 0) {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error!",
        message: "Please select at least one work item.",
      });
      return;
    }

    if (!Array.isArray(data.delete_issue_ids)) data.delete_issue_ids = [data.delete_issue_ids];

    try {
      await bulkDeleteIssues({
        workspaceSlug: workspaceSlug.toString(),
        projectId: projectId.toString(),
        issueIds: data.delete_issue_ids,
      });
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: "Success!",
        message: "Work items deleted successfully!",
      });
      handleClose();
    } catch {
      setToast({
        type: TOAST_TYPE.ERROR,
        title: "Error!",
        message: "Something went wrong. Please try again.",
      });
    }
  };

  const issueList =
    issues.length > 0 ? (
      <li className="p-2">
        {query === "" && (
          <h2 className="mb-2 mt-4 px-3 text-11 font-semibold text-primary">Select work items to delete</h2>
        )}
        <ul className="text-13 text-secondary">
          {issues.map((issue) => (
            <BulkDeleteIssuesModalItem
              issue={issue}
              canDeleteIssueIds={selectedIssueIds.includes(issue.id)}
              key={issue.id}
            />
          ))}
        </ul>
      </li>
    ) : (
      <div className="flex flex-col items-center justify-center px-3 py-8 text-center">
        {query === "" ? (
          <SimpleEmptyState title={t("issue_relation.empty_state.no_issues.title")} assetPath={issuesResolvedPath} />
        ) : (
          <SimpleEmptyState title={t("issue_relation.empty_state.search.title")} assetPath={searchResolvedPath} />
        )}
      </div>
    );

  return (
    <Transition.Root show={isOpen} afterLeave={() => setQuery("")} appear as="div">
      <Dialog as="div" className="relative z-20" onClose={handleClose}>
        <div className="fixed inset-0 z-20 overflow-y-auto bg-backdrop p-4 transition-opacity sm:p-6 md:p-20">
          <Transition.Child
            as={Dialog.Panel}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
            className="relative flex w-full items-center justify-center">
              <div className="w-full max-w-2xl transform divide-y divide-subtle-1 divide-opacity-10 rounded-lg bg-surface-1 shadow-raised-200 transition-all">
                <form>
                  <Combobox
                    onChange={(val: string | null) => {
                      if (val !== null) {
                        if (selectedIssueIds.includes(val))
                          setValue(
                            "delete_issue_ids",
                            selectedIssueIds.filter((i) => i !== val)
                          );
                        else setValue("delete_issue_ids", [...selectedIssueIds, val]);
                      }
                    }}
                  >
                    <div className="relative m-1">
                      <Search
                        className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-primary text-opacity-40"
                        aria-hidden="true"
                      />
                      <input
                        type="text"
                        className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-primary outline-none focus:ring-0 sm:text-13"
                        placeholder="Search..."
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </div>

                    <Combobox.Options static className="max-h-80 scroll-py-2 divide-y divide-subtle-1 overflow-y-auto">
                      {isSearching ? (
                        <Loader className="space-y-3 p-3">
                          <Loader.Item height="40px" />
                          <Loader.Item height="40px" />
                          <Loader.Item height="40px" />
                          <Loader.Item height="40px" />
                        </Loader>
                      ) : (
                        <>{issueList}</>
                      )}
                    </Combobox.Options>
                  </Combobox>

                  {issues.length > 0 && (
                    <div className="flex items-center justify-end gap-2 p-3">
                      <Button variant="secondary" size="lg" onClick={handleClose}>
                        Cancel
                      </Button>
                      <Button
                        variant="error-fill"
                        size="lg"
                        onClick={() => void handleSubmit(handleDelete)()}
                        loading={isSubmitting}
                      >
                        {isSubmitting ? "Deleting..." : "Delete selected work items"}
                      </Button>
                    </div>
                  )}
                </form>
              </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
