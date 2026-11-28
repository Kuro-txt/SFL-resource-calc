import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, HelpCircle, ArrowRight, Loader2, Lock, User as UserIcon, Hash } from "lucide-react";

interface LoginGateProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSignUp: (params: { username: string; password: string; farmId: string }) => Promise<{ error?: string; farmId?: string }>;
  onSignIn: (params: { username: string; password: string }) => Promise<{ error?: string; farmId?: string }>;
  onAuthenticated: (farmId?: string) => void;
}

type GateMode = "register" | "login";

export const LoginGate: React.FC<LoginGateProps> = ({
  theme,
  onToggleTheme,
  onSignUp,
  onSignIn,
  onAuthenticated,
}) => {
  const isDark = theme === "dark";
  const [mode, setMode] = useState<GateMode>("register");
  const [farmId, setFarmId] = useState(() => localStorage.getItem("sfl_farm_id") || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const handleUsernameChange = (val: string) => {
    if (val.includes("@")) {
      setUsername(val.replace(/@gmail\.com$/i, "").replace(/@.*$/, "").trim());
    } else {
      setUsername(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);

    try {
      const res =
        mode === "register"
          ? await onSignUp({ username, password, farmId })
          : await onSignIn({ username, password });

      if (res.error) {
        setAlert({ type: "error", text: res.error });
        setLoading(false);
        return;
      }

      setAlert({
        type: "success",
        text: mode === "register" ? "Account created! Entering farm..." : "Signed in! Loading your farm...",
      });
      onAuthenticated(res.farmId);
    } catch (err) {
      setAlert({ type: "error", text: err instanceof Error ? err.message : "Authentication failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        minHeight: "100vh",
        maxWidth: "940px",
        margin: "0 auto",
        padding: "24px 18px 48px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "18px",
      }}
    >
      {/* Top Bar: Live Status + Theme Toggle */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "7px 14px",
            borderRadius: "999px",
            background: "var(--card)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow)",
            fontSize: "0.76rem",
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "999px",
              background: "#10b981",
              boxShadow: "0 0 10px #10b981",
            }}
          />
          <span className="mono">Sun-Flux Live</span>
        </div>

        <motion.button
          type="button"
          onClick={onToggleTheme}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "11px",
            border: "1px solid var(--border)",
            background: "var(--card)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            color: "var(--text)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            boxShadow: "var(--shadow)",
          }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </motion.button>
      </motion.div>

      {/* Main Glassmorphic Auth Card */}
      <motion.section
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative",
          background: isDark ? "rgba(8, 14, 28, 0.88)" : "rgba(255, 253, 248, 0.90)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid",
          borderColor: isDark ? "rgba(56, 189, 248, 0.25)" : "var(--border)",
          borderRadius: "20px",
          padding: "28px",
          boxShadow: isDark
            ? "0 24px 64px rgba(0, 0, 0, 0.72), 0 0 36px rgba(0, 212, 255, 0.14)"
            : "0 24px 60px rgba(28, 21, 14, 0.14), inset 0 1px 0 var(--bevel)",
          overflow: "hidden",
        }}
      >
        {/* Night Mode Dual-Side Neon Edge Beams */}
        {isDark && (
          <>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "20px",
                border: "1.5px solid #00f0ff",
                clipPath: "inset(0% 90% 0% 0%)",
                boxShadow: "inset 0 0 18px rgba(0, 240, 255, 0.28)",
                pointerEvents: "none",
              }}
            />
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "20px",
                border: "1.5px solid #38bdf8",
                clipPath: "inset(0% 0% 0% 90%)",
                boxShadow: "inset 0 0 18px rgba(56, 189, 248, 0.28)",
                pointerEvents: "none",
              }}
            />
          </>
        )}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            gap: "28px",
            alignItems: "start",
          }}
        >
          {/* LEFT COLUMN: Overview & Highlights */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <span
                className="mono"
                style={{
                  display: "inline-block",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  padding: "3px 9px",
                  borderRadius: "6px",
                  background: "var(--accent-soft)",
                  color: "var(--accent)",
                  border: "1px solid var(--border)",
                  marginBottom: "10px",
                }}
              >
                GATE // FARMER ACCESS
              </span>
              <h1 style={{ fontSize: "1.65rem", fontWeight: 700, letterSpacing: "-0.025em", color: "var(--text)" }}>
                Welcome to Sun-Flux
              </h1>
              <p style={{ fontSize: "0.84rem", color: "var(--muted)", marginTop: "6px", lineHeight: 1.55 }}>
                Automated daily harvest baselines, resource expenses & P2P marketplace analytics for Sunflower Land.
              </p>
            </div>

            {/* Farmer Notice */}
            <div
              style={{
                padding: "14px",
                borderRadius: "12px",
                background: "var(--card-inner)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text)" }}>Notice for Farmers</span>
                <span
                  className="mono"
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: "5px",
                    background: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                >
                  NO REAL GMAIL NEEDED
                </span>
              </div>
              <p style={{ fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.5 }}>
                Register once with any username (<span className="mono">@gmail.com</span> attaches automatically) and link your{" "}
                <strong style={{ color: "var(--text)" }}>Farm ID</strong> for automated daily snapshots.
              </p>
            </div>

            {/* 3 Schedule Slots */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
              {[
                { label: "00:00 UTC", sub: "Baseline" },
                { label: "LIVE", sub: "SFL / USD" },
                { label: "22:30 UTC", sub: "Reports" },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    padding: "10px 8px",
                    borderRadius: "10px",
                    background: "var(--card-inner)",
                    border: "1px solid var(--border)",
                    textAlign: "center",
                  }}
                >
                  <div className="mono" style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--accent)" }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "2px" }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: Auth Mode Switcher + Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Mode Switcher */}
            <div
              style={{
                display: "flex",
                gap: "4px",
                padding: "4px",
                borderRadius: "11px",
                background: "var(--card-inner)",
                border: "1px solid var(--border)",
              }}
            >
              {(
                [
                  { id: "register", label: "New Farmer" },
                  { id: "login", label: "Returning" },
                ] as const
              ).map((item) => {
                const active = mode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMode(item.id);
                      setAlert(null);
                    }}
                    style={{
                      position: "relative",
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "none",
                      background: "transparent",
                      color: active ? (isDark ? "#040812" : "#ffffff") : "var(--muted)",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      zIndex: 1,
                      fontFamily: "inherit",
                      transition: "color 0.2s ease",
                    }}
                  >
                    {active && (
                      <motion.span
                        layoutId="gate-mode-pill"
                        transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "8px",
                          background: isDark
                            ? "linear-gradient(135deg, #00f0ff, #3b82f6)"
                            : "linear-gradient(135deg, #e87a30, #d45526)",
                          zIndex: -1,
                        }}
                      />
                    )}
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Alert Banner */}
            <AnimatePresence>
              {alert && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    background: alert.type === "error" ? "rgba(239, 68, 68, 0.14)" : "rgba(16, 185, 129, 0.14)",
                    border: `1px solid ${alert.type === "error" ? "rgba(239, 68, 68, 0.45)" : "rgba(16, 185, 129, 0.45)"}`,
                    color: alert.type === "error" ? "#ef4444" : "#10b981",
                  }}
                >
                  {alert.text}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {mode === "register" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label
                      htmlFor="gate-farm-id"
                      style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text)", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <Hash size={13} style={{ color: "var(--accent)" }} /> Sunflower Land Farm ID
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowHelp((s) => !s)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--accent)",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontFamily: "inherit",
                      }}
                    >
                      <HelpCircle size={12} /> Where is my ID?
                    </button>
                  </div>

                  <input
                    id="gate-farm-id"
                    type="number"
                    placeholder="e.g. 12345"
                    value={farmId}
                    onChange={(e) => setFarmId(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      background: "var(--card-inner)",
                      color: "var(--text)",
                      fontSize: "0.84rem",
                      fontFamily: "JetBrains Mono, monospace",
                      outline: "none",
                    }}
                  />

                  {showHelp && (
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: "var(--accent-soft)",
                        border: "1px solid var(--border)",
                        fontSize: "0.72rem",
                        color: "var(--text)",
                      }}
                    >
                      Find your Farm ID inside Sunflower Land → Settings → General.
                    </div>
                  )}
                </div>
              )}

              {/* Account Username */}
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label
                  htmlFor="gate-username"
                  style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text)", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <UserIcon size={13} style={{ color: "var(--accent)" }} /> Account Username
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "var(--card-inner)",
                    overflow: "hidden",
                  }}
                >
                  <input
                    id="gate-username"
                    type="text"
                    placeholder="e.g. farmer123"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    autoComplete="username"
                    required
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "10px 12px",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "var(--text)",
                      fontSize: "0.84rem",
                      fontFamily: "inherit",
                    }}
                  />
                  <span
                    className="mono"
                    style={{
                      padding: "10px 11px",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      borderLeft: "1px solid var(--border)",
                      background: "var(--card)",
                      userSelect: "none",
                    }}
                  >
                    @gmail.com
                  </span>
                </div>
              </div>

              {/* Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label
                    htmlFor="gate-password"
                    style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text)", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <Lock size={13} style={{ color: "var(--accent)" }} /> Password
                  </label>
                  <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>min 6 chars</span>
                </div>
                <input
                  id="gate-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "var(--card-inner)",
                    color: "var(--text)",
                    fontSize: "0.84rem",
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
              </div>

              {/* Primary CTA */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.985 }}
                style={{
                  marginTop: "4px",
                  width: "100%",
                  padding: "11px 16px",
                  borderRadius: "11px",
                  border: "none",
                  background: isDark
                    ? "linear-gradient(135deg, #00f0ff, #3b82f6)"
                    : "linear-gradient(135deg, #e87a30, #d45526)",
                  color: isDark ? "#040812" : "#ffffff",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.75 : 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: isDark
                    ? "0 0 24px rgba(0, 225, 255, 0.45)"
                    : "0 6px 18px rgba(217, 107, 39, 0.35)",
                  fontFamily: "inherit",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === "register" ? "Register & Enter Farm" : "Sign In & Enter Farm"}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>
      </motion.section>
    </div>
  );
};
