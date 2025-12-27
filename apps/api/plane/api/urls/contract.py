from django.urls import path

from plane.api.views import (
    ContractListCreateAPIEndpoint,
    ContractDetailAPIEndpoint,
    ContractProjectAllocationListCreateAPIEndpoint,
    ContractProjectAllocationDetailAPIEndpoint,
)

urlpatterns = [
    # Contracts
    path(
        "workspaces/<str:slug>/contracts/",
        ContractListCreateAPIEndpoint.as_view(http_method_names=["get", "post"]),
        name="contracts",
    ),
    path(
        "workspaces/<str:slug>/contracts/<uuid:pk>/",
        ContractDetailAPIEndpoint.as_view(http_method_names=["get", "patch", "delete"]),
        name="contract-detail",
    ),
    # Contract Project Allocations
    path(
        "workspaces/<str:slug>/contracts/<uuid:contract_id>/allocations/",
        ContractProjectAllocationListCreateAPIEndpoint.as_view(
            http_method_names=["get", "post"]
        ),
        name="contract-allocations",
    ),
    path(
        "workspaces/<str:slug>/contracts/<uuid:contract_id>/allocations/<uuid:pk>/",
        ContractProjectAllocationDetailAPIEndpoint.as_view(
            http_method_names=["get", "patch", "delete"]
        ),
        name="contract-allocation-detail",
    ),
]
