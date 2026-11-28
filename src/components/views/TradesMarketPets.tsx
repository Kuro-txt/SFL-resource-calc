import React, { useMemo, useState } from "react";
import { RefreshCw, Star } from "lucide-react";
import { NPC_CATALOG } from "../../panels/npc/npcData.js";
import { ENERGY_LEVEL_PERKS, KNOWN_PETS, PET_CATEGORIES } from "../../panels/pets/petsData.js";
import { fmtFlower, fmtUsd, formatValue, MiniRow, PillButton, SearchInput } from "./SharedUi";
import { TabRenderProps } from "./SettingsAndDashboard";

interface ParsedPet {
  key: string;
  name: string;
  species: string;
  category: string;
  rarity: string;
  emoji: string;
  level: number;
  xp: number;
  progress: number;
  energy: number;
  aura: string | null;
  requests: string[];
}

function calcPetLevel(rawXp: number) {
  const xp = Math.max(0, Number(rawXp) || 0);
  if (xp < 120) {
    return { level: 1, xp, progress: Math.round((xp / 120) * 1000) / 10 };
  }
  const level = Math.floor(Math.sqrt(xp / 60 - 1)) + 1;
  const startXp = 60 * (Math.pow(level - 1, 2) + 1);
  const nextXp = 60 * (Math.pow(level, 2) + 1);
  const progress = Math.min(100, Math.max(0, ((xp - startXp) / (nextXp - startXp)) * 100));
  return { level, xp, progress: Math.round(progress * 10) / 10 };
}

function extractPetsList(rawPets: Record<string, unknown>): ParsedPet[] {
  if (!rawPets || typeof rawPets !== "object") return [];
  const list: ParsedPet[] = [];

  const processOne = (petName: string, rawObj: unknown, groupKey: string) => {
    if (!rawObj || typeof rawObj !== "object") return;
    const obj = rawObj as {
      id?: number | string;
      name?: string;
      experience?: number;
      energy?: number;
      traits?: { type?: string; aura?: string };
      aura?: string;
      requests?: { food?: string[] };
    };

    const name = String(obj.name || petName);
    const traitType = obj.traits?.type;
    const isNft = groupKey === "nfts" || groupKey === "nft" || Boolean(traitType) || Boolean(obj.traits);
    const meta = (traitType && KNOWN_PETS[traitType]) || KNOWN_PETS[name];

    const species = traitType || meta?.species || "Pet";
    const rarity = isNft ? "NFT" : meta?.rarity || "Common";
    const category = meta?.category || "Voyagers";
    const emoji = meta?.emoji || (isNft ? "🐉" : "🐾");
    const lvl = calcPetLevel(obj.experience || 0);
    const aura = obj.traits?.aura || obj.aura || null;
    const requests = Array.isArray(obj.requests?.food) ? obj.requests.food : [];

    list.push({
      key: `${groupKey}-${obj.id || petName}`,
      name,
      species,
      category,
      rarity,
      emoji,
      level: lvl.level,
      xp: lvl.xp,
      progress: lvl.progress,
      energy: Number(obj.energy || 0),
      aura,
      requests,
    });
  };

  for (const [key, val] of Object.entries(rawPets)) {
    if (!val || typeof val !== "object") continue;
    const rec = val as Record<string, unknown>;
    if (rec.experience !== undefined || rec.name !== undefined || rec.requests !== undefined) {
      processOne(key, rec, "common");
    } else {
      for (const [subKey, subVal] of Object.entries(rec)) {
        processOne(subKey, subVal, key);
      }
    }
  }

  return list.sort((a, b) => b.level - a.level);
}

