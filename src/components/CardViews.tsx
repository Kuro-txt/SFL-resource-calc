import React, { useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Copy, Check, Sparkles, Coins, Calculator, Sun, Moon, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { MarketDataState, ResourceItem } from "../hooks/useMarketData";
import { TimeRange, useDashboardData } from "../hooks/useDashboardData";
import { TabId } from "./Navbar";

export type CurrencyMode = "flower" | "usd" | "both";

export interface AppPreferences {
  currency: CurrencyMode;
  defaultTax: number;
}

interface CardViewProps {
  tab: TabId;
  slot: string;
  market: MarketDataState;
  dashboard: ReturnType<typeof useDashboardData>;
  prefs: AppPreferences;
  onUpdatePrefs: (patch: Partial<AppPreferences>) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  expanded?: boolean;
}

function fmtFlower(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";
  if (val >= 100) return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (val >= 1) return val.toLocaleString(undefined, { maximumFractionDigits: 3 });
  return val.toFixed(4);
}

function fmtUsd(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";
  if (val >= 1) return `$${val.toFixed(2)}`;
  return `$${val.toFixed(4)}`;
}

function formatValue(flower: number | null, usd: number | null, currency: CurrencyMode): string {
  if (currency === "usd") return fmtUsd(usd);
  if (currency === "both") return `${fmtFlower(flower)} FL (${fmtUsd(usd)})`;
  return `${fmtFlower(flower)} FL`;
}

const MiniRow: React.FC<{
  label: string;
  right: string;
  sub?: string;
  image?: string;
}> = ({ label, right, sub, image }) => (
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
    <span className="mono" style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--accent)", flexShrink: 0 }}>
      {right}
    </span>
  </div>
);

