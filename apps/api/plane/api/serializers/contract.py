# Third party imports
from rest_framework import serializers

# Package imports
from .base import BaseSerializer
from plane.db.models import Contract, ContractProjectAllocation


class ContractSerializer(BaseSerializer):
    """
    Contract serializer with computed financial metrics.

    Provides contract details including financial amounts, dates, status,
    and computed properties like remaining/available amounts and utilization.
    """

    remaining_amount = serializers.IntegerField(read_only=True)
    available_amount = serializers.IntegerField(read_only=True)
    utilization_percentage = serializers.FloatField(read_only=True)
    child_contracts_count = serializers.IntegerField(read_only=True)
    project_allocations_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Contract
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "workspace",
            "deleted_at",
        ]


class ContractLiteSerializer(BaseSerializer):
    """
    Lightweight contract serializer for minimal data transfer.

    Provides essential contract information without computed metrics,
    optimized for list views and reference lookups.
    """

    class Meta:
        model = Contract
        fields = [
            "id",
            "name",
            "contract_number",
            "contract_type",
            "hierarchy_type",
            "status",
            "ceiling_amount",
            "obligated_amount",
            "expended_amount",
            "start_date",
            "end_date",
        ]


class ContractProjectAllocationSerializer(BaseSerializer):
    """
    Serializer for contract-project allocation relationships.

    Manages the financial allocation between contracts and projects,
    including tracking of allocated vs actual spend amounts.
    """

    remaining_allocation = serializers.IntegerField(read_only=True)
    contract_detail = ContractLiteSerializer(source="contract", read_only=True)

    class Meta:
        model = ContractProjectAllocation
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "deleted_at",
        ]


class ContractProjectAllocationCreateSerializer(serializers.Serializer):
    """
    Serializer for creating contract-project allocations.

    Validates allocation data for linking contracts to projects.
    """

    project = serializers.UUIDField(help_text="Project ID to allocate funds to")
    allocated_amount = serializers.IntegerField(
        help_text="Amount to allocate in cents", min_value=0
    )
    fiscal_year = serializers.CharField(
        max_length=10, required=False, allow_blank=True
    )
    description = serializers.CharField(required=False, allow_blank=True)
