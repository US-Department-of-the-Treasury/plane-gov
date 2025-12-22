import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// types
import type { IWorkspaceIntegration, ISlackIntegration } from "@plane/types";
// ui
import { Loader } from "@plane/ui";
// store
import { queryKeys } from "@/store/queries/query-keys";
// hooks
import { useInstance } from "@/hooks/store/use-instance";
import useIntegrationPopup from "@/hooks/use-integration-popup";
// services
import { AppInstallationService } from "@/services/app_installation.service";

type Props = {
  integration: IWorkspaceIntegration;
};

const appInstallationService = new AppInstallationService();

export function SelectChannel({ integration }: Props) {
  // store hooks
  const { config } = useInstance();
  // states
  const [slackChannelAvailabilityToggle, setSlackChannelAvailabilityToggle] = useState<boolean>(false);
  const [slackChannel, setSlackChannel] = useState<ISlackIntegration | null>(null);

  const { workspaceSlug, projectId } = useParams();
  const queryClient = useQueryClient();

  // FIXME:
  const { startAuth } = useIntegrationPopup({
    provider: "slackChannel",
    stateParams: integration.id,
    // github_app_name: instance?.config?.github_client_id || "",
    slack_client_id: config?.slack_client_id || "",
  });

  const { data: projectIntegration } = useQuery({
    queryKey: queryKeys.integrations.slack.channelInfo(workspaceSlug as string, projectId as string),
    queryFn: () =>
      appInstallationService.getSlackChannelDetail(workspaceSlug as string, projectId as string, integration.id),
    enabled: !!workspaceSlug && !!projectId && !!integration.id,
  });

  useEffect(() => {
    if (projectId && projectIntegration && projectIntegration.length > 0) {
      const projectSlackIntegrationCheck: ISlackIntegration | undefined = projectIntegration.find(
        (_slack: ISlackIntegration) => _slack.project === projectId
      );
      if (projectSlackIntegrationCheck) {
        setSlackChannel(() => projectSlackIntegrationCheck);
        setSlackChannelAvailabilityToggle(true);
      }
    }
  }, [projectIntegration, projectId]);

  const handleDelete = async () => {
    if (!workspaceSlug || !projectId) return;
    if (projectIntegration?.length === 0) return;
    queryClient
      .setQueryData(
        queryKeys.integrations.slack.channelInfo(workspaceSlug as string, projectId as string),
        (prevData: any) => {
          if (!prevData) return;
          return prevData.id !== integration.id;
        }
      );
    setSlackChannelAvailabilityToggle(false);
    setSlackChannel(null);
    appInstallationService
      .removeSlackChannel(workspaceSlug as string, projectId as string, integration.id, slackChannel?.id)
      .catch((err) => console.error(err));
  };

  const handleAuth = async () => {
    await startAuth();
  };

  return (
    <>
      {projectIntegration ? (
        <button
          type="button"
          className={`relative inline-flex h-4 w-6 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-700 transition-colors duration-200 ease-in-out focus:outline-none`}
          role="switch"
          aria-checked
          onClick={() => {
            slackChannelAvailabilityToggle ? handleDelete() : handleAuth();
          }}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-2 w-2 transform self-center rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              slackChannelAvailabilityToggle ? "translate-x-3" : "translate-x-0"
            }`}
          />
        </button>
      ) : (
        <Loader>
          <Loader.Item height="35px" width="150px" />
        </Loader>
      )}
    </>
  );
}
