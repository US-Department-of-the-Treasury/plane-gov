import type { FC } from "react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
// types
import { PROFILE_SETTINGS_TRACKER_EVENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { APITokenService } from "@plane/services";
import type { IApiToken } from "@plane/types";
// ui
import { AlertModalCore } from "@plane/ui";
// query keys
import { queryKeys } from "@/store/queries/query-keys";
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
import { getRouterWorkspaceSlug } from "@/store/client";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tokenId: string;
};

const apiTokenService = new APITokenService();

export function DeleteApiTokenModal(props: Props) {
  const { isOpen, onClose, tokenId } = props;
  // states
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  // hooks
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const handleClose = () => {
    onClose();
    setDeleteLoading(false);
  };

  const handleDeletion = async () => {
    setDeleteLoading(true);
    const workspaceSlug = getRouterWorkspaceSlug();
    if (!workspaceSlug) return;

    await apiTokenService
      .destroy(tokenId)
      .then(() => {
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: t("workspace_settings.settings.api_tokens.delete.success.title"),
          message: t("workspace_settings.settings.api_tokens.delete.success.message"),
        });

        queryClient.setQueryData<IApiToken[]>(queryKeys.apiTokens.all(workspaceSlug), (prevData) =>
          (prevData ?? []).filter((token) => token.id !== tokenId)
        );
        captureSuccess({
          eventName: PROFILE_SETTINGS_TRACKER_EVENTS.pat_deleted,
          payload: {
            token: tokenId,
          },
        });

        handleClose();
      })
      .catch((err) =>
        setToast({
          type: TOAST_TYPE.ERROR,
          title: t("workspace_settings.settings.api_tokens.delete.error.title"),
          message: err?.message ?? t("workspace_settings.settings.api_tokens.delete.error.message"),
        })
      )
      .catch((err) => {
        captureError({
          eventName: PROFILE_SETTINGS_TRACKER_EVENTS.pat_deleted,
          payload: {
            token: tokenId,
          },
          error: err as Error,
        });
      })
      .finally(() => setDeleteLoading(false));
  };

  return (
    <AlertModalCore
      handleClose={handleClose}
      handleSubmit={handleDeletion}
      isSubmitting={deleteLoading}
      isOpen={isOpen}
      title={t("workspace_settings.settings.api_tokens.delete.title")}
      content={<>{t("workspace_settings.settings.api_tokens.delete.description")} </>}
    />
  );
}
