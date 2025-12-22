import { useCallback } from "react";
import { useParams } from "next/navigation";
// plane types
import type { ILinkDetails } from "@plane/types";
// components
import { ModulesLinksListItem } from "@/components/modules";
// hooks
import { useProjectModules, getModuleById } from "@/store/queries/module";

type Props = {
  disabled?: boolean;
  handleDeleteLink: (linkId: string) => void;
  handleEditLink: (link: ILinkDetails) => void;
  moduleId: string;
};

export function ModuleLinksList(props: Props) {
  const { moduleId, handleDeleteLink, handleEditLink, disabled } = props;
  // router
  const { workspaceSlug, projectId } = useParams();
  // query hooks
  const { data: modules } = useProjectModules(
    workspaceSlug?.toString() ?? "",
    projectId?.toString() ?? ""
  );
  // derived values
  const currentModule = getModuleById(modules, moduleId);
  const moduleLinks = currentModule?.link_module;
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
}
