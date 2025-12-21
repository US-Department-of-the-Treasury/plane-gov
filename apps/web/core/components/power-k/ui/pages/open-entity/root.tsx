// local imports
import { PowerKOpenProjectSprintsMenu } from "./project-sprints-menu";
import { PowerKOpenProjectEpicsMenu } from "./project-epics-menu";
import { PowerKOpenProjectSettingsMenu } from "./project-settings-menu";
import { PowerKOpenProjectViewsMenu } from "./project-views-menu";
import { PowerKOpenProjectMenu } from "./projects-menu";
import type { TPowerKOpenEntityActionsProps } from "./shared";
import { PowerKOpenWorkspaceSettingsMenu } from "./workspace-settings-menu";
import { PowerKOpenWorkspaceMenu } from "./workspaces-menu";

export function PowerKOpenEntityPages(props: TPowerKOpenEntityActionsProps) {
  const { activePage, context, handleSelection } = props;

  return (
    <>
      {activePage === "open-workspace" && <PowerKOpenWorkspaceMenu handleSelect={handleSelection} />}
      {activePage === "open-project" && <PowerKOpenProjectMenu handleSelect={handleSelection} />}
      {activePage === "open-workspace-setting" && (
        <PowerKOpenWorkspaceSettingsMenu context={context} handleSelect={handleSelection} />
      )}
      {activePage === "open-project-setting" && (
        <PowerKOpenProjectSettingsMenu context={context} handleSelect={handleSelection} />
      )}
      {activePage === "open-project-sprint" && (
        <PowerKOpenProjectSprintsMenu context={context} handleSelect={handleSelection} />
      )}
      {activePage === "open-project-module" && (
        <PowerKOpenProjectEpicsMenu context={context} handleSelect={handleSelection} />
      )}
      {activePage === "open-project-view" && (
        <PowerKOpenProjectViewsMenu context={context} handleSelect={handleSelection} />
      )}
    </>
  );
}
