import { useState } from "react";
import { setPromiseToast } from "@plane/propel/toast";
import { Loader, ToggleSwitch } from "@plane/ui";
// components
import GitlabLogo from "@/app/assets/logos/gitlab-logo.svg?url";
import { AuthenticationMethodCard } from "@/components/authentication/authentication-method-card";
// hooks
import { useInstanceConfigurations, useUpdateInstanceConfigurations, computeFormattedConfig } from "@/store/queries";
// local components
import type { Route } from "./+types/page";
import { InstanceGitlabConfigForm } from "./form";

function InstanceGitlabAuthenticationPage(_props: Route.ComponentProps) {
  // queries
  const { data: configurations } = useInstanceConfigurations();
  const formattedConfig = computeFormattedConfig(configurations);
  const updateConfigMutation = useUpdateInstanceConfigurations();
  // state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // config
  const enableGitlabConfig = formattedConfig?.IS_GITLAB_ENABLED ?? "";

  const updateConfig = async (key: "IS_GITLAB_ENABLED", value: string) => {
    setIsSubmitting(true);

    const payload = {
      [key]: value,
    };

    const updateConfigPromise = updateConfigMutation.mutateAsync(payload);

    setPromiseToast(updateConfigPromise, {
      loading: "Saving Configuration...",
      success: {
        title: "Configuration saved",
        message: () => `GitLab authentication is now ${value === "1" ? "active" : "disabled"}.`,
      },
      error: {
        title: "Error",
        message: () => "Failed to save configuration",
      },
    });

    await updateConfigPromise
      .then(() => {
        setIsSubmitting(false);
      })
      .catch((err) => {
        console.error(err);
        setIsSubmitting(false);
      });
  };
  return (
    <>
      <div className="relative container mx-auto w-full h-full p-4 py-4 space-y-6 flex flex-col">
        <div className="border-b border-subtle mx-4 py-4 space-y-1 flex-shrink-0">
          <AuthenticationMethodCard
            name="GitLab"
            description="Allow members to login or sign up to plane with their GitLab accounts."
            icon={<img src={GitlabLogo} height={24} width={24} alt="GitLab Logo" />}
            config={
              <ToggleSwitch
                value={Boolean(parseInt(enableGitlabConfig))}
                onChange={() => {
                  if (Boolean(parseInt(enableGitlabConfig)) === true) {
                    updateConfig("IS_GITLAB_ENABLED", "0");
                  } else {
                    updateConfig("IS_GITLAB_ENABLED", "1");
                  }
                }}
                size="sm"
                disabled={isSubmitting || !formattedConfig}
              />
            }
            disabled={isSubmitting || !formattedConfig}
            withBorder={false}
          />
        </div>
        <div className="flex-grow overflow-hidden overflow-y-scroll vertical-scrollbar scrollbar-md px-4">
          {formattedConfig ? (
            <InstanceGitlabConfigForm config={formattedConfig} />
          ) : (
            <Loader className="space-y-8">
              <Loader.Item height="50px" width="25%" />
              <Loader.Item height="50px" />
              <Loader.Item height="50px" />
              <Loader.Item height="50px" />
              <Loader.Item height="50px" width="50%" />
            </Loader>
          )}
        </div>
      </div>
    </>
  );
}

export const meta: Route.MetaFunction = () => [{ title: "GitLab Authentication - God Mode" }];

export default InstanceGitlabAuthenticationPage;
