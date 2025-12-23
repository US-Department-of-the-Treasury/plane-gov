import { Outlet } from "react-router";
// local imports
import { ResourcesHeader } from "./header";

export default function ResourcesLayout() {
  return (
    <div className="flex flex-col h-full">
      <ResourcesHeader />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
