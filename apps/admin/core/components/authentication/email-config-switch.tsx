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

export function EmailCodesConfiguration(props: Props) {
  const { disabled, updateConfig } = props;
  // queries
  const { data: configurations } = useInstanceConfigurations();
  const formattedConfig = computeFormattedConfig(configurations);
  // derived values
  const enableMagicLogin = formattedConfig?.ENABLE_MAGIC_LINK_LOGIN ?? "";

  return (
    <ToggleSwitch
      value={Boolean(parseInt(enableMagicLogin))}
      onChange={() => {
        const newEnableMagicLogin = Boolean(parseInt(enableMagicLogin)) === true ? "0" : "1";
        updateConfig("ENABLE_MAGIC_LINK_LOGIN", newEnableMagicLogin);
      }}
      size="sm"
      disabled={disabled}
    />
  );
}
