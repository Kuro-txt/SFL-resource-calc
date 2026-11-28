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
  export interface KnownPetMeta {
    id: number;
    name: string;
    species: string;
    category: string;
    rarity: string;
    emoji: string;
    desc: string;
  }
  export interface PetCategoryMeta {
    icon: string;
    color: string;
    fetches: Array<{ name: string; energy: number; minLevel?: number }>;
  }
  export const KNOWN_PETS: Record<string, KnownPetMeta>;
  export const PET_CATEGORIES: Record<string, PetCategoryMeta>;
  export const FETCHING_ENERGY_COSTS: Record<string, number>;
  export const ENERGY_LEVEL_PERKS: Array<{
    level: number;
    bonusEnergy?: number;
    decimalYield?: number;
    acornBonus?: number;
    unlocksFossil?: boolean;
    label: string;
  }>;
}

declare module "*/data/itemBoosts.js" {
  export const ITEM_BOOSTS: Record<string, string>;
  export function getItemBoost(name: string): string | null;
}

declare module "*/data/transparentBoostSprites.js" {
  export const TRANSPARENT_BOOST_SPRITES: Record<string, string>;
}
