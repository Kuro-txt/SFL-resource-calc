import React, { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { NPC_CATALOG } from "../../panels/npc/npcData.js";
import { PET_SPECIES } from "../../panels/pets/petsData.js";
import { fmtFlower, fmtUsd, formatValue, MiniRow, PillButton, SearchInput } from "./SharedUi";
import { TabRenderProps } from "./SettingsAndDashboard";

export const TradesTabView: React.FC<TabRenderProps> = ({
  slot,
  market,
  dashboard,
  farm,
  prefs,
  expanded = false,
}) => {
  const [query, setQuery] = useState("");

  const parsedTrades = useMemo(() => {
    return farm.trades.map((t, idx) => {
      const initId = typeof t.initiatedBy === "object" && t.initiatedBy !== null ? t.initiatedBy.id : t.initiatedBy;
      const isSold = t.tradeType === "sold" || (dashboard.farmId && String(initId || "") === String(dashboard.farmId));
      const name = String(t.itemName || t.name || t.item || "Item");
      const qty = Number(t.quantity || 1);
      const fl = Number(t.sfl || 0);
      const usd = t.usd ? Number(t.usd) : fl * market.flowerPriceUsd;
      const dateStr = t.fulfilledAt ? new Date(t.fulfilledAt).toLocaleDateString() : "";
      return { id: t.id || String(idx), name, qty, fl, usd, isSold, dateStr };
    });
  }, [farm.trades, dashboard.farmId, market.flowerPriceUsd]);

  const soldTrades = useMemo(() => parsedTrades.filter((t) => t.isSold), [parsedTrades]);
  const boughtTrades = useMemo(() => parsedTrades.filter((t) => !t.isSold), [parsedTrades]);
  const totalSoldFl = useMemo(() => soldTrades.reduce((s, t) => s + t.fl, 0), [soldTrades]);
  const totalBoughtFl = useMemo(() => boughtTrades.reduce((s, t) => s + t.fl, 0), [boughtTrades]);

  if (slot === "01") {
    const filtered = query
      ? parsedTrades.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
      : parsedTrades;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <SearchInput value={query} onChange={setQuery} placeholder="Filter trade history by item..." />
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "310px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {filtered.length === 0 ? (
            <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              No trades loaded for Farm #{dashboard.farmId || "—"}.
            </div>
          ) : (
            (expanded ? filtered.slice(0, 80) : filtered.slice(0, 4)).map((t) => (
              <MiniRow
                key={t.id}
                label={`${t.isSold ? "SOLD" : "BOUGHT"} • ${t.name} (×${t.qty})`}
                sub={t.dateStr || undefined}
                right={`${t.isSold ? "+" : "-"}${formatValue(t.fl, t.usd, prefs.currency)}`}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  if (slot === "02") {
    const net = totalSoldFl - totalBoughtFl;
    return (
      <div style={{ display: "grid", gap: "8px" }}>
        <MiniRow label="Total Trades" right={String(parsedTrades.length)} />
        <MiniRow label="Sold Volume" right={`+${fmtFlower(totalSoldFl)} FL`} />
        <MiniRow label="Bought Volume" right={`-${fmtFlower(totalBoughtFl)} FL`} />
        <MiniRow label="Net Trade Flow" right={`${net >= 0 ? "+" : ""}${fmtFlower(net)} FL`} />
      </div>
    );
  }

  if (slot === "03") {
    return (
      <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "330px" : undefined, overflowY: expanded ? "auto" : undefined }}>
        {(expanded ? soldTrades.slice(0, 50) : soldTrades.slice(0, 4)).map((t) => (
          <MiniRow key={t.id} label={`${t.name} (×${t.qty})`} sub={t.dateStr || undefined} right={`+${formatValue(t.fl, t.usd, prefs.currency)}`} />
        ))}
      </div>
    );
  }

  if (slot === "04") {
    return (
      <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "330px" : undefined, overflowY: expanded ? "auto" : undefined }}>
        {(expanded ? boughtTrades.slice(0, 50) : boughtTrades.slice(0, 4)).map((t) => (
          <MiniRow key={t.id} label={`${t.name} (×${t.qty})`} sub={t.dateStr || undefined} right={`-${formatValue(t.fl, t.usd, prefs.currency)}`} />
        ))}
      </div>
    );
  }

  return null;
};

