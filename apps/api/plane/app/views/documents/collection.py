# Django imports
from django.db.models import Count, Q

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Package imports
from plane.app.permissions import DocumentCollectionPermission
from plane.app.serializers import DocumentCollectionSerializer
from plane.db.models import DocumentCollection, Workspace

# Local imports
from ..base import BaseViewSet


class DocumentCollectionViewSet(BaseViewSet):
    """
    ViewSet for managing Document collections.
    Collections organize documents into logical groups.
    """

    serializer_class = DocumentCollectionSerializer
    model = DocumentCollection
    permission_classes = [DocumentCollectionPermission]
    search_fields = ["name"]

    def get_queryset(self):
        return (
            DocumentCollection.objects.filter(
                workspace__slug=self.kwargs.get("slug"),
                deleted_at__isnull=True,
            )
            .select_related("workspace", "parent", "created_by")
            .annotate(
                child_count=Count(
                    "child_collections",
                    filter=Q(child_collections__deleted_at__isnull=True),
                ),
                document_count=Count("documents", filter=Q(documents__deleted_at__isnull=True)),
            )
            .order_by("sort_order", "name")
        )

    def create(self, request, slug):
        workspace = Workspace.objects.get(slug=slug)

        serializer = DocumentCollectionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(workspace=workspace)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, slug, pk):
        collection = self.get_queryset().get(pk=pk)

        # Validate parent to prevent circular references
        parent_id = request.data.get("parent")
        if parent_id:
            if str(parent_id) == str(pk):
                return Response(
                    {"error": "Collection cannot be its own parent"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Check for circular reference
            parent = DocumentCollection.objects.filter(pk=parent_id).first()
            while parent:
                if str(parent.id) == str(pk):
                    return Response(
                        {"error": "Circular reference detected"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                parent = parent.parent

        serializer = DocumentCollectionSerializer(collection, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, slug, pk):
        collection = self.get_queryset().get(pk=pk)

        # Move child collections to parent
        DocumentCollection.objects.filter(
            parent=collection,
            workspace__slug=slug,
            deleted_at__isnull=True,
        ).update(parent=collection.parent)

        # Move documents in this collection to no collection
        collection.documents.filter(deleted_at__isnull=True).update(collection=None)

        collection.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def list(self, request, slug):
        queryset = self.get_queryset()

        # Filter by parent if provided
        parent = request.query_params.get("parent")
        if parent:
            if parent == "root":
                queryset = queryset.filter(parent__isnull=True)
            else:
                queryset = queryset.filter(parent_id=parent)

        serializer = DocumentCollectionSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def retrieve(self, request, slug, pk):
        collection = self.get_queryset().get(pk=pk)
        serializer = DocumentCollectionSerializer(collection)
        return Response(serializer.data, status=status.HTTP_200_OK)
