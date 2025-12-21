from django.urls import path


from plane.app.views import (
    # Workspace-level sprint views (new)
    WorkspaceSprintViewSet,
    WorkspaceSprintIssuesEndpoint,
    WorkspaceSprintUserPropertiesEndpoint,
    WorkspaceSprintFavoriteEndpoint,
)


urlpatterns = [
    # Workspace Sprint ViewSet (CRUD operations)
    path(
        "workspaces/<str:slug>/sprints/",
        WorkspaceSprintViewSet.as_view({"get": "list"}),
        name="workspace-sprints",
    ),
    path(
        "workspaces/<str:slug>/sprints/<uuid:pk>/",
        WorkspaceSprintViewSet.as_view({
            "get": "retrieve",
            "patch": "partial_update",
        }),
        name="workspace-sprint-detail",
    ),
    # Sprint Issues
    path(
        "workspaces/<str:slug>/sprints/<uuid:sprint_id>/issues/",
        WorkspaceSprintIssuesEndpoint.as_view(),
        name="workspace-sprint-issues",
    ),
    path(
        "workspaces/<str:slug>/sprints/<uuid:sprint_id>/issues/<uuid:issue_id>/",
        WorkspaceSprintIssuesEndpoint.as_view(),
        name="workspace-sprint-issue-detail",
    ),
    # User Properties for Sprint
    path(
        "workspaces/<str:slug>/sprints/<uuid:sprint_id>/user-properties/",
        WorkspaceSprintUserPropertiesEndpoint.as_view(),
        name="workspace-sprint-user-properties",
    ),
    # Sprint Favorites
    path(
        "workspaces/<str:slug>/sprints/<uuid:sprint_id>/favorite/",
        WorkspaceSprintFavoriteEndpoint.as_view(),
        name="workspace-sprint-favorite",
    ),
]