export const MarketTabView: React.FC<TabRenderProps> = ({
  slot,
  market,
  farm,
  prefs,
  expanded = false,
}) => {
  const [query, setQuery] = useState("");
  const boostedCollectibles = useMemo(
    () => market.collectibles.filter((c) => Boolean(c.boost) && (c.priceFlower ?? 0) > 0),
    [market.collectibles]
  );

  if (slot === "01") {
    const matches = query
      ? boostedCollectibles.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
      : boostedCollectibles;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {expanded && <SearchInput value={query} onChange={setQuery} placeholder="Search boosted collectibles..." />}
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "300px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? matches : matches.slice(0, 4)).map((c) => {
            const starred = farm.wishlist.includes(c.name);
            return (
              <MiniRow
                key={`${c.collection}-${c.id}`}
                label={c.name}
                sub={c.boost?.split("\n")[0] || undefined}
                image={c.image}
                right={formatValue(c.priceFlower, c.priceUsd, prefs.currency)}
                action={
                  <PillButton active={starred} onClick={() => farm.toggleWishlist(c.name)}>
                    <Star size={11} />
                  </PillButton>
                }
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (slot === "02") {
    const matches = query
      ? market.resources.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
      : market.resources;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search resource market..." />
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "290px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? matches : matches.slice(0, 3)).map((r) => (
            <MiniRow key={r.name} label={r.name} sub={expanded ? r.category : undefined} right={formatValue(r.priceFlower, r.priceUsd, prefs.currency)} />
          ))}
        </div>
      </div>
    );
  }

  if (slot === "03") {
    const allMarketItems = [...market.collectibles, ...market.wearables];
    const trackedItems = farm.wishlist
      .map((name) => allMarketItems.find((i) => i.name === name))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const totalGoalFl = trackedItems.reduce((s, i) => s + (i.priceFlower || 0), 0);
    const pct = totalGoalFl > 0 ? Math.min(100, (farm.balance / totalGoalFl) * 100) : 0;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span className="mono" style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--accent)" }}>
            Goal: {fmtFlower(totalGoalFl)} FL ({fmtUsd(totalGoalFl * market.flowerPriceUsd)})
          </span>
          <span className="mono" style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
            {pct.toFixed(0)}% funded
          </span>
        </div>
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "290px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {trackedItems.length === 0 ? (
            <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              Click ★ on any Collectible or Wearable to track it in your Wishlist.
            </div>
          ) : (
            (expanded ? trackedItems : trackedItems.slice(0, 3)).map((item) => (
              <MiniRow
                key={`wish-${item.collection}-${item.id}`}
                label={item.name}
                image={item.image}
                right={formatValue(item.priceFlower, item.priceUsd, prefs.currency)}
                action={
                  <PillButton active onClick={() => farm.toggleWishlist(item.name)}>
                    <Star size={11} />
                  </PillButton>
                }
              />
            ))
          )}
        </div>
      </div>
    );
  }

  if (slot === "04") {
    const matches = query
      ? market.wearables.filter((w) => w.name.toLowerCase().includes(query.toLowerCase()))
      : market.wearables;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {expanded && <SearchInput value={query} onChange={setQuery} placeholder="Search wearables..." />}
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "300px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? matches : matches.slice(0, 4)).map((w) => {
            const starred = farm.wishlist.includes(w.name);
            return (
              <MiniRow
                key={`${w.collection}-${w.id}`}
                label={w.name}
                sub={w.boost?.split("\n")[0] || "Wearable"}
                image={w.image}
                right={formatValue(w.priceFlower, w.priceUsd, prefs.currency)}
                action={
                  <PillButton active={starred} onClick={() => farm.toggleWishlist(w.name)}>
                    <Star size={11} />
                  </PillButton>
                }
              />
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

export const PetsAndNpcTabView: React.FC<TabRenderProps> = ({ slot, farm, expanded = false }) => {
  const [query, setQuery] = useState("");

  if (slot === "01") {
    const ownedEntries = Object.entries(farm.rawPets || {}).map(([name, val]) => {
      const info = PET_SPECIES[name];
      const petObj = (val && typeof val === "object" ? val : {}) as { level?: number; experience?: number };
      return {
        name,
        category: info?.category || "Pet",
        level: petObj.level ?? 1,
        aura: info?.aura || info?.fetch?.join(", ") || "",
      };
    });

    return (
      <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "340px" : undefined, overflowY: expanded ? "auto" : undefined }}>
        {ownedEntries.length === 0 ? (
          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            Sync your Farm on Dashboard to inspect active Pets & XP levels.
          </div>
        ) : (
          (expanded ? ownedEntries : ownedEntries.slice(0, 5)).map((p) => (
            <MiniRow key={p.name} label={p.name} sub={p.aura || p.category} right={`Lv.${p.level}`} />
          ))
        )}
      </div>
    );
  }

  if (slot === "02") {
    const matches = query
      ? NPC_CATALOG.filter((n) => n.name.toLowerCase().includes(query.toLowerCase()))
      : NPC_CATALOG;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {expanded && <SearchInput value={query} onChange={setQuery} placeholder="Search NPCs..." />}
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "300px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? matches : matches.slice(0, 5)).map((npc) => {
            const pts = farm.npcs?.[npc.id]?.friendship?.points || 0;
            const nextMilestone = npc.milestones.find((m) => m.pts > pts);
            const fav = npc.favorites?.[0];
            return (
              <MiniRow
                key={npc.id}
                label={`${npc.icon} ${npc.name}`}
                sub={fav ? `Fav: ${fav.name} (+${fav.pts} pts) • ${npc.location}` : npc.location}
                right={nextMilestone ? `${pts}/${nextMilestone.pts} pts` : `${pts} pts`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};
