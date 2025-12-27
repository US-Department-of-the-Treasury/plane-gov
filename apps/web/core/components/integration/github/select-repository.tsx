import React from "react";
import { useParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { IWorkspaceIntegration } from "@plane/types";
// ui
import { CustomSearchSelect } from "@plane/ui";
// helpers
import { truncateText } from "@plane/utils";
// store
import { queryKeys } from "@/store/queries/query-keys";
// services
import { ProjectService } from "@/services/project";

type Props = {
  integration: IWorkspaceIntegration;
  value: any;
  label: string | React.ReactNode;
  onChange: (repo: any) => void;
  characterLimit?: number;
};

type GithubRepo = {
  id: string;
  full_name: string;
};

type GithubReposResponse = {
  repositories: GithubRepo[];
  total_count: number;
};

const projectService = new ProjectService();

export function SelectRepository(props: Props) {
  const { integration, value, label, onChange, characterLimit = 25 } = props;
  // router
  const { workspaceSlug } = useParams();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<GithubReposResponse>({
    queryKey: queryKeys.integrations.github.repositories(workspaceSlug as string, integration?.id ?? ""),
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const url = `${process.env.VITE_API_BASE_URL}/api/workspaces/${workspaceSlug}/workspace-integrations/${integration.id}/github-repositories/?page=${page}`;
      return projectService.getGithubRepositories(url);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.repositories.length, 0);
      if (totalFetched < lastPage.total_count) {
        return allPages.length + 1;
      }
      return undefined;
    },
    enabled: !!workspaceSlug && !!integration?.id,
  });

  const paginatedData = data?.pages ?? [];
  let userRepositories = paginatedData.map((page) => page.repositories).flat();
  userRepositories = userRepositories.filter((repo) => repo?.id);

  const totalCount = paginatedData && paginatedData.length > 0 ? paginatedData[0].total_count : 0;

  const options =
    userRepositories.map((repo) => ({
      value: repo.id,
      query: repo.full_name,
      content: <p>{truncateText(repo.full_name, characterLimit)}</p>,
    })) ?? [];

  if (userRepositories.length < 1) return null;

  return (
    <CustomSearchSelect
      value={value}
      options={options}
      onChange={(val: unknown) => {
        const repo = userRepositories.find((repo) => repo.id === (val as string));

        onChange(repo);
      }}
      label={label}
      footerOption={
        <>
          {userRepositories && hasNextPage && (
            <button
              type="button"
              className="w-full p-1 text-center text-10 text-secondary hover:bg-layer-1"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading..." : "Click to load more..."}
            </button>
          )}
        </>
      }
      optionsClassName="w-48"
    />
  );
}
