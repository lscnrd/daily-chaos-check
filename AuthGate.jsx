import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient.js";
import { logSessionStart } from "./analytics.js";

// Simple email/password auth. Magic-link (passwordless) is also available in
// Supabase Auth if you'd rather not deal with password reset flows — swap
// signInWithPassword/signUp for supabase.auth.signInWithOtp({ email }) and
// adjust the form accordingly.

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) logSessionStart();
  }, [session?.user?.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const { error } = await fn({ email, password });
    setBusy(false);
    if (error) setError(error.message);
  }

  if (session === undefined) {
    return <div style={{ padding: 24, fontFamily: "sans-serif" }}>Loading…</div>;
  }

  if (session === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#EAF2F0", fontFamily: "sans-serif" }}>
        <form onSubmit={handleSubmit} style={{ background: "white", padding: 32, borderRadius: 16, width: 320 }}>
          <h2 style={{ marginTop: 0 }}>{mode === "signin" ? "Log in" : "Create account"}</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 10, marginBottom: 10, borderRadius: 8, border: "1px solid #D3E0DB" }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: "100%", padding: 10, marginBottom: 10, borderRadius: 8, border: "1px solid #D3E0DB" }}
          />
          {error && <p style={{ color: "#FF5A3C", fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={busy} style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: "#2F6E63", color: "white", fontWeight: 500 }}>
            {busy ? "…" : mode === "signin" ? "Log in" : "Sign up"}
          </button>
          <p style={{ fontSize: 13, marginTop: 12, textAlign: "center" }}>
            {mode === "signin" ? (
              <>No account? <button type="button" onClick={() => setMode("signup")} style={{ background: "none", border: "none", color: "#2F6E63", cursor: "pointer", padding: 0 }}>Sign up</button></>
            ) : (
              <>Already have an account? <button type="button" onClick={() => setMode("signin")} style={{ background: "none", border: "none", color: "#2F6E63", cursor: "pointer", padding: 0 }}>Log in</button></>
            )}
          </p>
        </form>
      </div>
    );
  }

  return children;
}
