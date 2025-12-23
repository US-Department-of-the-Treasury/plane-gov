"use client";

import { memo, useMemo, useCallback, useRef, useState, useEffect } from "react";
import { Lock, Loader2 } from "lucide-react";
// plane imports
import { LIVE_BASE_PATH, LIVE_BASE_URL } from "@plane/constants";
import { CollaborativeDocumentEditorWithRef } from "@plane/editor";
import type { EditorRefApi, TDisplayConfig, TRealtimeConfig, TServerHandler, CollaborationState } from "@plane/editor";
import { EFileAssetType } from "@plane/types";
import { cn, generateRandomColor, hslToHex } from "@plane/utils";
// hooks
import { useEditorConfig, useEditorMention } from "@/hooks/editor";
import { useUser } from "@/hooks/store/user";
import { useEditorAsset } from "@/hooks/store/use-editor-asset";
import { usePageFilters } from "@/hooks/use-page-filters";
import { useParseEditorContent } from "@/hooks/use-parse-editor-content";
import { useWorkspaces, getWorkspaceBySlug } from "@/store/queries/workspace";
import { useWorkspaceMembers, getWorkspaceMemberByUserId, getMemberDisplayName } from "@/store/queries/member";
// plane web hooks
import { useEditorFlagging } from "@/plane-web/hooks/use-editor-flagging";
// components
import { EditorMentionsRoot } from "@/components/editor/embeds/mentions";
// queries
import { useUpdateWikiPage } from "@/store/queries";
// types
import type { TWikiPageDetail } from "@plane/types";

interface WikiPageEditorProps {
  workspaceSlug: string;
  pageId: string;
  page: TWikiPageDetail;
}

type SyncingStatus = "syncing" | "synced" | "error";

/**
 * WikiPageEditor - Real-time collaborative editor for wiki pages
 *
 * Uses TipTap editor with Hocuspocus for real-time collaboration.
 * Auto-saves via WebSocket - no manual save button needed.
 */
