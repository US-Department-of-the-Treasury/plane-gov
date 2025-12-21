// components
import type { TPowerKCommandConfig, TPowerKContextType, TPowerKPageType } from "@/components/power-k/core/types";
// plane web imports
import {
  PowerKContextBasedActionsExtended,
  usePowerKContextBasedExtendedActions,
} from "@/plane-web/components/command-palette/power-k/pages/context-based";
// local imports
import { usePowerKSprintContextBasedActions } from "./sprint/commands";
import { PowerKEpicContextBasedPages } from "./epic";
import { usePowerKEpicContextBasedActions } from "./module/commands";
import { usePowerKPageContextBasedActions } from "./page/commands";
import { PowerKWorkItemContextBasedPages } from "./work-item";
import { usePowerKWorkItemContextBasedCommands } from "./work-item/commands";

export type ContextBasedActionsProps = {
  activePage: TPowerKPageType | null;
  activeContext: TPowerKContextType | null;
  handleSelection: (data: unknown) => void;
};

export function PowerKContextBasedPagesList(props: ContextBasedActionsProps) {
  const { activeContext, activePage, handleSelection } = props;

  return (
    <>
      {activeContext === "work-item" && (
        <PowerKWorkItemContextBasedPages activePage={activePage} handleSelection={handleSelection} />
      )}
      {activeContext === "module" && (
        <PowerKEpicContextBasedPages activePage={activePage} handleSelection={handleSelection} />
      )}
      <PowerKContextBasedActionsExtended {...props} />
    </>
  );
}

export const usePowerKContextBasedActions = (): TPowerKCommandConfig[] => {
  const workItemCommands = usePowerKWorkItemContextBasedCommands();
  const sprintCommands = usePowerKSprintContextBasedActions();
  const epicCommands = usePowerKEpicContextBasedActions();
  const pageCommands = usePowerKPageContextBasedActions();
  const extendedCommands = usePowerKContextBasedExtendedActions();

  return [...workItemCommands, ...sprintCommands, ...epicCommands, ...pageCommands, ...extendedCommands];
};
