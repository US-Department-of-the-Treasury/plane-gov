import React from "react";
// plane imports
import { EpicStatusIcon } from "@plane/propel/icons";
import type { IEpic } from "@plane/types";
// local imports
import { PowerKMenuBuilder } from "./builder";

type Props = {
  epics: IEpic[];
  onSelect: (epic: IEpic) => void;
  value?: string[];
};

export function PowerKEpicsMenu({ epics, onSelect, value }: Props) {
  return (
    <PowerKMenuBuilder
      items={epics}
      getKey={(epic) => epic.id}
      getIconNode={(epic) => <EpicStatusIcon status={epic.status ?? "backlog"} className="shrink-0 size-3.5" />}
      getValue={(epic) => epic.name}
      getLabel={(epic) => epic.name}
      isSelected={(epic) => !!value?.includes(epic.id)}
      onSelect={onSelect}
      emptyText="No epics found"
    />
  );
}
