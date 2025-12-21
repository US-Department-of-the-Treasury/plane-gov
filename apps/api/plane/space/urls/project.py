from django.urls import path


from plane.space.views import (
    ProjectDeployBoardPublicSettingsEndpoint,
    ProjectIssuesPublicEndpoint,
    WorkspaceProjectAnchorEndpoint,
    ProjectSprintsEndpoint,
    ProjectModulesEndpoint,
    ProjectStatesEndpoint,
    ProjectLabelsEndpoint,
    ProjectMembersEndpoint,
    ProjectMetaDataEndpoint,
)

urlpatterns = [
    path(
        "anchor/<str:anchor>/meta/",
        ProjectMetaDataEndpoint.as_view(),
        name="project-meta",
    ),
    path(
        "anchor/<str:anchor>/settings/",
        ProjectDeployBoardPublicSettingsEndpoint.as_view(),
        name="project-deploy-board-settings",
    ),
    path(
        "anchor/<str:anchor>/issues/",
        ProjectIssuesPublicEndpoint.as_view(),
        name="project-deploy-board",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/anchor/",
        WorkspaceProjectAnchorEndpoint.as_view(),
        name="project-deploy-board",
    ),
    path(
        "anchor/<str:anchor>/sprints/",
        ProjectSprintsEndpoint.as_view(),
        name="project-sprints",
    ),
    path(
        "anchor/<str:anchor>/modules/",
        ProjectModulesEndpoint.as_view(),
        name="project-modules",
    ),
    path(
        "anchor/<str:anchor>/states/",
        ProjectStatesEndpoint.as_view(),
        name="project-states",
    ),
    path(
        "anchor/<str:anchor>/labels/",
        ProjectLabelsEndpoint.as_view(),
        name="project-labels",
    ),
    path(
        "anchor/<str:anchor>/members/",
        ProjectMembersEndpoint.as_view(),
        name="project-members",
    ),
]
