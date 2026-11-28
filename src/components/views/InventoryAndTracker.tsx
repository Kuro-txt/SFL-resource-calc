import React, { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ResourceItem } from "../../hooks/useMarketData";
import { fmtFlower, fmtUsd, formatValue, MiniRow, PillButton, SearchInput } from "./SharedUi";
import { TabRenderProps } from "./SettingsAndDashboard";

function normKey(s: string): string {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export const InventoryTabView: React.FC<TabRenderProps> = ({
  slot,
  market,
  dashboard,
  farm,
  prefs,
  expanded = false,
}) => {
  const [query, setQuery] = useState("");
  const userTaxDecimal = prefs.defaultTax / 100;

  const resourceRows = useMemo(() => {
    const invNorm = new Map<string, number>();
    Object.entries(farm.inventory).forEach(([k, v]) => invNorm.set(normKey(k), v));

    return market.resources
      .map((r) => {
        const qty = invNorm.get(normKey(r.name)) || 0;
        const gross = qty * r.priceFlower;
        const net = gross * (1 - userTaxDecimal);
        return { ...r, qty, gross, net, netUsd: net * market.flowerPriceUsd };
      })
      .filter((r) => r.qty > 0)
      .sort((a, b) => b.net - a.net);
  }, [farm.inventory, market.resources, market.flowerPriceUsd, userTaxDecimal]);

  const ownedBoosts = useMemo(() => {
    const invNorm = new Map<string, number>();
    Object.entries(farm.inventory).forEach(([k, v]) => invNorm.set(normKey(k), (invNorm.get(normKey(k)) || 0) + v));
    Object.entries(farm.wardrobe).forEach(([k, v]) => invNorm.set(normKey(k), (invNorm.get(normKey(k)) || 0) + v));

    const allBoosts = [...market.collectibles, ...market.wearables].filter((i) => Boolean(i.boost));
    return allBoosts
      .map((item) => {
        const qty = invNorm.get(normKey(item.name)) || 0;
        const floor = item.priceFlower || 0;
        const net = qty * floor * 0.9; // Fixed 10% tax on boosts matching inventoryLogic.js
        return { ...item, qty, net, netUsd: net * market.flowerPriceUsd };
      })
      .filter((i) => i.qty > 0)
      .sort((a, b) => b.net - a.net);
  }, [farm.inventory, farm.wardrobe, market.collectibles, market.wearables, market.flowerPriceUsd]);

  const totalResourceNet = useMemo(() => resourceRows.reduce((s, r) => s + r.net, 0), [resourceRows]);
  const totalBoostsNet = useMemo(() => ownedBoosts.reduce((s, b) => s + b.net, 0), [ownedBoosts]);

  if (Object.keys(farm.inventory).length === 0 && Object.keys(farm.wardrobe).length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
          {dashboard.farmId
            ? `Sync Farm #${dashboard.farmId} to load your live inventory & boosts.`
            : "Enter your Farm ID on Dashboard first, then sync live farm data."}
        </div>
        {dashboard.farmId && (
          <PillButton active={farm.syncing} onClick={() => void farm.syncFarm(dashboard.farmId, prefs.customApiKey)}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <RefreshCw size={12} /> {farm.syncing ? "Syncing Farm..." : "Sync Live Farm"}
            </span>
          </PillButton>
        )}
      </div>
    );
  }

  if (slot === "01") {
    const shown = query ? resourceRows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())) : resourceRows;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span className="mono" style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent)" }}>
            {fmtFlower(totalResourceNet)} FL ({fmtUsd(totalResourceNet * market.flowerPriceUsd)})
          </span>
          <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
            Net after {prefs.defaultTax}% tax
          </span>
        </div>
        {expanded && <SearchInput value={query} onChange={setQuery} placeholder="Filter owned resources..." />}
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "290px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? shown : shown.slice(0, 4)).map((r) => (
            <MiniRow
              key={r.name}
              label={`${r.name} (×${Math.round(r.qty).toLocaleString()})`}
              sub={expanded ? r.category : undefined}
              right={formatValue(r.net, r.netUsd, prefs.currency)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (slot === "02") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span className="mono" style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent)" }}>
            {fmtFlower(totalBoostsNet)} FL ({fmtUsd(totalBoostsNet * market.flowerPriceUsd)})
          </span>
          <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
            {ownedBoosts.length} owned • 10% tax
          </span>
        </div>
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "310px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? ownedBoosts : ownedBoosts.slice(0, 3)).map((b) => (
            <MiniRow
              key={`${b.collection}-${b.id}`}
              label={`${b.name}${b.qty > 1 ? ` ×${b.qty}` : ""}`}
              sub={b.boost?.split("\n")[0] || undefined}
              image={b.image}
              right={formatValue(b.net, b.netUsd, prefs.currency)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (slot === "03") {
    const crops = resourceRows.filter(
      (r) => r.category.toLowerCase().includes("crop") || r.category.toLowerCase().includes("fruit")
    );
    return (
      <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "340px" : undefined, overflowY: expanded ? "auto" : undefined }}>
        {(expanded ? crops : crops.slice(0, 4)).map((r) => (
          <MiniRow key={r.name} label={`${r.name} (×${Math.round(r.qty).toLocaleString()})`} right={formatValue(r.net, r.netUsd, prefs.currency)} />
        ))}
      </div>
    );
  }

  if (slot === "04") {
    const others = resourceRows.filter(
      (r) => !r.category.toLowerCase().includes("crop") && !r.category.toLowerCase().includes("fruit")
    );
    return (
      <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "340px" : undefined, overflowY: expanded ? "auto" : undefined }}>
        {(expanded ? others : others.slice(0, 4)).map((r) => (
          <MiniRow key={r.name} label={`${r.name} (×${Math.round(r.qty).toLocaleString()})`} sub={expanded ? r.category : undefined} right={formatValue(r.net, r.netUsd, prefs.currency)} />
        ))}
      </div>
    );
  }

  return null;
};

