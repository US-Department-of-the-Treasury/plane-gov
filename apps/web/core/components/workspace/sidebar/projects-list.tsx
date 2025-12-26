import { memo, useState, useRef, useEffect } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { useParams, usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@plane/propel/primitives";
// plane imports
import { EUserPermissions, EUserPermissionsLevel, PROJECT_TRACKER_ELEMENTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { ChevronRightIcon } from "@plane/propel/icons";
import { IconButton } from "@plane/propel/icon-button";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Tooltip } from "@plane/propel/tooltip";
import { Loader } from "@plane/ui";
import { copyUrlToClipboard, cn, orderJoinedProjects } from "@plane/utils";
// components
import { CreateProjectModal } from "@/components/project/create-project-modal";
// hooks
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { useProjects, getProjectById, getJoinedProjectIds } from "@/store/queries/project";
import { useUserPermissions } from "@/hooks/store/user";
// plane web imports
import type { TProject } from "@/plane-web/types";
// local imports
import { SidebarProjectsListItem } from "./projects-list-item";

export const SidebarProjectsList = memo(function SidebarProjectsList() {
  // router params
  const { workspaceSlug } = useParams();
  const pathname = usePathname();
  // states - user preference for collapsed state (only applies when not on a projects page)
  const [userPreference, setUserPreference] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("isAllProjectsListOpen");
    return stored === null ? true : stored === "true";
  });
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false); // scroll animation state
  // Force open on projects pages, otherwise respect user preference
  const isAllProjectsListOpen = pathname.includes("projects") ? true : userPreference;
  // refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  // store hooks
  const { t } = useTranslation();
  const { toggleCreateProjectModal } = useCommandPalette();
  const { allowPermissions } = useUserPermissions();

  const { data: projects = [], isLoading } = useProjects(workspaceSlug?.toString());
  const joinedProjects = getJoinedProjectIds(projects);

  // loader state for compatibility
  const loader = isLoading ? "init-loader" : undefined;

  // auth
  const isAuthorizedUser = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );

  const handleCopyText = (projectId: string) => {
    void copyUrlToClipboard(`${workspaceSlug}/projects/${projectId}/issues`).then(() => {
      setToast({
        type: TOAST_TYPE.SUCCESS,
        title: t("link_copied"),
        message: t("project_link_copied_to_clipboard"),
      });
      return undefined;
    });
  };

  const handleOnProjectDrop = (
    sourceId: string | undefined,
    destinationId: string | undefined,
    shouldDropAtEnd: boolean
  ) => {
    if (!sourceId || !destinationId || !workspaceSlug) return;
    if (sourceId === destinationId) return;

    const joinedProjectsList: TProject[] = [];
    joinedProjects.map((projectId) => {
      const projectDetails = getProjectById(projects, projectId);
      if (projectDetails) joinedProjectsList.push(projectDetails);
    });

    const sourceIndex = joinedProjects.indexOf(sourceId);
    const destinationIndex = shouldDropAtEnd ? joinedProjects.length : joinedProjects.indexOf(destinationId);

    if (joinedProjectsList.length <= 0) return;

    const updatedSortOrder = orderJoinedProjects(sourceIndex, destinationIndex, sourceId, joinedProjectsList);
    if (updatedSortOrder != undefined) {
      // TODO: Replace with TanStack Query mutation when updateProjectView is migrated
      // For now, this will need to use the existing MobX store method
      // or be implemented with a mutation hook
      console.warn("updateProjectView needs to be replaced with TanStack Query mutation");
      setToast({
        type: TOAST_TYPE.ERROR,
        title: t("error"),
        message: t("project_reordering_not_yet_migrated"),
      });
    }
  };

  /**
   * Implementing scroll animation styles based on the scroll length of the container
   */
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const scrollTop = containerRef.current.scrollTop;
        setIsScrolled(scrollTop > 0);
      }
    };
    const currentContainerRef = containerRef.current;
    if (currentContainerRef) {
      currentContainerRef.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (currentContainerRef) {
        currentContainerRef.removeEventListener("scroll", handleScroll);
      }
    };
  }, [containerRef]);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) return;

    return combine(
      autoScrollForElements({
        element,
        canScroll: ({ source }) => source?.data?.dragInstanceId === "PROJECTS",
        getAllowedAxis: () => "vertical",
      })
    );
  }, [containerRef]);

  const toggleListDisclosure = (isOpen: boolean) => {
    setUserPreference(isOpen);
    localStorage.setItem("isAllProjectsListOpen", isOpen.toString());
  };
  return (
    <>
      {workspaceSlug && (
        <CreateProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          setToFavorite={false}
          workspaceSlug={workspaceSlug.toString()}
        />
      )}
      <div
        ref={containerRef}
        className={cn("overflow-y-auto", {
          "border-t border-strong": isScrolled,
        })}
      >
        <Collapsible open={isAllProjectsListOpen} onOpenChange={toggleListDisclosure} className="flex flex-col">
          <div className="group w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-placeholder hover:bg-layer-transparent-hover">
            <CollapsibleTrigger
              className="w-full flex items-center gap-1 whitespace-nowrap text-left text-13 font-semibold text-placeholder"
              aria-label={t(
                isAllProjectsListOpen
                  ? "aria_labels.projects_sidebar.close_projects_menu"
                  : "aria_labels.projects_sidebar.open_projects_menu"
              )}
            >
              <span className="text-13 font-semibold">{t("projects")}</span>
            </CollapsibleTrigger>
            <div className="flex items-center gap-1">
              <Tooltip tooltipHeading={t("create_project")} tooltipContent="">
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={() => {
                    setIsProjectModalOpen(true);
                  }}
                  data-ph-element={PROJECT_TRACKER_ELEMENTS.SIDEBAR_CREATE_PROJECT_TOOLTIP}
                  className="inline-flex text-placeholder"
                  aria-label={t("aria_labels.projects_sidebar.create_new_project")}
                />
              </Tooltip>
              <IconButton
                variant="ghost"
                size="sm"
                icon={ChevronRightIcon}
                onClick={() => toggleListDisclosure(!isAllProjectsListOpen)}
                className="text-placeholder"
                iconClassName={cn("transition-transform", {
                  "rotate-90": isAllProjectsListOpen,
                })}
                aria-label={t(
                  isAllProjectsListOpen
                    ? "aria_labels.projects_sidebar.close_projects_menu"
                    : "aria_labels.projects_sidebar.open_projects_menu"
                )}
              />
            </div>
          </div>
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
            {loader === "init-loader" && (
              <Loader className="w-full space-y-1.5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Loader.Item key={index} height="28px" />
                ))}
              </Loader>
            )}
            <div className="flex flex-col gap-0.5">
              {joinedProjects.map((projectId, index) => (
                <SidebarProjectsListItem
                  key={projectId}
                  projectId={projectId}
                  handleCopyText={() => handleCopyText(projectId)}
                  projectListType={"JOINED"}
                  disableDrag={false}
                  disableDrop={false}
                  isLastChild={index === joinedProjects.length - 1}
                  handleOnProjectDrop={handleOnProjectDrop}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {isAuthorizedUser && joinedProjects?.length === 0 && (
          <button
            type="button"
            data-ph-element={PROJECT_TRACKER_ELEMENTS.SIDEBAR_CREATE_PROJECT_BUTTON}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 text-13 leading-5 font-medium text-secondary hover:bg-surface-2 rounded-md"
            onClick={() => {
              toggleCreateProjectModal(true);
            }}
          >
            {t("add_project")}
          </button>
        )}
      </div>
    </>
  );
});
