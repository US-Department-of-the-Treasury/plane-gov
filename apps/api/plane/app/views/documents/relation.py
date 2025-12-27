# Django imports
from django.db.models import Q

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Package imports
from plane.app.permissions import DocumentPermission
from plane.app.serializers import DocumentRelationSerializer, DocumentLinkSerializer
from plane.db.models import (
    Document,
    DocumentRelation,
    DocumentRelationChoices,
    DocumentLink,
    DocumentActivity,
    Workspace,
    WorkspaceMember,
)

# Local imports
from ..base import BaseViewSet


class DocumentRelationViewSet(BaseViewSet):
    """
    ViewSet for managing document-to-document relations.
    For issue-type documents, this replaces IssueRelation functionality.
    """

    serializer_class = DocumentRelationSerializer
    model = DocumentRelation
    permission_classes = [DocumentPermission]

    def get_document(self, slug, document_id):
        """Get the document and verify access."""
        user = self.request.user

        # Check if user is admin
        is_admin = WorkspaceMember.objects.filter(
            member=user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        base_query = Document.objects.filter(
            pk=document_id,
            workspace__slug=slug,
            deleted_at__isnull=True,
        )

        if is_admin:
            return base_query.first()

        # Regular users can access their own documents
        return base_query.filter(owned_by=user).first()

    def get_queryset(self):
        document_id = self.kwargs.get("document_id")
        slug = self.kwargs.get("slug")

        # Get both forward and reverse relations
        return (
            DocumentRelation.objects.filter(
                Q(document_id=document_id) | Q(related_document_id=document_id),
                workspace__slug=slug,
                deleted_at__isnull=True,
            )
            .select_related("document", "related_document")
            .order_by("-created_at")
        )

    def list(self, request, slug, document_id):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        queryset = self.get_queryset()

        # Organize relations by type
        relations = {
            "blocking": [],
            "blocked_by": [],
            "relates_to": [],
            "duplicate": [],
            "start_before": [],
            "start_after": [],
            "finish_before": [],
            "finish_after": [],
            "implemented_by": [],
            "implements": [],
        }

        for rel in queryset:
            if str(rel.document_id) == str(document_id):
                # Forward relation
                rel_type = rel.relation_type
                relations[rel_type].append(
                    DocumentRelationSerializer(rel, context={"request": request}).data
                )
            else:
                # Reverse relation - map to reverse type
                reverse_type = DocumentRelationChoices._REVERSE_MAPPING.get(
                    rel.relation_type, rel.relation_type
                )
                # Swap document and related_document for the response
                rel_data = DocumentRelationSerializer(rel, context={"request": request}).data
                # Swap IDs in response so "related_document" is always the other document
                rel_data["related_document"] = str(rel.document_id)
                rel_data["related_document_detail"] = {
                    "id": str(rel.document.id),
                    "name": rel.document.name,
                    "document_type": rel.document.document_type,
                    "sequence_id": rel.document.sequence_id,
                    "state_id": str(rel.document.state_id) if rel.document.state_id else None,
                    "logo_props": rel.document.logo_props,
                }
                relations[reverse_type].append(rel_data)

        return Response(relations, status=status.HTTP_200_OK)

    def create(self, request, slug, document_id):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        related_document_id = request.data.get("related_document")
        relation_type = request.data.get("relation_type", DocumentRelationChoices.BLOCKED_BY)

        if not related_document_id:
            return Response(
                {"error": "related_document is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if str(related_document_id) == str(document_id):
            return Response(
                {"error": "Cannot create relation to self"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify related document exists
        related_document = Document.objects.filter(
            pk=related_document_id,
            workspace=document.workspace,
            deleted_at__isnull=True,
        ).first()

        if not related_document:
            return Response(
                {"error": "Related document not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if relation already exists (in either direction)
        existing = DocumentRelation.objects.filter(
            Q(document_id=document_id, related_document_id=related_document_id)
            | Q(document_id=related_document_id, related_document_id=document_id),
            deleted_at__isnull=True,
        ).first()

        if existing:
            return Response(
                {"error": "Relation already exists between these documents"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create relation
        relation = DocumentRelation.objects.create(
            document=document,
            related_document=related_document,
            relation_type=relation_type,
            workspace=document.workspace,
            created_by=request.user,
            updated_by=request.user,
        )

        # Log activity
        DocumentActivity.objects.create(
            workspace=document.workspace,
            document=document,
            verb="relation_created",
            field="relation",
            new_value=f"{relation_type}: {related_document.name}",
            new_identifier=related_document.id,
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        return Response(
            DocumentRelationSerializer(relation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, slug, document_id, pk):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        relation = DocumentRelation.objects.filter(
            Q(pk=pk),
            Q(document_id=document_id) | Q(related_document_id=document_id),
            deleted_at__isnull=True,
        ).first()

        if not relation:
            return Response({"error": "Relation not found"}, status=status.HTTP_404_NOT_FOUND)

        # Log activity
        other_document = relation.related_document if str(relation.document_id) == str(document_id) else relation.document
        DocumentActivity.objects.create(
            workspace=document.workspace,
            document=document,
            verb="relation_deleted",
            field="relation",
            old_value=f"{relation.relation_type}: {other_document.name}",
            old_identifier=other_document.id,
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        relation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentLinkViewSet(BaseViewSet):
    """
    ViewSet for managing external links attached to documents.
    For issue-type documents, this replaces IssueLink functionality.
    """

    serializer_class = DocumentLinkSerializer
    model = DocumentLink
    permission_classes = [DocumentPermission]

    def get_document(self, slug, document_id):
        """Get the document and verify access."""
        user = self.request.user

        is_admin = WorkspaceMember.objects.filter(
            member=user,
            workspace__slug=slug,
            role=20,
            is_active=True,
        ).exists()

        base_query = Document.objects.filter(
            pk=document_id,
            workspace__slug=slug,
            deleted_at__isnull=True,
        )

        if is_admin:
            return base_query.first()

        return base_query.filter(owned_by=user).first()

    def get_queryset(self):
        document_id = self.kwargs.get("document_id")
        slug = self.kwargs.get("slug")

        return DocumentLink.objects.filter(
            document_id=document_id,
            document__workspace__slug=slug,
            deleted_at__isnull=True,
        ).order_by("-created_at")

    def list(self, request, slug, document_id):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        queryset = self.get_queryset()
        serializer = DocumentLinkSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create(self, request, slug, document_id):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        url = request.data.get("url")
        if not url:
            return Response({"error": "url is required"}, status=status.HTTP_400_BAD_REQUEST)

        title = request.data.get("title", "")
        metadata = request.data.get("metadata", {})

        link = DocumentLink.objects.create(
            document=document,
            url=url,
            title=title,
            metadata=metadata,
            workspace=document.workspace,
            created_by=request.user,
            updated_by=request.user,
        )

        # Log activity
        DocumentActivity.objects.create(
            workspace=document.workspace,
            document=document,
            verb="link_created",
            field="link",
            new_value=url,
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        return Response(DocumentLinkSerializer(link).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, slug, document_id, pk):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        link = self.get_queryset().filter(pk=pk).first()
        if not link:
            return Response({"error": "Link not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = DocumentLinkSerializer(link, data=request.data, partial=True)
        if serializer.is_valid():
            link = serializer.save(updated_by=request.user)
            return Response(DocumentLinkSerializer(link).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, slug, document_id, pk):
        document = self.get_document(slug, document_id)
        if not document:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        link = self.get_queryset().filter(pk=pk).first()
        if not link:
            return Response({"error": "Link not found"}, status=status.HTTP_404_NOT_FOUND)

        # Log activity
        DocumentActivity.objects.create(
            workspace=document.workspace,
            document=document,
            verb="link_deleted",
            field="link",
            old_value=link.url,
            actor=request.user,
            created_by=request.user,
            updated_by=request.user,
        )

        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
