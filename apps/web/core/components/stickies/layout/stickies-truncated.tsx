import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
// plane utils
import { useTranslation } from "@plane/i18n";
import { cn } from "@plane/utils";
// hooks
import { useSticky } from "@/hooks/use-stickies";
// queries
import { queryKeys } from "@/store/queries/query-keys";
// components
import { ContentOverflowWrapper } from "../../core/content-overflow-HOC";
import { StickiesLayout } from "./stickies-list";

type StickiesTruncatedProps = {
  handleClose?: () => void;
};

export function StickiesTruncated(props: StickiesTruncatedProps) {
  const { handleClose = () => {} } = props;
  // navigation
  const { workspaceSlug } = useParams();
  // store hooks
  const { fetchWorkspaceStickies } = useSticky();
  const { t } = useTranslation();

  useQuery({
    queryKey: queryKeys.stickies.all(workspaceSlug?.toString() ?? "", "", undefined),
    queryFn: () => fetchWorkspaceStickies(),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return (
    <ContentOverflowWrapper
      maxHeight={620}
      containerClassName="pb-2 box-border"
      fallback={null}
      customButton={
        <Link
          href={`/${workspaceSlug}/stickies`}
          className={cn(
            "gap-1 w-full text-accent-primary text-13 font-medium transition-opacity duration-300 bg-surface-2/20"
          )}
          onClick={handleClose}
        >
          {t("show_all")}
        </Link>
      }
    >
      <StickiesLayout workspaceSlug={workspaceSlug?.toString()} />
    </ContentOverflowWrapper>
  );
}
