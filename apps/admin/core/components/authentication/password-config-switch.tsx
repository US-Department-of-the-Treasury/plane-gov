import React from "react";
// plane internal packages
import type { TInstanceAuthenticationMethodKeys } from "@plane/types";
import { ToggleSwitch } from "@plane/ui";
// hooks
import { useInstanceConfigurations, computeFormattedConfig } from "@/store/queries";

type Props = {
  disabled: boolean;
  updateConfig: (key: TInstanceAuthenticationMethodKeys, value: string) => void;
};

export function PasswordLoginConfiguration(props: Props) {
  const { disabled, updateConfig } = props;
  // queries
  const { data: configurations } = useInstanceConfigurations();
  const formattedConfig = computeFormattedConfig(configurations);
  // derived values
  const enableEmailPassword = formattedConfig?.ENABLE_EMAIL_PASSWORD ?? "";

  return (
    <ToggleSwitch
      value={Boolean(parseInt(enableEmailPassword))}
      onChange={() => {
        const newEnableEmailPassword = Boolean(parseInt(enableEmailPassword)) === true ? "0" : "1";
        updateConfig("ENABLE_EMAIL_PASSWORD", newEnableEmailPassword);
      }}
      size="sm"
      disabled={disabled}
    />
  );
}
