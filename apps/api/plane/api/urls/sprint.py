from django.urls import path

from plane.api.views.sprint import (
    SprintListCreateAPIEndpoint,
    SprintDetailAPIEndpoint,
    SprintIssueListCreateAPIEndpoint,
    SprintIssueDetailAPIEndpoint,
    TransferSprintIssueAPIEndpoint,
    SprintArchiveUnarchiveAPIEndpoint,
)

urlpatterns = [
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/",
        SprintListCreateAPIEndpoint.as_view(http_method_names=["get", "post"]),
        name="sprints",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/<uuid:pk>/",
        SprintDetailAPIEndpoint.as_view(http_method_names=["get", "patch", "delete"]),
        name="sprints",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/<uuid:sprint_id>/sprint-issues/",
        SprintIssueListCreateAPIEndpoint.as_view(http_method_names=["get", "post"]),
        name="sprint-issues",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/<uuid:sprint_id>/sprint-issues/<uuid:issue_id>/",
        SprintIssueDetailAPIEndpoint.as_view(http_method_names=["get", "delete"]),
        name="sprint-issues",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/<uuid:sprint_id>/transfer-issues/",
        TransferSprintIssueAPIEndpoint.as_view(http_method_names=["post"]),
        name="transfer-issues",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/sprints/<uuid:sprint_id>/archive/",
        SprintArchiveUnarchiveAPIEndpoint.as_view(http_method_names=["post"]),
        name="sprint-archive-unarchive",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/archived-sprints/",
        SprintArchiveUnarchiveAPIEndpoint.as_view(http_method_names=["get"]),
        name="sprint-archive-unarchive",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/archived-sprints/<uuid:sprint_id>/unarchive/",
        SprintArchiveUnarchiveAPIEndpoint.as_view(http_method_names=["delete"]),
        name="sprint-archive-unarchive",
    ),
]
