import { useCallback, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { getOrInitSupabase } from "./useAuth";

export interface FarmTradeRecord {
  id?: string;
  itemName?: string;
  name?: string;
  item?: string;
  itemId?: number | string;
  collection?: string;
  quantity?: number;
  sfl?: number;
  usd?: number;
  tradeType?: string;
  fulfilledAt?: number;
  initiatedBy?: { id?: string | number } | string | number;
}

export interface RollupRow {
  week_start?: string;
  month_start?: string;
  total_count?: number;
  net_flowers?: number;
  crops?: unknown;
}

export interface BaselineRow {
  snapshot_date: string;
  stock: Record<string, number | string>;
}

export interface FarmDataState {
  inventory: Record<string, number>;
  wardrobe: Record<string, number>;
  balance: number;
  coins: number;
  npcs: Record<string, { friendship?: { points?: number } }>;
  rawPets: Record<string, unknown>;
  baselines: BaselineRow[];
  weeklyRollups: RollupRow[];
  monthlyRollups: RollupRow[];
  trades: FarmTradeRecord[];
  wishlist: string[];
  syncing: boolean;
  syncError: string | null;
  lastSyncedAt: string | null;
  syncFarm: (farmId: string, apiKey?: string) => Promise<void>;
  toggleWishlist: (name: string) => void;
}

function parseJsonSafe<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function useFarmData(farmId: string, user: User | null, apiKey = ""): FarmDataState {
  const [inventory, setInventory] = useState<Record<string, number>>(() =>
    parseJsonSafe(localStorage.getItem("sfl_farm_inventory"), {})
  );
  const [wardrobe, setWardrobe] = useState<Record<string, number>>(() =>
    parseJsonSafe(localStorage.getItem("sfl_farm_wardrobe"), {})
  );
  const [balance, setBalance] = useState<number>(() => parseFloat(localStorage.getItem("sfl_farm_balance") || "0") || 0);
  const [coins, setCoins] = useState<number>(0);
  const [npcs, setNpcs] = useState<Record<string, { friendship?: { points?: number } }>>(() =>
    parseJsonSafe(localStorage.getItem("sfl_farm_npcs"), {})
  );
  const [rawPets, setRawPets] = useState<Record<string, unknown>>(() =>
    parseJsonSafe(localStorage.getItem("sfl_farm_pets"), {})
  );
  const [baselines, setBaselines] = useState<BaselineRow[]>([]);
  const [weeklyRollups, setWeeklyRollups] = useState<RollupRow[]>([]);
  const [monthlyRollups, setMonthlyRollups] = useState<RollupRow[]>([]);
  const [trades, setTrades] = useState<FarmTradeRecord[]>([]);
  const [wishlist, setWishlist] = useState<string[]>(() =>
    parseJsonSafe<string[]>(localStorage.getItem("sfl_tracked_targets"), [])
  );
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const loadAuxCloudData = useCallback(async (targetFarmId: string) => {
    const clean = targetFarmId.trim();
    if (!clean && !user?.id) return;
    const qs = `farmId=${encodeURIComponent(clean)}&userId=${encodeURIComponent(user?.id || "")}`;

    const [baseRes, weekRes, monthRes, tradeRes] = await Promise.allSettled([
      fetch(`/api/baselines?${qs}`),
      fetch(`/api/yields?${qs}&type=weekly`),
      fetch(`/api/yields?${qs}&type=monthly`),
      clean ? fetch(`/api/trades?farmId=${encodeURIComponent(clean)}`) : Promise.resolve(null),
    ]);

    if (baseRes.status === "fulfilled" && baseRes.value.ok) {
      const json = await baseRes.value.json();
      if (Array.isArray(json?.data)) setBaselines(json.data);
    }
    if (weekRes.status === "fulfilled" && weekRes.value.ok) {
      const json = await weekRes.value.json();
      if (Array.isArray(json?.data)) setWeeklyRollups(json.data);
    }
    if (monthRes.status === "fulfilled" && monthRes.value.ok) {
      const json = await monthRes.value.json();
      if (Array.isArray(json?.data)) setMonthlyRollups(json.data);
    }
    if (tradeRes.status === "fulfilled" && tradeRes.value && tradeRes.value.ok) {
      const json = await tradeRes.value.json();
      if (Array.isArray(json?.trades)) setTrades(json.trades);
    }
  }, [user?.id]);

  const syncFarm = useCallback(
    async (targetFarmId: string, overrideKey?: string) => {
      const clean = targetFarmId.trim();
      if (!clean) return;
      setSyncing(true);
      setSyncError(null);

      try {
        const keyToUse = (overrideKey ?? apiKey).trim();
        const keyParam = keyToUse ? `&apiKey=${encodeURIComponent(keyToUse)}` : "";
        let res = await fetch(`/api/get-farm?farmId=${encodeURIComponent(clean)}${keyParam}`);
        if (!res.ok) {
          res = await fetch(`https://sfl-calculator-backend.onrender.com/api/get-farm?farmId=${encodeURIComponent(clean)}${keyParam}`);
        }
        if (!res.ok) {
          throw new Error(`Farm sync failed (HTTP ${res.status})`);
        }

        const payload = await res.json();
        const farmObj = payload?.farm?.farm || payload?.farm || {};

        const invRaw = (farmObj.inventory || {}) as Record<string, string | number>;
        const cleanInv: Record<string, number> = {};
        Object.entries(invRaw).forEach(([k, v]) => {
          const n = parseFloat(String(v));
          if (!Number.isNaN(n) && n > 0) cleanInv[k] = n;
        });

        const wardRaw = (farmObj.wardrobe || {}) as Record<string, string | number>;
        const cleanWard: Record<string, number> = {};
        Object.entries(wardRaw).forEach(([k, v]) => {
          const n = parseFloat(String(v));
          if (!Number.isNaN(n) && n > 0) cleanWard[k] = n;
        });

        const bal = parseFloat(String(farmObj.balance || 0)) || 0;
        const cns = parseFloat(String(farmObj.coins || 0)) || 0;
        const npcObj = (farmObj.npcs || {}) as Record<string, { friendship?: { points?: number } }>;
        const petsObj = (farmObj.pets || {}) as Record<string, unknown>;

        setInventory(cleanInv);
        setWardrobe(cleanWard);
        setBalance(bal);
        setCoins(cns);
        setNpcs(npcObj);
        setRawPets(petsObj);
        setLastSyncedAt(new Date().toISOString());

        try {
          localStorage.setItem("sfl_farm_inventory", JSON.stringify(cleanInv));
          localStorage.setItem("sfl_farm_wardrobe", JSON.stringify(cleanWard));
          localStorage.setItem("sfl_farm_balance", String(bal));
          localStorage.setItem("sfl_farm_npcs", JSON.stringify(npcObj));
          localStorage.setItem("sfl_farm_pets", JSON.stringify(petsObj));
        } catch {
          // ignore
        }

        await loadAuxCloudData(clean);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : "Failed to sync farm");
      } finally {
        setSyncing(false);
      }
    },
    [apiKey, loadAuxCloudData]
  );

  // Auto-sync live farm when farmId is set (and load wishlist & aux cloud data)
  useEffect(() => {
    if (farmId) {
      void syncFarm(farmId);
    } else if (user?.id) {
      void loadAuxCloudData("");
    }
    if (user?.id) {
      void (async () => {
        const client = await getOrInitSupabase();
        if (!client) return;
        const { data } = await client.from("profiles").select("tracked_targets").eq("id", user.id).maybeSingle();
        if (Array.isArray(data?.tracked_targets)) {
          setWishlist(data.tracked_targets as string[]);
          localStorage.setItem("sfl_tracked_targets", JSON.stringify(data.tracked_targets));
        }
      })();
    }
  }, [farmId, user?.id]);

  const toggleWishlist = useCallback(
    (name: string) => {
      setWishlist((prev) => {
        const exists = prev.includes(name);
        const next = exists ? prev.filter((x) => x !== name) : [...prev, name];
        localStorage.setItem("sfl_tracked_targets", JSON.stringify(next));
        if (user?.id) {
          void (async () => {
            const client = await getOrInitSupabase();
            if (client) {
              await client.from("profiles").upsert({ id: user.id, tracked_targets: next }, { onConflict: "id" });
            }
          })();
        }
        return next;
      });
    },
    [user?.id]
  );

  return {
    inventory,
    wardrobe,
    balance,
    coins,
    npcs,
    rawPets,
    baselines,
    weeklyRollups,
    monthlyRollups,
    trades,
    wishlist,
    syncing,
    syncError,
    lastSyncedAt,
    syncFarm,
    toggleWishlist,
  };
}