export const PetsTabView: React.FC<TabRenderProps> = ({ slot, dashboard, farm, prefs, expanded = false }) => {
  const pets = useMemo(() => extractPetsList(farm.rawPets), [farm.rawPets]);
  const maxPetLevel = useMemo(() => pets.reduce((m, p) => Math.max(m, p.level), 0), [pets]);

  if (slot === "01") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.74rem", color: "var(--muted)" }}>
          <span className="mono">{pets.length} companion pets active</span>
          {dashboard.farmId && (
            <PillButton active={farm.syncing} onClick={() => void farm.syncFarm(dashboard.farmId, prefs.customApiKey)}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <RefreshCw size={11} /> {farm.syncing ? "Syncing..." : "Sync"}
              </span>
            </PillButton>
          )}
        </div>
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "300px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {pets.length === 0 ? (
            <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              {dashboard.farmId
                ? "Click Sync above to load pets from your farm."
                : "Enter & load your Farm ID on Dashboard first."}
            </div>
          ) : (
            (expanded ? pets : pets.slice(0, 4)).map((p) => (
              <MiniRow
                key={p.key}
                label={`${p.emoji} ${p.name}`}
                sub={`${p.species} • ${p.category}${p.aura ? ` • ${p.aura}` : ""} (${p.progress}% XP)`}
                right={`Lv.${p.level} • ${p.energy}E`}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  if (slot === "02") {
    const allRequests = pets.flatMap((p) =>
      p.requests.map((food) => ({
        pet: `${p.emoji} ${p.name}`,
        food,
        inStock: farm.inventory[food] || 0,
      }))
    );

    return (
      <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "330px" : undefined, overflowY: expanded ? "auto" : undefined }}>
        {allRequests.length === 0 ? (
          <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
            {pets.length === 0 ? "Sync your farm to view daily pet food cravings." : "No active food requests right now."}
          </div>
        ) : (
          (expanded ? allRequests : allRequests.slice(0, 4)).map((req, idx) => (
            <MiniRow
              key={`${req.pet}-${req.food}-${idx}`}
              label={req.food}
              sub={`Requested by ${req.pet}`}
              right={req.inStock > 0 ? `In Stock (${Math.floor(req.inStock)})` : "Missing"}
            />
          ))
        )}
      </div>
    );
  }

  if (slot === "03") {
    const entries = Object.entries(PET_CATEGORIES);
    return (
      <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "330px" : undefined, overflowY: expanded ? "auto" : undefined }}>
        {(expanded ? entries : entries.slice(0, 4)).map(([catName, meta]) => (
          <MiniRow
            key={catName}
            label={`${meta.icon} ${catName}`}
            sub={meta.fetches.map((f) => `${f.name} (${f.energy}E)`).join(" • ")}
            right={`${meta.fetches.length} items`}
          />
        ))}
      </div>
    );
  }

  if (slot === "04") {
    return (
      <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "330px" : undefined, overflowY: expanded ? "auto" : undefined }}>
        {(expanded ? ENERGY_LEVEL_PERKS : ENERGY_LEVEL_PERKS.slice(0, 4)).map((perk) => {
          const unlocked = maxPetLevel >= perk.level;
          return (
            <MiniRow
              key={perk.level}
              label={`Level ${perk.level}`}
              sub={perk.label}
              right={unlocked ? "Unlocked" : "Locked"}
            />
          );
        })}
      </div>
    );
  }

  return null;
};

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
    const filtered = query ? parsedTrades.filter((t) => t.name.toLowerCase().includes(query.toLowerCase())) : parsedTrades;

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
    const matches = query ? boostedCollectibles.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())) : boostedCollectibles;
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
    const matches = query ? market.resources.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())) : market.resources;
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
    const matches = query ? market.wearables.filter((w) => w.name.toLowerCase().includes(query.toLowerCase())) : market.wearables;
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

export const NpcTabView: React.FC<TabRenderProps> = ({ slot, market, farm, prefs, expanded = false }) => {
  const [query, setQuery] = useState("");

  if (slot === "01") {
    const matches = query ? NPC_CATALOG.filter((n) => n.name.toLowerCase().includes(query.toLowerCase())) : NPC_CATALOG;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search 14 NPCs..." />
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "300px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? matches : matches.slice(0, 4)).map((npc) => {
            const pts = farm.npcs?.[npc.id]?.friendship?.points || 0;
            const nextMilestone = npc.milestones.find((m) => m.pts > pts);
            return (
              <MiniRow
                key={npc.id}
                label={`${npc.icon} ${npc.name}`}
                sub={nextMilestone ? `Next: ${nextMilestone.reward} (${npc.location})` : `${npc.location} • Repeat: ${npc.repeatReward}`}
                right={nextMilestone ? `${pts}/${nextMilestone.pts} pts` : `${pts} pts`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (slot === "02") {
    const favRows = NPC_CATALOG.flatMap((npc) =>
      npc.favorites.map((f) => {
        const res = market.resources.find((r) => r.name.toLowerCase() === f.name.toLowerCase());
        return {
          npc: `${npc.icon} ${npc.name}`,
          gift: f.name,
          pts: f.pts,
          flower: res?.priceFlower || null,
          usd: res?.priceUsd || null,
        };
      })
    );
    const filtered = query
      ? favRows.filter((r) => r.gift.toLowerCase().includes(query.toLowerCase()) || r.npc.toLowerCase().includes(query.toLowerCase()))
      : favRows;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <SearchInput value={query} onChange={setQuery} placeholder="Search NPC favorite gifts..." />
        <div style={{ display: "grid", gap: "6px", maxHeight: expanded ? "300px" : undefined, overflowY: expanded ? "auto" : undefined }}>
          {(expanded ? filtered : filtered.slice(0, 4)).map((r, i) => (
            <MiniRow
              key={`${r.npc}-${r.gift}-${i}`}
              label={r.gift}
              sub={`${r.npc} • +${r.pts} pts`}
              right={r.flower ? formatValue(r.flower, r.usd, prefs.currency) : `+${r.pts} pts`}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
};
