import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
// plane imports
import { PRODUCT_TOUR_TRACKER_EVENTS } from "@plane/constants";
import { ContentWrapper } from "@plane/ui";
// helpers
import { captureSuccess } from "@/helpers/event-tracker.helper";
// hooks
import { useHome } from "@/hooks/store/use-home";
import { useUserProfile, useUser } from "@/hooks/store/user";
import { queryKeys } from "@/store/queries/query-keys";
// plane web imports
import { HomePeekOverviewsRoot } from "@/plane-web/components/home";
import { TourRoot } from "@/plane-web/components/onboarding/tour/root";
// local imports
import { DashboardWidgets } from "./home-dashboard-widgets";
import { UserGreetingsView } from "./user-greetings";

export function WorkspaceHomeView() {
  // store hooks
  const { workspaceSlug } = useParams();
  const { data: currentUser } = useUser();
  const { data: currentUserProfile, updateTourCompleted } = useUserProfile();
  const { fetchWidgets } = useHome();

  useQuery({
    queryKey: queryKeys.home.widgets(workspaceSlug?.toString() ?? ""),
    queryFn: () => fetchWidgets(workspaceSlug?.toString()),
    enabled: !!workspaceSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const handleTourCompleted = () => {
    updateTourCompleted()
      .then(() => {
        captureSuccess({
          eventName: PRODUCT_TOUR_TRACKER_EVENTS.complete,
          payload: {
            user_id: currentUser?.id,
          },
        });
      })
      .catch((error: unknown) => {
        console.error(error);
      });
  };

  // TODO: refactor loader implementation
  return (
    <>
      {currentUserProfile && !currentUserProfile.is_tour_completed && (
        <div className="fixed left-0 top-0 z-20 grid h-full w-full place-items-center bg-backdrop bg-opacity-50 transition-opacity overflow-y-auto">
          <TourRoot onComplete={handleTourCompleted} />
        </div>
      )}
      <>
        <HomePeekOverviewsRoot />
        <ContentWrapper className="gap-6 bg-surface-1 mx-auto scrollbar-hide px-page-x">
          <div className="max-w-[800px] mx-auto w-full">
            {currentUser && <UserGreetingsView user={currentUser} />}
            <DashboardWidgets />
          </div>
        </ContentWrapper>
      </>
    </>
  );
}
