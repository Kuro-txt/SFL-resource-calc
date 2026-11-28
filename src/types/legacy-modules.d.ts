declare module "*/panels/npc/npcData.js" {
  export interface NpcMilestone {
    pts: number;
    reward: string;
  }
  export interface NpcFavorite {
    name: string;
    pts: number;
  }
  export interface NpcCatalogEntry {
    id: string;
    name: string;
    location: string;
    icon: string;
    milestones: NpcMilestone[];
    repeatInterval: number;
    repeatReward: string;
    favorites: NpcFavorite[];
  }
  export const NPC_CATALOG: NpcCatalogEntry[];
}

declare module "*/panels/pets/petsData.js" {
  export const PET_SPECIES: Record<
    string,
    { category: string; fetch?: string[]; aura?: string }
  >;
  export const KNOWN_PETS: Record<string, string>;
  export const FETCHING_ENERGY_COSTS: Record<string, number>;
}

declare module "*/data/itemBoosts.js" {
  export const ITEM_BOOSTS: Record<string, string>;
  export function getItemBoost(name: string): string | null;
}

declare module "*/data/transparentBoostSprites.js" {
  export const TRANSPARENT_BOOST_SPRITES: Record<string, string>;
}
