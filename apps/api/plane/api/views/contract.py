# Django imports
from django.db import models
from django.db.models import Count, F

# Third party imports
from rest_framework import status
from rest_framework.response import Response

# Package imports
from plane.api.serializers import (
    ContractSerializer,
    ContractLiteSerializer,
    ContractProjectAllocationSerializer,
)
from plane.app.permissions import WorkspaceEntityPermission
from plane.db.models import Contract, ContractProjectAllocation, Project, Workspace
# Use session-based authentication for browser access
from plane.app.views.base import BaseAPIView


class ContractListCreateAPIEndpoint(BaseAPIView):
    """Contract List and Create Endpoint"""

    serializer_class = ContractSerializer
    model = Contract
    permission_classes = [WorkspaceEntityPermission]
    use_read_replica = True

    def get_queryset(self):
        return (
            Contract.objects.filter(workspace__slug=self.kwargs.get("slug"))
            .filter(
                workspace__workspace_member__member=self.request.user,
                workspace__workspace_member__is_active=True,
            )
            .select_related("workspace", "parent_contract")
            .annotate(
                child_contracts_count=Count(
                    "child_contracts",
                    filter=models.Q(child_contracts__deleted_at__isnull=True),
                )
            )
            .annotate(
                project_allocations_count=Count(
                    "project_allocations",
                    filter=models.Q(project_allocations__deleted_at__isnull=True),
                )
            )
            .annotate(
                remaining_amount=F("ceiling_amount") - F("obligated_amount")
            )
            .annotate(
                available_amount=F("obligated_amount") - F("expended_amount")
            )
            .order_by("-created_at")
            .distinct()
        )

    def get(self, request, slug):
        """List contracts

        Retrieve all contracts in a workspace.
        Supports filtering by status, contract_type, and hierarchy_type.
        """
        queryset = self.get_queryset()

        # Filter by status
        status_filter = request.GET.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by contract type
        contract_type = request.GET.get("contract_type")
        if contract_type:
            queryset = queryset.filter(contract_type=contract_type)

        # Filter by hierarchy type
        hierarchy_type = request.GET.get("hierarchy_type")
        if hierarchy_type:
            queryset = queryset.filter(hierarchy_type=hierarchy_type)

        # Filter by parent contract (for task orders / call orders)
        parent_id = request.GET.get("parent_contract")
        if parent_id:
            queryset = queryset.filter(parent_contract_id=parent_id)

        return self.paginate(
            request=request,
            queryset=queryset,
            on_results=lambda contracts: ContractSerializer(
                contracts,
                many=True,
                fields=self.fields,
                expand=self.expand,
            ).data,
        )

    def post(self, request, slug):
        """Create contract

        Create a new government contract in the workspace.
        """
        workspace = Workspace.objects.get(slug=slug)
        serializer = ContractSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save(workspace_id=workspace.id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ContractDetailAPIEndpoint(BaseAPIView):
    """Contract Retrieve, Update, Delete Endpoint"""

    serializer_class = ContractSerializer
    model = Contract
    permission_classes = [WorkspaceEntityPermission]
    use_read_replica = True

    def get_queryset(self):
        return (
            Contract.objects.filter(workspace__slug=self.kwargs.get("slug"))
            .filter(
                workspace__workspace_member__member=self.request.user,
                workspace__workspace_member__is_active=True,
            )
            .select_related("workspace", "parent_contract")
            .annotate(
                child_contracts_count=Count(
                    "child_contracts",
                    filter=models.Q(child_contracts__deleted_at__isnull=True),
                )
            )
            .annotate(
                project_allocations_count=Count(
                    "project_allocations",
                    filter=models.Q(project_allocations__deleted_at__isnull=True),
                )
            )
            .annotate(
                remaining_amount=F("ceiling_amount") - F("obligated_amount")
            )
            .annotate(
                available_amount=F("obligated_amount") - F("expended_amount")
            )
        )

    def get(self, request, slug, pk):
        """Retrieve contract

        Get details of a specific contract by ID.
        """
        contract = self.get_queryset().get(pk=pk)
        serializer = ContractSerializer(
            contract, fields=self.fields, expand=self.expand
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, slug, pk):
        """Update contract

        Modify an existing contract's properties.
        """
        contract = Contract.objects.get(workspace__slug=slug, pk=pk)
        serializer = ContractSerializer(
            contract, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, slug, pk):
        """Delete contract

        Permanently remove a contract.
        """
        contract = Contract.objects.get(workspace__slug=slug, pk=pk)
        contract.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ContractProjectAllocationListCreateAPIEndpoint(BaseAPIView):
    """Contract Project Allocation List and Create Endpoint"""

    serializer_class = ContractProjectAllocationSerializer
    model = ContractProjectAllocation
    permission_classes = [WorkspaceEntityPermission]
    use_read_replica = True

    def get_queryset(self):
        return (
            ContractProjectAllocation.objects.filter(
                contract__workspace__slug=self.kwargs.get("slug")
            )
            .filter(contract_id=self.kwargs.get("contract_id"))
            .filter(
                contract__workspace__workspace_member__member=self.request.user,
                contract__workspace__workspace_member__is_active=True,
            )
            .select_related("contract", "project")
            .annotate(
                remaining_allocation=F("allocated_amount") - F("actual_spend")
            )
            .order_by("-created_at")
        )

    def get(self, request, slug, contract_id):
        """List contract allocations

        Retrieve all project allocations for a contract.
        """
        return self.paginate(
            request=request,
            queryset=self.get_queryset(),
            on_results=lambda allocations: ContractProjectAllocationSerializer(
                allocations,
                many=True,
                fields=self.fields,
                expand=self.expand,
            ).data,
        )

    def post(self, request, slug, contract_id):
        """Create contract allocation

        Allocate funds from a contract to a project.
        """
        contract = Contract.objects.get(workspace__slug=slug, pk=contract_id)

        # Validate project is in the same workspace
        project_id = request.data.get("project")
        if project_id:
            project = Project.objects.get(pk=project_id)
            if project.workspace_id != contract.workspace_id:
                return Response(
                    {"error": "Project must be in the same workspace as the contract"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        data = {**request.data, "contract": contract_id}
        serializer = ContractProjectAllocationSerializer(
            data=data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ContractProjectAllocationDetailAPIEndpoint(BaseAPIView):
    """Contract Project Allocation Retrieve, Update, Delete Endpoint"""

    serializer_class = ContractProjectAllocationSerializer
    model = ContractProjectAllocation
    permission_classes = [WorkspaceEntityPermission]
    use_read_replica = True

    def get(self, request, slug, contract_id, pk):
        """Retrieve allocation

        Get details of a specific contract-project allocation.
        """
        allocation = ContractProjectAllocation.objects.get(
            contract__workspace__slug=slug, contract_id=contract_id, pk=pk
        )
        serializer = ContractProjectAllocationSerializer(
            allocation, fields=self.fields, expand=self.expand
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, slug, contract_id, pk):
        """Update allocation

        Modify an existing contract-project allocation.
        """
        allocation = ContractProjectAllocation.objects.get(
            contract__workspace__slug=slug, contract_id=contract_id, pk=pk
        )
        serializer = ContractProjectAllocationSerializer(
            allocation, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, slug, contract_id, pk):
        """Delete allocation

        Remove a contract-project allocation.
        """
        allocation = ContractProjectAllocation.objects.get(
            contract__workspace__slug=slug, contract_id=contract_id, pk=pk
        )
        allocation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
