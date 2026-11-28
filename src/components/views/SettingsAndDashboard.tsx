import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Coins,
  Calculator,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Scale,
  Eye,
  EyeOff,
  LogOut,
  Gem,
  KeyRound,
} from "lucide-react";
import { MarketDataState, ResourceItem } from "../../hooks/useMarketData";
import { TimeRange, useDashboardData } from "../../hooks/useDashboardData";
import { FarmDataState } from "../../hooks/useFarmData";
import { AppPreferences, CoinRatioMode, CurrencyMode, fmtFlower, fmtUsd, formatValue, MiniRow, PillButton } from "./SharedUi";

export interface TabRenderProps {
  slot: string;
  market: MarketDataState;
  dashboard: ReturnType<typeof useDashboardData>;
  farm: FarmDataState;
  prefs: AppPreferences;
  onUpdatePrefs: (patch: Partial<AppPreferences>) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  userEmail?: string | null;
  onSignOut?: () => void;
  expanded?: boolean;
}

export const DashboardTabView: React.FC<TabRenderProps> = ({
  slot,
  market,
  dashboard,
  farm,
  prefs,
  expanded = false,
}) => {
  const [farmInput, setFarmInput] = useState(dashboard.farmId);
  const [taxInput, setTaxInput] = useState("100");
  const [taxRate, setTaxRate] = useState(prefs.defaultTax);

  useEffect(() => {
    setFarmInput(dashboard.farmId);
  }, [dashboard.farmId]);

  useEffect(() => {
    setTaxRate(prefs.defaultTax);
  }, [prefs.defaultTax]);

  const resourceMap = useMemo(() => {
    const m = new Map<string, ResourceItem>();
    market.resources.forEach((r) => m.set(r.name.toLowerCase(), r));
    return m;
  }, [market.resources]);

  const spotlight = useMemo(() => {
    const boosted = market.collectibles.filter((c) => Boolean(c.boost) && (c.priceFlower ?? 0) > 0);
    return boosted.find((c) => c.name === "Scarecrow") || boosted[0] || market.collectibles[0] || null;
  }, [market.collectibles]);

  const handleLoadAndSync = (id: string) => {
    dashboard.setFarmId(id);
    if (id.trim()) {
      void farm.syncFarm(id, prefs.customApiKey);
    }
  };

  if (slot === "01") {
    const { earnedFlowers, earnedQty, spentFlowers, spentQty, netFlowers, earnedItems, spentItems, rangeLabel } =
      dashboard.summary;
    const isPositive = netFlowers >= 0;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLoadAndSync(farmInput);
            }}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <input
              type="text"
              value={farmInput}
              onChange={(e) => setFarmInput(e.target.value)}
              placeholder="Enter Farm ID..."
              style={{
                width: "120px",
                padding: "5px 9px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--card-inner)",
                color: "var(--text)",
                fontSize: "0.76rem",
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
            <PillButton active={Boolean(dashboard.farmId)} onClick={() => handleLoadAndSync(farmInput)}>
              {dashboard.loading || farm.syncing ? "Syncing..." : "Load"}
            </PillButton>
            {dashboard.farmId && (
              <PillButton
                onClick={() => {
                  void dashboard.refreshFarm();
                  void farm.syncFarm(dashboard.farmId, prefs.customApiKey);
                }}
              >
                <RefreshCw size={12} />
              </PillButton>
            )}
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            {(["day", "week", "month"] as TimeRange[]).map((tr) => (
              <PillButton key={tr} active={dashboard.timeRange === tr} onClick={() => dashboard.setTimeRange(tr)}>
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

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--muted)" }}>
          <span className="mono">{rangeLabel}</span>
          {dashboard.farmId ? (
            <span className="mono">Farm #{dashboard.farmId}</span>
          ) : (
            <span>Enter a Farm ID to load Earned, Spent & Net</span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
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
                  <MiniRow key={`earned-${it.name}`} label={`${it.name} (×${Math.round(it.qty).toLocaleString()})`} right={`+${fmtFlower(it.flowers)} FL`} />
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
                  <MiniRow key={`spent-${it.name}`} label={`${it.name} (×${Math.round(it.qty).toLocaleString()})`} right={`-${fmtFlower(it.flowers)} FL`} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (slot === "02") {
    const keyNames = ["Sunflower", "Wood", "Stone", "Gold"];
    const items = expanded
      ? market.resources
      : keyNames.map((n) => resourceMap.get(n.toLowerCase())).filter((x): x is ResourceItem => Boolean(x));

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span className="mono" style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent)" }}>
            ${market.flowerPriceUsd.toFixed(4)}
          </span>
          <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
            {farm.balance > 0 ? `Bal: ${fmtFlower(farm.balance)} FL` : "FLOWER / USD"}
          </span>
        </div>
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "300px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {items.map((item) => (
            <MiniRow key={item.name} label={item.name} right={formatValue(item.priceFlower, item.priceUsd, prefs.currency)} />
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
            <MiniRow key={item.name} label={`${item.name} (×${Math.round(item.qty).toLocaleString()})`} right={`+${fmtFlower(item.flowers)} FL`} />
          ))}
        </div>
      );
    }

    return spotlight ? (
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img src={spotlight.image} alt={spotlight.name} style={{ width: "52px", height: "52px", objectFit: "contain", imageRendering: "pixelated", flexShrink: 0 }} />
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
            <MiniRow key={item.name} label={`${item.name} (×${Math.round(item.qty).toLocaleString()})`} right={`-${fmtFlower(item.flowers)} FL`} />
          ))}
        </div>
      );
    }

    const minerals = market.resources.filter((r) => r.category.toLowerCase().includes("mineral"));
    return (
      <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "340px" : undefined, overflowY: expanded ? "auto" : undefined }}>
        {(expanded ? minerals : minerals.slice(0, 3)).map((item) => (
          <MiniRow key={item.name} label={item.name} right={formatValue(item.priceFlower, item.priceUsd, prefs.currency)} />
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
            {tiers.map((t) => (
              <MiniRow key={t} label={`${t}% Tax`} right={`${fmtFlower(gross * (1 - t / 100))} FL`} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export const SettingsTabView: React.FC<TabRenderProps> = ({
  slot,
  market,
  dashboard,
  farm,
  prefs,
  onUpdatePrefs,
  theme,
  onToggleTheme,
  userEmail,
  onSignOut,
}) => {
  const [hideUser, setHideUser] = useState(() => localStorage.getItem("sfl_hide_username") === "true");
  const packKeys = Object.keys(market.gemPacks).sort((a, b) => Number(a) - Number(b));

  const effectiveGemRate = useMemo(() => {
    if (prefs.gemPack === "free") return 0;
    const pack = market.gemPacks[prefs.gemPack] || market.gemPacks["100"];
    if (!pack) return 0;
    return Number(pack.sfl1 || 0) * (prefs.gemDiscount ? 0.8 : 1);
  }, [market.gemPacks, prefs.gemPack, prefs.gemDiscount]);

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

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Coins size={14} style={{ color: "var(--muted)" }} />
          {(["flower", "usd", "both"] as CurrencyMode[]).map((curr) => (
            <PillButton key={curr} active={prefs.currency === curr} onClick={() => onUpdatePrefs({ currency: curr })}>
              {curr.toUpperCase()}
            </PillButton>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <KeyRound size={13} style={{ color: "var(--muted)" }} />
          <input
            type="password"
            value={prefs.customApiKey}
            onChange={(e) => onUpdatePrefs({ customApiKey: e.target.value })}
            placeholder="Optional SFL API Key..."
            style={{
              width: "180px",
              padding: "5px 9px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--card-inner)",
              color: "var(--text)",
              fontSize: "0.76rem",
              fontFamily: "JetBrains Mono, monospace",
            }}
          />
        </div>
      </div>
    );
  }

  if (slot === "02") {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        {/* Tax Rate */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Calculator size={14} style={{ color: "var(--muted)" }} />
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Tax</span>
          <select
            value={String(prefs.defaultTax)}
            onChange={(e) => onUpdatePrefs({ defaultTax: parseFloat(e.target.value) })}
            style={{
              padding: "5px 8px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--card-inner)",
              color: "var(--text)",
              fontSize: "0.76rem",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {[0, 5, 7.5, 10, 15, 20, 25, 30, 50].map((r) => (
              <option key={r} value={r}>
                {r}%
              </option>
            ))}
          </select>
        </div>

        {/* Coin : Flower Ratio */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Coins size={14} style={{ color: "var(--muted)" }} />
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Coin Ratio</span>
          <select
            value={prefs.coinRatioMode}
            onChange={(e) => {
              const mode = e.target.value as CoinRatioMode;
              if (mode === "free") {
                onUpdatePrefs({ coinRatioMode: "free", coinFlowerRatio: 0 });
              } else if (mode === "1000" || mode === "1500") {
                onUpdatePrefs({ coinRatioMode: mode, coinFlowerRatio: Number(mode) });
              } else {
                onUpdatePrefs({
                  coinRatioMode: "custom",
                  coinFlowerRatio: prefs.coinFlowerRatio > 0 ? prefs.coinFlowerRatio : 1000,
                });
              }
            }}
            style={{
              padding: "5px 8px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--card-inner)",
              color: "var(--text)",
              fontSize: "0.76rem",
              fontFamily: "inherit",
            }}
          >
            <option value="1000">1,000 : 1 FL</option>
            <option value="1500">1,500 : 1 FL</option>
            <option value="free">Free Coins</option>
            <option value="custom">Custom...</option>
          </select>

          {prefs.coinRatioMode === "custom" && (
            <input
              type="number"
              min={1}
              step={50}
              value={prefs.coinFlowerRatio || 1000}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!Number.isNaN(v) && v > 0) onUpdatePrefs({ coinFlowerRatio: v });
              }}
              style={{
                width: "82px",
                padding: "5px 8px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--card-inner)",
                color: "var(--text)",
                fontSize: "0.76rem",
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
          )}
        </div>

        {/* Gem Pack + 20% Discount */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Gem size={14} style={{ color: "var(--muted)" }} />
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Gem Pack</span>
          <select
            value={prefs.gemPack}
            onChange={(e) => onUpdatePrefs({ gemPack: e.target.value })}
            style={{
              padding: "5px 8px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--card-inner)",
              color: "var(--text)",
              fontSize: "0.76rem",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            <option value="free">Free Gems (0 FL)</option>
            {packKeys.map((k) => {
              const p = market.gemPacks[k];
              const rate = Number(p.sfl1 || 0) * (prefs.gemDiscount ? 0.8 : 1);
              return (
                <option key={k} value={k}>
                  {Number(k).toLocaleString()} Gems ({rate.toFixed(4)} FL/ea)
                </option>
              );
            })}
          </select>

          <PillButton active={prefs.gemDiscount} onClick={() => onUpdatePrefs({ gemDiscount: !prefs.gemDiscount })}>
            -20% {prefs.gemDiscount ? "ON" : "OFF"}
          </PillButton>

          <span className="mono" style={{ fontSize: "0.72rem", color: "var(--accent)" }}>
            {effectiveGemRate.toFixed(4)} FL/gem
          </span>
        </div>
      </div>
    );
  }

  if (slot === "03") {
    const toggleHideUser = () => {
      const next = !hideUser;
      setHideUser(next);
      localStorage.setItem("sfl_hide_username", next ? "true" : "false");
    };

    return (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: "var(--muted)" }}>
          <span className="mono" style={{ color: "var(--text)", fontWeight: 600 }}>
            {userEmail ? (hideUser ? "••••••••" : userEmail) : "Guest"}
          </span>
          {userEmail && (
            <PillButton onClick={toggleHideUser}>{hideUser ? <Eye size={12} /> : <EyeOff size={12} />}</PillButton>
          )}
          <span className="mono">• 1-7: Tabs • ESC: Close</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <PillButton
            active={market.loading || dashboard.loading || farm.syncing}
            onClick={() => {
              void market.refresh(true);
              void dashboard.refreshFarm();
              if (dashboard.farmId) void farm.syncFarm(dashboard.farmId, prefs.customApiKey);
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <RefreshCw size={13} /> {market.loading || dashboard.loading || farm.syncing ? "Syncing..." : "Sync All Data"}
            </span>
          </PillButton>
          {onSignOut && (
            <PillButton onClick={onSignOut}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <LogOut size={13} /> Sign Out
              </span>
            </PillButton>
          )}
        </div>
      </div>
    );
  }

  return null;
};
