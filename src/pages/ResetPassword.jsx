import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient.js";

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Clicking the emailed reset link brings the visitor here with a
    // recovery token in the URL; Supabase's client picks it up automatically
    // and fires this event once the recovery session is established.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // If the session is already present (e.g. on a fast reload), allow
    // the form to show right away instead of waiting indefinitely.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 2000);
    } catch (err) {
      setError(err?.message || "Failed to reset password. The link may have expired — request a new one.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: "12px", padding: "2.5rem", width: "100%", maxWidth: "420px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.25rem" }}>Set New Password</h1>

        {!ready && !success && (
          <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Verifying your reset link...</p>
        )}

        {success && (
          <div style={{ background: "#f0fdf4", color: "#15803d", padding: "0.6rem 0.85rem", borderRadius: "8px", fontSize: "0.85rem" }}>
            Password updated. Redirecting to sign in...
          </div>
        )}

        {ready && !success && (
          <form onSubmit={handleSubmit}>
            <p style={{ color: "#64748b", margin: "0 0 1.5rem", fontSize: "0.875rem" }}>Choose a new password for your account</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box" }}
                  placeholder="At least 8 characters"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "0.35rem" }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", boxSizing: "border-box" }}
                  placeholder="Re-enter password"
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
              }}
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
