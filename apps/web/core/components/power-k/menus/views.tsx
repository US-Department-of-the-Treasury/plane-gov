import React from "react";
import { Layers } from "lucide-react";
// plane imports
import type { IProjectView } from "@plane/types";
// local imports
import { PowerKMenuBuilder } from "./builder";

type Props = {
  views: IProjectView[];
  onSelect: (view: IProjectView) => void;
};

export function PowerKViewsMenu({ views, onSelect }: Props) {
  return (
    <PowerKMenuBuilder
      items={views}
      getKey={(view) => view.id}
      getIcon={() => Layers}
      getValue={(view) => view.name}
      getLabel={(view) => view.name}
      onSelect={onSelect}
      emptyText="No views found"
    />
  );
}
