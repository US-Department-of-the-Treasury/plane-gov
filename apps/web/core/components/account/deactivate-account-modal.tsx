import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal, DialogTitle } from "@plane/propel/primitives";
import { PROFILE_SETTINGS_TRACKER_EVENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
// ui
import { Button } from "@plane/propel/button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
// hooks
import { captureError, captureSuccess } from "@/helpers/event-tracker.helper";
import { useUser } from "@/hooks/store/user";
import { useAppRouter } from "@/hooks/use-app-router";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function DeactivateAccountModal(props: Props) {
  const router = useAppRouter();
  const { isOpen, onClose } = props;
  // hooks
  const { t } = useTranslation();
  const { deactivateAccount, signOut } = useUser();

  // states
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleClose = () => {
    setIsDeactivating(false);
    onClose();
  };

  const handleDeleteAccount = async () => {
    setIsDeactivating(true);

    await deactivateAccount()
      .then(() => {
        captureSuccess({
          eventName: PROFILE_SETTINGS_TRACKER_EVENTS.deactivate_account,
        });
        setToast({
          type: TOAST_TYPE.SUCCESS,
          title: "Success!",
          message: "Account deactivated successfully.",
        });
        signOut();
        router.push("/");
        handleClose();
      })
      .catch((err: any) => {
        captureError({
          eventName: PROFILE_SETTINGS_TRACKER_EVENTS.deactivate_account,
        });
        setToast({
          type: TOAST_TYPE.ERROR,
          title: "Error!",
          message: err?.error,
        });
      })
      .finally(() => setIsDeactivating(false));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed inset-0 z-20 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogContent
              showCloseButton={false}
              className="relative transform overflow-hidden rounded-lg bg-surface-1 text-left shadow-raised-200 sm:my-8 sm:w-[40rem] static translate-x-0 translate-y-0 p-0 border-0"
            >
              <div className="px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="">
                  <div className="flex items-start gap-x-4">
                    <div className="mt-3 grid place-items-center rounded-full bg-red-500/20 p-2 sm:mt-3 sm:p-2 md:mt-0 md:p-4 lg:mt-0 lg:p-4 ">
                      <Trash2
                        className="h-4 w-4 text-red-600 sm:h-4 sm:w-4 md:h-6 md:w-6 lg:h-6 lg:w-6"
                        aria-hidden="true"
                      />
                    </div>
                    <div>
                      <DialogTitle className="my-4 text-20 font-medium leading-6 text-primary">
                        {t("deactivate_your_account")}
                      </DialogTitle>
                      <p className="mt-6 list-disc pr-4 text-14 font-regular text-secondary">
                        {t("deactivate_your_account_description")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mb-2 flex items-center justify-end gap-2 p-4 sm:px-6">
                <Button variant="secondary" size="lg" onClick={onClose}>
                  {t("cancel")}
                </Button>
                <Button variant="error-fill" size="lg" onClick={handleDeleteAccount}>
                  {isDeactivating ? t("deactivating") : t("confirm")}
                </Button>
              </div>
            </DialogContent>
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