export const WikiPageEditor = memo(function WikiPageEditor({ workspaceSlug, pageId, page }: WikiPageEditorProps) {
  // refs
  const editorRef = useRef<EditorRefApi>(null);
  // state
  const [title, setTitle] = useState(page.name);
  const [syncingStatus, setSyncingStatus] = useState<SyncingStatus>("syncing");
  const [editorReady, setEditorReady] = useState(false);

  // hooks
  const { data: currentUser } = useUser();
  const { data: workspaces } = useWorkspaces();
  const { data: members } = useWorkspaceMembers(workspaceSlug);
  const { fontSize, fontStyle, isFullWidth } = usePageFilters();
  const { getEditorFileHandlers } = useEditorConfig();
  const { uploadEditorAsset, duplicateEditorAsset } = useEditorAsset();
  const { document: documentEditorExtensions } = useEditorFlagging({ workspaceSlug });
  const { getEditorMetaData } = useParseEditorContent({ workspaceSlug });

  // mutations
  const updatePageMutation = useUpdateWikiPage();

  // derived values
  const workspaceId = getWorkspaceBySlug(workspaces ?? [], workspaceSlug)?.id ?? "";

  // mention handler
  const { fetchMentions } = useEditorMention({
    enableAdvancedMentions: false,
    searchEntity: () => Promise.resolve({}),
  });

  // display config for editor
  const displayConfig: TDisplayConfig = useMemo(
    () => ({
      fontSize,
      fontStyle,
      wideLayout: isFullWidth,
    }),
    [fontSize, fontStyle, isFullWidth]
  );

  // server handler for sync status
  const serverHandler: TServerHandler = useMemo(
    () => ({
      onStateChange: (state: CollaborationState) => {
        if (state.stage.kind === "disconnected") {
          setSyncingStatus("error");
        } else if (state.stage.kind === "synced") {
          setSyncingStatus("synced");
        } else {
          setSyncingStatus("syncing");
        }
      },
    }),
    []
  );

  // realtime config for WebSocket connection
  const realtimeConfig: TRealtimeConfig | undefined = useMemo(() => {
    try {
      const LIVE_SERVER_BASE_URL = LIVE_BASE_URL?.trim() || window.location.origin;
      const WS_LIVE_URL = new URL(LIVE_SERVER_BASE_URL);
      const isSecureEnvironment = window.location.protocol === "https:";
      WS_LIVE_URL.protocol = isSecureEnvironment ? "wss" : "ws";
      WS_LIVE_URL.pathname = `${LIVE_BASE_PATH}/collaboration`;

      // Add query parameters for wiki page
      WS_LIVE_URL.searchParams.set("documentType", "wiki_page");
      WS_LIVE_URL.searchParams.set("workspaceSlug", workspaceSlug);

      return {
        url: WS_LIVE_URL.toString(),
      };
    } catch (error) {
      console.error("Error creating realtime config", error);
      return undefined;
    }
  }, [workspaceSlug]);

  // user config for collaboration presence
  const userConfig = useMemo(
    () => ({
      id: currentUser?.id ?? "",
      name: currentUser?.display_name ?? "",
      color: hslToHex(generateRandomColor(currentUser?.id ?? "")),
    }),
    [currentUser?.display_name, currentUser?.id]
  );

  // file handler using the editor config hook
  const fileHandler = useMemo(
    () =>
      getEditorFileHandlers({
        uploadFile: async (blockId, file) => {
          const { asset_id } = await uploadEditorAsset({
            blockId,
            data: {
              entity_identifier: pageId,
              entity_type: EFileAssetType.PAGE_DESCRIPTION,
            },
            file,
            workspaceSlug,
          });
          return asset_id;
        },
        duplicateFile: async (assetId: string) => {
          const { asset_id } = await duplicateEditorAsset({
            assetId,
            entityId: pageId,
            entityType: EFileAssetType.PAGE_DESCRIPTION,
            workspaceSlug,
          });
          return asset_id;
        },
        workspaceId,
        workspaceSlug,
      }),
    [getEditorFileHandlers, uploadEditorAsset, duplicateEditorAsset, pageId, workspaceId, workspaceSlug]
  );

  // handle title change with debounced save
  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      setTitle(newTitle);
      // Debounce the API call
      if (newTitle !== page.name) {
        try {
          await updatePageMutation.mutateAsync({
            workspaceSlug,
            pageId,
            data: { name: newTitle },
          });
        } catch (error) {
          console.error("Failed to update page title:", error);
        }
      }
    },
    [page.name, workspaceSlug, pageId, updatePageMutation]
  );

  // handle editor ready
  const handleEditorReady = useCallback((status: boolean) => {
    setEditorReady(status);
  }, []);

  // sync title with page prop
  useEffect(() => {
    if (page.name !== title) {
      setTitle(page.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.name]);

  // block width class for consistent styling
  const blockWidthClassName = cn(
    "block bg-transparent w-full max-w-[720px] mx-auto transition-all duration-200 ease-in-out",
    {
      "max-w-[1152px]": isFullWidth,
    }
  );

  // Loading state while realtime config is being built
  if (!realtimeConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-6 animate-spin text-custom-text-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-custom-border-200 bg-custom-background-100">
        <div className="flex items-center gap-2">
          {page.is_locked && (
            <div className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded">
              <Lock className="size-3" />
              <span>Locked</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sync status indicator */}
          <div className="flex items-center gap-1.5 text-xs text-custom-text-400">
            {syncingStatus === "syncing" && (
              <>
                <Loader2 className="size-3 animate-spin" />
                <span>Syncing...</span>
              </>
            )}
            {syncingStatus === "synced" && (
              <>
                <div className="size-2 rounded-full bg-green-500" />
                <span>Saved</span>
              </>
            )}
            {syncingStatus === "error" && (
              <>
                <div className="size-2 rounded-full bg-red-500" />
                <span>Connection lost</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto">
        <div className={blockWidthClassName}>
          {/* Title input */}
          <div className="px-6 pt-8 pb-4">
            <input
              type="text"
              value={title}
              onChange={(e) => void handleTitleChange(e.target.value)}
              placeholder="Untitled"
              className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-custom-text-400"
              disabled={page.is_locked}
            />
          </div>

          {/* Collaborative editor */}
          <CollaborativeDocumentEditorWithRef
            editable={!page.is_locked}
            id={pageId}
            fileHandler={fileHandler}
            handleEditorReady={handleEditorReady}
            ref={editorRef}
            containerClassName="h-full p-0 pb-64 px-6"
            displayConfig={displayConfig}
            getEditorMetaData={getEditorMetaData}
            mentionHandler={{
              searchCallback: async (query) => {
                const res = await fetchMentions(query);
                if (!res) throw new Error("Failed in fetching mentions");
                return res;
              },
              renderComponent: (props) => <EditorMentionsRoot {...props} />,
              getMentionedEntityDetails: (id: string) => {
                const member = getWorkspaceMemberByUserId(members, id);
                return { display_name: member ? getMemberDisplayName(member) : "" };
              },
            }}
            realtimeConfig={realtimeConfig}
            serverHandler={serverHandler}
            user={userConfig}
            disabledExtensions={documentEditorExtensions.disabled}
            flaggedExtensions={documentEditorExtensions.flagged}
            extendedEditorProps={{}}
          />
        </div>
      </div>

      {/* Footer status bar */}
      <div className="flex items-center justify-between px-6 py-2 border-t border-custom-border-200 text-xs text-custom-text-400">
        <div className="flex items-center gap-4">
          <span>Last updated: {new Date(page.updated_at).toLocaleString()}</span>
          {page.updated_by_detail && <span>by {page.updated_by_detail.display_name}</span>}
        </div>
        <div className="flex items-center gap-4">{editorReady && <span>Editor ready</span>}</div>
      </div>
    </div>
  );
});
