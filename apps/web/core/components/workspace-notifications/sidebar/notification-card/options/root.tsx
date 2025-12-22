import type { Dispatch, SetStateAction } from "react";
// plane imports
import { cn } from "@plane/utils";
// hooks
import { useNotification } from "@/hooks/store/notifications/use-notification";
// local imports
import { NotificationItemArchiveOption } from "./archive";
import { NotificationItemReadOption } from "./read";
import { NotificationItemSnoozeOption } from "./snooze";

type TNotificationOption = {
  workspaceSlug: string;
  notificationId: string;
  isSnoozeStateModalOpen: boolean;
  setIsSnoozeStateModalOpen: Dispatch<SetStateAction<boolean>>;
  customSnoozeModal: boolean;
  setCustomSnoozeModal: Dispatch<SetStateAction<boolean>>;
};

export function NotificationOption(props: TNotificationOption) {
  const {
    workspaceSlug,
    notificationId,
    isSnoozeStateModalOpen,
    setIsSnoozeStateModalOpen,
    customSnoozeModal,
    setCustomSnoozeModal,
  } = props;
  // hooks
  const notification = useNotification(workspaceSlug, { snoozed: false, archived: false }, notificationId);

  // Don't render if notification is not found
  if (!notification.asJson) return null;

  // After check, notification conforms to INotification (all properties exist)
  // Type assertion is safe here because we checked notification.asJson exists above
  const notificationData = notification as any;

  return (
    <div
      className={cn("flex-shrink-0 hidden group-hover:block text-body-xs-medium", {
        block: isSnoozeStateModalOpen,
      })}
    >
      <div className="relative flex justify-center items-center gap-2">
        {/* read */}
        <NotificationItemReadOption workspaceSlug={workspaceSlug} notification={notificationData} />

        {/* archive */}
        <NotificationItemArchiveOption workspaceSlug={workspaceSlug} notification={notificationData} />

        {/* snooze notification */}
        <NotificationItemSnoozeOption
          workspaceSlug={workspaceSlug}
          notification={notificationData}
          setIsSnoozeStateModalOpen={setIsSnoozeStateModalOpen}
          customSnoozeModal={customSnoozeModal}
          setCustomSnoozeModal={setCustomSnoozeModal}
        />
      </div>
    </div>
  );
}
