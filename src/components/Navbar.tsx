import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, LayoutGrid, Layers, FolderOpen, SlidersHorizontal, type LucideIcon } from "lucide-react";

export type TabId = "overview" | "workspace" | "library" | "settings";

export interface TabMeta {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

export const TABS: TabMeta[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "workspace", label: "Workspace", icon: Layers },
  { id: "library", label: "Library", icon: FolderOpen },
  { id: "settings", label: "Settings", icon: SlidersHorizontal },
];

interface NavbarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  theme,
  onToggleTheme,
}) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        padding: "10px 14px",
        background: "var(--card)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        boxShadow: "var(--shadow), inset 0 1px 0 var(--bevel)",
        overflow: "hidden",
      }}
    >
      {/* Segmented Tabs sliding in symmetrically from Left & Right sides */}
      <nav
        aria-label="Primary tabs"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px",
          borderRadius: "11px",
          background: "var(--card-inner)",
          border: "1px solid var(--border)",
          flexWrap: "wrap",
          overflow: "hidden",
        }}
      >
        {TABS.map((tab, idx) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          const fromLeft = idx < TABS.length / 2;
          const dist = fromLeft ? -(2 - idx) * 28 : (idx - 1) * 28;
          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              initial={{ opacity: 0, x: dist, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{
                duration: 0.65,
                delay: 0.14 + Math.abs(idx - 1.5) * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "7px 15px",
                borderRadius: "8px",
                border: "none",
                background: "transparent",
                color: isActive ? (theme === "dark" ? "#040812" : "#ffffff") : "var(--muted)",
                fontFamily: "inherit",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                zIndex: 1,
                transition: "color 0.22s ease",
              }}
            >
              {isActive && (
                <motion.span
                  layoutId="nav-pill"
                  transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.9 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "8px",
                    background:
                      theme === "dark"
                        ? "linear-gradient(135deg, #00f0ff, #3b82f6)"
                        : "linear-gradient(135deg, #e87a30, #d45526)",
                    boxShadow:
                      theme === "dark"
                        ? "0 0 22px rgba(0, 225, 255, 0.55)"
                        : "0 4px 14px rgba(217, 107, 39, 0.35)",
                    zIndex: -1,
                  }}
                />
              )}
              <Icon size={14} />
              <span>{tab.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* Theme Switch sliding in from Right */}
      <motion.button
        type="button"
        onClick={onToggleTheme}
        initial={{ opacity: 0, x: 36 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "10px",
          border: "1px solid var(--border)",
          background: "var(--card-inner)",
          color: "var(--text)",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            initial={{ y: -14, opacity: 0, rotate: -30 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 14, opacity: 0, rotate: 30 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "grid", placeItems: "center" }}
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </motion.header>
  );
};
