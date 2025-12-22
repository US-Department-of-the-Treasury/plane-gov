import { Loader } from "@plane/ui";
// hooks
import { useInstanceConfigurations, computeFormattedConfig } from "@/store/queries";
// local
import type { Route } from "./+types/page";
import { InstanceImageConfigForm } from "./form";

function InstanceImagePage(_props: Route.ComponentProps) {
  // store
  const { data: instanceConfigurations } = useInstanceConfigurations();
  const formattedConfig = computeFormattedConfig(instanceConfigurations);

  return (
    <>
      <div className="relative container mx-auto w-full h-full p-4 py-4 space-y-6 flex flex-col">
        <div className="border-b border-subtle mx-4 py-4 space-y-1 flex-shrink-0">
          <div className="text-18 font-medium text-primary">Third-party image libraries</div>
          <div className="text-13 font-regular text-tertiary">
            Let your users search and choose images from third-party libraries
          </div>
        </div>
        <div className="flex-grow overflow-hidden overflow-y-scroll vertical-scrollbar scrollbar-md px-4">
          {formattedConfig ? (
            <InstanceImageConfigForm config={formattedConfig} />
          ) : (
            <Loader className="space-y-8">
              <Loader.Item height="50px" width="50%" />
              <Loader.Item height="50px" width="20%" />
            </Loader>
          )}
        </div>
      </div>
    </>
  );
}

export const meta: Route.MetaFunction = () => [{ title: "Images Settings - God Mode" }];

export default InstanceImagePage;
