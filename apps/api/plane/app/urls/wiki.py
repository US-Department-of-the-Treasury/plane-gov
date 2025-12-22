from django.urls import path


from plane.app.views import (
    WikiCollectionViewSet,
    WikiPageViewSet,
    WikiPageDescriptionViewSet,
    WikiPageShareViewSet,
    WikiPageVersionViewSet,
)

urlpatterns = [
    # Collections
    path(
        "workspaces/<str:slug>/wiki/collections/",
        WikiCollectionViewSet.as_view({"get": "list", "post": "create"}),
        name="wiki-collections",
    ),
    path(
        "workspaces/<str:slug>/wiki/collections/<uuid:pk>/",
        WikiCollectionViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="wiki-collection-detail",
    ),
    # Pages
    path(
        "workspaces/<str:slug>/wiki/pages/",
        WikiPageViewSet.as_view({"get": "list", "post": "create"}),
        name="wiki-pages",
    ),
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:pk>/",
        WikiPageViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="wiki-page-detail",
    ),
    # Page actions
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:pk>/lock/",
        WikiPageViewSet.as_view({"post": "lock"}),
        name="wiki-page-lock",
    ),
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:pk>/unlock/",
        WikiPageViewSet.as_view({"post": "unlock"}),
        name="wiki-page-unlock",
    ),
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:pk>/archive/",
        WikiPageViewSet.as_view({"post": "archive"}),
        name="wiki-page-archive",
    ),
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:pk>/unarchive/",
        WikiPageViewSet.as_view({"post": "unarchive"}),
        name="wiki-page-unarchive",
    ),
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:pk>/duplicate/",
        WikiPageViewSet.as_view({"post": "duplicate"}),
        name="wiki-page-duplicate",
    ),
    # Page description (binary)
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:pk>/description/",
        WikiPageDescriptionViewSet.as_view({"get": "retrieve", "patch": "partial_update"}),
        name="wiki-page-description",
    ),
    # Page shares
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/shares/",
        WikiPageShareViewSet.as_view({"get": "list", "post": "create"}),
        name="wiki-page-shares",
    ),
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/shares/<uuid:pk>/",
        WikiPageShareViewSet.as_view({"patch": "partial_update", "delete": "destroy"}),
        name="wiki-page-share-detail",
    ),
    # Page versions
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/versions/",
        WikiPageVersionViewSet.as_view({"get": "list"}),
        name="wiki-page-versions",
    ),
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/versions/<uuid:pk>/",
        WikiPageVersionViewSet.as_view({"get": "retrieve"}),
        name="wiki-page-version-detail",
    ),
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/versions/<uuid:pk>/restore/",
        WikiPageVersionViewSet.as_view({"post": "restore"}),
        name="wiki-page-version-restore",
    ),
]
