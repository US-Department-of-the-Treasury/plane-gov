# Compatibility stub for migrations that reference plane.db.models.module
# The Module model was renamed to Epic, but old migrations still import from here.
# Do not add new code here - use epic.py instead.

from plane.db.models.epic import (
    get_default_filters,
    get_default_display_filters,
    get_default_display_properties,
)

__all__ = [
    "get_default_filters",
    "get_default_display_filters",
    "get_default_display_properties",
]
