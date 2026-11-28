import { useCallback, useEffect, useMemo, useState } from "react";
import { User } from "@supabase/supabase-js";
import { ResourceItem } from "./useMarketData";
import { getOrInitSupabase } from "./useAuth";

export type TimeRange = "day" | "week" | "month";

export interface BreakdownItem {
  name: string;
  qty: number;
  flowers: number;
}

export interface DashboardSummary {
  earnedFlowers: number;
  earnedQty: number;
  spentFlowers: number;
  spentQty: number;
  netFlowers: number;
  earnedItems: BreakdownItem[];
  spentItems: BreakdownItem[];
  rangeLabel: string;
}

interface RawAct {
  type?: string;
  crop?: string;
  name?: string;
  totalProduced?: number;
  qty?: number;
  harvestCount?: number;
  netFlowers?: number;
  flowers?: number;
  dailySflEarned?: number;
  coinsSpent?: number;
  coinsEarned?: number;
  earned?: number;
  gemsSpent?: number;
  items?: Array<{ name?: string; crop?: string; item?: string; qty?: number; flowers?: number }>;
}

interface RawYieldRow {
  date: string;
  totalCount: number;
  crops: Array<{ name: string; qty: number; flowers: number; unitPrice?: number }>;
  cropActivityYields: RawAct[];
}

interface TradeRow {
  fulfilledAt?: number | string;
  itemName?: string;
  name?: string;
  item?: string;
  quantity?: number | string;
  tradeType?: string;
  initiatedBy?: { id?: string | number } | string | number;
}

const GLOBAL_TAX_KEYS = new Set([
  "sunflower", "potato", "pumpkin", "carrot", "cabbage", "beetroot", "cauliflower", "parsnip", "radish", "wheat",
  "kale", "apple", "blueberry", "orange", "eggplant", "corn", "banana", "soybean", "grape", "rice", "olive",
  "tomato", "lemon", "barley", "rhubarb", "zucchini", "yam", "broccoli", "pepper", "onion", "turnip", "artichoke",
  "duskberry", "lunara", "celestine", "wood", "stone", "iron", "gold", "egg", "honey", "crimstone", "leather",
  "wool", "merinowool", "feather", "milk", "salt", "goblinemblem", "bumpkinemblem", "sunflorianemblem",
  "nightshadeemblem", "ruffroot", "chewedbone", "heartleaf", "crystalleaf", "moonfur", "ribbon", "dewberry",
  "wildgrass", "frostpebble", "capsulebait", "umbrellabait", "crimsonbaitfish", "saltwort", "greenbeetle",
  "bluebeetle", "pinkbeetle", "amberbeetle", "pigbristles", "truffle",
]);

