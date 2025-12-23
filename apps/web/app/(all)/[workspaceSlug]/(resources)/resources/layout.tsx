import type { ReactNode } from "react";
// local imports
import { ResourcesHeader } from "./header";

interface ResourcesLayoutProps {
  children: ReactNode;
}

export default function ResourcesLayout({ children }: ResourcesLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <ResourcesHeader />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
