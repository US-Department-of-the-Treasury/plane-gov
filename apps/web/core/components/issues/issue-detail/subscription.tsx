import type { FC } from "react";
import { Bell, BellOff } from "lucide-react";
// plane-i18n
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
// UI
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { EIssueServiceType } from "@plane/types";
import { Loader } from "@plane/ui";
// hooks
import { useUserPermissions } from "@/hooks/store/user";
// queries
import { useIssueSubscription, useToggleIssueSubscription } from "@/store/queries/issue";

export type TIssueSubscription = {
  workspaceSlug: string;
  projectId: string;
  issueId: string;
  serviceType?: EIssueServiceType;
};

export function IssueSubscription(props: TIssueSubscription) {
  const { workspaceSlug, projectId, issueId, serviceType = EIssueServiceType.ISSUES } = props;
  const { t } = useTranslation();

  // queries
  const { data: subscriptionData, isLoading } = useIssueSubscription(workspaceSlug, projectId, issueId);
  const { mutate: toggleSubscription, isPending } = useToggleIssueSubscription();

  // hooks
  const { allowPermissions } = useUserPermissions();

  const isSubscribed = subscriptionData?.subscribed;
  const isEditable = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.PROJECT,
    workspaceSlug,
    projectId
  );

  const handleSubscription = () => {
    toggleSubscription(
      {
        workspaceSlug,
        projectId,
        issueId,
        subscribed: !isSubscribed
      },
      {
        onSuccess: () => {
          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: t("toast.success"),
            message: isSubscribed
              ? t("issue.subscription.actions.unsubscribed")
              : t("issue.subscription.actions.subscribed"),
          });
        },
        onError: () => {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: t("toast.error"),
            message: t("common.error.message"),
          });
        },
      }
    );
  };

  if (isLoading)
    return (
      <Loader>
        <Loader.Item width="106px" height="28px" />
      </Loader>
    );

  return (
    <div>
      <Button
        prependIcon={isSubscribed ? <BellOff /> : <Bell className="h-3 w-3" />}
        variant="secondary"
        className="hover:!bg-accent-primary/20"
        onClick={handleSubscription}
        disabled={!isEditable || isPending}
        size="lg"
      >
        {isPending ? (
          <span>
            <span className="hidden sm:block">{t("common.loading")}</span>
          </span>
        ) : isSubscribed ? (
          <div className="hidden sm:block">{t("common.actions.unsubscribe")}</div>
        ) : (
          <div className="hidden sm:block">{t("common.actions.subscribe")}</div>
        )}
      </Button>
    </div>
  );
}
