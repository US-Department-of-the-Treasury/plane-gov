from django.urls import path

from plane.api.views import (
    EpicListCreateAPIEndpoint,
    EpicDetailAPIEndpoint,
    EpicIssueListCreateAPIEndpoint,
    EpicIssueDetailAPIEndpoint,
    EpicArchiveUnarchiveAPIEndpoint,
)

urlpatterns = [
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/",
        EpicListCreateAPIEndpoint.as_view(http_method_names=["get", "post"]),
        name="epics",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:pk>/",
        EpicDetailAPIEndpoint.as_view(http_method_names=["get", "patch", "delete"]),
        name="epics-detail",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:epic_id>/epic-issues/",
        EpicIssueListCreateAPIEndpoint.as_view(http_method_names=["get", "post"]),
        name="epic-issues",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:epic_id>/epic-issues/<uuid:issue_id>/",
        EpicIssueDetailAPIEndpoint.as_view(http_method_names=["delete"]),
        name="epic-issues-detail",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:pk>/archive/",
        EpicArchiveUnarchiveAPIEndpoint.as_view(http_method_names=["post"]),
        name="epic-archive",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/archived-epics/",
        EpicArchiveUnarchiveAPIEndpoint.as_view(http_method_names=["get"]),
        name="epic-archive-list",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/archived-epics/<uuid:pk>/unarchive/",
        EpicArchiveUnarchiveAPIEndpoint.as_view(http_method_names=["delete"]),
        name="epic-unarchive",
    ),
]
