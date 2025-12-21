import { useCallback } from "react";
import { observer } from "mobx-react";
// plane types
import type { ILinkDetails } from "@plane/types";
// components
import { ModulesLinksListItem } from "@/components/epics";
// hooks
import { useEpic } from "@/hooks/store/use-epic";

type Props = {
  disabled?: boolean;
  handleDeleteLink: (linkId: string) => void;
  handleEditLink: (link: ILinkDetails) => void;
  epicId: string;
};

export const ModuleLinksList = observer(function ModuleLinksList(props: Props) {
  const { epicId, handleDeleteLink, handleEditLink, disabled } = props;
  // store hooks
  const { getEpicById } = useEpic();
  // derived values
  const currentEpic = getEpicById(epicId);
  const moduleLinks = currentEpic?.link_epic;
  // memoized link handlers
  const memoizedDeleteLink = useCallback((id: string) => handleDeleteLink(id), [handleDeleteLink]);
  const memoizedEditLink = useCallback((link: ILinkDetails) => handleEditLink(link), [handleEditLink]);

  if (!moduleLinks) return null;

  return (
    <>
      {moduleLinks.map((link) => (
        <ModulesLinksListItem
          key={link.id}
          handleDeleteLink={() => memoizedDeleteLink(link.id)}
          handleEditLink={() => memoizedEditLink(link)}
          isEditingAllowed={!disabled}
          link={link}
        />
      ))}
    </>
  );
});
