import { useCallback, useEffect, useState } from "react";

export interface ResourceItem {
  name: string;
  category: string;
  priceFlower: number;
  priceUsd: number;
}

export interface CollectibleItem {
  id: number;
  name: string;
  collection: "collectibles" | "wearables";
  priceFlower: number | null;
  priceUsd: number | null;
  boost: string | null;
  image: string;
}

export interface GemPack {
  gem: number;
  usd: number;
  sfl1: number;
  sfl: number;
  pol: number;
}

export const DEFAULT_GEM_PACKS: Record<string, GemPack> = {
  "100": { gem: 100, usd: 1.29, sfl1: 0.0801, sfl: 8.0137, pol: 12.7754 },
  "650": { gem: 650, usd: 6.49, sfl1: 0.0620, sfl: 40.3171, pol: 64.2731 },
  "1350": { gem: 1350, usd: 12.99, sfl1: 0.0598, sfl: 80.6963, pol: 128.6452 },
  "2800": { gem: 2800, usd: 25.99, sfl1: 0.0577, sfl: 161.4548, pol: 257.3895 },
  "7400": { gem: 7400, usd: 64.99, sfl1: 0.0546, sfl: 403.7301, pol: 643.6223 },
  "15500": { gem: 15500, usd: 129.99, sfl1: 0.0521, sfl: 807.5223, pol: 1287.3435 },
  "200000": { gem: 200000, usd: 1299.99, sfl1: 0.0404, sfl: 8075.7822, pol: 12874.3268 },
};

export interface MarketDataState {
  resources: ResourceItem[];
  collectibles: CollectibleItem[];
  wearables: CollectibleItem[];
  gemPacks: Record<string, GemPack>;
  flowerPriceUsd: number;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  refresh: (force?: boolean) => Promise<void>;
}

export function useMarketData(): MarketDataState {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [collectibles, setCollectibles] = useState<CollectibleItem[]>([]);
  const [wearables, setWearables] = useState<CollectibleItem[]>([]);
  const [gemPacks, setGemPacks] = useState<Record<string, GemPack>>(() => {
    try {
      const raw = localStorage.getItem("sfl_exchange_gems_cache");
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, GemPack>;
        if (parsed && Object.keys(parsed).length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_GEM_PACKS;
  });
  const [flowerPriceUsd, setFlowerPriceUsd] = useState<number>(0.1243);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    const forceParam = force ? "&force=true" : "";

    try {
      const [resMapResp, resListResp, colListResp, wearListResp, exResp] = await Promise.all([
        fetch(`/api/resource-prices?${force ? "force=true" : ""}`),
        fetch(`/api/resource-prices?format=array${forceParam}`),
        fetch(`/api/collectible-prices?tradeable=true&format=array${forceParam}`),
        fetch(`/api/collectible-prices?collection=wearables&tradeable=true&format=array${forceParam}`),
        fetch(`/api/get-exchange${force ? "?force=true" : ""}`),
      ]);

      if (resMapResp.ok) {
        const meta = await resMapResp.json();
        if (typeof meta?.flowerPriceUsd === "number") {
          setFlowerPriceUsd(meta.flowerPriceUsd);
        }
        if (meta?.updated_at) {
          setLastUpdated(meta.updated_at);
        }
      }

      if (resListResp.ok) {
        const list = await resListResp.json();
        if (Array.isArray(list)) setResources(list);
      }

      if (colListResp.ok) {
        const list = await colListResp.json();
        if (Array.isArray(list)) setCollectibles(list);
      }

      if (wearListResp.ok) {
        const list = await wearListResp.json();
        if (Array.isArray(list)) setWearables(list);
      }

      if (exResp.ok) {
        const ex = await exResp.json();
        if (ex?.gems && typeof ex.gems === "object" && Object.keys(ex.gems).length > 0) {
          setGemPacks(ex.gems as Record<string, GemPack>);
          try {
            localStorage.setItem("sfl_exchange_gems_cache", JSON.stringify(ex.gems));
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load market data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  return {
    resources,
    collectibles,
    wearables,
    gemPacks,
    flowerPriceUsd,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}
