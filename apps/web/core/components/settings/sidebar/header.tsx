import { useParams } from "next/navigation";
// plane imports
import { getUserRole } from "@plane/utils";
// components
import { WorkspaceLogo } from "@/components/workspace/logo";
// hooks
import { useWorkspaceDetails } from "@/store/queries/workspace";
// plane web imports
import { SubscriptionPill } from "@/plane-web/components/common/subscription/subscription-pill";

export function SettingsSidebarHeader(props: { customHeader?: React.ReactNode }) {
  const { customHeader } = props;
  const { workspaceSlug } = useParams();
  const { data: currentWorkspace } = useWorkspaceDetails(workspaceSlug?.toString());
  return customHeader
    ? customHeader
    : currentWorkspace && (
        <div className="flex w-full gap-3 items-center justify-between px-2">
          <div className="flex w-full gap-3 items-center overflow-hidden">
            <WorkspaceLogo
              logo={currentWorkspace.logo_url ?? ""}
              name={currentWorkspace.name ?? ""}
              classNames="size-8 border border-subtle"
            />
            <div className="w-full overflow-hidden">
              <div className="text-14 font-medium text-secondary truncate text-ellipsis ">
                {currentWorkspace.name ?? "Workspace"}
              </div>
              <div className="text-13 text-tertiary capitalize">
                {getUserRole(currentWorkspace.role)?.toLowerCase() || "guest"}
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <SubscriptionPill />
          </div>
        </div>
      );
}
