import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/page";

// Redirect workspace root to projects list
function WorkspaceDashboardPage({ params }: Route.ComponentProps) {
  const { workspaceSlug } = params;
  const navigate = useNavigate();

  useEffect(() => {
    void navigate(`/${workspaceSlug}/projects/`, { replace: true });
  }, [workspaceSlug, navigate]);

  // Show nothing while redirecting
  return null;
}

export default WorkspaceDashboardPage;
