# Package imports
from .base import BaseSerializer
from plane.db.models import Epic


class EpicBaseSerializer(BaseSerializer):
    class Meta:
        model = Epic
        fields = "__all__"
        read_only_fields = [
            "workspace",
            "project",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
