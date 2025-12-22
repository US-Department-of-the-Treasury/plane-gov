import { useQuery } from "@tanstack/react-query";
// plane imports
import { useTranslation } from "@plane/i18n";
// components
import { PageHead } from "@/components/core/page-title";
import { EmailNotificationForm } from "@/components/profile/notification/email-notification-form";
import { SettingsHeading } from "@/components/settings/heading";
import { EmailSettingsLoader } from "@/components/ui/loader/settings/email";
// services
import { UserService } from "@/services/user.service";
import { queryKeys } from "@/store/queries/query-keys";

const userService = new UserService();

export default function ProfileNotificationPage() {
  const { t } = useTranslation();
  // fetching user email notification settings
  const { data, isPending } = useQuery({
    queryKey: queryKeys.emailNotifications.settings(),
    queryFn: () => userService.currentUserEmailNotificationSettings(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  if (!data || isPending) {
    return <EmailSettingsLoader />;
  }

  return (
    <>
      <PageHead title={`${t("profile.label")} - ${t("notifications")}`} />

      <SettingsHeading
        title={t("account_settings.notifications.heading")}
        description={t("account_settings.notifications.description")}
      />
      <EmailNotificationForm data={data} />
    </>
  );
}
