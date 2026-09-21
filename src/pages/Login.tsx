import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  databaseConfigured,
  getSession,
  onAuthStateChange,
  signIn,
  type Session,
} from "../supabase";

export default function Login() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    void getSession().then((currSession) => {
      if (!isMounted) return;
      setSession(currSession);
      setCheckingSession(false);
    });

    const subscription = onAuthStateChange((_event, currSession) => {
      if (!isMounted) return;
      setSession(currSession);
      setCheckingSession(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checkingSession) {
    return (
      <div className="auth-loading-screen" role="status" aria-live="polite">
        <div className="auth-loading-card">
          <div className="brand-badge">SOL</div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Preencha o e-mail e a senha.");
      return;
    }

    if (!databaseConfigured) {
      setError("Supabase não configurado no ambiente.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await signIn(email.trim(), password);
      navigate("/admin", { replace: true });
    } catch (err: unknown) {
      console.error("Erro na autenticação:", err);
      if (err && typeof err === "object") {
        const errorObj = err as { message?: string; status?: number };
        if (
          errorObj.message?.toLowerCase().includes("invalid login credentials") ||
          errorObj.message?.toLowerCase().includes("invalid_grant") ||
          errorObj.status === 400
        ) {
          setError("E-mail ou senha incorretos.");
        } else {
          setError(
            errorObj.message || "Não foi possível realizar o login. Tente novamente.",
          );
        }
      } else {
        setError("Não foi possível conectar ao servidor de autenticação.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <img
            src="/logo-skalee.jpg"
            alt="Skalee TV"
            style={{ width: "44px", height: "44px", borderRadius: "10px", objectFit: "cover", boxShadow: "0 0 12px rgba(168,85,247,0.3)" }}
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, letterSpacing: "0.02em" }}>
              SKALEE <span style={{ color: "var(--skalee-purple)" }}>TV</span>
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--skalee-text-secondary)" }}>
              Painel de Gestão
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <h2>Acesso Restrito</h2>

          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@supermercadosol.com.br"
            disabled={submitting}
          />

          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={submitting}
          />

          <button
            type="submit"
            className="btn btn-primary submit"
            disabled={submitting}
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        {error && (
          <div className="toast error login-error" role="alert">
            {error}
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