function normalizeKey(s: string): string {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function roundUpToThreeDecimals(val: number): number {
  return Math.ceil((val - 1e-9) * 1000) / 1000;
}

function parseJsonField<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val)) return val as unknown as T;
  if (val && typeof val === "object") return val as T;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function getDateBounds(timeRange: TimeRange, offset: number) {
  const now = new Date();

  if (timeRange === "day") {
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    const dateStr = target.toISOString().split("T")[0];
    const minTimestamp = new Date(`${dateStr}T00:00:00Z`).getTime();
    const maxTimestamp = new Date(`${dateStr}T23:59:59.999Z`).getTime();
    let label = target.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    if (offset === 0) label += " (Today)";
    else if (offset === 1) label += " (Yesterday)";
    return { minDateStr: dateStr, maxDateStr: dateStr, minTimestamp, maxTimestamp, monthKey: dateStr.slice(0, 7), label };
  }

  if (timeRange === "week") {
    const dayOfWeek = (now.getUTCDay() + 6) % 7;
    const daysBack = dayOfWeek + offset * 7;
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6));
    const minDateStr = monday.toISOString().split("T")[0];
    const maxDateStr = sunday.toISOString().split("T")[0];
    const minTimestamp = new Date(`${minDateStr}T00:00:00Z`).getTime();
    const maxTimestamp = new Date(`${maxDateStr}T23:59:59.999Z`).getTime();
    const startFmt = monday.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const endFmt = sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    let label = `${startFmt} – ${endFmt}`;
    if (offset === 0) label = `This Week (${startFmt} – ${endFmt})`;
    else if (offset === 1) label = `Last Week (${startFmt} – ${endFmt})`;
    return { minDateStr, maxDateStr, minTimestamp, maxTimestamp, monthKey: minDateStr.slice(0, 7), label };
  }

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset + 1, 0));
  const minDateStr = start.toISOString().split("T")[0];
  const maxDateStr = end.toISOString().split("T")[0];
  const minTimestamp = new Date(`${minDateStr}T00:00:00Z`).getTime();
  const maxTimestamp = new Date(`${maxDateStr}T23:59:59.999Z`).getTime();
  const monthName = start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const label = offset === 0 ? `${monthName} (This Month)` : offset === 1 ? `${monthName} (Last Month)` : monthName;
  return { minDateStr, maxDateStr, minTimestamp, maxTimestamp, monthKey: minDateStr.slice(0, 7), label };
}

function normalizeYieldRow(raw: Record<string, unknown>): RawYieldRow | null {
  const date = String(raw.yield_date || raw.date || "").slice(0, 10);
  if (!date) return null;

  const acts = parseJsonField<RawAct[]>(raw.crop_activity_yields ?? raw.cropActivityYields, []);
  let crops = parseJsonField<Array<{ name?: string; item?: string; crop?: string; qty?: number; flowers?: number; unitPrice?: number }>>(
    raw.crops,
    []
  );

  if (crops.length === 0 && acts.length > 0) {
    crops = acts
      .filter((c) => c && c.type !== "spent" && c.type !== "coins" && c.type !== "gems" && c.type !== "delivery_flowers" && c.type !== "deliveries")
      .map((c) => ({
        name: c.crop || c.name || "Crop",
        qty: Number(c.totalProduced || c.qty || c.harvestCount || 0),
        flowers: Number(c.netFlowers || c.flowers || 0),
      }));
  }

  const mappedCrops = crops.map((c) => ({
    name: String(c.name || c.item || c.crop || "Item"),
    qty: Number(c.qty || 0),
    flowers: Number(c.flowers || 0),
    unitPrice: c.unitPrice ? Number(c.unitPrice) : undefined,
  }));

  const totalCount = Number(raw.total_count ?? raw.totalCount ?? 0);
  return {
    date,
    totalCount,
    crops: mappedCrops,
    cropActivityYields: acts,
  };
}

