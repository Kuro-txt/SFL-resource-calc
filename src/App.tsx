import React, { useEffect, useState } from "react";
import { MotionConfig, AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { PixelCanvas } from "./components/PixelCanvas";
import { Navbar, TabId, TABS } from "./components/Navbar";
import { EmptyCard } from "./components/EmptyCard";
import { AppPreferences, CardContent } from "./components/CardViews";
import { useMarketData } from "./hooks/useMarketData";

interface CardSpec {
  slot: string;
  title: string;
  span: string;
  minHeight?: number;
  enterFrom?: "left" | "right" | "center";
}

const TAB_LAYOUTS: Record<TabId, CardSpec[]> = {
  overview: [
    { slot: "01", title: "Live Market Pulse", span: "span-8", minHeight: 280, enterFrom: "left" },
    { slot: "02", title: "Economy Snapshot", span: "span-4", minHeight: 280, enterFrom: "right" },
    { slot: "03", title: "Boost Spotlight", span: "span-4", minHeight: 195, enterFrom: "left" },
    { slot: "04", title: "Minerals & Ores", span: "span-4", minHeight: 195, enterFrom: "center" },
    { slot: "05", title: "Tax Calculator", span: "span-4", minHeight: 195, enterFrom: "right" },
  ],
  workspace: [
    { slot: "01", title: "Crops Index", span: "span-4", minHeight: 225, enterFrom: "left" },
    { slot: "02", title: "Fruits & Honey", span: "span-4", minHeight: 225, enterFrom: "center" },
    { slot: "03", title: "Resource Finder", span: "span-4", minHeight: 225, enterFrom: "right" },
    { slot: "04", title: "Bulk Trade Estimator", span: "span-6", minHeight: 215, enterFrom: "left" },
    { slot: "05", title: "API Endpoints", span: "span-6", minHeight: 215, enterFrom: "right" },
  ],
  library: [
    { slot: "01", title: "Boosted Collectibles", span: "span-6", minHeight: 245, enterFrom: "left" },
    { slot: "02", title: "Wearables Floor", span: "span-6", minHeight: 245, enterFrom: "right" },
    { slot: "03", title: "Top Market Value", span: "span-6", minHeight: 245, enterFrom: "left" },
    { slot: "04", title: "Collectible Explorer", span: "span-6", minHeight: 245, enterFrom: "right" },
  ],
  settings: [
    { slot: "01", title: "Theme & Currency", span: "span-12", minHeight: 150, enterFrom: "left" },
    { slot: "02", title: "Default Tax Preset", span: "span-12", minHeight: 150, enterFrom: "right" },
    { slot: "03", title: "Data Sync & Shortcuts", span: "span-12", minHeight: 150, enterFrom: "left" },
  ],
};

// Smooth GPU-only side-slide page variants
const pageVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir * 80,
    scale: 0.99,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir * -80,
    scale: 0.99,
  }),
};

