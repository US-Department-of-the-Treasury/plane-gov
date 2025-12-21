import { observer } from "mobx-react";
import { useTheme } from "next-themes";
import { Disclosure } from "@headlessui/react";
import { EmptyStateDetailed } from "@plane/propel/empty-state";
// plane imports
import { useTranslation } from "@plane/i18n";
import type { ISprint } from "@plane/types";
import { Row } from "@plane/ui";
// assets
import darkActiveSprintAsset from "@/app/assets/empty-state/sprint/active-dark.webp?url";
import lightActiveSprintAsset from "@/app/assets/empty-state/sprint/active-light.webp?url";
// components
import { ActiveSprintStats } from "@/components/sprints/active-sprint/sprint-stats";
import { ActiveSprintProductivity } from "@/components/sprints/active-sprint/productivity";
import { ActiveSprintProgress } from "@/components/sprints/active-sprint/progress";
import useSprintsDetails from "@/components/sprints/active-sprint/use-sprints-details";
import { SprintListGroupHeader } from "@/components/sprints/list/sprint-list-group-header";
import { SprintsListItem } from "@/components/sprints/list/sprints-list-item";
// hooks
import { useSprint } from "@/hooks/store/use-sprint";
import type { ActiveSprintIssueDetails } from "@/store/issue/sprint";

interface IActiveSprintDetails {
  workspaceSlug: string;
  projectId: string;
  sprintId?: string;
  showHeader?: boolean;
}

type ActiveSprintsComponentProps = {
  sprintId: string | null | undefined;
  activeSprint: ISprint | null;
  activeSprintResolvedPath: string;
  workspaceSlug: string;
  projectId: string;
  handleFiltersUpdate: (filters: any) => void;
  sprintIssueDetails?: ActiveSprintIssueDetails | { nextPageResults: boolean };
};

const ActiveSprintsComponent = observer(function ActiveSprintsComponent({
  sprintId,
  activeSprint,
  activeSprintResolvedPath,
  workspaceSlug,
  projectId,
  handleFiltersUpdate,
  sprintIssueDetails,
}: ActiveSprintsComponentProps) {
  const { t } = useTranslation();

  if (!sprintId || !activeSprint) {
    return (
      <EmptyStateDetailed
        assetKey="sprint"
        title={t("project_sprints.empty_state.active.title")}
        description={t("project_sprints.empty_state.active.description")}
        rootClassName="py-10 h-auto"
      />
    );
  }

  return (
    <div className="flex flex-col border-b border-subtle">
      <SprintsListItem
        key={sprintId}
        sprintId={sprintId}
        workspaceSlug={workspaceSlug}
        projectId={projectId}
        className="!border-b-transparent"
      />
      <Row className="bg-surface-1 pt-3 pb-6">
        <div className="grid grid-cols-1 bg-surface-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <ActiveSprintProgress
            handleFiltersUpdate={handleFiltersUpdate}
            projectId={projectId}
            workspaceSlug={workspaceSlug}
            sprint={activeSprint}
          />
          <ActiveSprintProductivity workspaceSlug={workspaceSlug} projectId={projectId} sprint={activeSprint} />
          <ActiveSprintStats
            workspaceSlug={workspaceSlug}
            projectId={projectId}
            sprint={activeSprint}
            sprintId={sprintId}
            handleFiltersUpdate={handleFiltersUpdate}
            sprintIssueDetails={sprintIssueDetails}
          />
        </div>
      </Row>
    </div>
  );
});

export const ActiveSprintRoot = observer(function ActiveSprintRoot(props: IActiveSprintDetails) {
  const { workspaceSlug, projectId, sprintId: propsSprintId, showHeader = true } = props;
  // theme hook
  const { resolvedTheme } = useTheme();
  // plane hooks
  const { t } = useTranslation();
  // store hooks
  const { currentProjectActiveSprintId } = useSprint();
  // derived values
  const sprintId = propsSprintId ?? currentProjectActiveSprintId;
  const activeSprintResolvedPath = resolvedTheme === "light" ? lightActiveSprintAsset : darkActiveSprintAsset;
  // fetch sprint details
  const {
    handleFiltersUpdate,
    sprint: activeSprint,
    sprintIssueDetails,
  } = useSprintsDetails({ workspaceSlug, projectId, sprintId });

  return (
    <>
      {showHeader ? (
        <Disclosure as="div" className="flex flex-shrink-0 flex-col" defaultOpen>
          {({ open }) => (
            <>
              <Disclosure.Button className="sticky top-0 z-[2] w-full flex-shrink-0 border-b border-subtle bg-layer-1 cursor-pointer">
                <SprintListGroupHeader title={t("project_sprints.active_sprint.label")} type="current" isExpanded={open} />
              </Disclosure.Button>
              <Disclosure.Panel>
                <ActiveSprintsComponent
                  sprintId={sprintId}
                  activeSprint={activeSprint}
                  activeSprintResolvedPath={activeSprintResolvedPath}
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  handleFiltersUpdate={handleFiltersUpdate}
                  sprintIssueDetails={sprintIssueDetails}
                />
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>
      ) : (
        <ActiveSprintsComponent
          sprintId={sprintId}
          activeSprint={activeSprint}
          activeSprintResolvedPath={activeSprintResolvedPath}
          workspaceSlug={workspaceSlug}
          projectId={projectId}
          handleFiltersUpdate={handleFiltersUpdate}
          sprintIssueDetails={sprintIssueDetails}
        />
      )}
    </>
  );
});
