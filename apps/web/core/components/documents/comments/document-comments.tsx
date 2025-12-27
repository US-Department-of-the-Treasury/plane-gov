"use client";

import { memo, useState, useCallback, useRef } from "react";
import { Send, MoreHorizontal, Trash2, Edit2, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
// plane imports
import { useTranslation } from "@plane/i18n";
import { cn } from "@plane/utils";
// components
import { Button, Avatar, Tooltip } from "@plane/ui";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@plane/propel/primitives";
// hooks
import { useUser } from "@/hooks/store/user";
import { usePageComments, useCreatePageComment, useUpdatePageComment, useDeletePageComment } from "@/store/queries";
// types
import type { TDocumentComment } from "@plane/types";

interface DocumentCommentsProps {
  workspaceSlug: string;
  documentId: string;
  isEditable?: boolean;
}

interface CommentItemProps {
  comment: TDocumentComment;
  workspaceSlug: string;
  documentId: string;
  currentUserId: string | undefined;
  isEditable: boolean;
}

const CommentItem = memo(function CommentItem({
  comment,
  workspaceSlug,
  documentId,
  currentUserId,
  isEditable,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.comment_stripped);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateCommentMutation = useUpdatePageComment();
  const deleteCommentMutation = useDeletePageComment();

  const isOwner = currentUserId === comment.actor;
  const canModify = isEditable && isOwner;

  const handleEdit = useCallback(() => {
    setEditContent(comment.comment_stripped);
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [comment.comment_stripped]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent(comment.comment_stripped);
  }, [comment.comment_stripped]);

  const handleSaveEdit = useCallback(async () => {
    if (!editContent.trim() || editContent === comment.comment_stripped) {
      handleCancelEdit();
      return;
    }

    try {
      await updateCommentMutation.mutateAsync({
        workspaceSlug,
        pageId: documentId,
        commentId: comment.id,
        data: {
          comment_html: `<p>${editContent}</p>`,
        },
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  }, [
    workspaceSlug,
    documentId,
    comment.id,
    comment.comment_stripped,
    editContent,
    updateCommentMutation,
    handleCancelEdit,
  ]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteCommentMutation.mutateAsync({
        workspaceSlug,
        pageId: documentId,
        commentId: comment.id,
      });
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  }, [workspaceSlug, documentId, comment.id, deleteCommentMutation]);

  const actorName = comment.actor_detail?.display_name || "Unknown User";
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });

  return (
    <div className="group flex gap-3 py-3 border-b border-custom-border-100 last:border-0">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {comment.actor_detail?.avatar_url ? (
          <Avatar src={comment.actor_detail.avatar_url} name={actorName} size={32} />
        ) : (
          <div className="size-8 rounded-full bg-custom-background-80 flex items-center justify-center">
            <User className="size-4 text-custom-text-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-custom-text-100 truncate">{actorName}</span>
          <span className="text-xs text-custom-text-400">{timeAgo}</span>
          {comment.access === "INTERNAL" && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Internal</span>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-custom-border-200 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-custom-primary-100"
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void handleSaveEdit()} loading={updateCommentMutation.isPending}>
                Save
              </Button>
              <Button size="sm" variant="neutral-primary" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="text-sm text-custom-text-200 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: comment.comment_html }}
          />
        )}
      </div>

      {/* Actions */}
      {canModify && !isEditing && (
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="p-1 rounded hover:bg-custom-background-80 transition-colors">
                <MoreHorizontal className="size-4 text-custom-text-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit2 className="size-3.5 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleDelete()} className="text-red-500 focus:text-red-500">
                <Trash2 className="size-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
});

export const DocumentComments = memo(function DocumentComments({
  workspaceSlug,
  documentId,
  isEditable = true,
}: DocumentCommentsProps) {
  const { t } = useTranslation();
  const [newComment, setNewComment] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hooks
  const { data: currentUser } = useUser();
  const { data: comments, isLoading } = usePageComments(workspaceSlug, documentId);
  const createCommentMutation = useCreatePageComment();

  const handleSubmit = useCallback(async () => {
    if (!newComment.trim()) return;

    try {
      await createCommentMutation.mutateAsync({
        workspaceSlug,
        pageId: documentId,
        data: {
          comment_html: `<p>${newComment}</p>`,
        },
      });
      setNewComment("");
    } catch (error) {
      console.error("Failed to create comment:", error);
    }
  }, [workspaceSlug, documentId, newComment, createCommentMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void handleSubmit();
      }
    },
    [handleSubmit]
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="size-8 rounded-full bg-custom-background-80 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-custom-background-80 rounded animate-pulse" />
              <div className="h-12 w-full bg-custom-background-80 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-custom-border-200">
        <h3 className="text-base font-medium">
          {t("common.comments") || "Comments"}
          {comments && comments.length > 0 && (
            <span className="ml-2 text-sm text-custom-text-400">({comments.length})</span>
          )}
        </h3>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto px-4">
        {comments && comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              workspaceSlug={workspaceSlug}
              documentId={documentId}
              currentUserId={currentUser?.id}
              isEditable={isEditable}
            />
          ))
        ) : (
          <div className="py-8 text-center text-sm text-custom-text-400">No comments yet. Be the first to comment!</div>
        )}
      </div>

      {/* New Comment Input */}
      {isEditable && (
        <div className="p-4 border-t border-custom-border-200">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment... (Ctrl+Enter to submit)"
              className="w-full px-3 py-2 pr-10 text-sm border border-custom-border-200 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-custom-primary-100"
              rows={3}
            />
            <Tooltip tooltipContent="Send (Ctrl+Enter)">
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!newComment.trim() || createCommentMutation.isPending}
                className={cn(
                  "absolute bottom-3 right-3 p-1.5 rounded-md transition-colors",
                  newComment.trim()
                    ? "bg-custom-primary-100 text-white hover:bg-custom-primary-200"
                    : "bg-custom-background-80 text-custom-text-400"
                )}
              >
                <Send className="size-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
});
