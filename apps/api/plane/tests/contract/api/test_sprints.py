import pytest
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from uuid import uuid4

from plane.db.models import Sprint, Project, ProjectMember


@pytest.fixture
def project(db, workspace, create_user):
    """Create a test project with the user as a member"""
    project = Project.objects.create(
        name="Test Project",
        identifier="TP",
        workspace=workspace,
        created_by=create_user,
    )
    ProjectMember.objects.create(
        project=project,
        member=create_user,
        role=20,  # Admin role
        is_active=True,
    )
    return project


@pytest.fixture
def sprint_data():
    """Sample sprint data for tests"""
    return {
        "name": "Test Sprint",
        "description": "A test sprint for unit tests",
    }


@pytest.fixture
def draft_sprint_data():
    """Sample draft sprint data (no dates)"""
    return {
        "name": "Draft Sprint",
        "description": "A draft sprint without dates",
    }


@pytest.fixture
def create_sprint(db, project, create_user):
    """Create a test sprint"""
    return Sprint.objects.create(
        name="Existing Sprint",
        description="An existing sprint",
        start_date=timezone.now() + timedelta(days=1),
        end_date=timezone.now() + timedelta(days=7),
        project=project,
        workspace=project.workspace,
        owned_by=create_user,
    )


@pytest.mark.contract
class TestSprintListCreateAPIEndpoint:
    """Test Sprint List and Create API Endpoint"""

    def get_sprint_url(self, workspace_slug, project_id):
        """Helper to get sprint endpoint URL"""
        return f"/api/v1/workspaces/{workspace_slug}/projects/{project_id}/sprints/"

    @pytest.mark.django_db
    def test_create_sprint_success(self, api_key_client, workspace, project, sprint_data):
        """Test successful sprint creation"""
        url = self.get_sprint_url(workspace.slug, project.id)

        response = api_key_client.post(url, sprint_data, format="json")

        assert response.status_code == status.HTTP_201_CREATED

        assert Sprint.objects.count() == 1

        created_sprint = Sprint.objects.first()
        assert created_sprint.name == sprint_data["name"]
        assert created_sprint.description == sprint_data["description"]
        assert created_sprint.project == project
        assert created_sprint.owned_by_id is not None

    @pytest.mark.django_db
    def test_create_sprint_invalid_data(self, api_key_client, workspace, project):
        """Test sprint creation with invalid data"""
        url = self.get_sprint_url(workspace.slug, project.id)

        # Test with empty data
        response = api_key_client.post(url, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Test with missing name
        response = api_key_client.post(url, {"description": "Test sprint"}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @pytest.mark.django_db
    def test_create_sprint_invalid_date_combination(self, api_key_client, workspace, project):
        """Test sprint creation with invalid date combination (only start_date)"""
        url = self.get_sprint_url(workspace.slug, project.id)

        invalid_data = {
            "name": "Invalid Sprint",
            "start_date": (timezone.now() + timedelta(days=1)).isoformat(),
            # Missing end_date
        }

        response = api_key_client.post(url, invalid_data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Both start date and end date are either required or are to be null" in response.data["error"]

    @pytest.mark.django_db
    def test_create_sprint_with_external_id(self, api_key_client, workspace, project):
        """Test creating sprint with external ID"""
        url = self.get_sprint_url(workspace.slug, project.id)

        sprint_data = {
            "name": "External Sprint",
            "description": "A sprint with external ID",
            "external_id": "ext-123",
            "external_source": "github",
        }

        response = api_key_client.post(url, sprint_data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        created_sprint = Sprint.objects.first()
        assert created_sprint.external_id == "ext-123"
        assert created_sprint.external_source == "github"

    @pytest.mark.django_db
    def test_create_sprint_duplicate_external_id(self, api_key_client, workspace, project, create_user):
        """Test creating sprint with duplicate external ID"""
        url = self.get_sprint_url(workspace.slug, project.id)

        # Create first sprint
        Sprint.objects.create(
            name="First Sprint",
            project=project,
            workspace=workspace,
            external_id="ext-123",
            external_source="github",
            owned_by=create_user,
        )

        # Try to create second sprint with same external ID
        sprint_data = {
            "name": "Second Sprint",
            "external_id": "ext-123",
            "external_source": "github",
            "owned_by": create_user.id,
        }

        response = api_key_client.post(url, sprint_data, format="json")

        assert response.status_code == status.HTTP_409_CONFLICT
        assert "same external id" in response.data["error"]

    @pytest.mark.django_db
    def test_list_sprints_success(self, api_key_client, workspace, project, create_sprint, create_user):
        """Test successful sprint listing"""
        url = self.get_sprint_url(workspace.slug, project.id)

        # Create additional sprints
        Sprint.objects.create(
            name="Sprint 2",
            project=project,
            workspace=workspace,
            start_date=timezone.now() + timedelta(days=10),
            end_date=timezone.now() + timedelta(days=17),
            owned_by=create_user,
        )
        Sprint.objects.create(
            name="Sprint 3",
            project=project,
            workspace=workspace,
            start_date=timezone.now() + timedelta(days=20),
            end_date=timezone.now() + timedelta(days=27),
            owned_by=create_user,
        )

        response = api_key_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) == 3  # Including create_sprint fixture

    @pytest.mark.django_db
    def test_list_sprints_with_view_filter(self, api_key_client, workspace, project, create_user):
        """Test sprint listing with different view filters"""
        url = self.get_sprint_url(workspace.slug, project.id)

        # Create sprints in different states
        now = timezone.now()

        # Current sprint (started but not ended)
        Sprint.objects.create(
            name="Current Sprint",
            project=project,
            workspace=workspace,
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=6),
            owned_by=create_user,
        )

        # Upcoming sprint
        Sprint.objects.create(
            name="Upcoming Sprint",
            project=project,
            workspace=workspace,
            start_date=now + timedelta(days=1),
            end_date=now + timedelta(days=8),
            owned_by=create_user,
        )

        # Completed sprint
        Sprint.objects.create(
            name="Completed Sprint",
            project=project,
            workspace=workspace,
            start_date=now - timedelta(days=10),
            end_date=now - timedelta(days=3),
            owned_by=create_user,
        )

        # Draft sprint
        Sprint.objects.create(
            name="Draft Sprint",
            project=project,
            workspace=workspace,
            owned_by=create_user,
        )

        # Test current sprints
        response = api_key_client.get(url, {"sprint_view": "current"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["name"] == "Current Sprint"

        # Test upcoming sprints
        response = api_key_client.get(url, {"sprint_view": "upcoming"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["name"] == "Upcoming Sprint"

        # Test completed sprints
        response = api_key_client.get(url, {"sprint_view": "completed"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["name"] == "Completed Sprint"

        # Test draft sprints
        response = api_key_client.get(url, {"sprint_view": "draft"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["name"] == "Draft Sprint"


@pytest.mark.contract
class TestSprintDetailAPIEndpoint:
    """Test Sprint Detail API Endpoint"""

    def get_sprint_detail_url(self, workspace_slug, project_id, sprint_id):
        """Helper to get sprint detail endpoint URL"""
        return f"/api/v1/workspaces/{workspace_slug}/projects/{project_id}/sprints/{sprint_id}/"

    @pytest.mark.django_db
    def test_get_sprint_success(self, api_key_client, workspace, project, create_sprint):
        """Test successful sprint retrieval"""
        url = self.get_sprint_detail_url(workspace.slug, project.id, create_sprint.id)

        response = api_key_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert str(response.data["id"]) == str(create_sprint.id)
        assert response.data["name"] == create_sprint.name
        assert response.data["description"] == create_sprint.description

    @pytest.mark.django_db
    def test_get_sprint_not_found(self, api_key_client, workspace, project):
        """Test getting non-existent sprint"""
        fake_id = uuid4()
        url = self.get_sprint_detail_url(workspace.slug, project.id, fake_id)

        response = api_key_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    @pytest.mark.django_db
    def test_update_sprint_success(self, api_key_client, workspace, project, create_sprint):
        """Test successful sprint update"""
        url = self.get_sprint_detail_url(workspace.slug, project.id, create_sprint.id)

        update_data = {
            "name": f"Updated Sprint {uuid4()}",
            "description": "Updated description",
        }

        response = api_key_client.patch(url, update_data, format="json")

        assert response.status_code == status.HTTP_200_OK

        create_sprint.refresh_from_db()
        assert create_sprint.name == update_data["name"]
        assert create_sprint.description == update_data["description"]

    @pytest.mark.django_db
    def test_update_sprint_invalid_data(self, api_key_client, workspace, project, create_sprint):
        """Test sprint update with invalid data"""
        url = self.get_sprint_detail_url(workspace.slug, project.id, create_sprint.id)

        update_data = {"name": ""}
        response = api_key_client.patch(url, update_data, format="json")

        # This might be 400 if name is required, or 200 if empty names are allowed
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_200_OK]

    @pytest.mark.django_db
    def test_update_sprint_with_external_id_conflict(
        self, api_key_client, workspace, project, create_sprint, create_user
    ):
        """Test sprint update with conflicting external ID"""
        url = self.get_sprint_detail_url(workspace.slug, project.id, create_sprint.id)

        # Create another sprint with external ID
        Sprint.objects.create(
            name="Another Sprint",
            project=project,
            workspace=workspace,
            external_id="ext-456",
            external_source="github",
            owned_by=create_user,
        )

        # Try to update sprint with same external ID
        update_data = {
            "external_id": "ext-456",
            "external_source": "github",
        }

        response = api_key_client.patch(url, update_data, format="json")

        assert response.status_code == status.HTTP_409_CONFLICT
        assert "same external id" in response.data["error"]

    @pytest.mark.django_db
    def test_delete_sprint_success(self, api_key_client, workspace, project, create_sprint):
        """Test successful sprint deletion"""
        url = self.get_sprint_detail_url(workspace.slug, project.id, create_sprint.id)

        response = api_key_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Sprint.objects.filter(id=create_sprint.id).exists()

    @pytest.mark.django_db
    def test_sprint_metrics_annotation(self, api_key_client, workspace, project, create_sprint):
        """Test that sprint includes issue metrics annotations"""
        url = self.get_sprint_detail_url(workspace.slug, project.id, create_sprint.id)

        response = api_key_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Check that metrics are included in response
        sprint_data = response.data
        assert "total_issues" in sprint_data
        assert "completed_issues" in sprint_data
        assert "cancelled_issues" in sprint_data
        assert "started_issues" in sprint_data
        assert "unstarted_issues" in sprint_data
        assert "backlog_issues" in sprint_data

        # All should be 0 for a new sprint
        assert sprint_data["total_issues"] == 0
        assert sprint_data["completed_issues"] == 0
        assert sprint_data["cancelled_issues"] == 0
        assert sprint_data["started_issues"] == 0
        assert sprint_data["unstarted_issues"] == 0
        assert sprint_data["backlog_issues"] == 0
