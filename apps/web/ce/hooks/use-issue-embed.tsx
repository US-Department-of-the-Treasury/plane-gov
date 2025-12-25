// editor
import type { TEmbedConfig } from "@plane/editor";
// plane types
import type { TSearchEntityRequestPayload, TSearchResponse } from "@plane/types";

export type TIssueEmbedHookProps = {
  fetchEmbedSuggestions?: (payload: TSearchEntityRequestPayload) => Promise<TSearchResponse>;
  projectId?: string;
  workspaceSlug?: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useIssueEmbed = (_props: TIssueEmbedHookProps) => {
  const widgetCallback = () => null;

  const issueEmbedProps: TEmbedConfig["issue"] = {
    widgetCallback,
  };

  return {
    issueEmbedProps,
  };
};
