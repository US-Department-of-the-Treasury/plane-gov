import React, { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { Tab } from "@headlessui/react";
// plane package imports
import type { ISprint, IEpic, IProject } from "@plane/types";
import { Spinner } from "@plane/ui";
// hooks
import { useAnalytics } from "@/hooks/store/use-analytics";
// plane web components
import TotalInsights from "../../total-insights";
import CreatedVsResolved from "../created-vs-resolved";
import CustomizedInsights from "../customized-insights";
import WorkItemsInsightTable from "../workitems-insight-table";

type Props = {
  fullScreen: boolean;
  projectDetails: IProject | undefined;
  sprintDetails: ISprint | undefined;
  epicDetails: IEpic | undefined;
  isEpic?: boolean;
};

export const WorkItemsModalMainContent = observer(function WorkItemsModalMainContent(props: Props) {
  const { projectDetails, sprintDetails, epicDetails, fullScreen, isEpic } = props;
  const { updateSelectedProjects, updateSelectedSprint, updateSelectedEpic, updateIsPeekView } = useAnalytics();
  const [isModalConfigured, setIsModalConfigured] = useState(false);

  useEffect(() => {
    updateIsPeekView(true);

    // Handle project selection
    if (projectDetails?.id) {
      updateSelectedProjects([projectDetails.id]);
    }

    // Handle sprint selection
    if (sprintDetails?.id) {
      updateSelectedSprint(sprintDetails.id);
    }

    // Handle epic selection
    if (epicDetails?.id) {
      updateSelectedEpic(epicDetails.id);
    }
    setIsModalConfigured(true);

    // Cleanup fields
    return () => {
      updateSelectedProjects([]);
      updateSelectedSprint("");
      updateSelectedEpic("");
      updateIsPeekView(false);
    };
  }, [
    projectDetails?.id,
    sprintDetails?.id,
    epicDetails?.id,
    updateSelectedProjects,
    updateSelectedSprint,
    updateSelectedEpic,
    updateIsPeekView,
  ]);

  if (!isModalConfigured)
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );

  return (
    <Tab.Group as={React.Fragment}>
      <div className="flex flex-col gap-14 overflow-y-auto p-6">
        <TotalInsights analyticsType="work-items" peekView={!fullScreen} />
        <CreatedVsResolved />
        <CustomizedInsights peekView={!fullScreen} isEpic={isEpic} />
        <WorkItemsInsightTable />
      </div>
    </Tab.Group>
  );
});
