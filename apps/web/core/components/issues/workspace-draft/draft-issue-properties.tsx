import { useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
// icons
import { DueDatePropertyIcon, StartDatePropertyIcon } from "@plane/propel/icons";
// types
import type { TIssuePriorities, TWorkspaceDraftIssue } from "@plane/types";
import { getDate, renderFormattedPayloadDate, shouldHighlightIssueDueDate } from "@plane/utils";
// components
import { SprintDropdown } from "@/components/dropdowns/sprint";
import { DateDropdown } from "@/components/dropdowns/date";
import { EstimateDropdown } from "@/components/dropdowns/estimate";
import { MemberDropdown } from "@/components/dropdowns/member/dropdown";
import { ModuleDropdown } from "@/components/dropdowns/module/dropdown";
import { PriorityDropdown } from "@/components/dropdowns/priority";
import { StateDropdown } from "@/components/dropdowns/state/dropdown";
// helpers
// hooks
import { useProjectEstimates } from "@/hooks/store/estimates";
import { useWorkspaceDraftIssues } from "@/hooks/store/workspace-draft";
import { usePlatformOS } from "@/hooks/use-platform-os";
import { useProjectLabels } from "@/store/queries/label";
import { useProjectDetails } from "@/store/queries/project";
import { useProjectStates, getStateById } from "@/store/queries/state";
import { IssuePropertyLabels } from "../issue-layouts/properties";
// local components

export interface IIssueProperties {
  issue: TWorkspaceDraftIssue;
  updateIssue:
    | ((projectId: string | null, issueId: string, data: Partial<TWorkspaceDraftIssue>) => Promise<void>)
    | undefined;
  className: string;
}

export function DraftIssueProperties(props: IIssueProperties) {
  const { issue, updateIssue, className } = props;
  // router
  const { workspaceSlug } = useParams();

  // store hooks
  const { addSprintToIssue, addModulesToIssue } = useWorkspaceDraftIssues();
  const { areEstimateEnabledByProjectId } = useProjectEstimates();
  const { isMobile } = usePlatformOS();

  // queries
  const { data: projectDetails } = useProjectDetails(workspaceSlug as string, issue.project_id);

  // queries
  const { data: projectLabels } = useProjectLabels(workspaceSlug as string, issue.project_id);
  const { data: projectStates } = useProjectStates(workspaceSlug as string, issue.project_id);

  // derived values
  const stateDetails = getStateById(projectStates, issue.state_id);

  const issueOperations = useMemo(
    () => ({
      updateIssueEpics: async (moduleIds: string[]) => {
        if (!workspaceSlug || !issue.id) return;
        await addModulesToIssue(workspaceSlug.toString(), issue.id, moduleIds);
      },
      addIssueToSprint: async (sprintId: string) => {
        if (!workspaceSlug || !issue.id) return;
        await addSprintToIssue(workspaceSlug.toString(), issue.id, sprintId);
      },
      removeIssueFromSprint: async () => {
        if (!workspaceSlug || !issue.id) return;
        // TODO: To be checked
        await addSprintToIssue(workspaceSlug.toString(), issue.id, "");
      },
    }),
    [workspaceSlug, issue, addSprintToIssue, addModulesToIssue]
  );

  const handleState = (stateId: string) =>
    issue?.project_id && updateIssue && updateIssue(issue.project_id, issue.id, { state_id: stateId });

  const handlePriority = (value: TIssuePriorities) =>
    issue?.project_id && updateIssue && updateIssue(issue.project_id, issue.id, { priority: value });

  const handleLabel = (ids: string[]) =>
    issue?.project_id && updateIssue && updateIssue(issue.project_id, issue.id, { label_ids: ids });

  const handleAssignee = (ids: string[]) =>
    issue?.project_id && updateIssue && updateIssue(issue.project_id, issue.id, { assignee_ids: ids });

  const handleModule = useCallback(
    (moduleIds: string[] | null) => {
      if (!issue || !issue.module_ids || !moduleIds) return;
      issueOperations.updateIssueEpics(moduleIds);
    },
    [issueOperations, issue]
  );

  const handleSprint = useCallback(
    (sprintId: string | null) => {
      if (!issue || issue.sprint_id === sprintId) return;
      if (sprintId) issueOperations.addIssueToSprint?.(sprintId);
      else issueOperations.removeIssueFromSprint?.();
    },
    [issue, issueOperations]
  );

  const handleStartDate = (date: Date | null) =>
    issue?.project_id &&
    updateIssue &&
    updateIssue(issue.project_id, issue.id, {
      start_date: date ? (renderFormattedPayloadDate(date) ?? undefined) : undefined,
    });

  const handleTargetDate = (date: Date | null) =>
    issue?.project_id &&
    updateIssue &&
    updateIssue(issue.project_id, issue.id, {
      target_date: date ? (renderFormattedPayloadDate(date) ?? undefined) : undefined,
    });

  const handleEstimate = (value: string | undefined) =>
    issue?.project_id && updateIssue && updateIssue(issue.project_id, issue.id, { estimate_point: value });

  if (!issue.project_id) return null;

  const defaultLabelOptions = issue?.label_ids
    ?.map((id) => projectLabels?.find((label) => label.id === id))
    .filter(Boolean) || [];

  const minDate = getDate(issue.start_date);
  minDate?.setDate(minDate.getDate());

  const maxDate = getDate(issue.target_date);
  maxDate?.setDate(maxDate.getDate());

  const handleEventPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div className={className}>
      {/* basic properties */}
      {/* state */}
      <div className="h-5" onClick={handleEventPropagation}>
        <StateDropdown
          buttonContainerClassName="truncate max-w-40"
          value={issue.state_id}
          onChange={handleState}
          projectId={issue.project_id}
          buttonVariant="border-with-text"
          renderByDefault={isMobile}
          showTooltip
        />
      </div>

      {/* priority */}
      <div className="h-5" onClick={handleEventPropagation}>
        <PriorityDropdown
          value={issue?.priority}
          onChange={handlePriority}
          buttonVariant="border-without-text"
          buttonClassName="border"
          renderByDefault={isMobile}
          showTooltip
        />
      </div>

      {/* label */}

      <IssuePropertyLabels
        projectId={issue?.project_id || null}
        value={issue?.label_ids || null}
        defaultOptions={defaultLabelOptions}
        onChange={handleLabel}
        renderByDefault={isMobile}
        hideDropdownArrow
      />

      {/* start date */}
      <div className="h-5" onClick={handleEventPropagation}>
        <DateDropdown
          value={issue.start_date ?? null}
          onChange={handleStartDate}
          maxDate={maxDate}
          placeholder="Start date"
          icon={<StartDatePropertyIcon className="h-3 w-3 flex-shrink-0" />}
          buttonVariant={issue.start_date ? "border-with-text" : "border-without-text"}
          optionsClassName="z-10"
          renderByDefault={isMobile}
          showTooltip
        />
      </div>

      {/* target/due date */}
      <div className="h-5" onClick={handleEventPropagation}>
        <DateDropdown
          value={issue?.target_date ?? null}
          onChange={handleTargetDate}
          minDate={minDate}
          placeholder="Due date"
          icon={<DueDatePropertyIcon className="h-3 w-3 flex-shrink-0" />}
          buttonVariant={issue.target_date ? "border-with-text" : "border-without-text"}
          buttonClassName={
            shouldHighlightIssueDueDate(issue?.target_date || null, stateDetails?.group) ? "text-red-500" : ""
          }
          clearIconClassName="!text-primary"
          optionsClassName="z-10"
          renderByDefault={isMobile}
          showTooltip
        />
      </div>

      {/* assignee */}
      <div className="h-5" onClick={handleEventPropagation}>
        <MemberDropdown
          projectId={issue?.project_id}
          value={issue?.assignee_ids}
          onChange={handleAssignee}
          multiple
          buttonVariant={issue.assignee_ids?.length > 0 ? "transparent-without-text" : "border-without-text"}
          buttonClassName={issue.assignee_ids?.length > 0 ? "hover:bg-transparent px-0" : ""}
          showTooltip={issue?.assignee_ids?.length === 0}
          placeholder="Assignees"
          optionsClassName="z-10"
          tooltipContent=""
          renderByDefault={isMobile}
        />
      </div>

      {/* modules */}
      {projectDetails?.module_view && (
        <div className="h-5" onClick={handleEventPropagation}>
          <ModuleDropdown
            buttonContainerClassName="truncate max-w-40"
            projectId={issue?.project_id}
            value={issue?.module_ids ?? []}
            onChange={handleModule}
            renderByDefault={isMobile}
            multiple
            buttonVariant="border-with-text"
            showCount
            showTooltip
          />
        </div>
      )}

      {/* sprints */}
      {projectDetails?.sprint_view && (
        <div className="h-5" onClick={handleEventPropagation}>
          <SprintDropdown
            buttonContainerClassName="truncate max-w-40"
            projectId={issue?.project_id}
            value={issue?.sprint_id || null}
            onChange={handleSprint}
            buttonVariant="border-with-text"
            renderByDefault={isMobile}
            showTooltip
          />
        </div>
      )}

      {/* estimates */}
      {issue.project_id && areEstimateEnabledByProjectId(issue.project_id?.toString()) && (
        <div className="h-5" onClick={handleEventPropagation}>
          <EstimateDropdown
            value={issue.estimate_point ?? undefined}
            onChange={handleEstimate}
            projectId={issue.project_id}
            buttonVariant="border-with-text"
            renderByDefault={isMobile}
            showTooltip
          />
        </div>
      )}
    </div>
  );
}
