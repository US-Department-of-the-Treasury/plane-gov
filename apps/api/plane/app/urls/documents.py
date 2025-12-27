from django.urls import path


from plane.app.views import (
    DocumentCollectionViewSet,
    DocumentViewSet,
    DocumentDescriptionViewSet,
    DocumentShareViewSet,
    DocumentVersionViewSet,
    # Unified document model views
    DocumentCommentViewSet,
    DocumentCommentReactionViewSet,
    DocumentRelationViewSet,
    DocumentLinkViewSet,
    PropertyDefinitionViewSet,
    DocumentPropertyValueViewSet,
    BulkDocumentPropertyValueViewSet,
)

urlpatterns = [
    # Collections
    path(
        "workspaces/<str:slug>/documents/collections/",
        DocumentCollectionViewSet.as_view({"get": "list", "post": "create"}),
        name="document-collections",
    ),
    path(
        "workspaces/<str:slug>/documents/collections/<uuid:pk>/",
        DocumentCollectionViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="document-collection-detail",
    ),
    # Documents
    path(
        "workspaces/<str:slug>/documents/",
        DocumentViewSet.as_view({"get": "list", "post": "create"}),
        name="documents",
    ),
    path(
        "workspaces/<str:slug>/documents/<uuid:pk>/",
        DocumentViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="document-detail",
    ),
    # Document actions
    path(
        "workspaces/<str:slug>/documents/<uuid:pk>/lock/",
        DocumentViewSet.as_view({"post": "lock"}),
        name="document-lock",
    ),
    path(
        "workspaces/<str:slug>/documents/<uuid:pk>/unlock/",
        DocumentViewSet.as_view({"post": "unlock"}),
        name="document-unlock",
    ),
    path(
        "workspaces/<str:slug>/documents/<uuid:pk>/archive/",
        DocumentViewSet.as_view({"post": "archive"}),
        name="document-archive",
    ),
    path(
        "workspaces/<str:slug>/documents/<uuid:pk>/unarchive/",
        DocumentViewSet.as_view({"post": "unarchive"}),
        name="document-unarchive",
    ),
    path(
        "workspaces/<str:slug>/documents/<uuid:pk>/duplicate/",
        DocumentViewSet.as_view({"post": "duplicate"}),
        name="document-duplicate",
    ),
    # Document description (binary)
    path(
        "workspaces/<str:slug>/documents/<uuid:pk>/description/",
        DocumentDescriptionViewSet.as_view({"get": "retrieve", "patch": "partial_update"}),
        name="document-description",
    ),
    # Document shares
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/shares/",
        DocumentShareViewSet.as_view({"get": "list", "post": "create"}),
        name="document-shares",
    ),
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/shares/<uuid:pk>/",
        DocumentShareViewSet.as_view({"patch": "partial_update", "delete": "destroy"}),
        name="document-share-detail",
    ),
    # Document versions
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/versions/",
        DocumentVersionViewSet.as_view({"get": "list"}),
        name="document-versions",
    ),
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/versions/<uuid:pk>/",
        DocumentVersionViewSet.as_view({"get": "retrieve"}),
        name="document-version-detail",
    ),
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/versions/<uuid:pk>/restore/",
        DocumentVersionViewSet.as_view({"post": "restore"}),
        name="document-version-restore",
    ),
    # Property Definitions (workspace-scoped schemas)
    path(
        "workspaces/<str:slug>/documents/properties/",
        PropertyDefinitionViewSet.as_view({"get": "list", "post": "create"}),
        name="document-property-definitions",
    ),
    path(
        "workspaces/<str:slug>/documents/properties/<uuid:pk>/",
        PropertyDefinitionViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="document-property-definition-detail",
    ),
    # Document Comments
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/comments/",
        DocumentCommentViewSet.as_view({"get": "list", "post": "create"}),
        name="document-comments",
    ),
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/comments/<uuid:pk>/",
        DocumentCommentViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
        name="document-comment-detail",
    ),
    # Comment Reactions
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/comments/<uuid:comment_id>/reactions/",
        DocumentCommentReactionViewSet.as_view({"get": "list", "post": "create"}),
        name="document-comment-reactions",
    ),
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/comments/<uuid:comment_id>/reactions/<uuid:pk>/",
        DocumentCommentReactionViewSet.as_view({"delete": "destroy"}),
        name="document-comment-reaction-detail",
    ),
    # Document Relations (document-to-document)
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/relations/",
        DocumentRelationViewSet.as_view({"get": "list", "post": "create"}),
        name="document-relations",
    ),
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/relations/<uuid:pk>/",
        DocumentRelationViewSet.as_view({"delete": "destroy"}),
        name="document-relation-detail",
    ),
    # Document Links (external URLs)
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/links/",
        DocumentLinkViewSet.as_view({"get": "list", "post": "create"}),
        name="document-links",
    ),
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/links/<uuid:pk>/",
        DocumentLinkViewSet.as_view({"patch": "partial_update", "delete": "destroy"}),
        name="document-link-detail",
    ),
    # Document Property Values
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/properties/",
        DocumentPropertyValueViewSet.as_view({"get": "list", "post": "create"}),
        name="document-properties",
    ),
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/properties/<uuid:pk>/",
        DocumentPropertyValueViewSet.as_view({"patch": "partial_update", "delete": "destroy"}),
        name="document-property-detail",
    ),
    # Bulk Document Property Values
    path(
        "workspaces/<str:slug>/documents/<uuid:document_id>/properties/bulk/",
        BulkDocumentPropertyValueViewSet.as_view({"post": "create"}),
        name="document-properties-bulk",
    ),
]
