import type { FC } from "react";
import React from "react";
import { useParams } from "next/navigation";
import { Logo } from "@plane/propel/emoji-icon-picker";
import { ChevronRightIcon } from "@plane/propel/icons";
// icons
import { Row } from "@plane/ui";
// helpers
import { cn } from "@plane/utils";
// store queries
import { useProjects, getProjectById } from "@/store/queries/project";

type Props = {
  projectId: string;
  count?: number;
  showCount?: boolean;
  isExpanded?: boolean;
};

export function SprintListProjectGroupHeader(props: Props) {
  const { projectId, count, showCount = false, isExpanded = false } = props;
  // router
  const { workspaceSlug } = useParams();
  // store hooks
  const { data: projects } = useProjects(workspaceSlug);
  // derived values
  const project = getProjectById(projects, projectId);

  if (!project) return null;
  return (
    <Row className="flex items-center gap-2 flex-shrink-0 py-2.5">
      <ChevronRightIcon
        className={cn("h-4 w-4 text-tertiary duration-300 ", {
          "rotate-90": isExpanded,
        })}
        strokeWidth={2}
      />
      <div className="flex size-4 flex-shrink-0 items-center justify-center overflow-hidden">
        <Logo logo={project.logo_props} size={16} />
      </div>
      <div className="relative flex w-full flex-row items-center gap-1 overflow-hidden">
        <div className="inline-block line-clamp-1 truncate font-medium text-primary">{project.name}</div>
        {showCount && <div className="pl-2 text-13 font-medium text-tertiary">{`${count ?? "0"}`}</div>}
      </div>
    </Row>
  );
}
