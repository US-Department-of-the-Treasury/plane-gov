// hooks
import { useInstanceInfo } from "@/store/queries";

export function InstanceProvider(props: React.PropsWithChildren) {
  const { children } = props;
  // Trigger instance info fetch (TanStack Query handles caching and deduplication)
  useInstanceInfo();

  return <>{children}</>;
}
