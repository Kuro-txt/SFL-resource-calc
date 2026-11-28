import React from "react";
import { TabId } from "./Navbar";
import { MarketDataState } from "../hooks/useMarketData";
import { useDashboardData } from "../hooks/useDashboardData";
import { FarmDataState } from "../hooks/useFarmData";
import { AppPreferences } from "./views/SharedUi";
import { DashboardTabView, SettingsTabView } from "./views/SettingsAndDashboard";
import { InventoryTabView, TrackerTabView } from "./views/InventoryAndTracker";
import { MarketTabView, PetsAndNpcTabView, TradesTabView } from "./views/TradesMarketPets";

export type { AppPreferences, CurrencyMode, CoinRatioMode } from "./views/SharedUi";

interface CardViewProps {
  tab: TabId;
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

export const CardContent: React.FC<CardViewProps> = ({ tab, ...rest }) => {
  if (rest.market.loading && rest.market.resources.length === 0) {
    return (
      <div className="mono" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
        Syncing live Sunflower Land market...
      </div>
    );
  }

  switch (tab) {
    case "dashboard":
      return <DashboardTabView {...rest} />;
    case "inventory":
      return <InventoryTabView {...rest} />;
    case "tracker":
      return <TrackerTabView {...rest} />;
    case "trades":
      return <TradesTabView {...rest} />;
    case "market":
      return <MarketTabView {...rest} />;
    case "pets":
      return <PetsAndNpcTabView {...rest} />;
    case "settings":
      return <SettingsTabView {...rest} />;
    default:
      return null;
  }
};