export function useDashboardData({
  resources,
  flowerPriceUsd,
  user,
  taxRatePct,
  coinFlowerRatio,
}: {
  resources: ResourceItem[];
  flowerPriceUsd: number;
  user: User | null;
  taxRatePct: number;
  coinFlowerRatio: number;
}) {
  const [farmId, setFarmIdState] = useState<string>(() => localStorage.getItem("sfl_farm_id") || "");
  const [timeRange, setTimeRange] = useState<TimeRange>("day");
  const [offset, setOffset] = useState<number>(1);
  const [rows, setRows] = useState<RawYieldRow[]>([]);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [gemPriceFlower, setGemPriceFlower] = useState<number>(0.05);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resourcePriceMap = useMemo(() => {
    const m = new Map<string, number>();
    resources.forEach((r) => m.set(normalizeKey(r.name), r.priceFlower));
    return m;
  }, [resources]);

  const fetchFarmYields = useCallback(
    async (targetFarmId: string) => {
      const clean = targetFarmId.trim();
      if (!clean && !user?.id) {
        setRows([]);
        setTrades([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let fetchedRows: RawYieldRow[] = [];
        const client = await getOrInitSupabase();

        // 1. Primary: Query Supabase daily_yields directly (matches main auth.js & trackerPanel.js)
        if (client && (user?.id || clean)) {
          try {
            const targetUserIds: string[] = [];
            if (user?.id) targetUserIds.push(user.id);
            if (clean) {
              const { data: profs } = await client.from("profiles").select("id").eq("farm_id", clean);
              if (Array.isArray(profs)) {
                profs.forEach((p) => {
                  if (p.id && !targetUserIds.includes(p.id)) targetUserIds.push(p.id);
                });
              }
            }

            if (targetUserIds.length > 0 || clean) {
              let query = client.from("daily_yields").select("*").order("yield_date", { ascending: false }).limit(95);
              if (clean && targetUserIds.length > 0) {
                query = query.or(`farm_id.eq.${clean},user_id.in.(${targetUserIds.join(",")})`);
              } else if (clean) {
                query = query.eq("farm_id", clean);
              } else {
                query = query.in("user_id", targetUserIds);
              }

              const { data } = await query;
              if (Array.isArray(data) && data.length > 0) {
                const seen = new Set<string>();
                for (const r of data) {
                  const norm = normalizeYieldRow(r as Record<string, unknown>);
                  if (norm && !seen.has(norm.date)) {
                    seen.add(norm.date);
                    fetchedRows.push(norm);
                  }
                }
              }
            }
          } catch {
            // fallback to backend /api/yields
          }
        }

        // 2. Fallback: Backend /api/yields (local Vercel first, then Render)
        if (fetchedRows.length === 0) {
          const qs = `farmId=${encodeURIComponent(clean)}&userId=${encodeURIComponent(user?.id || "")}`;
          let res = await fetch(`/api/yields?${qs}`);
          if (!res.ok) {
            res = await fetch(`https://sfl-calculator-backend.onrender.com/api/yields?${qs}`);
          }
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json?.data)) {
              fetchedRows = json.data
                .map((r: Record<string, unknown>) => normalizeYieldRow(r))
                .filter((x: RawYieldRow | null): x is RawYieldRow => Boolean(x));
            }
          }
        }

        // 3. Also load cached local snapshots as fallback/overlay if present
        if (fetchedRows.length === 0) {
          try {
            const local = JSON.parse(localStorage.getItem("sfl_daily_snapshots") || "[]");
            if (Array.isArray(local)) {
              fetchedRows = local
                .map((r: Record<string, unknown>) => normalizeYieldRow(r))
                .filter((x: RawYieldRow | null): x is RawYieldRow => Boolean(x));
            }
          } catch {
            // ignore
          }
        }

        setRows(fetchedRows);

        // 4. Fetch fulfilled trades for Spent deduction & live Gem exchange rate in parallel
        const [tradesRes, exRes] = await Promise.allSettled([
          clean ? fetch(`/api/trades?farmId=${encodeURIComponent(clean)}`) : Promise.resolve(null),
          fetch(`/api/get-exchange`),
        ]);

        if (tradesRes.status === "fulfilled" && tradesRes.value && tradesRes.value.ok) {
          const tJson = await tradesRes.value.json();
          if (Array.isArray(tJson?.trades)) {
            setTrades(tJson.trades);
          }
        }

        if (exRes.status === "fulfilled" && exRes.value && exRes.value.ok) {
          const exJson = await exRes.value.json();
          const gemUsd = Number(exJson?.gems?.[0]?.usd || exJson?.gems?.["100"]?.usd || 0);
          if (gemUsd > 0 && flowerPriceUsd > 0) {
            setGemPriceFlower(gemUsd / flowerPriceUsd);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load farm yields");
      } finally {
        setLoading(false);
      }
    },
    [user?.id, flowerPriceUsd]
  );

  useEffect(() => {
    if (farmId || user?.id) {
      void fetchFarmYields(farmId);
    }
  }, [farmId, user?.id, fetchFarmYields]);

  const setFarmId = useCallback(
    (nextId: string) => {
      const clean = nextId.trim();
      localStorage.setItem("sfl_farm_id", clean);
      setFarmIdState(clean);

      if (clean && user?.id) {
        void (async () => {
          const client = await getOrInitSupabase();
          if (client) {
            await client.from("profiles").upsert({ id: user.id, farm_id: clean }, { onConflict: "id" });
          }
        })();
      }
    },
    [user?.id]
  );

  const summary: DashboardSummary = useMemo(() => {
    const bounds = getDateBounds(timeRange, offset);
    const earnedMap = new Map<string, BreakdownItem>();
    const spentMap = new Map<string, BreakdownItem>();

    // Calculate tradesSold within active bounds (deducted from spent so market sales aren't counted as consumed)
    const tradesSold: Record<string, number> = {};
    for (const t of trades) {
      const fulfilledAt = parseInt(String(t.fulfilledAt || 0), 10);
      if (fulfilledAt > 0 && (fulfilledAt < bounds.minTimestamp || fulfilledAt > bounds.maxTimestamp)) continue;

      const rawName = String(t.itemName || t.name || t.item || "");
      const clean = normalizeKey(rawName);
      if (!clean) continue;

      const qty = Number(t.quantity || 1);
      const initId = typeof t.initiatedBy === "object" && t.initiatedBy !== null ? t.initiatedBy.id : t.initiatedBy;
      const isSeller = t.tradeType === "sold" || (farmId && String(initId || "") === String(farmId));
      if (isSeller) {
        tradesSold[clean] = (tradesSold[clean] || 0) + qty;
      }
    }

    const matchingRows = rows.filter((r) => r.date >= bounds.minDateStr && r.date <= bounds.maxDateStr);
    const userTaxDecimal = taxRatePct / 100;

    let totalCoinsEarned = 0;
    let totalCoinsSpent = 0;
    let totalGemsSpent = 0;

    for (const row of matchingRows) {
      // 1. Earned crops/items (applying live market prices & global vs 10% tax like main)
      for (const c of row.crops) {
        const clean = normalizeKey(c.name);
        if (!clean || clean === "gem" || clean === "gems" || clean === "coins" || clean === "coin") continue;
        if (c.qty <= 0) continue;

        const livePrice = c.unitPrice && c.unitPrice > 0 ? c.unitPrice : resourcePriceMap.get(clean);
        const effTax = GLOBAL_TAX_KEYS.has(clean) ? userTaxDecimal : 0.1;
        const fl = livePrice && livePrice > 0 ? roundUpToThreeDecimals(livePrice * c.qty * (1 - effTax)) : c.flowers;

        if (fl <= 0 && c.qty <= 0) continue;
        const prev = earnedMap.get(c.name) || { name: c.name, qty: 0, flowers: 0 };
        prev.qty += c.qty;
        prev.flowers += fl;
        earnedMap.set(c.name, prev);
      }

      // 2. Activity records: Coins, Gems, Delivery Flowers, and Spent Items
      let dayCoinsSpent = 0;
      let dayGemsSpent = 0;

      for (const act of row.cropActivityYields) {
        if (!act) continue;

        if (act.type === "coins" || act.crop === "Coins") {
          totalCoinsEarned += Number(act.coinsEarned || act.earned || 0);
          dayCoinsSpent = Math.max(dayCoinsSpent, Number(act.coinsSpent || 0));
        } else if (act.type === "gems" || act.crop === "Gems") {
          dayGemsSpent = Math.max(dayGemsSpent, Number(act.gemsSpent || 0));
        } else if (act.type === "delivery_flowers" || act.type === "deliveries") {
          const fl = Number(act.flowers || act.dailySflEarned || act.qty || 0);
          if (fl > 0) {
            const prev = earnedMap.get("Delivery Flowers") || { name: "Delivery Flowers", qty: 0, flowers: 0 };
            prev.qty += 1;
            prev.flowers += fl;
            earnedMap.set("Delivery Flowers", prev);
          }
        } else if (act.type === "spent" && Array.isArray(act.items)) {
          for (const s of act.items) {
            const name = String(s.name || s.crop || s.item || "").trim();
            if (!name) continue;
            const clean = normalizeKey(name);
            if (clean === "coins" || clean === "coin") {
              dayCoinsSpent = Math.max(dayCoinsSpent, Number(s.qty || 0));
              continue;
            }
            if (clean === "gem" || clean === "gems") {
              dayGemsSpent = Math.max(dayGemsSpent, Number(s.qty || 0));
              continue;
            }

            let qty = Number(s.qty || 0);
            const soldOffset = tradesSold[clean] || 0;
            if (soldOffset > 0) {
              qty = Math.max(0, qty - soldOffset);
              tradesSold[clean] = Math.max(0, soldOffset - Number(s.qty || 0));
            }
            if (qty <= 0.01) continue;

            const liveUnit = resourcePriceMap.get(clean) || 0;
            const fl = s.flowers && Number(s.flowers) > 0 ? Number(s.flowers) : liveUnit * qty * (1 - userTaxDecimal);

            const prev = spentMap.get(name) || { name, qty: 0, flowers: 0 };
            prev.qty += qty;
            prev.flowers += fl;
            spentMap.set(name, prev);
          }
        }
      }

      totalCoinsSpent += dayCoinsSpent;
      totalGemsSpent += dayGemsSpent;
    }

    // Add Coins Earned (untaxed via user Coin/Flower ratio)
    if (totalCoinsEarned > 0 && coinFlowerRatio > 0) {
      const coinFl = Number((totalCoinsEarned / coinFlowerRatio).toFixed(3));
      earnedMap.set("Coins", { name: "Coins", qty: Math.round(totalCoinsEarned), flowers: coinFl });
    }

    // Add Coins Spent
    if (totalCoinsSpent > 0 && coinFlowerRatio > 0) {
      const coinSpentFl = Number((totalCoinsSpent / coinFlowerRatio).toFixed(3));
      spentMap.set("Coins", { name: "Coins", qty: Math.round(totalCoinsSpent), flowers: coinSpentFl });
    }

    // Add Gems Spent
    if (totalGemsSpent > 0) {
      const gemFl = Number((totalGemsSpent * gemPriceFlower).toFixed(3));
      spentMap.set("Gems", { name: "Gems", qty: Math.round(totalGemsSpent), flowers: gemFl });
    }

    const earnedItems = Array.from(earnedMap.values()).sort((a, b) => b.flowers - a.flowers);
    const spentItems = Array.from(spentMap.values()).sort((a, b) => b.flowers - a.flowers);

    const earnedFlowers = earnedItems.reduce((s, i) => s + i.flowers, 0);
    const earnedQty = earnedItems.reduce((s, i) => s + i.qty, 0);
    const spentFlowers = spentItems.reduce((s, i) => s + i.flowers, 0);
    const spentQty = spentItems.reduce((s, i) => s + i.qty, 0);

    return {
      earnedFlowers,
      earnedQty,
      spentFlowers,
      spentQty,
      netFlowers: earnedFlowers - spentFlowers,
      earnedItems,
      spentItems,
      rangeLabel: bounds.label,
    };
  }, [rows, trades, farmId, timeRange, offset, resourcePriceMap, taxRatePct, coinFlowerRatio, gemPriceFlower]);

  return {
    farmId,
    setFarmId,
    timeRange,
    setTimeRange: (r: TimeRange) => {
      setTimeRange(r);
      setOffset(r === "day" ? 1 : 0);
    },
    offset,
    setOffset,
    loading,
    error,
    summary,
    refreshFarm: () => fetchFarmYields(farmId),
  };
}
