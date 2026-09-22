import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { telemetryStore } from "@/lib/store";
import { initTheme } from "@/lib/theme";
import { useSession } from "@/lib/session";
import { Landing } from "@/pages/Landing";
import { Auth } from "@/pages/Auth";
import { Ward } from "@/pages/Ward";
import { Audit } from "@/pages/Audit";

function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (!session) {
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/ward"
        element={
          <RequireAuth>
            <Ward />
          </RequireAuth>
        }
      />
      <Route
        path="/audit"
        element={
          <RequireAuth>
            <Audit />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    initTheme();
    // The telemetry feed runs for the lifetime of the app, independent of the
    // currently visible route, so graphs stay continuous while navigating.
    telemetryStore.start();
  }, []);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
