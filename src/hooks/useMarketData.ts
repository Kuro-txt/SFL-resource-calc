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

export interface MarketDataState {
  resources: ResourceItem[];
  collectibles: CollectibleItem[];
  wearables: CollectibleItem[];
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
  const [flowerPriceUsd, setFlowerPriceUsd] = useState<number>(0.1243);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    const forceParam = force ? "&force=true" : "";

    try {
      const [resMapResp, resListResp, colListResp, wearListResp] = await Promise.all([
        fetch(`/api/resource-prices?${force ? "force=true" : ""}`),
        fetch(`/api/resource-prices?format=array${forceParam}`),
        fetch(`/api/collectible-prices?tradeable=true&format=array${forceParam}`),
        fetch(`/api/collectible-prices?collection=wearables&tradeable=true&format=array${forceParam}`),
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
    flowerPriceUsd,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}
