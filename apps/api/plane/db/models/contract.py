# Python imports
from django.db import models
from django.conf import settings

# Package imports
from .base import BaseModel


# Contract type choices for government contracts
CONTRACT_TYPE_CHOICES = [
    ("idiq", "IDIQ"),  # Indefinite Delivery/Indefinite Quantity
    ("bpa", "BPA"),  # Blanket Purchase Agreement
    ("ffp", "Firm Fixed Price"),
    ("tm", "Time & Materials"),
    ("cpff", "Cost Plus Fixed Fee"),
    ("task_order", "Task Order"),  # Under IDIQ
    ("call_order", "Call Order"),  # Under BPA
]

CONTRACT_HIERARCHY_CHOICES = [
    ("master", "Master Contract"),  # IDIQ or BPA umbrella
    ("task_order", "Task Order"),  # Work order under IDIQ
    ("call_order", "Call Order"),  # Order under BPA
    ("standalone", "Standalone"),  # FFP, T&M, CPFF not under umbrella
]

CONTRACT_STATUS_CHOICES = [
    ("active", "Active"),
    ("completed", "Completed"),
    ("expired", "Expired"),
    ("cancelled", "Cancelled"),
]


class Contract(BaseModel):
    """
    Government contract model supporting IDIQ, BPA, FFP, T&M, and CPFF contract types.

    All monetary amounts are stored in cents (integer) to avoid floating-point errors.
    For example, $100,000 is stored as 10000000 cents.
    """

    workspace = models.ForeignKey(
        "db.Workspace",
        on_delete=models.CASCADE,
        related_name="contracts",
    )

    # Basic contract info
    name = models.CharField(max_length=255)
    contract_number = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)

    # Contract type and hierarchy
    contract_type = models.CharField(
        max_length=20,
        choices=CONTRACT_TYPE_CHOICES,
        default="ffp",
    )
    hierarchy_type = models.CharField(
        max_length=20,
        choices=CONTRACT_HIERARCHY_CHOICES,
        default="standalone",
    )
    parent_contract = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="child_contracts",
        help_text="Parent IDIQ/BPA contract for task orders and call orders",
    )

    # Vendor/Contractor info
    vendor_name = models.CharField(max_length=255, blank=True)
    vendor_contact = models.CharField(max_length=255, blank=True)

    # Financial amounts (stored in cents)
    ceiling_amount = models.BigIntegerField(
        default=0,
        help_text="Maximum contract value in cents (e.g., 10000000 = $100,000)",
    )
    obligated_amount = models.BigIntegerField(
        default=0,
        help_text="Committed/obligated funds in cents",
    )
    expended_amount = models.BigIntegerField(
        default=0,
        help_text="Actual spend to date in cents",
    )
    currency = models.CharField(max_length=3, default="USD")

    # Contract dates
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    pop_start = models.DateField(
        null=True,
        blank=True,
        help_text="Period of Performance start date",
    )
    pop_end = models.DateField(
        null=True,
        blank=True,
        help_text="Period of Performance end date",
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=CONTRACT_STATUS_CHOICES,
        default="active",
    )

    # Flexible metadata for additional contract-specific data
    metadata = models.JSONField(default=dict, blank=True)

    # Sort order for manual ordering
    sort_order = models.FloatField(default=65535)

    class Meta:
        verbose_name = "Contract"
        verbose_name_plural = "Contracts"
        db_table = "contracts"
        ordering = ("-created_at",)
        unique_together = [["workspace", "contract_number", "deleted_at"]]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "contract_number"],
                condition=models.Q(deleted_at__isnull=True) & ~models.Q(contract_number=""),
                name="contract_unique_workspace_number_when_not_deleted",
            )
        ]

    def __str__(self):
        if self.contract_number:
            return f"{self.contract_number} - {self.name}"
        return self.name

    @property
    def remaining_amount(self):
        """Calculate remaining budget (ceiling - obligated)."""
        return self.ceiling_amount - self.obligated_amount

    @property
    def available_amount(self):
        """Calculate available funds (obligated - expended)."""
        return self.obligated_amount - self.expended_amount

    @property
    def utilization_percentage(self):
        """Calculate contract utilization percentage."""
        if self.ceiling_amount == 0:
            return 0
        return (self.obligated_amount / self.ceiling_amount) * 100


class ContractProjectAllocation(BaseModel):
    """
    Junction table linking contracts to projects with allocation amounts.

    A contract can fund multiple projects, and a project can be funded by multiple contracts.
    This table tracks how much of each contract is allocated to each project.
    """

    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name="project_allocations",
    )
    project = models.ForeignKey(
        "db.Project",
        on_delete=models.CASCADE,
        related_name="contract_allocations",
    )

    # Financial allocation (stored in cents)
    allocated_amount = models.BigIntegerField(
        default=0,
        help_text="Amount allocated from this contract to this project in cents",
    )
    actual_spend = models.BigIntegerField(
        default=0,
        help_text="Actual spend against this allocation in cents",
    )

    # Optional fiscal year tracking (government contracts often have FY constraints)
    fiscal_year = models.CharField(max_length=10, blank=True)

    # Description of what this allocation covers
    description = models.TextField(blank=True)

    class Meta:
        verbose_name = "Contract Project Allocation"
        verbose_name_plural = "Contract Project Allocations"
        db_table = "contract_project_allocations"
        ordering = ("-created_at",)
        # Allow multiple allocations per contract-project pair (e.g., different fiscal years)
        # but prevent exact duplicates
        unique_together = [["contract", "project", "fiscal_year", "deleted_at"]]
        constraints = [
            models.UniqueConstraint(
                fields=["contract", "project", "fiscal_year"],
                condition=models.Q(deleted_at__isnull=True),
                name="allocation_unique_contract_project_fy_when_not_deleted",
            )
        ]

    def __str__(self):
        return f"{self.contract.name} → {self.project.name}"

    @property
    def remaining_allocation(self):
        """Calculate remaining allocation (allocated - actual_spend)."""
        return self.allocated_amount - self.actual_spend

    def save(self, *args, **kwargs):
        # Ensure contract and project are in the same workspace
        if self.contract.workspace_id != self.project.workspace_id:
            raise ValueError("Contract and project must be in the same workspace")
        super().save(*args, **kwargs)