const SearchInput: React.FC<{
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

const PillButton: React.FC<{
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

export const CardContent: React.FC<CardViewProps> = ({
  tab,
  slot,
  market,
  dashboard,
  prefs,
  onUpdatePrefs,
  theme,
  onToggleTheme,
  expanded = false,
}) => {
  const [query, setQuery] = useState("");
  const [farmInput, setFarmInput] = useState(dashboard.farmId);
  useEffect(() => {
    setFarmInput(dashboard.farmId);
  }, [dashboard.farmId]);
  const [taxInput, setTaxInput] = useState("100");
  const [taxRate, setTaxRate] = useState(prefs.defaultTax);
  const [bulkQty, setBulkQty] = useState("1000");
  const [selectedResource, setSelectedResource] = useState("Sunflower");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const resourceMap = useMemo(() => {
    const m = new Map<string, ResourceItem>();
    market.resources.forEach((r) => m.set(r.name.toLowerCase(), r));
    return m;
  }, [market.resources]);

  const boostedCollectibles = useMemo(
    () => market.collectibles.filter((c) => Boolean(c.boost) && (c.priceFlower ?? 0) > 0),
    [market.collectibles]
  );

  const sortedByPrice = useMemo(
    () => [...market.collectibles].sort((a, b) => (b.priceFlower ?? 0) - (a.priceFlower ?? 0)),
    [market.collectibles]
  );

  const spotlight = useMemo(() => {
    return (
      boostedCollectibles.find((c) => c.name === "Scarecrow") ||
      boostedCollectibles[0] ||
      market.collectibles[0] ||
      null
    );
  }, [boostedCollectibles, market.collectibles]);

  const copyEndpoint = (path: string) => {
    const full = `${window.location.origin}${path}`;
    void navigator.clipboard?.writeText(full);
    setCopiedUrl(path);
    setTimeout(() => setCopiedUrl(null), 1500);
  };

  if (market.loading && market.resources.length === 0) {
    return (
      <div style={{ display: "grid", gap: "8px" }}>
        <div className="mono" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
          Syncing live Sunflower Land market...
        </div>
      </div>
    );
  }

  // ── OVERVIEW ─────────────────────────────────────────────────────────────
  if (tab === "overview") {
    if (slot === "01") {
      const { earnedFlowers, earnedQty, spentFlowers, spentQty, netFlowers, earnedItems, spentItems, rangeLabel } =
        dashboard.summary;
      const isPositive = netFlowers >= 0;

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
          {/* Farm ID + Time Range Controls */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                dashboard.setFarmId(farmInput);
              }}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <input
                type="text"
                value={farmInput}
                onChange={(e) => setFarmInput(e.target.value)}
                placeholder="Enter Farm ID..."
                style={{
                  width: "125px",
                  padding: "5px 9px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--card-inner)",
                  color: "var(--text)",
                  fontSize: "0.76rem",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              />
              <PillButton active={Boolean(dashboard.farmId)} onClick={() => dashboard.setFarmId(farmInput)}>
                {dashboard.loading ? "..." : "Load"}
              </PillButton>
            </form>

            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              {(["day", "week", "month"] as TimeRange[]).map((tr) => (
                <PillButton
                  key={tr}
                  active={dashboard.timeRange === tr}
                  onClick={() => dashboard.setTimeRange(tr)}
                >
                  {tr.charAt(0).toUpperCase() + tr.slice(1)}
                </PillButton>
              ))}
              <PillButton onClick={() => dashboard.setOffset(dashboard.offset + 1)}>
                <ChevronLeft size={12} />
              </PillButton>
              <PillButton onClick={() => dashboard.setOffset(Math.max(0, dashboard.offset - 1))}>
                <ChevronRight size={12} />
              </PillButton>
            </div>
          </div>

          {/* Active Date Label */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--muted)" }}>
            <span className="mono">{rangeLabel}</span>
            {dashboard.farmId ? (
              <span className="mono">Farm #{dashboard.farmId}</span>
            ) : (
              <span>Enter a Farm ID to load Earned, Spent & Net</span>
            )}
          </div>

          {/* 3 Core KPI Boxes: Net, Earned, Spent */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "10px",
            }}
          >
            {/* Net Output */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                background: "var(--card-inner)",
                border: `1.5px solid ${isPositive ? "rgba(16, 185, 129, 0.45)" : "rgba(239, 68, 68, 0.45)"}`,
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                <span>Net Output</span>
                <Scale size={13} style={{ color: isPositive ? "#10b981" : "#ef4444" }} />
              </div>
              <div className="mono" style={{ fontSize: "1.18rem", fontWeight: 700, color: isPositive ? "#10b981" : "#ef4444" }}>
                {isPositive ? "+" : ""}{fmtFlower(netFlowers)} FL
              </div>
              <div className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                {fmtUsd(netFlowers * market.flowerPriceUsd)} • {isPositive ? "Surplus" : "Deficit"}
              </div>
            </div>

            {/* Items Earned */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                background: "var(--card-inner)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                <span>Earned</span>
                <TrendingUp size={13} style={{ color: "#10b981" }} />
              </div>
              <div className="mono" style={{ fontSize: "1.18rem", fontWeight: 700, color: "var(--text)" }}>
                +{fmtFlower(earnedFlowers)} FL
              </div>
              <div className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                {fmtUsd(earnedFlowers * market.flowerPriceUsd)} • {Math.round(earnedQty).toLocaleString()} items
              </div>
            </div>

            {/* Items Spent */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                background: "var(--card-inner)",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                <span>Spent</span>
                <TrendingDown size={13} style={{ color: "#f59e0b" }} />
              </div>
              <div className="mono" style={{ fontSize: "1.18rem", fontWeight: 700, color: "var(--text)" }}>
                -{fmtFlower(spentFlowers)} FL
              </div>
              <div className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                {fmtUsd(spentFlowers * market.flowerPriceUsd)} • {Math.round(spentQty).toLocaleString()} items
              </div>
            </div>
          </div>

          {/* Expanded Modal: Side-by-Side Earned & Spent Breakdown */}
          {expanded && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "14px",
                marginTop: "6px",
                maxHeight: "230px",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="mono" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#10b981" }}>
                  ITEMS EARNED ({earnedItems.length})
                </div>
                {earnedItems.length === 0 ? (
                  <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>No earned items in this period.</div>
                ) : (
                  earnedItems.map((it) => (
                    <MiniRow
                      key={`earned-${it.name}`}
                      label={`${it.name} (×${Math.round(it.qty).toLocaleString()})`}
                      right={`+${fmtFlower(it.flowers)} FL`}
                    />
                  ))
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="mono" style={{ fontSize: "0.72rem", fontWeight: 700, color: "#f59e0b" }}>
                  ITEMS SPENT ({spentItems.length})
                </div>
                {spentItems.length === 0 ? (
                  <div style={{ fontSize: "0.76rem", color: "var(--muted)" }}>No spent items in this period.</div>
                ) : (
                  spentItems.map((it) => (
                    <MiniRow
                      key={`spent-${it.name}`}
                      label={`${it.name} (×${Math.round(it.qty).toLocaleString()})`}
                      right={`-${fmtFlower(it.flowers)} FL`}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (slot === "02") {
      const keyNames = ["Sunflower", "Wood", "Stone", "Gold", "Crimstone"];
      const items = expanded
        ? market.resources
        : keyNames.map((n) => resourceMap.get(n.toLowerCase())).filter((x): x is ResourceItem => Boolean(x));

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span className="mono" style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)" }}>
              ${market.flowerPriceUsd.toFixed(4)}
            </span>
            <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>FLOWER / USD</span>
          </div>
          <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "300px" : undefined, overflowY: expanded ? "auto" : undefined }}>
            {items.map((item) => (
              <MiniRow
                key={item.name}
                label={item.name}
                right={formatValue(item.priceFlower, item.priceUsd, prefs.currency)}
              />
            ))}
          </div>
        </div>
      );
    }

    if (slot === "03") {
      const earned = dashboard.summary.earnedItems;
      if (earned.length > 0) {
        return (
          <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "340px" : undefined, overflowY: expanded ? "auto" : undefined }}>
            {(expanded ? earned : earned.slice(0, 3)).map((item) => (
              <MiniRow
                key={item.name}
                label={`${item.name} (×${Math.round(item.qty).toLocaleString()})`}
                right={`+${fmtFlower(item.flowers)} FL`}
              />
            ))}
          </div>
        );
      }

      return spotlight ? (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src={spotlight.image}
            alt={spotlight.name}
            style={{ width: "52px", height: "52px", objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>{spotlight.name}</div>
            <div className="mono" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--accent)", margin: "2px 0" }}>
              {formatValue(spotlight.priceFlower, spotlight.priceUsd, prefs.currency)}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {spotlight.boost?.split("\n")[0] || "Collectible"}
            </div>
          </div>
        </div>
      ) : null;
    }

    if (slot === "04") {
      const spent = dashboard.summary.spentItems;
      if (spent.length > 0) {
        return (
          <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "340px" : undefined, overflowY: expanded ? "auto" : undefined }}>
            {(expanded ? spent : spent.slice(0, 3)).map((item) => (
              <MiniRow
                key={item.name}
                label={`${item.name} (×${Math.round(item.qty).toLocaleString()})`}
                right={`-${fmtFlower(item.flowers)} FL`}
              />
            ))}
          </div>
        );
      }

      const minerals = market.resources.filter((r) => r.category.toLowerCase().includes("mineral"));
      const shown = expanded ? minerals : minerals.slice(0, 3);
      return (
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "340px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {shown.map((item) => (
            <MiniRow
              key={item.name}
              label={item.name}
              right={formatValue(item.priceFlower, item.priceUsd, prefs.currency)}
            />
          ))}
        </div>
      );
    }

    if (slot === "05") {
      const gross = parseFloat(taxInput) || 0;
      const net = gross * (1 - taxRate / 100);
      const netUsd = net * market.flowerPriceUsd;
      const tiers = [7.5, 10, 15, 20, 25, 30];

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <input
              type="number"
              value={taxInput}
              onChange={(e) => setTaxInput(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--card-inner)",
                color: "var(--text)",
                fontSize: "0.82rem",
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            {[7.5, 10, 15].map((r) => (
              <PillButton key={r} active={taxRate === r} onClick={() => setTaxRate(r)}>
                {r}%
              </PillButton>
            ))}
          </div>

          <MiniRow label="Net Payout" right={`${fmtFlower(net)} FL (${fmtUsd(netUsd)})`} />

          {expanded && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", marginTop: "6px" }}>
              {tiers.map((t) => {
                const tNet = gross * (1 - t / 100);
                return <MiniRow key={t} label={`${t}% Tax`} right={`${fmtFlower(tNet)} FL`} />;
              })}
            </div>
          )}
        </div>
      );
    }
  }

  // ── WORKSPACE ────────────────────────────────────────────────────────────
  if (tab === "workspace") {
    if (slot === "01") {
      const crops = market.resources.filter((r) => r.category.toLowerCase().includes("crop"));
      return (
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "340px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? crops : crops.slice(0, 4)).map((c) => (
            <MiniRow key={c.name} label={c.name} right={formatValue(c.priceFlower, c.priceUsd, prefs.currency)} />
          ))}
        </div>
      );
    }

    if (slot === "02") {
      const fruits = market.resources.filter(
        (r) => r.category.toLowerCase().includes("fruit") || r.category.toLowerCase().includes("forage")
      );
      return (
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "340px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? fruits : fruits.slice(0, 4)).map((c) => (
            <MiniRow key={c.name} label={c.name} sub={expanded ? c.category : undefined} right={formatValue(c.priceFlower, c.priceUsd, prefs.currency)} />
          ))}
        </div>
      );
    }

    if (slot === "03") {
      const matches = market.resources.filter((r) =>
        r.name.toLowerCase().includes(query.trim().toLowerCase())
      );
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <SearchInput value={query} onChange={setQuery} placeholder="Find resource price..." />
          <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "280px" : undefined, overflowY: expanded ? "auto" : undefined }}>
            {(expanded ? matches : matches.slice(0, 3)).map((r) => (
              <MiniRow key={r.name} label={r.name} right={formatValue(r.priceFlower, r.priceUsd, prefs.currency)} />
            ))}
          </div>
        </div>
      );
    }

    if (slot === "04") {
      const resItem = resourceMap.get(selectedResource.toLowerCase()) || market.resources[0];
      const qty = parseFloat(bulkQty) || 0;
      const gross = qty * (resItem?.priceFlower || 0);
      const net = gross * (1 - prefs.defaultTax / 100);

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              style={{
                flex: 1,
                padding: "7px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--card-inner)",
                color: "var(--text)",
                fontSize: "0.8rem",
                fontFamily: "inherit",
              }}
            >
              {market.resources.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={bulkQty}
              onChange={(e) => setBulkQty(e.target.value)}
              style={{
                width: "110px",
                padding: "7px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--card-inner)",
                color: "var(--text)",
                fontSize: "0.8rem",
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
          </div>
          <MiniRow label="Gross Value" right={`${fmtFlower(gross)} FL`} />
          <MiniRow label={`Net (${prefs.defaultTax}% Tax)`} right={`${fmtFlower(net)} FL (${fmtUsd(net * market.flowerPriceUsd)})`} />
        </div>
      );
    }

    if (slot === "05") {
      const endpoints = [
        { label: "Resource Prices API", path: "/api/resource-prices?format=flat" },
        { label: "Collectible Prices API", path: "/api/collectible-prices?tradeable=true&format=flat" },
        { label: "Boosted Collectibles API", path: "/api/collectible-prices?boosts=true&tradeable=true&format=array" },
      ];
      return (
        <div style={{ display: "grid", gap: "8px" }}>
          {endpoints.map((ep) => (
            <div
              key={ep.path}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                padding: "7px 10px",
                borderRadius: "8px",
                background: "var(--card-inner)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>{ep.label}</div>
                <div className="mono" style={{ fontSize: "0.68rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ep.path}
                </div>
              </div>
              <PillButton active={copiedUrl === ep.path} onClick={() => copyEndpoint(ep.path)}>
                {copiedUrl === ep.path ? <Check size={12} /> : <Copy size={12} />}
              </PillButton>
            </div>
          ))}
        </div>
      );
    }
  }

  // ── LIBRARY ──────────────────────────────────────────────────────────────
  if (tab === "library") {
    if (slot === "01") {
      return (
        <div style={{ display: "grid", gap: "7px", maxHeight: expanded ? "340px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? boostedCollectibles : boostedCollectibles.slice(0, 4)).map((c) => (
            <MiniRow
              key={`${c.collection}-${c.id}`}
              label={c.name}
              sub={c.boost?.split("\n")[0] || undefined}
              image={c.image}
              right={formatValue(c.priceFlower, c.priceUsd, prefs.currency)}
            />
          ))}
        </div>
      );
    }

    if (slot === "02") {
      return (
        <div style={{ display: "grid", gap: "7px", maxHeight: expanded ? "340px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? market.wearables : market.wearables.slice(0, 4)).map((w) => (
            <MiniRow
              key={`${w.collection}-${w.id}`}
              label={w.name}
              sub={w.boost?.split("\n")[0] || "Wearable"}
              image={w.image}
              right={formatValue(w.priceFlower, w.priceUsd, prefs.currency)}
            />
          ))}
        </div>
      );
    }

    if (slot === "03") {
      return (
        <div style={{ display: "grid", gap: "7px", maxHeight: expanded ? "340px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? sortedByPrice.slice(0, 40) : sortedByPrice.slice(0, 4)).map((c) => (
            <MiniRow
              key={`${c.collection}-${c.id}`}
              label={c.name}
              sub={c.boost?.split("\n")[0] || "Collectible"}
              image={c.image}
              right={formatValue(c.priceFlower, c.priceUsd, prefs.currency)}
            />
          ))}
        </div>
      );
    }

    if (slot === "04") {
      const matches = market.collectibles.filter((c) =>
        c.name.toLowerCase().includes(query.trim().toLowerCase())
      );
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <SearchInput value={query} onChange={setQuery} placeholder="Search 579+ tradeable collectibles..." />
          <div style={{ display: "grid", gap: "7px", maxHeight: expanded ? "280px" : undefined, overflowY: expanded ? "auto" : undefined }}>
            {(expanded ? matches.slice(0, 50) : matches.slice(0, 3)).map((c) => (
              <MiniRow
                key={`${c.collection}-${c.id}`}
                label={c.name}
                sub={c.boost?.split("\n")[0] || undefined}
                image={c.image}
                right={formatValue(c.priceFlower, c.priceUsd, prefs.currency)}
              />
            ))}
          </div>
        </div>
      );
    }
  }

  // ── SETTINGS ─────────────────────────────────────────────────────────────
  if (tab === "settings") {
    if (slot === "01") {
      return (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <PillButton active={theme === "light"} onClick={() => theme !== "light" && onToggleTheme()}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Sun size={13} /> Sunset Light
              </span>
            </PillButton>
            <PillButton active={theme === "dark"} onClick={() => theme !== "dark" && onToggleTheme()}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Moon size={13} /> Cyber Neon
              </span>
            </PillButton>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Coins size={14} style={{ color: "var(--muted)" }} />
            {(["flower", "usd", "both"] as CurrencyMode[]).map((curr) => (
              <PillButton
                key={curr}
                active={prefs.currency === curr}
                onClick={() => onUpdatePrefs({ currency: curr })}
              >
                {curr.toUpperCase()}
              </PillButton>
            ))}
          </div>
        </div>
      );
    }

    if (slot === "02") {
      return (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "var(--muted)" }}>
            <Calculator size={14} /> Default Marketplace Tax Rate
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {[7.5, 10, 15].map((r) => (
              <PillButton key={r} active={prefs.defaultTax === r} onClick={() => onUpdatePrefs({ defaultTax: r })}>
                {r}%
              </PillButton>
            ))}
          </div>
        </div>
      );
    }

    if (slot === "03") {
      return (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: "var(--muted)" }}>
            <Sparkles size={14} />
            <span className="mono">1-4: Tabs • ESC: Close • ←/→: Cycle</span>
          </div>
          <PillButton active={market.loading} onClick={() => void market.refresh(true)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <RefreshCw size={13} /> {market.loading ? "Refreshing..." : "Refresh Live Prices"}
            </span>
          </PillButton>
        </div>
      );
    }
  }

  return null;
};