export const TrackerTabView: React.FC<TabRenderProps> = ({
  slot,
  market,
  dashboard,
  farm,
  prefs,
  expanded = false,
}) => {
  const [selectedName, setSelectedName] = useState("Sunflower");
  const [calcQty, setCalcQty] = useState("1000");

  const resourceMap = useMemo(() => {
    const m = new Map<string, ResourceItem>();
    market.resources.forEach((r) => m.set(r.name.toLowerCase(), r));
    return m;
  }, [market.resources]);

  if (slot === "01") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.74rem", color: "var(--muted)" }}>
          <span className="mono">{dashboard.rows.length} daily snapshots loaded</span>
          <PillButton active={dashboard.loading} onClick={() => void dashboard.refreshFarm()}>
            <RefreshCw size={12} />
          </PillButton>
        </div>
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "320px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {dashboard.rows.length === 0 ? (
            <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>No yield snapshots found yet.</div>
          ) : (
            (expanded ? dashboard.rows : dashboard.rows.slice(0, 5)).map((r) => {
              const dayFl = r.crops.reduce((s, c) => s + (c.flowers || 0), 0);
              return (
                <MiniRow
                  key={r.date}
                  label={r.date}
                  sub={`${r.crops.length} resources • ${Math.round(r.totalCount).toLocaleString()} units`}
                  right={`+${fmtFlower(dayFl)} FL (${fmtUsd(dayFl * market.flowerPriceUsd)})`}
                />
              );
            })
          )}
        </div>
      </div>
    );
  }

  if (slot === "02") {
    const item = resourceMap.get(selectedName.toLowerCase()) || market.resources[0];
    const qty = parseFloat(calcQty) || 0;
    const gross = qty * (item?.priceFlower || 0);
    const net = gross * (1 - prefs.defaultTax / 100);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <select
          value={selectedName}
          onChange={(e) => setSelectedName(e.target.value)}
          style={{
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
              {r.name} ({fmtFlower(r.priceFlower)} FL)
            </option>
          ))}
        </select>
        <input
          type="number"
          value={calcQty}
          onChange={(e) => setCalcQty(e.target.value)}
          style={{
            padding: "7px 10px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            background: "var(--card-inner)",
            color: "var(--text)",
            fontSize: "0.82rem",
            fontFamily: "JetBrains Mono, monospace",
          }}
        />
        <MiniRow label="Gross" right={`${fmtFlower(gross)} FL`} />
        <MiniRow label={`Net (${prefs.defaultTax}% Tax)`} right={`${fmtFlower(net)} FL (${fmtUsd(net * market.flowerPriceUsd)})`} />
      </div>
    );
  }

  if (slot === "03") {
    const latest = farm.baselines[0];
    if (!latest) {
      return (
        <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          No 00:00 UTC baseline snapshot found for Farm #{dashboard.farmId || "—"}.
        </div>
      );
    }
    const deltas = Object.entries(latest.stock || {})
      .map(([name, baseRaw]) => {
        const baseVal = parseFloat(String(baseRaw)) || 0;
        const liveVal = farm.inventory[name] || 0;
        return { name, baseVal, liveVal, diff: liveVal - baseVal };
      })
      .filter((d) => Math.abs(d.diff) > 0.01)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div className="mono" style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
          Baseline Date: {latest.snapshot_date} • {deltas.length} changes vs live
        </div>
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "300px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? deltas : deltas.slice(0, 3)).map((d) => (
            <MiniRow
              key={d.name}
              label={d.name}
              sub={expanded ? `${d.baseVal} → ${d.liveVal}` : undefined}
              right={`${d.diff > 0 ? "+" : ""}${Math.round(d.diff).toLocaleString()}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (slot === "04") {
    const rollups = [...farm.weeklyRollups.slice(0, 4), ...farm.monthlyRollups.slice(0, 4)];
    return (
      <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "320px" : undefined, overflowY: expanded ? "auto" : undefined }}>
        {rollups.length === 0 ? (
          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>No weekly or monthly rollups archived yet.</div>
        ) : (
          (expanded ? rollups : rollups.slice(0, 4)).map((r, idx) => (
            <MiniRow
              key={`${r.week_start || r.month_start || idx}`}
              label={r.week_start ? `Week ${r.week_start}` : `Month ${r.month_start}`}
              sub={`${Math.round(Number(r.total_count || 0)).toLocaleString()} items`}
              right={`${fmtFlower(Number(r.net_flowers || 0))} FL`}
            />
          ))
        )}
      </div>
    );
  }

  return null;
};
