import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
// services
import { UserService } from "@/services/user.service";
// components
import { ActivityList } from "./activity-list";
// query keys
import { queryKeys } from "@/store/queries/query-keys";

// services
const userService = new UserService();

type Props = {
  cursor: string;
  perPage: number;
  updateResultsCount: (count: number) => void;
  updateTotalPages: (count: number) => void;
};

export function WorkspaceActivityListPage(props: Props) {
  const { cursor, perPage, updateResultsCount, updateTotalPages } = props;
  // router
  const { workspaceSlug, userId } = useParams();

  const { data: userProfileActivity } = useQuery({
    queryKey: queryKeys.userProfiles.activity(workspaceSlug?.toString() ?? "", userId?.toString() ?? "", { cursor }),
    queryFn: () =>
      userService.getUserProfileActivity(workspaceSlug!.toString(), userId!.toString(), {
        cursor,
        per_page: perPage,
      }),
    enabled: !!(workspaceSlug && userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (!userProfileActivity) return;

    updateTotalPages(userProfileActivity.total_pages);
    updateResultsCount(userProfileActivity.results.length);
  }, [updateResultsCount, updateTotalPages, userProfileActivity]);

  return <ActivityList activity={userProfileActivity} />;
}
