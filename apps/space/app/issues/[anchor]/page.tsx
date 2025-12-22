import { useParams, useSearchParams } from "next/navigation";
// components
import { IssuesLayoutsRoot } from "@/components/issues/issue-layouts";
// store hooks
import { usePublishSettings, useStates, useLabels } from "@/store/queries";

export default function IssuesPage() {
  // params
  const params = useParams<{ anchor: string }>();
  const { anchor } = params;
  const searchParams = useSearchParams();
  const peekId = searchParams.get("peekId") || undefined;

  // TanStack Query hooks - auto-fetch on mount
  const { data: publishSettings } = usePublishSettings(anchor);
  useStates(anchor);
  useLabels(anchor);

  if (!publishSettings) return null;

  return <IssuesLayoutsRoot anchor={anchor} peekId={peekId} />;
}
