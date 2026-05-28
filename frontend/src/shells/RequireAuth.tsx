import { Navigate, Outlet } from "react-router-dom";
import { useMe } from "../hooks/useAuth";
import { FullScreenMessage } from "../components/primitives/FullScreenMessage";

/**
 * Auth route guard.
 * Renders children/outlet only when a session exists.
 * Redirects to /login when unauthenticated.
 * Shows a loading state while the session query resolves.
 */
export function RequireAuth() {
  const me = useMe();
  if (me.isLoading) return <FullScreenMessage title="Loading ImaginAI" />;
  if (!me.data?.user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
