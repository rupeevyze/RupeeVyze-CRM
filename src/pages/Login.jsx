import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../authContext.jsx";
import { supabase } from "../supabaseClient.js";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await login(email, password);
      // Redirect based on role once the profile is hydrated.
      // authContext's onAuthStateChange sets currentUser; we can
      // check the session's user id via a fresh profile lookup here,
      // but simplest is to redirect to a neutral landing route that
      // itself redirects by role — falling back to adviser dashboard.
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.message || "Login failed. Check your email and password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetMessage("");
    if (!resetEmail) {
      setResetError("Please enter your email.");
      return;
    }
    setResetSubmitting(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetErr) throw resetErr;
      setResetMessage("If an account exists for this email, a password reset link has been sent.");
    } catch (err) {
      setResetError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setResetSubmitting(false);
    }
  };

  if (showReset) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', sans-serif" }}>
        <form
          onSubmit={handleResetRequest}
          style={{ background: "#fff", borderRadius: "12px", padding: "2.5rem", width: "100%", maxWidth: "420px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem" }}>Reset Password</h1>
          <p style={{ color: "#64748b", margin: "0 0 1.5rem", fontSize: "0.875rem" }}>Enter your email and we'll send you a reset link</p>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>Email</label>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              autoComplete="username"
              style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box" }}
              placeholder="you@rupeevyze.com"
            />
          </div>

          {resetError && (
            <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "0.6rem 0.85rem", borderRadius: "8px", fontSize: "0.8rem", marginBottom: "1rem" }}>
              {resetError}
            </div>
          )}
          {resetMessage && (
            <div style={{ background: "#f0fdf4", color: "#15803d", padding: "0.6rem 0.85rem", borderRadius: "8px", fontSize: "0.8rem", marginBottom: "1rem" }}>
              {resetMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={resetSubmitting}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: resetSubmitting ? "#a5b4fc" : "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: resetSubmitting ? "not-allowed" : "pointer",
              marginBottom: "1rem",
            }}
          >
            {resetSubmitting ? "Sending..." : "Send Reset Link"}
          </button>

          <button
            type="button"
            onClick={() => { setShowReset(false); setResetError(""); setResetMessage(""); }}
            style={{ width: "100%", background: "none", border: "none", color: "#4f46e5", fontSize: "0.85rem", cursor: "pointer" }}
          >
            ← Back to Sign In
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', sans-serif" }}>
      <form
        onSubmit={handleLogin}
        style={{ background: "#fff", borderRadius: "12px", padding: "2.5rem", width: "100%", maxWidth: "420px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem" }}>RupeeVyze Insurance CRM</h1>
        <p style={{ color: "#64748b", margin: "0 0 1.5rem", fontSize: "0.875rem" }}>Sign in with your email and password</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box" }}
              placeholder="you@rupeevyze.com"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box" }}
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "0.6rem 0.85rem", borderRadius: "8px", fontSize: "0.8rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: "100%",
            padding: "0.75rem",
            background: submitting ? "#a5b4fc" : "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: submitting ? "not-allowed" : "pointer",
            transition: "background 0.15s",
            marginBottom: "1rem",
          }}
        >
          {submitting ? "Signing in..." : "Sign In"}
        </button>

        <button
          type="button"
          onClick={() => setShowReset(true)}
          style={{ width: "100%", background: "none", border: "none", color: "#4f46e5", fontSize: "0.85rem", cursor: "pointer" }}
        >
          Forgot password?
        </button>
      </form>
    </div>
  );
}

export default Login;
