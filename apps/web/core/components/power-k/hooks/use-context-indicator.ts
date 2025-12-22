import { useParams } from "next/navigation";
// plane imports
import { getPageName } from "@plane/utils";
// hooks
import { useWorkspaceSprints, getSprintById } from "@/store/queries/sprint";
import { useProjectEpics, getEpicById } from "@/store/queries";
// plane web imports
import { useExtendedContextIndicator } from "@/plane-web/components/command-palette/power-k/hooks/use-extended-context-indicator";
import { EPageStoreType, usePageStore } from "@/plane-web/hooks/store";
// local imports
import type { TPowerKContextType } from "../core/types";

type TArgs = {
  activeContext: TPowerKContextType | null;
};

export const useContextIndicator = (args: TArgs): string | null => {
  const { activeContext } = args;
  // navigation
  const { workspaceSlug, projectId, workItem: workItemIdentifier, sprintId, epicId, pageId } = useParams();
  // queries - TanStack Query
  const { data: sprints } = useWorkspaceSprints(workspaceSlug?.toString() ?? "");
  const { data: epics } = useProjectEpics(workspaceSlug?.toString() ?? "", projectId?.toString() ?? "");
  const { getPageById } = usePageStore(EPageStoreType.PROJECT);
  // extended context indicator
  const extendedIndicator = useExtendedContextIndicator({
    activeContext,
  });
  let indicator: string | undefined | null = null;

  switch (activeContext) {
    case "work-item": {
      indicator = workItemIdentifier ? workItemIdentifier.toString() : null;
      break;
    }
    case "sprint": {
      const sprintDetails = sprintId ? getSprintById(sprints, sprintId.toString()) : null;
      indicator = sprintDetails?.name;
      break;
    }
    case "epic": {
      const epicDetails = epicId ? getEpicById(epics, epicId.toString()) : null;
      indicator = epicDetails?.name;
      break;
    }
    case "page": {
      const pageInstance = pageId ? getPageById(pageId.toString()) : null;
      indicator = getPageName(pageInstance?.name);
      break;
    }
    default: {
      indicator = extendedIndicator;
    }
  }

  return indicator ?? null;
};
