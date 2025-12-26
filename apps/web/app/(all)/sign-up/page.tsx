import { Navigate } from "react-router";

// Government deployment: Sign-up is disabled
// Users can only join via workspace invites
export default function SignUpPage() {
  return <Navigate to="/sign-in" replace />;
}
