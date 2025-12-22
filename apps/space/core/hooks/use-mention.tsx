import { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
// plane imports
import { UserService } from "@plane/services";
import type { IUser } from "@plane/types";

const userService = new UserService();

export const useMention = () => {
  const { data: user, isLoading: userDataLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => userService.me(),
  });

  const userRef = useRef<IUser | undefined>(undefined);

  useEffect(() => {
    if (userRef) {
      userRef.current = user;
    }
  }, [user]);

  const waitForUserDate = async () =>
    new Promise<IUser>((resolve) => {
      const checkData = () => {
        if (userRef.current) {
          resolve(userRef.current);
        } else {
          setTimeout(checkData, 100);
        }
      };
      checkData();
    });

  const mentionHighlights = async () => {
    if (!userDataLoading && userRef.current) {
      return [userRef.current.id];
    } else {
      const user = await waitForUserDate();
      return [user.id];
    }
  };

  return {
    mentionHighlights,
  };
};
