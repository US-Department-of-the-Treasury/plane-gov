// components
import { SprintsListItem } from "./sprints-list-item";

type Props = {
  sprintIds: string[];
  projectId: string;
  workspaceSlug: string;
};

export function SprintsListMap(props: Props) {
  const { sprintIds, projectId, workspaceSlug } = props;

  return (
    <>
      {sprintIds.map((sprintId) => (
        <SprintsListItem key={sprintId} sprintId={sprintId} workspaceSlug={workspaceSlug} projectId={projectId} />
      ))}
    </>
  );
}
