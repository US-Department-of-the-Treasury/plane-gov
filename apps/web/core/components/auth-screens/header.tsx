import Link from "next/link";
import { useTranslation } from "@plane/i18n";
import { PlaneLockup } from "@plane/propel/icons";
import { PageHead } from "@/components/core/page-title";
import { EAuthModes } from "@/helpers/authentication.helper";

type AuthHeaderProps = {
  type: EAuthModes;
};

export function AuthHeader({ type }: AuthHeaderProps) {
  const { t } = useTranslation();
  const pageTitle = type === EAuthModes.SIGN_IN ? "Sign in" : "Sign up";

  return (
    <>
      <PageHead title={t(pageTitle) + " - Plane"} />
      <div className="flex items-center justify-between gap-6 w-full flex-shrink-0 sticky top-0">
        <Link href="/">
          <PlaneLockup height={20} width={95} className="text-primary" />
        </Link>
        {/* Sign up link removed - government use requires invite-only access */}
      </div>
    </>
  );
}
