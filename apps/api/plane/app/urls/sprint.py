from django.urls import path


from plane.app.views import (
    SprintViewSet,
    SprintIssueViewSet,
    SprintDateCheckEndpoint,
    SprintFavoriteViewSet,
    SprintProgressEndpoint,
    SprintAnalyticsEndpoint,
    TransferSprintIssueEndpoint,
    SprintUserPropertiesEndpoint,
    SprintArchiveUnarchiveEndpoint,
)


urlpatterns = [
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/",
        SprintViewSet.as_view({"get": "list", "post": "create"}),
        name="project-sprint",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/<uuid:pk>/",
        SprintViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="project-sprint",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/<uuid:sprint_id>/sprint-issues/",
        SprintIssueViewSet.as_view({"get": "list", "post": "create"}),
        name="project-issue-sprint",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/<uuid:sprint_id>/sprint-issues/<uuid:issue_id>/",
        SprintIssueViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="project-issue-sprint",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/date-check/",
        SprintDateCheckEndpoint.as_view(),
        name="project-sprint-date",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/user-favorite-sprints/",
        SprintFavoriteViewSet.as_view({"get": "list", "post": "create"}),
        name="user-favorite-sprint",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/user-favorite-sprints/<uuid:sprint_id>/",
        SprintFavoriteViewSet.as_view({"delete": "destroy"}),
        name="user-favorite-sprint",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/<uuid:sprint_id>/transfer-issues/",
        TransferSprintIssueEndpoint.as_view(),
        name="transfer-issues",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/<uuid:sprint_id>/user-properties/",
        SprintUserPropertiesEndpoint.as_view(),
        name="sprint-user-filters",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/<uuid:sprint_id>/archive/",
        SprintArchiveUnarchiveEndpoint.as_view(),
        name="sprint-archive-unarchive",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/archived-sprints/",
        SprintArchiveUnarchiveEndpoint.as_view(),
        name="sprint-archive-unarchive",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/archived-sprints/<uuid:pk>/",
        SprintArchiveUnarchiveEndpoint.as_view(),
        name="sprint-archive-unarchive",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/<uuid:sprint_id>/progress/",
        SprintProgressEndpoint.as_view(),
        name="project-sprint",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/<uuid:sprint_id>/analytics/",
        SprintAnalyticsEndpoint.as_view(),
        name="project-sprint",
    ),
]
