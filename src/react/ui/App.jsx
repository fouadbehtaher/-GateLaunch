import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const Field = ({ label, children }) => (
  <label style={{ display: "grid", gap: 6 }}>
    <div className="muted" style={{ fontSize: 12 }}>
      {label}
    </div>
    {children}
  </label>
);

const Button = ({ variant = "primary", ...props }) => {
  const className = useMemo(() => {
    if (variant === "ghost") return "ghost-btn";
    if (variant === "danger") return "danger-btn";
    return "primary-btn";
  }, [variant]);
  return <button className={className} {...props} />;
};

const Badge = ({ children }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: 999,
      background: "rgba(148,163,184,0.14)",
      border: "1px solid rgba(148,163,184,0.25)",
      fontSize: 12,
    }}
  >
    {children}
  </span>
);

export default function App() {
  const [health, setHealth] = useState(null);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [h, me] = await Promise.all([
        api.health().catch(() => null),
        api.me().catch((e) => (e.status === 401 ? null : Promise.reject(e))),
      ]);
      setHealth(h);
      setUser(me?.user || null);
      if (me?.user) {
        const o = await api.orders();
        setOrders(Array.isArray(o?.orders) ? o.orders : []);
      } else {
        setOrders([]);
      }
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogin = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.login({ email, password });
      setPassword("");
      await load();
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    setBusy(true);
    setError("");
    try {
      await api.logout();
      setUser(null);
      setOrders([]);
      await load();
    } catch (e) {
      setError(e.message || "Logout failed");
    } finally {
      setBusy(false);
    }
  };

  const onRefreshOrders = async () => {
    setBusy(true);
    setError("");
    try {
      const o = await api.orders();
      setOrders(Array.isArray(o?.orders) ? o.orders : []);
    } catch (e) {
      setError(e.message || "Failed to load orders");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Badge>backend: {health?.status || "unknown"}</Badge>
        <Badge>env: {health?.env || "unknown"}</Badge>
        <Badge>storage: {health?.storage || "unknown"}</Badge>
        <Badge>version: {health?.version || "unknown"}</Badge>
        <span className="muted" style={{ marginInlineStart: "auto" }}>
          {loading ? "Loading…" : ""}
        </span>
      </div>

      {error ? (
        <div
          style={{
            padding: 10,
            borderRadius: 12,
            background: "rgba(255, 59, 68, 0.08)",
            border: "1px solid rgba(255, 59, 68, 0.22)",
          }}
        >
          {error}
        </div>
      ) : null}

      {!user ? (
        <form onSubmit={onLogin} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Email">
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </Field>
            <Field label="Password">
              <input
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                type="password"
                required
              />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
            <Button type="button" variant="ghost" onClick={load} disabled={busy}>
              Reload
            </Button>
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Uses cookie sessions via <code>/api/login</code>.
          </div>
        </form>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700 }}>{user.name || user.email}</div>
            <Badge>{user.role}</Badge>
            <span className="muted">{user.email}</span>
            <span style={{ marginInlineStart: "auto" }} />
            <Button variant="ghost" onClick={onRefreshOrders} disabled={busy}>
              Refresh orders
            </Button>
            <Button variant="danger" onClick={onLogout} disabled={busy}>
              Logout
            </Button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 16 }}>Orders</h2>
              <span className="muted" style={{ fontSize: 12 }}>
                {orders.length} total
              </span>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {orders.slice(0, 25).map((o) => (
                <div
                  key={o.id}
                  className="card"
                  style={{ padding: 12, display: "grid", gap: 6, background: "rgba(15,23,42,0.35)" }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700 }}>{o.game}</div>
                    <Badge>{o.status || "unknown"}</Badge>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {o.wallet || ""}
                    </span>
                    <span className="muted" style={{ fontSize: 12, marginInlineStart: "auto" }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : ""}
                    </span>
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    playerId: <code>{o.playerId}</code> · amount: <code>{o.amount}</code>
                  </div>
                </div>
              ))}
              {orders.length === 0 ? <div className="muted">No orders yet.</div> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

