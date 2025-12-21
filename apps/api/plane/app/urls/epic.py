from django.urls import path


from plane.app.views import (
    EpicViewSet,
    EpicIssueViewSet,
    EpicLinkViewSet,
    EpicFavoriteViewSet,
    EpicUserPropertiesEndpoint,
    EpicArchiveUnarchiveEndpoint,
)


urlpatterns = [
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/",
        EpicViewSet.as_view({"get": "list", "post": "create"}),
        name="project-epics",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:pk>/",
        EpicViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="project-epics",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/issues/<uuid:issue_id>/epics/",
        EpicIssueViewSet.as_view({"post": "create_issue_epics"}),
        name="issue-epic",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:epic_id>/issues/",
        EpicIssueViewSet.as_view({"post": "create_epic_issues", "get": "list"}),
        name="project-epic-issues",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:epic_id>/issues/<uuid:issue_id>/",
        EpicIssueViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="project-epic-issues",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:epic_id>/epic-links/",
        EpicLinkViewSet.as_view({"get": "list", "post": "create"}),
        name="project-issue-epic-links",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:epic_id>/epic-links/<uuid:pk>/",
        EpicLinkViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="project-issue-epic-links",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/user-favorite-epics/",
        EpicFavoriteViewSet.as_view({"get": "list", "post": "create"}),
        name="user-favorite-epic",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/user-favorite-epics/<uuid:epic_id>/",
        EpicFavoriteViewSet.as_view({"delete": "destroy"}),
        name="user-favorite-epic",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:epic_id>/user-properties/",
        EpicUserPropertiesEndpoint.as_view(),
        name="sprint-user-filters",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/epics/<uuid:epic_id>/archive/",
        EpicArchiveUnarchiveEndpoint.as_view(),
        name="epic-archive-unarchive",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/archived-epics/",
        EpicArchiveUnarchiveEndpoint.as_view(),
        name="epic-archive-unarchive",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/archived-epics/<uuid:pk>/",
        EpicArchiveUnarchiveEndpoint.as_view(),
        name="epic-archive-unarchive",
    ),
]
