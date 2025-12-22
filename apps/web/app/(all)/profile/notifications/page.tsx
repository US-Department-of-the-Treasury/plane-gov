import { useQuery } from "@tanstack/react-query";
// components
import { useTranslation } from "@plane/i18n";
import { PageHead } from "@/components/core/page-title";
import { EmailNotificationForm } from "@/components/profile/notification/email-notification-form";
import { ProfileSettingContentHeader } from "@/components/profile/profile-setting-content-header";
import { ProfileSettingContentWrapper } from "@/components/profile/profile-setting-content-wrapper";
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
      <ProfileSettingContentWrapper>
        <ProfileSettingContentHeader
          title={t("email_notifications")}
          description={t("stay_in_the_loop_on_issues_you_are_subscribed_to_enable_this_to_get_notified")}
        />
        <EmailNotificationForm data={data} />
      </ProfileSettingContentWrapper>
    </>
  );
}
