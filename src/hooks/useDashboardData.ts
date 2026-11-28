import { useCallback, useEffect, useMemo, useState } from "react";
import { ResourceItem } from "./useMarketData";

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

interface RawYieldRow {
  date: string;
  totalCount?: number;
  netFlowers?: string | number;
  crops?: Array<{ name?: string; qty?: number; flowers?: number }>;
  cropActivityYields?: Array<{
    type?: string;
    crop?: string;
    name?: string;
    totalProduced?: number;
    qty?: number;
    netFlowers?: number;
    flowers?: number;
    coinsSpent?: number;
    coinsEarned?: number;
    items?: Array<{ name?: string; qty?: number; flowers?: number }>;
  }>;
}

export function getDateBounds(timeRange: TimeRange, offset: number) {
  const now = new Date();

  if (timeRange === "day") {
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    const dateStr = target.toISOString().split("T")[0];
    let label = target.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    if (offset === 0) label += " (Today)";
    else if (offset === 1) label += " (Yesterday)";
    return { minDateStr: dateStr, maxDateStr: dateStr, label };
  }

  if (timeRange === "week") {
    const dayOfWeek = (now.getUTCDay() + 6) % 7;
    const daysBack = dayOfWeek + offset * 7;
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack));
    const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6));
    const minDateStr = monday.toISOString().split("T")[0];
    const maxDateStr = sunday.toISOString().split("T")[0];
    const startFmt = monday.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const endFmt = sunday.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    let label = `${startFmt} – ${endFmt}`;
    if (offset === 0) label = `This Week (${startFmt} – ${endFmt})`;
    else if (offset === 1) label = `Last Week (${startFmt} – ${endFmt})`;
    return { minDateStr, maxDateStr, label };
  }

  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset + 1, 0));
  const minDateStr = start.toISOString().split("T")[0];
  const maxDateStr = end.toISOString().split("T")[0];
  const monthName = start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const label = offset === 0 ? `${monthName} (This Month)` : offset === 1 ? `${monthName} (Last Month)` : monthName;
  return { minDateStr, maxDateStr, label };
}

export function useDashboardData(resources: ResourceItem[]) {
  const [farmId, setFarmIdState] = useState<string>(() => localStorage.getItem("sfl_farm_id") || "");
  const [timeRange, setTimeRange] = useState<TimeRange>("day");
  const [offset, setOffset] = useState<number>(1);
  const [rows, setRows] = useState<RawYieldRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resourcePriceMap = useMemo(() => {
    const m = new Map<string, number>();
    resources.forEach((r) => m.set(r.name.toLowerCase().replace(/[^a-z0-9]/g, ""), r.priceFlower));
    return m;
  }, [resources]);

  const fetchFarmYields = useCallback(async (targetId: string) => {
    const clean = targetId.trim();
    if (!clean) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/yields?farmId=${encodeURIComponent(clean)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load farm yields");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (farmId) {
      void fetchFarmYields(farmId);
    }
  }, [farmId, fetchFarmYields]);

  const setFarmId = (nextId: string) => {
    const clean = nextId.trim();
    localStorage.setItem("sfl_farm_id", clean);
    setFarmIdState(clean);
  };

  const summary: DashboardSummary = useMemo(() => {
    const bounds = getDateBounds(timeRange, offset);
    const earnedMap = new Map<string, BreakdownItem>();
    const spentMap = new Map<string, BreakdownItem>();

    const matchingRows = rows.filter((r) => r.date >= bounds.minDateStr && r.date <= bounds.maxDateStr);

    for (const row of matchingRows) {
      // 1. Earned crops/items
      if (Array.isArray(row.crops)) {
        for (const c of row.crops) {
          const name = String(c.name || "").trim();
          if (!name) continue;
          const qty = Number(c.qty || 0);
          const fl = Number(c.flowers || 0);
          if (qty <= 0 && fl <= 0) continue;
          const prev = earnedMap.get(name) || { name, qty: 0, flowers: 0 };
          prev.qty += qty;
          prev.flowers += fl;
          earnedMap.set(name, prev);
        }
      }

      // 2. Spent items & delivery flowers from cropActivityYields
      if (Array.isArray(row.cropActivityYields)) {
        for (const act of row.cropActivityYields) {
          if (!act) continue;
          if (act.type === "delivery_flowers") {
            const fl = Number(act.flowers || act.netFlowers || 0);
            if (fl > 0) {
              const prev = earnedMap.get("Delivery Flowers") || { name: "Delivery Flowers", qty: 0, flowers: 0 };
              prev.qty += 1;
              prev.flowers += fl;
              earnedMap.set("Delivery Flowers", prev);
            }
          } else if (act.type === "spent" && Array.isArray(act.items)) {
            for (const s of act.items) {
              const name = String(s.name || "").trim();
              if (!name) continue;
              const qty = Number(s.qty || 0);
              let fl = Number(s.flowers || 0);
              if (fl <= 0 && qty > 0) {
                const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
                fl = (resourcePriceMap.get(key) || 0) * qty;
              }
              if (qty <= 0 && fl <= 0) continue;
              const prev = spentMap.get(name) || { name, qty: 0, flowers: 0 };
              prev.qty += qty;
              prev.flowers += fl;
              spentMap.set(name, prev);
            }
          }
        }
      }
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
  }, [rows, timeRange, offset, resourcePriceMap]);

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
