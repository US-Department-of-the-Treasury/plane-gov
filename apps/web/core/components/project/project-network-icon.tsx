import { Lock, Building, Globe2 } from "lucide-react";
// plane imports
import type { TNetworkChoiceIconKey } from "@plane/constants";
import { cn } from "@plane/utils";

type Props = {
  iconKey: TNetworkChoiceIconKey;
  className?: string;
};

// Icon mapping outside of render to avoid creating components during render
const ICON_MAP: Record<TNetworkChoiceIconKey, typeof Lock | typeof Building | typeof Globe2> = {
  Lock,
  Building,
  Globe2,
};

export function ProjectNetworkIcon(props: Props) {
  const { iconKey, className } = props;

  const Icon = ICON_MAP[iconKey];
  if (!Icon) return null;

  return <Icon className={cn("h-3 w-3", className)} />;
}
