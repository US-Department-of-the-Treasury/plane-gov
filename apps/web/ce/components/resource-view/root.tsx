import { useParams } from "next/navigation";
// hooks
import { useWorkspaceSprints } from "@/store/queries/sprint";
import { useWorkspaceMembers } from "@/store/queries/member";
// local imports
import { ResourceMatrix } from "./resource-matrix";

export function ResourceViewRoot() {
  const { workspaceSlug } = useParams();

  const workspaceSlugStr = workspaceSlug?.toString();

  // TanStack Query automatically fetches sprints and members
  useWorkspaceSprints(workspaceSlugStr || "");
  useWorkspaceMembers(workspaceSlugStr || "");

  if (!workspaceSlugStr) {
    return null;
  }

  return <ResourceMatrix workspaceSlug={workspaceSlugStr} />;
}
