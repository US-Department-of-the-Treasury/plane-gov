"use client";

import { memo, useMemo, useCallback, useRef, useState, useEffect } from "react";
import { Smile, X, Check, Loader2 } from "lucide-react";
// plane imports
import { LIVE_BASE_PATH, LIVE_BASE_URL } from "@plane/constants";
import { CollaborativeDocumentEditorWithRef } from "@plane/editor";
import type { EditorRefApi, TDisplayConfig, TRealtimeConfig, TServerHandler, CollaborationState } from "@plane/editor";
import { EmojiPicker, EmojiIconPickerTypes, Logo } from "@plane/propel/emoji-icon-picker";
import { EFileAssetType } from "@plane/types";
import type { TLogoProps, TWikiPageDetail } from "@plane/types";
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
  const titleRef = useRef<HTMLTextAreaElement>(null);
  // state
  const [title, setTitle] = useState(page.name);
  const [syncingStatus, setSyncingStatus] = useState<SyncingStatus>("syncing");
  const [_editorReady, setEditorReady] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

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

  // handle icon change
  const handleIconChange = useCallback(
    async (value: { type: string; value: string | { name: string; color: string } }) => {
      const newLogoProps: TLogoProps =
        value.type === EmojiIconPickerTypes.EMOJI
          ? { in_use: "emoji", emoji: { value: value.value as string } }
          : { in_use: "icon", icon: value.value as { name: string; color: string } };

      try {
        await updatePageMutation.mutateAsync({
          workspaceSlug,
          pageId,
          data: { logo_props: newLogoProps },
        });
      } catch (error) {
        console.error("Failed to update page icon:", error);
      }
    },
    [workspaceSlug, pageId, updatePageMutation]
  );

  // handle icon removal
  const handleRemoveIcon = useCallback(async () => {
    try {
      await updatePageMutation.mutateAsync({
        workspaceSlug,
        pageId,
        data: { logo_props: {} as TLogoProps },
      });
    } catch (error) {
      console.error("Failed to remove page icon:", error);
    }
  }, [workspaceSlug, pageId, updatePageMutation]);

  // auto-resize textarea for title
  const resizeTextarea = useCallback(() => {
    const textarea = titleRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [title, resizeTextarea]);

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

  // derived values for icon display
  const hasIcon = page.logo_props?.in_use;
  const isEditable = !page.is_locked;

  // handle click on empty area below content to focus editor at end
  const handleEmptyAreaClick = useCallback(() => {
    if (!isEditable) return;
    editorRef.current?.focus("end");
  }, [isEditable]);

  // block width class for consistent Notion-style styling (768px = max-w-3xl)
  const blockWidthClassName = cn(
    "block bg-transparent w-full max-w-3xl mx-auto transition-all duration-200 ease-in-out",
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
    <div className="flex flex-col h-full bg-white dark:bg-[#191919]">
      {/* Notion-style content area with generous padding */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        <div className={cn(blockWidthClassName, "px-12 pt-20 pb-8 flex-1 flex flex-col")}>
          {/* Icon section - Notion-style large emoji/icon */}
          <div className="group/icon mb-4">
            {hasIcon ? (
              <div className="flex items-center gap-3">
                <EmojiPicker
                  isOpen={isIconPickerOpen}
                  handleToggle={(val) => setIsIconPickerOpen(val)}
                  buttonClassName="outline-none"
                  label={
                    <div className="size-20 flex items-center justify-center rounded-xl hover:bg-[#f7f7f5] dark:hover:bg-[#2f2f2f] transition-colors cursor-pointer">
                      <Logo logo={page.logo_props} size={72} type="lucide" />
                    </div>
                  }
                  onChange={(val) => void handleIconChange(val)}
                  defaultIconColor={page.logo_props?.in_use === "icon" ? page.logo_props?.icon?.color : undefined}
                  defaultOpen={
                    page.logo_props?.in_use === "emoji" ? EmojiIconPickerTypes.EMOJI : EmojiIconPickerTypes.ICON
                  }
                  disabled={!isEditable}
                />
                {isEditable && (
                  <button
                    type="button"
                    onClick={() => void handleRemoveIcon()}
                    className="size-7 flex items-center justify-center rounded-lg opacity-0 group-hover/icon:opacity-100 transition-opacity bg-[#f7f7f5] dark:bg-[#2f2f2f] hover:bg-[#efefef] dark:hover:bg-[#3a3a3a] text-[#37352f80] dark:text-[#ffffff80]"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ) : (
              isEditable && (
                <EmojiPicker
                  isOpen={isIconPickerOpen}
                  handleToggle={(val) => setIsIconPickerOpen(val)}
                  buttonClassName="outline-none"
                  label={
                    <button
                      type="button"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[14px] text-[#37352f80] dark:text-[#ffffff80] opacity-0 group-hover/icon:opacity-100 transition-opacity hover:bg-[#f7f7f5] dark:hover:bg-[#2f2f2f]"
                    >
                      <Smile className="size-5" />
                      <span>Add icon</span>
                    </button>
                  }
                  onChange={(val) => void handleIconChange(val)}
                />
              )
            )}
          </div>

          {/* Title section - Notion-style 40px bold */}
          <div className="group/title relative mb-6">
            <div className="flex items-start gap-3">
              <textarea
                ref={titleRef}
                value={title}
                onChange={(e) => void handleTitleChange(e.target.value)}
                placeholder="Untitled"
                rows={1}
                style={{ fontSize: "40px" }}
                className={cn(
                  "flex-1 leading-[1.2] font-bold bg-transparent border-none outline-none resize-none overflow-hidden",
                  "text-[#37352f] dark:text-[#ffffffcf]",
                  "placeholder:text-[#37352f40] dark:placeholder:text-[#ffffff40]"
                )}
                disabled={!isEditable}
              />
              {/* Subtle sync status indicator */}
              <div className="pt-4 flex items-center">
                {syncingStatus === "syncing" && (
                  <Loader2 className="size-4 animate-spin text-[#37352f52] dark:text-[#ffffff52]" />
                )}
                {syncingStatus === "synced" && (
                  <Check className="size-4 text-[#0f7b6c] opacity-0 group-hover/title:opacity-100 transition-opacity" />
                )}
                {syncingStatus === "error" && (
                  <div className="flex items-center gap-1.5 text-[12px] text-[#e03e3e]">
                    <div className="size-2 rounded-full bg-[#e03e3e]" />
                    <span>Offline</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collaborative editor */}
          <CollaborativeDocumentEditorWithRef
            editable={isEditable}
            hideTitleEditor
            id={pageId}
            fileHandler={fileHandler}
            handleEditorReady={handleEditorReady}
            ref={editorRef}
            containerClassName="h-full p-0"
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
          {/* Clickable empty area below content - clicking here focuses editor at end */}
          {/* Uses flex-1 to fill remaining viewport height, like Notion */}
          {isEditable && (
            <div className="flex-1 min-h-[200px] cursor-text" onClick={handleEmptyAreaClick} aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
});
