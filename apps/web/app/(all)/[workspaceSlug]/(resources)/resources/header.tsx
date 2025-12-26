"use client";

import { useParams } from "next/navigation";
import { Users, UserPlus } from "lucide-react";
// plane imports
import { Button } from "@plane/propel/button";
import { Tooltip } from "@plane/propel/tooltip";
import { Breadcrumbs, Header } from "@plane/ui";
// components
import { BreadcrumbLink } from "@/components/common/breadcrumb-link";
import { CountChip } from "@/components/common/count-chip";
// hooks
import { useWorkspaceMembers } from "@/store/queries/member";
import { useWorkspaceSprints, getSprintIds } from "@/store/queries/sprint";
import { usePlatformOS } from "@/hooks/use-platform-os";

export function ResourcesHeader() {
  const { workspaceSlug } = useParams();
  const { isMobile } = usePlatformOS();

  const workspaceSlugStr = workspaceSlug?.toString() || "";
  const { data: members } = useWorkspaceMembers(workspaceSlugStr);
  const { data: sprints } = useWorkspaceSprints(workspaceSlugStr);

  const memberCount = members?.length || 0;
  const sprintCount = getSprintIds(sprints).length;

  return (
    <Header>
      <Header.LeftItem>
        <div className="flex items-center gap-2.5">
          <Breadcrumbs>
            <Breadcrumbs.Item
              component={
                <BreadcrumbLink label="Team Members" icon={<Users className="h-4 w-4 text-tertiary" />} isLast />
              }
              isLast
            />
          </Breadcrumbs>
          {memberCount > 0 && (
            <Tooltip
              isMobile={isMobile}
              tooltipContent={`${memberCount} team ${memberCount === 1 ? "member" : "members"} across ${sprintCount} ${sprintCount === 1 ? "sprint" : "sprints"}`}
              position="bottom"
            >
              <CountChip count={memberCount} />
            </Tooltip>
          )}
        </div>
      </Header.LeftItem>
      <Header.RightItem>
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            // TODO: Implement add team member modal
            console.log("Add team member clicked");
          }}
        >
          <UserPlus className="h-4 w-4 hidden sm:block" />
          <span className="hidden sm:block">Add member</span>
          <span className="block sm:hidden">Add</span>
        </Button>
      </Header.RightItem>
    </Header>
  );
}
