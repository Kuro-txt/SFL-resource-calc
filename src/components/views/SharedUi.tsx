import React from "react";
import { Search } from "lucide-react";

export type CurrencyMode = "flower" | "usd" | "both";
export type CoinRatioMode = "1000" | "1500" | "free" | "custom";

export interface AppPreferences {
  currency: CurrencyMode;
  defaultTax: number;
  coinFlowerRatio: number;
  coinRatioMode: CoinRatioMode;
  gemPack: string; // 'free' | '100' | '650' | '1350' | '2800' | '7400' | '15500' | '200000'
  gemDiscount: boolean;
  customApiKey: string;
}

export function fmtFlower(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";
  if (val >= 100) return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (val >= 1) return val.toLocaleString(undefined, { maximumFractionDigits: 3 });
  return val.toFixed(4);
}

export function fmtUsd(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";
  if (val >= 1) return `$${val.toFixed(2)}`;
  return `$${val.toFixed(4)}`;
}

export function formatValue(flower: number | null, usd: number | null, currency: CurrencyMode): string {
  if (currency === "usd") return fmtUsd(usd);
  if (currency === "both") return `${fmtFlower(flower)} FL (${fmtUsd(usd)})`;
  return `${fmtFlower(flower)} FL`;
}

export const MiniRow: React.FC<{
  label: string;
  right: string;
  sub?: string;
  image?: string;
  action?: React.ReactNode;
}> = ({ label, right, sub, image, action }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      padding: "6px 10px",
      borderRadius: "8px",
      background: "var(--card-inner)",
      border: "1px solid var(--border)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
      {image && (
        <img
          src={image}
          alt={label}
          loading="lazy"
          style={{ width: "20px", height: "20px", objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 }}
        />
      )}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "var(--text)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontSize: "0.68rem",
              color: "var(--muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
      <span className="mono" style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--accent)" }}>
        {right}
      </span>
      {action}
    </div>
  </div>
);

export const SearchInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}> = ({ value, onChange, placeholder }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "7px 11px",
      borderRadius: "9px",
      background: "var(--card-inner)",
      border: "1px solid var(--border)",
    }}
  >
    <Search size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: "transparent",
        border: "none",
        outline: "none",
        color: "var(--text)",
        fontSize: "0.8rem",
        fontFamily: "inherit",
      }}
    />
  </div>
);

export const PillButton: React.FC<{
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      padding: "5px 10px",
      borderRadius: "8px",
      border: "1px solid",
      borderColor: active ? "var(--accent)" : "var(--border)",
      background: active ? "var(--accent-soft)" : "var(--card-inner)",
      color: active ? "var(--accent)" : "var(--muted)",
      fontSize: "0.74rem",
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "inherit",
    }}
  >
    {children}
  </button>
);
