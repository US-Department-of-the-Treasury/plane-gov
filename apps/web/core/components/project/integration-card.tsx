import React from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { IWorkspaceIntegration } from "@plane/types";
// assets
import GithubLogo from "@/app/assets/logos/github-square.png?url";
import SlackLogo from "@/app/assets/services/slack.png?url";
// components
import { SelectRepository, SelectChannel } from "@/components/integration";
// queries
import { queryKeys } from "@/store/queries/query-keys";
// services
import { ProjectService } from "@/services/project";

type Props = {
  integration: IWorkspaceIntegration;
};

const integrationDetails: { [key: string]: any } = {
  github: {
    logo: GithubLogo,
    description: "Select GitHub repository to enable sync.",
  },
  slack: {
    logo: SlackLogo,
    description: "Get regular updates and control which notification you want to receive.",
  },
};

// services
const projectService = new ProjectService();

export function IntegrationCard({ integration }: Props) {
  const { workspaceSlug, projectId } = useParams();
  const queryClient = useQueryClient();

  const { data: syncedGithubRepository } = useQuery({
    queryKey: queryKeys.integrations.github.repository(projectId?.toString() ?? ""),
    queryFn: () =>
      workspaceSlug && projectId && integration
        ? projectService.getProjectGithubRepository(
            workspaceSlug.toString(),
            projectId.toString(),
            integration.id
          )
        : null,
    enabled: !!(workspaceSlug && projectId && integration),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const handleChange = (repo: any) => {
    if (!workspaceSlug || !projectId || !integration) return;

    const {
      html_url,
      owner: { login },
      id,
      name,
    } = repo;

    projectService
      .syncGithubRepository(workspaceSlug.toString(), projectId.toString(), integration.id, {
        name,
        owner: login,
        repository_id: id,
        url: html_url,
      })
      .then(() => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.integrations.github.repository(projectId.toString()),
        });

        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: `${login}/${name} repository synced with the project successfully.`,
        });
      })
      .catch((err) => {
        console.error(err);
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: "Repository could not be synced with the project. Please try again.",
        });
      });
  };

  return (
    <>
      {integration && (
        <div className="flex items-center justify-between gap-2 border-b border-subtle bg-surface-1 px-4 py-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 flex-shrink-0">
              <img
                src={integrationDetails[integration.integration_detail.provider].logo}
                className="w-full h-full object-cover"
                alt={`${integration.integration_detail.title} Logo`}
              />
            </div>
            <div>
              <h3 className="flex items-center gap-4 text-13 font-medium">{integration.integration_detail.title}</h3>
              <p className="text-13 tracking-tight text-secondary">
                {integrationDetails[integration.integration_detail.provider].description}
              </p>
            </div>
          </div>
          {integration.integration_detail.provider === "github" && (
            <SelectRepository
              integration={integration}
              value={
                syncedGithubRepository && syncedGithubRepository.length > 0
                  ? `${syncedGithubRepository[0].repo_detail.owner}/${syncedGithubRepository[0].repo_detail.name}`
                  : null
              }
              label={
                syncedGithubRepository && syncedGithubRepository.length > 0
                  ? `${syncedGithubRepository[0].repo_detail.owner}/${syncedGithubRepository[0].repo_detail.name}`
                  : "Select Repository"
              }
              onChange={handleChange}
            />
          )}
          {integration.integration_detail.provider === "slack" && <SelectChannel integration={integration} />}
        </div>
      )}
    </>
  );
}
