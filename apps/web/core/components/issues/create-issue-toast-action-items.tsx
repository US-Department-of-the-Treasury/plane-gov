import type { FC } from "react";
import React, { useState } from "react";
import { copyUrlToClipboard, generateWorkItemLink } from "@plane/utils";
// plane imports
// helpers
// hooks
// queries
import { useIssue } from "@/store/queries/issue";
import { useProjects, getProjectById } from "@/store/queries/project";

type TCreateIssueToastActionItems = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  isEpic?: boolean;
};

export function CreateIssueToastActionItems(props: TCreateIssueToastActionItems) {
  const { workspaceSlug, projectId, issueId, isEpic = false } = props;
  // state
  const [copied, setCopied] = useState(false);
  // queries
  const { data: issue } = useIssue(workspaceSlug, projectId, issueId);
  const { data: projects = [] } = useProjects(workspaceSlug);

  // derived values
  const project = issue?.project_id ? getProjectById(projects, issue.project_id) : undefined;
  const projectIdentifier = project?.identifier;

  if (!issue) return null;

  const workItemLink = generateWorkItemLink({
    workspaceSlug,
    projectId: issue?.project_id,
    issueId,
    projectIdentifier,
    sequenceId: issue?.sequence_id,
    isEpic,
  });

  const copyToClipboard = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    try {
      await copyUrlToClipboard(workItemLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      setCopied(false);
    }
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="flex items-center gap-1 text-11 text-secondary -ml-2">
      <a
        href={workItemLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent-primary px-2 py-1 hover:bg-surface-2 font-medium rounded-sm"
      >
        {`View ${isEpic ? "epic" : "work item"}`}
      </a>

      {copied ? (
        <>
          <span className="cursor-default px-2 py-1 text-secondary">Copied!</span>
        </>
      ) : (
        <>
          <button
            className="cursor-pointer hidden group-hover:flex px-2 py-1 text-tertiary hover:text-secondary hover:bg-surface-2 rounded-sm"
            onClick={copyToClipboard}
          >
            Copy link
          </button>
        </>
      )}
    </div>
  );
}
