from django.urls import path

from plane.space.views import RoadmapPublicEndpoint, RoadmapSettingsEndpoint

urlpatterns = [
    path(
        "anchor/<str:anchor>/roadmap/",
        RoadmapPublicEndpoint.as_view(),
        name="public-roadmap",
    ),
    path(
        "anchor/<str:anchor>/roadmap/settings/",
        RoadmapSettingsEndpoint.as_view(),
        name="public-roadmap-settings",
    ),
]
