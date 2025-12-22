"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { SitesMemberService } from "@plane/services";
import { queryKeys } from "./query-keys";
import type { TPublicMember } from "@/types/member";

const memberService = new SitesMemberService();

/**
 * Hook to fetch members for a published project.
 * Replaces MobX MemberStore.fetchMembers.
 */
export function useMembers(anchor: string) {
  const query = useQuery({
    queryKey: queryKeys.members.all(anchor),
    queryFn: () => memberService.list(anchor),
    enabled: !!anchor,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });

  const getMemberById = useCallback(
    (memberId: string): TPublicMember | undefined => {
      if (!query.data || !memberId) return undefined;
      return query.data.find((member) => member.id === memberId);
    },
    [query.data]
  );

  const getMembersByIds = useCallback(
    (memberIds: string[]): TPublicMember[] => {
      if (!query.data || !memberIds?.length) return [];
      return query.data.filter((member) => memberIds.includes(member.id));
    },
    [query.data]
  );

  return {
    ...query,
    getMemberById,
    getMembersByIds,
  };
}
