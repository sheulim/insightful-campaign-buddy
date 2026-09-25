import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      {loading || !user ? (
        <div className="mx-auto max-w-6xl px-5 py-24 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <Outlet />
      )}
    </div>
  );
}
