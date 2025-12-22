import { useCallback } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane types
import type { ILinkDetails } from "@plane/types";
// components
import { EpicLinksListItem } from "@/components/epics";
// hooks
import { useEpic } from "@/hooks/store/use-epic";

type Props = {
  disabled?: boolean;
  handleDeleteLink: (linkId: string) => void;
  handleEditLink: (link: ILinkDetails) => void;
  epicId: string;
};

export const EpicLinksList = observer(function EpicLinksList(props: Props) {
  const { epicId, handleDeleteLink, handleEditLink, disabled } = props;
  // store hooks
  const { getEpicById } = useEpic();
  // derived values
  const currentEpic = getEpicById(epicId);
  const epicLinks = currentEpic?.link_epic;
  // memoized link handlers
  const memoizedDeleteLink = useCallback((id: string) => handleDeleteLink(id), [handleDeleteLink]);
  const memoizedEditLink = useCallback((link: ILinkDetails) => handleEditLink(link), [handleEditLink]);

  if (!epicLinks) return null;

  return (
    <>
      {epicLinks.map((link) => (
        <EpicLinksListItem
          key={link.id}
          handleDeleteLink={() => memoizedDeleteLink(link.id)}
          handleEditLink={() => memoizedEditLink(link)}
          isEditingAllowed={!disabled}
          link={link}
        />
      ))}
    </>
  );
}
