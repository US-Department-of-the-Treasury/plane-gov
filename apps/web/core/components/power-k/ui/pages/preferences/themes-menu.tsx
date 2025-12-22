import React, { useEffect, useState } from "react";
import { Command } from "cmdk";
// plane imports
import { THEME_OPTIONS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
// local imports
import { PowerKModalCommandItem } from "../../modal/command-item";

type Props = {
  onSelect: (theme: string) => void;
};

export function PowerKPreferencesThemesMenu(props: Props) {
  const { onSelect } = props;
  // hooks
  const { t } = useTranslation();
  // states
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Command.Group>
      {THEME_OPTIONS.map((theme) => (
        <PowerKModalCommandItem key={theme.value} onSelect={() => onSelect(theme.value)} label={t(theme.i18n_label)} />
      ))}
    </Command.Group>
  );
}
