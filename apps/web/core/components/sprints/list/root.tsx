import type { FC } from "react";
import React from "react";
import { observer } from "mobx-react";
import { Disclosure } from "@headlessui/react";
// components
import { useTranslation } from "@plane/i18n";
import { ContentWrapper, ERowVariant } from "@plane/ui";
import { ListLayout } from "@/components/core/list";
import { ActiveSprintRoot } from "@/plane-web/components/sprints";
// local imports
import { SprintPeekOverview } from "../sprint-peek-overview";
import { SprintListGroupHeader } from "./sprint-list-group-header";
import { SprintsListMap } from "./sprints-list-map";

export interface ISprintsList {
  completedSprintIds: string[];
  upcomingSprintIds?: string[] | undefined;
  sprintIds: string[];
  workspaceSlug: string;
  projectId: string;
  isArchived?: boolean;
}

export const SprintsList = observer(function SprintsList(props: ISprintsList) {
  const { completedSprintIds, upcomingSprintIds, sprintIds, workspaceSlug, projectId, isArchived = false } = props;
  const { t } = useTranslation();

  return (
    <ContentWrapper variant={ERowVariant.HUGGING} className="flex-row">
      <ListLayout>
        {isArchived ? (
          <>
            <SprintsListMap sprintIds={sprintIds} projectId={projectId} workspaceSlug={workspaceSlug} />
          </>
        ) : (
          <>
            <ActiveSprintRoot workspaceSlug={workspaceSlug} projectId={projectId} />

            {upcomingSprintIds && (
              <Disclosure as="div" className="flex flex-shrink-0 flex-col" defaultOpen>
                {({ open }) => (
                  <>
                    <Disclosure.Button className="sticky top-0 z-[2] w-full flex-shrink-0 border-b border-subtle bg-layer-1 cursor-pointer">
                      <SprintListGroupHeader
                        title={t("project_sprints.upcoming_sprint.label")}
                        type="upcoming"
                        count={upcomingSprintIds.length}
                        showCount
                        isExpanded={open}
                      />
                    </Disclosure.Button>
                    <Disclosure.Panel>
                      <SprintsListMap sprintIds={upcomingSprintIds} projectId={projectId} workspaceSlug={workspaceSlug} />
                    </Disclosure.Panel>
                  </>
                )}
              </Disclosure>
            )}
            <Disclosure as="div" className="flex flex-shrink-0 flex-col pb-7">
              {({ open }) => (
                <>
                  <Disclosure.Button className="sticky top-0 z-2 w-full flex-shrink-0 border-b border-subtle bg-layer-1 cursor-pointer">
                    <SprintListGroupHeader
                      title={t("project_sprints.completed_sprint.label")}
                      type="completed"
                      count={completedSprintIds.length}
                      showCount
                      isExpanded={open}
                    />
                  </Disclosure.Button>
                  <Disclosure.Panel>
                    <SprintsListMap sprintIds={completedSprintIds} projectId={projectId} workspaceSlug={workspaceSlug} />
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          </>
        )}
      </ListLayout>
      <SprintPeekOverview projectId={projectId} workspaceSlug={workspaceSlug} isArchived={isArchived} />
    </ContentWrapper>
  );
});
