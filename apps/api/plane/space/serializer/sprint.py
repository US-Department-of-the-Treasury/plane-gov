# Package imports
from .base import BaseSerializer
from plane.db.models import Sprint


class SprintBaseSerializer(BaseSerializer):
    class Meta:
        model = Sprint
        fields = "__all__"
        read_only_fields = [
            "workspace",
            "project",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