export const App: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("canvas_theme");
    return saved === "dark" ? "dark" : "light";
  });
  const [prefs, setPrefs] = useState<AppPreferences>(() => {
    try {
      const raw = localStorage.getItem("sfl_motion_prefs");
      if (raw) return JSON.parse(raw) as AppPreferences;
    } catch {
      // ignore
    }
    return { currency: "flower", defaultTax: 7.5 };
  });

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [direction, setDirection] = useState(1);
  const [expandedSlot, setExpandedSlot] = useState<string | null>(null);

  const market = useMarketData();
  const isDark = theme === "dark";
  const cards = TAB_LAYOUTS[activeTab];
  const expandedIndex = expandedSlot ? cards.findIndex((c) => c.slot === expandedSlot) : -1;
  const expandedCard = expandedIndex >= 0 ? cards[expandedIndex] : null;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("canvas_theme", theme);
  }, [theme]);

  const handleUpdatePrefs = (patch: Partial<AppPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem("sfl_motion_prefs", JSON.stringify(next));
      return next;
    });
  };

  const handleSelectTab = (next: TabId) => {
    if (next === activeTab) return;
    setExpandedSlot(null);
    const prevIdx = TABS.findIndex((t) => t.id === activeTab);
    const nextIdx = TABS.findIndex((t) => t.id === next);
    setDirection(nextIdx >= prevIdx ? 1 : -1);
    setActiveTab(next);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Escape" && expandedSlot) {
          setExpandedSlot(null);
        }
        return;
      }
      if (e.key === "Escape" && expandedSlot) {
        setExpandedSlot(null);
        return;
      }
      if (expandedSlot && expandedIndex >= 0) {
        if (e.key === "ArrowRight") {
          setExpandedSlot(cards[(expandedIndex + 1) % cards.length].slot);
          return;
        }
        if (e.key === "ArrowLeft") {
          setExpandedSlot(cards[(expandedIndex - 1 + cards.length) % cards.length].slot);
          return;
        }
      }
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < TABS.length) {
        handleSelectTab(TABS[idx].id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTab, expandedSlot, expandedIndex, cards]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <MotionConfig reducedMotion="user">
      <PixelCanvas theme={theme} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "28px 18px 64px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <Navbar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main style={{ position: "relative", minHeight: "520px", overflow: "hidden", padding: "6px 4px" }}>
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.section
              key={activeTab}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              className="card-grid-bento"
            >
              {cards.map((card, i) =>
                expandedSlot === card.slot ? (
                  <div
                    key={`${activeTab}-${card.slot}`}
                    className={card.span}
                    style={{ minHeight: `${card.minHeight ?? 200}px` }}
                    aria-hidden="true"
                  />
                ) : (
                  <EmptyCard
                    key={`${activeTab}-${card.slot}`}
                    layoutId={`card-${activeTab}-${card.slot}`}
                    slot={card.slot}
                    title={card.title}
                    className={card.span}
                    minHeight={card.minHeight}
                    index={i}
                    isDark={isDark}
                    enterFrom={card.enterFrom}
                    onOpen={() => setExpandedSlot(card.slot)}
                  >
                    <CardContent
                      tab={activeTab}
                      slot={card.slot}
                      market={market}
                      prefs={prefs}
                      onUpdatePrefs={handleUpdatePrefs}
                      theme={theme}
                      onToggleTheme={toggleTheme}
                    />
                  </EmptyCard>
                )
              )}
            </motion.section>
          </AnimatePresence>
        </main>
      </div>

      {/* Cinematic Expanded Card Stage */}
      <AnimatePresence>
        {expandedCard && (
          <motion.div
            key="expanded-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setExpandedSlot(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              background: isDark ? "rgba(2, 5, 12, 0.76)" : "rgba(26, 20, 14, 0.42)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              display: "grid",
              placeItems: "center",
              padding: "24px",
            }}
          >
            <motion.div
              layoutId={`card-${activeTab}-${expandedCard.slot}`}
              onClick={(e) => e.stopPropagation()}
              transition={{ type: "spring", stiffness: 310, damping: 30, mass: 0.85 }}
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "840px",
                minHeight: "480px",
                background: isDark ? "rgba(8, 14, 28, 0.96)" : "rgba(255, 253, 248, 0.98)",
                border: "1px solid",
                borderColor: isDark ? "rgba(0, 225, 255, 0.4)" : "var(--border-hover)",
                borderRadius: "20px",
                padding: "28px 30px",
                boxShadow: isDark
                  ? "0 30px 90px rgba(0, 0, 0, 0.85), 0 0 50px rgba(0, 212, 255, 0.25)"
                  : "0 32px 80px rgba(28, 21, 14, 0.24)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflow: "hidden",
                willChange: "transform",
              }}
            >
              {isDark && (
                <>
                  <motion.span
                    aria-hidden="true"
                    initial={{ clipPath: "inset(0% 96% 0% 0%)", opacity: 0.4 }}
                    animate={{ clipPath: "inset(0% 50% 0% 0%)", opacity: 1 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "20px",
                      border: "1.5px solid #00f0ff",
                      boxShadow:
                        "inset 0 0 22px rgba(0, 240, 255, 0.35), 0 0 24px rgba(0, 240, 255, 0.55)",
                      pointerEvents: "none",
                    }}
                  />
                  <motion.span
                    aria-hidden="true"
                    initial={{ clipPath: "inset(0% 0% 0% 96%)", opacity: 0.4 }}
                    animate={{ clipPath: "inset(0% 0% 0% 50%)", opacity: 1 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "20px",
                      border: "1.5px solid #38bdf8",
                      boxShadow:
                        "inset 0 0 22px rgba(56, 189, 248, 0.35), 0 0 24px rgba(56, 189, 248, 0.55)",
                      pointerEvents: "none",
                    }}
                  />
                </>
              )}

              {/* Expanded Header */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "7px",
                      background: "var(--accent)",
                      color: isDark ? "#03050a" : "#ffffff",
                      boxShadow: isDark ? "0 0 14px rgba(0, 225, 255, 0.5)" : "none",
                    }}
                  >
                    {expandedCard.slot}
                  </span>
                  <div>
                    <h2 style={{ fontSize: "1.18rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                      {expandedCard.title}
                    </h2>
                    <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                      {activeTab.toUpperCase()} // LIVE VIEW
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() =>
                      setExpandedSlot(cards[(expandedIndex - 1 + cards.length) % cards.length].slot)
                    }
                    aria-label="Previous card"
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "9px",
                      border: "1px solid var(--border)",
                      background: "var(--card-inner)",
                      color: "var(--text)",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <ChevronLeft size={16} />
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setExpandedSlot(cards[(expandedIndex + 1) % cards.length].slot)}
                    aria-label="Next card"
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "9px",
                      border: "1px solid var(--border)",
                      background: "var(--card-inner)",
                      color: "var(--text)",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <ChevronRight size={16} />
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.06, rotate: 90 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: "spring", stiffness: 320, damping: 22 }}
                    onClick={() => setExpandedSlot(null)}
                    aria-label="Close expanded card"
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "9px",
                      border: "1px solid var(--border)",
                      background: "var(--card-inner)",
                      color: "var(--text)",
                      display: "grid",
                      placeItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <X size={16} />
                  </motion.button>
                </div>
              </motion.div>

              {/* Expanded Inner Content */}
              <motion.div
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.12, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  flex: 1,
                  margin: "20px 0",
                  borderRadius: "14px",
                  border: "1px solid var(--border)",
                  background: "var(--card-inner)",
                  padding: "20px",
                  position: "relative",
                  zIndex: 2,
                  overflowY: "auto",
                }}
              >
                <CardContent
                  tab={activeTab}
                  slot={expandedCard.slot}
                  market={market}
                  prefs={prefs}
                  onUpdatePrefs={handleUpdatePrefs}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  expanded
                />
              </motion.div>

              {/* Expanded Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.75 }}
                transition={{ delay: 0.16, duration: 0.25 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.74rem",
                  color: "var(--muted)",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <span className="mono">ESC to close • ← / → to cycle</span>
                <span className="mono">
                  {expandedIndex + 1} / {cards.length}
                </span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
};
