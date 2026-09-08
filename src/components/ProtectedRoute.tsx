import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getSession, onAuthStateChange, type Session } from "../supabase";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void getSession().then((initialSession) => {
      if (!isMounted) return;
      setSession(initialSession);
      setLoading(false);
    });

    const subscription = onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="auth-loading-screen" role="status" aria-live="polite">
        <div className="auth-loading-card">
          <div className="brand-badge">SOL</div>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

