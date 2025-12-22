import React from "react";
// plane imports
import { ContrastIcon } from "@plane/propel/icons";
import type { ISprint } from "@plane/types";
// local imports
import { PowerKMenuBuilder } from "./builder";

type Props = {
  sprints: ISprint[];
  onSelect: (sprint: ISprint) => void;
  value?: string | null;
};

export function PowerKSprintsMenu({ sprints, onSelect, value }: Props) {
  return (
    <PowerKMenuBuilder
      items={sprints}
      getIcon={() => ContrastIcon}
      getKey={(sprint) => sprint.id}
      getValue={(sprint) => sprint.name}
      getLabel={(sprint) => sprint.name}
      isSelected={(sprint) => value === sprint.id}
      onSelect={onSelect}
      emptyText="No sprints found"
    />
  );
}
