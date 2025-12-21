# Python imports
import copy
import json

# Django imports
from django.core import serializers
from django.db.models import F, Func, OuterRef, Q, Subquery
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.gzip import gzip_page

# Third party imports
from rest_framework import status
from rest_framework.response import Response


# Package imports
from .. import BaseViewSet
from plane.app.serializers import SprintIssueSerializer
from plane.bgtasks.issue_activities_task import issue_activity
from plane.db.models import Sprint, SprintIssue, Issue, FileAsset, IssueLink
from plane.utils.grouper import (
    issue_group_values,
    issue_on_results,
    issue_queryset_grouper,
)
from plane.utils.issue_filters import issue_filters
from plane.utils.order_queryset import order_issue_queryset
from plane.utils.paginator import GroupedOffsetPaginator, SubGroupedOffsetPaginator
from plane.app.permissions import allow_permission, ROLE
from plane.utils.host import base_host
from plane.utils.filters import ComplexFilterBackend
from plane.utils.filters import IssueFilterSet


class SprintIssueViewSet(BaseViewSet):
    serializer_class = SprintIssueSerializer
    model = SprintIssue
    filter_backends = (ComplexFilterBackend,)
    filterset_class = IssueFilterSet

    webhook_event = "sprint_issue"
    bulk = True

    filterset_fields = ["issue__labels__id", "issue__assignees__id"]

    def get_queryset(self):
        return self.filter_queryset(
            super()
            .get_queryset()
            .annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("issue_id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .filter(workspace__slug=self.kwargs.get("slug"))
            .filter(project_id=self.kwargs.get("project_id"))
            .filter(
                project__project_projectmember__member=self.request.user,
                project__project_projectmember__is_active=True,
            )
            .filter(project__archived_at__isnull=True)
            .filter(sprint_id=self.kwargs.get("sprint_id"))
            .select_related("project")
            .select_related("workspace")
            .select_related("sprint")
            .select_related("issue", "issue__state", "issue__project")
            .prefetch_related("issue__assignees", "issue__labels")
            .distinct()
        )

    def apply_annotations(self, issues):
        return (
            issues.annotate(
                sprint_id=Subquery(
                    SprintIssue.objects.filter(issue=OuterRef("id"), deleted_at__isnull=True).values("sprint_id")[:1]
                )
            )
            .annotate(
                link_count=IssueLink.objects.filter(issue=OuterRef("id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .annotate(
                attachment_count=FileAsset.objects.filter(
                    issue_id=OuterRef("id"),
                    entity_type=FileAsset.EntityTypeContext.ISSUE_ATTACHMENT,
                )
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .annotate(
                sub_issues_count=Issue.issue_objects.filter(parent=OuterRef("id"))
                .order_by()
                .annotate(count=Func(F("id"), function="Count"))
                .values("count")
            )
            .prefetch_related("assignees", "labels", "issue_epic__epic", "issue_sprint__sprint")
        )

    @method_decorator(gzip_page)
    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def list(self, request, slug, project_id, sprint_id):
        filters = issue_filters(request.query_params, "GET")
        issue_queryset = (
            Issue.issue_objects.filter(issue_sprint__sprint_id=sprint_id, issue_sprint__deleted_at__isnull=True)
            .filter(project_id=project_id)
            .filter(workspace__slug=slug)
        )

        # Apply filtering from filterset
        issue_queryset = self.filter_queryset(issue_queryset)

        # Apply legacy filters
        issue_queryset = issue_queryset.filter(**filters)

        # Total count queryset
        total_issue_queryset = copy.deepcopy(issue_queryset)

        # Applying annotations to the issue queryset
        issue_queryset = self.apply_annotations(issue_queryset)

        order_by_param = request.GET.get("order_by", "-created_at")
        # Issue queryset
        issue_queryset, order_by_param = order_issue_queryset(
            issue_queryset=issue_queryset, order_by_param=order_by_param
        )

        # Group by
        group_by = request.GET.get("group_by", False)
        sub_group_by = request.GET.get("sub_group_by", False)

        # issue queryset
        issue_queryset = issue_queryset_grouper(queryset=issue_queryset, group_by=group_by, sub_group_by=sub_group_by)

        if group_by:
            # Check group and sub group value paginate
            if sub_group_by:
                if group_by == sub_group_by:
                    return Response(
                        {"error": "Group by and sub group by cannot have same parameters"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                else:
                    # group and sub group pagination
                    return self.paginate(
                        request=request,
                        order_by=order_by_param,
                        queryset=issue_queryset,
                        total_count_queryset=total_issue_queryset,
                        on_results=lambda issues: issue_on_results(
                            group_by=group_by, issues=issues, sub_group_by=sub_group_by
                        ),
                        paginator_cls=SubGroupedOffsetPaginator,
                        group_by_fields=issue_group_values(
                            field=group_by,
                            slug=slug,
                            project_id=project_id,
                            filters=filters,
                        ),
                        sub_group_by_fields=issue_group_values(
                            field=sub_group_by,
                            slug=slug,
                            project_id=project_id,
                            filters=filters,
                        ),
                        group_by_field_name=group_by,
                        sub_group_by_field_name=sub_group_by,
                        count_filter=Q(
                            Q(issue_intake__status=1)
                            | Q(issue_intake__status=-1)
                            | Q(issue_intake__status=2)
                            | Q(issue_intake__isnull=True),
                            archived_at__isnull=True,
                            is_draft=False,
                        ),
                    )
            # Group Paginate
            else:
                # Group paginate
                return self.paginate(
                    request=request,
                    order_by=order_by_param,
                    queryset=issue_queryset,
                    total_count_queryset=total_issue_queryset,
                    on_results=lambda issues: issue_on_results(
                        group_by=group_by, issues=issues, sub_group_by=sub_group_by
                    ),
                    paginator_cls=GroupedOffsetPaginator,
                    group_by_fields=issue_group_values(
                        field=group_by,
                        slug=slug,
                        project_id=project_id,
                        filters=filters,
                    ),
                    group_by_field_name=group_by,
                    count_filter=Q(
                        Q(issue_intake__status=1)
                        | Q(issue_intake__status=-1)
                        | Q(issue_intake__status=2)
                        | Q(issue_intake__isnull=True),
                        archived_at__isnull=True,
                        is_draft=False,
                    ),
                )
        else:
            # List Paginate
            return self.paginate(
                order_by=order_by_param,
                request=request,
                queryset=issue_queryset,
                total_count_queryset=total_issue_queryset,
                on_results=lambda issues: issue_on_results(group_by=group_by, issues=issues, sub_group_by=sub_group_by),
            )

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def create(self, request, slug, project_id, sprint_id):
        issues = request.data.get("issues", [])

        if not issues:
            return Response({"error": "Issues are required"}, status=status.HTTP_400_BAD_REQUEST)

        sprint = Sprint.objects.get(workspace__slug=slug, project_id=project_id, pk=sprint_id)

        if sprint.end_date is not None and sprint.end_date < timezone.now():
            return Response(
                {"error": "The Sprint has already been completed so no new issues can be added"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get all SprintIssues already created
        sprint_issues = list(SprintIssue.objects.filter(~Q(sprint_id=sprint_id), issue_id__in=issues))
        existing_issues = [str(sprint_issue.issue_id) for sprint_issue in sprint_issues]
        new_issues = list(set(issues) - set(existing_issues))

        # New issues to create
        created_records = SprintIssue.objects.bulk_create(
            [
                SprintIssue(
                    project_id=project_id,
                    workspace_id=sprint.workspace_id,
                    created_by_id=request.user.id,
                    updated_by_id=request.user.id,
                    sprint_id=sprint_id,
                    issue_id=issue,
                )
                for issue in new_issues
            ],
            batch_size=10,
        )

        # Updated Issues
        updated_records = []
        update_sprint_issue_activity = []
        # Iterate over each sprint_issue in sprint_issues
        for sprint_issue in sprint_issues:
            old_sprint_id = sprint_issue.sprint_id
            # Update the sprint_issue's sprint_id
            sprint_issue.sprint_id = sprint_id
            # Add the modified sprint_issue to the records_to_update list
            updated_records.append(sprint_issue)
            # Record the update activity
            update_sprint_issue_activity.append(
                {
                    "old_sprint_id": str(old_sprint_id),
                    "new_sprint_id": str(sprint_id),
                    "issue_id": str(sprint_issue.issue_id),
                }
            )

        # Update the sprint issues
        SprintIssue.objects.bulk_update(updated_records, ["sprint_id"], batch_size=100)
        # Capture Issue Activity
        issue_activity.delay(
            type="sprint.activity.created",
            requested_data=json.dumps({"sprints_list": issues}),
            actor_id=str(self.request.user.id),
            issue_id=None,
            project_id=str(self.kwargs.get("project_id", None)),
            current_instance=json.dumps(
                {
                    "updated_sprint_issues": update_sprint_issue_activity,
                    "created_sprint_issues": serializers.serialize("json", created_records),
                }
            ),
            epoch=int(timezone.now().timestamp()),
            notification=True,
            origin=base_host(request=request, is_app=True),
        )
        return Response({"message": "success"}, status=status.HTTP_201_CREATED)

    @allow_permission([ROLE.ADMIN, ROLE.MEMBER])
    def destroy(self, request, slug, project_id, sprint_id, issue_id):
        sprint_issue = SprintIssue.objects.filter(
            issue_id=issue_id,
            workspace__slug=slug,
            project_id=project_id,
            sprint_id=sprint_id,
        )
        issue_activity.delay(
            type="sprint.activity.deleted",
            requested_data=json.dumps(
                {
                    "sprint_id": str(self.kwargs.get("sprint_id")),
                    "issues": [str(issue_id)],
                }
            ),
            actor_id=str(self.request.user.id),
            issue_id=str(issue_id),
            project_id=str(self.kwargs.get("project_id", None)),
            current_instance=None,
            epoch=int(timezone.now().timestamp()),
            notification=True,
            origin=base_host(request=request, is_app=True),
        )
        sprint_issue.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
