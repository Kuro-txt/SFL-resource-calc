import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Maximize2 } from "lucide-react";

interface EmptyCardProps {
  layoutId: string;
  slot: string;
  title: string;
  className?: string;
  minHeight?: number;
  index?: number;
  isDark?: boolean;
  enterFrom?: "left" | "right" | "center";
  onOpen: () => void;
  children?: React.ReactNode;
}

/**
 * 60fps GPU-composited container card:
 * - Zero React re-renders on pointer tilt (useMotionValue + useSpring)
 * - Clean shared-element layoutId morph to expanded modal stage
 * - Night Mode: Dual neon cyan/blue beams sweep from both left & right edges
 */
export const EmptyCard: React.FC<EmptyCardProps> = ({
  layoutId,
  slot,
  title,
  className = "span-4",
  minHeight = 200,
  index = 0,
  isDark = false,
  enterFrom = "center",
  onOpen,
  children,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);

  const rawRx = useMotionValue(0);
  const rawRy = useMotionValue(0);
  const rotateX = useSpring(rawRx, { stiffness: 260, damping: 24 });
  const rotateY = useSpring(rawRy, { stiffness: 260, damping: 24 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    rawRx.set(-ny * 5);
    rawRy.set(nx * 5);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    rawRx.set(0);
    rawRy.set(0);
  };

  const handleOpen = (e?: React.MouseEvent<HTMLDivElement>) => {
    if (e && e.target instanceof HTMLElement) {
      const interactive = e.target.closest("input, button, select, textarea, a");
      if (interactive && interactive !== cardRef.current) return;
    }
    rawRx.set(0);
    rawRy.set(0);
    setHovered(false);
    onOpen();
  };

  const initialX = enterFrom === "left" ? -36 : enterFrom === "right" ? 36 : 0;

  return (
    <motion.div
      ref={cardRef}
      layoutId={layoutId}
      className={className}
      initial={{ x: initialX, y: 14, scale: 0.98 }}
      animate={{ x: 0, y: 0, scale: 1 }}
      transition={{
        layout: { type: "spring", stiffness: 310, damping: 30, mass: 0.85 },
        x: { duration: 0.45, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 0.42, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] },
        scale: { duration: 0.42, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] },
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.985 }}
      onClick={handleOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpen();
        }
      }}
      style={{
        position: "relative",
        minHeight: `${minHeight}px`,
        transformPerspective: 950,
        rotateX,
        rotateY,
        background: isDark
          ? "rgba(8, 14, 28, 0.86)"
          : "linear-gradient(155deg, rgba(255, 252, 246, 0.94) 0%, rgba(251, 238, 220, 0.88) 100%)",
        border: isDark ? "1px solid var(--border)" : "1px solid rgba(206, 152, 104, 0.55)",
        borderRadius: "16px",
        padding: "20px 22px",
        boxShadow: isDark
          ? "var(--shadow), inset 0 1px 0 var(--bevel)"
          : "0 14px 34px rgba(120, 62, 22, 0.11), 0 2px 6px rgba(120, 62, 22, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -2px 0 rgba(217, 107, 39, 0.12)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        cursor: "pointer",
        overflow: "hidden",
        willChange: "transform",
      }}
    >
      {/* Light Mode: Sunlit Corner Sheen + Dual-Side Terracotta Edge Sweeps */}
      {!isDark && (
        <>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 90% 8%, rgba(232, 122, 48, 0.14), transparent 52%), radial-gradient(circle at 10% 92%, rgba(245, 180, 92, 0.12), transparent 50%)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
          <motion.span
            aria-hidden="true"
            initial={{ clipPath: "inset(0% 100% 0% 0%)", opacity: 0 }}
            animate={{
              clipPath: hovered ? "inset(0% 50% 0% 0%)" : "inset(0% 94% 0% 0%)",
              opacity: hovered ? 0.95 : 0.72,
            }}
            transition={{
              duration: 0.42,
              delay: hovered ? 0 : index * 0.05 + 0.12,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "16px",
              border: "1.5px solid #e87a30",
              boxShadow: "inset 0 0 10px rgba(232, 122, 48, 0.18), 0 0 10px rgba(232, 122, 48, 0.22)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
          <motion.span
            aria-hidden="true"
            initial={{ clipPath: "inset(0% 0% 0% 100%)", opacity: 0 }}
            animate={{
              clipPath: hovered ? "inset(0% 0% 0% 50%)" : "inset(0% 0% 0% 94%)",
              opacity: hovered ? 0.95 : 0.72,
            }}
            transition={{
              duration: 0.42,
              delay: hovered ? 0 : index * 0.05 + 0.12,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "16px",
              border: "1.5px solid #d45526",
              boxShadow: "inset 0 0 10px rgba(212, 85, 38, 0.16), 0 0 10px rgba(212, 85, 38, 0.2)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
        </>
      )}

      {/* Night Mode: Dual-Side Neon Blue Outlines Sweeping from Both Sides */}
      {isDark && (
        <>
          <motion.span
            aria-hidden="true"
            initial={{ clipPath: "inset(0% 100% 0% 0%)", opacity: 0 }}
            animate={{
              clipPath: hovered ? "inset(0% 50% 0% 0%)" : "inset(0% 93% 0% 0%)",
              opacity: hovered ? 1 : 0.85,
            }}
            transition={{
              duration: 0.45,
              delay: hovered ? 0 : index * 0.06 + 0.14,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "16px",
              border: "1.5px solid #00f0ff",
              boxShadow:
                "inset 0 0 14px rgba(0, 240, 255, 0.34), 0 0 16px rgba(0, 240, 255, 0.5)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />

          <motion.span
            aria-hidden="true"
            initial={{ clipPath: "inset(0% 0% 0% 100%)", opacity: 0 }}
            animate={{
              clipPath: hovered ? "inset(0% 0% 0% 50%)" : "inset(0% 0% 0% 93%)",
              opacity: hovered ? 1 : 0.85,
            }}
            transition={{
              duration: 0.45,
              delay: hovered ? 0 : index * 0.06 + 0.14,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "16px",
              border: "1.5px solid #38bdf8",
              boxShadow:
                "inset 0 0 14px rgba(56, 189, 248, 0.34), 0 0 16px rgba(56, 189, 248, 0.5)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
        </>
      )}

      {/* Top Row */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            className="mono"
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: "6px",
              background: isDark
                ? "var(--card-inner)"
                : "linear-gradient(135deg, rgba(232, 122, 48, 0.18), rgba(212, 85, 38, 0.09))",
              color: isDark ? "var(--muted)" : "var(--accent)",
              border: isDark ? "1px solid var(--border)" : "1px solid rgba(217, 107, 39, 0.34)",
            }}
          >
            {slot}
          </span>
          <span style={{ fontSize: "0.92rem", fontWeight: 600, letterSpacing: "-0.015em", color: "var(--text)" }}>
            {title}
          </span>
        </div>

        <motion.span
          animate={{ scale: hovered ? 1.08 : 1 }}
          transition={{ type: "spring", stiffness: 360, damping: 24 }}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            display: "grid",
            placeItems: "center",
            background: hovered ? "var(--accent-soft)" : "var(--card-inner)",
            color: hovered ? "var(--accent)" : "var(--muted)",
            border: "1px solid var(--border)",
            transition: "background 0.2s ease, color 0.2s ease",
          }}
        >
          <Maximize2 size={12} />
        </motion.span>
      </div>

      {/* Card Body */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "12px 0",
          minHeight: 0,
        }}
      >
        {children}
      </div>

      {/* Minimal Footer Indicator */}
      <div
        style={{
          position: "relative",
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: "14px",
          borderTop: "1px solid var(--border)",
          opacity: hovered ? 0.95 : 0.68,
          transition: "opacity 0.2s ease",
        }}
      >
        <span style={{ fontSize: "0.74rem", color: "var(--muted)", fontWeight: 500 }}>
          Click to expand
        </span>
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "2px",
            background: isDark && hovered ? "var(--accent)" : "var(--border-hover)",
            boxShadow: isDark && hovered ? "0 0 10px var(--accent)" : "none",
            transition: "all 0.2s ease",
          }}
        />
      </div>
    </motion.div>
  );
};
