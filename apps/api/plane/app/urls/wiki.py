from django.urls import path


from plane.app.views import (
    WikiCollectionViewSet,
    WikiPageViewSet,
    WikiPageDescriptionViewSet,
    WikiPageShareViewSet,
    WikiPageVersionViewSet,
    # Unified page model views
    PageCommentViewSet,
    PageCommentReactionViewSet,
    PageRelationViewSet,
    PageLinkViewSet,
    PropertyDefinitionViewSet,
    PagePropertyValueViewSet,
    BulkPagePropertyValueViewSet,
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
    # Property Definitions (workspace-scoped schemas)
    path(
        "workspaces/<str:slug>/wiki/properties/",
        PropertyDefinitionViewSet.as_view({"get": "list", "post": "create"}),
        name="wiki-property-definitions",
    ),
    path(
        "workspaces/<str:slug>/wiki/properties/<uuid:pk>/",
        PropertyDefinitionViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="wiki-property-definition-detail",
    ),
    # Page Comments
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/comments/",
        PageCommentViewSet.as_view({"get": "list", "post": "create"}),
        name="wiki-page-comments",
    ),
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/comments/<uuid:pk>/",
        PageCommentViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="wiki-page-comment-detail",
    ),
    # Comment Reactions
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/comments/<uuid:comment_id>/reactions/",
        PageCommentReactionViewSet.as_view({"get": "list", "post": "create"}),
        name="wiki-page-comment-reactions",
    ),
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/comments/<uuid:comment_id>/reactions/<uuid:pk>/",
        PageCommentReactionViewSet.as_view({"delete": "destroy"}),
        name="wiki-page-comment-reaction-detail",
    ),
    # Page Relations (page-to-page)
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/relations/",
        PageRelationViewSet.as_view({"get": "list", "post": "create"}),
        name="wiki-page-relations",
    ),
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/relations/<uuid:pk>/",
        PageRelationViewSet.as_view({"delete": "destroy"}),
        name="wiki-page-relation-detail",
    ),
    # Page Links (external URLs)
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/links/",
        PageLinkViewSet.as_view({"get": "list", "post": "create"}),
        name="wiki-page-links",
    ),
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/links/<uuid:pk>/",
        PageLinkViewSet.as_view({"patch": "partial_update", "delete": "destroy"}),
        name="wiki-page-link-detail",
    ),
    # Page Property Values
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/properties/",
        PagePropertyValueViewSet.as_view({"get": "list", "post": "create"}),
        name="wiki-page-properties",
    ),
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/properties/<uuid:pk>/",
        PagePropertyValueViewSet.as_view({"patch": "partial_update", "delete": "destroy"}),
        name="wiki-page-property-detail",
    ),
    # Bulk Page Property Values
    path(
        "workspaces/<str:slug>/wiki/pages/<uuid:page_id>/properties/bulk/",
        BulkPagePropertyValueViewSet.as_view({"post": "create"}),
        name="wiki-page-properties-bulk",
    ),
]
