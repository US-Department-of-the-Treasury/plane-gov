import { Command } from "cmdk";
// plane imports
import { EPIC_STATUS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { EpicStatusIcon } from "@plane/propel/icons";
import type { TEpicStatus } from "@plane/types";
// local imports
import { PowerKModalCommandItem } from "../../../modal/command-item";

type Props = {
  handleSelect: (data: TEpicStatus) => void;
  value: TEpicStatus;
};

export function PowerKEpicStatusMenu(props: Props) {
  const { handleSelect, value } = props;
  // translation
  const { t } = useTranslation();

  return (
    <Command.Group>
      {EPIC_STATUS.map((status) => (
        <PowerKModalCommandItem
          key={status.value}
          iconNode={<EpicStatusIcon status={status.value} className="shrink-0 size-3.5" />}
          label={t(status.i18n_label)}
          isSelected={status.value === value}
          onSelect={() => handleSelect(status.value)}
        />
      ))}
    </Command.Group>
  );
}
