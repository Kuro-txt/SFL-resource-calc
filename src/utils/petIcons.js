/**
 * Shared Pet Icon Resolver for Sunflower Land Pets.
 * Resolves local game asset pet icons and NFT animated avatars with graceful emoji fallbacks.
 */

// Available local pet asset names in public/icons/pets/
export const AVAILABLE_PETS = new Set([
  // Common pets (awake)
  "barkley", "biscuit", "cloudy", "meowchi", "butters", "smokey",
  "twizzle", "flicker", "pippin", "burro", "pinto", "roan", "stallion",
  "mudhorn", "bison", "oxen", "nibbles", "peanuts", "waddles", "pip", "skipper", "ramsey",
  // Common pets (asleep)
  "barkley_asleep", "biscuit_asleep", "cloudy_asleep", "meowchi_asleep", "butters_asleep", "smokey_asleep",
  "twizzle_asleep", "flicker_asleep", "pippin_asleep", "burro_asleep", "pinto_asleep", "roan_asleep", "stallion_asleep",
  "mudhorn_asleep", "bison_asleep", "oxen_asleep", "nibbles_asleep", "peanuts_asleep", "waddles_asleep", "pip_asleep", "skipper_asleep",
  // NFT pet species / avatars
  "dragon", "phoenix", "griffin", "ram", "warthog", "wolf", "bear",
  // Faction pets
  "bumpkin_pet", "goblin_pet", "nightshade_pet", "sunflorian_pet",
  // Pet items & buildings
  "pet_egg", "pet_nft_egg", "pet_cookie", "petting_hand", "pet_bed", "pet_bowls",
  "pet_kennel", "pet_playground", "pet_rug", "pet_toys", "pet_tree", "petnip_plant"
]);

// Aliases and mappings from species / display names to asset filenames
export const PET_ALIASES = {
  "dog": "barkley",
  "cat": "meowchi",
  "owl": "twizzle",
  "horse": "burro",
  "bull": "mudhorn",
  "hamster": "nibbles",
  "penguin": "waddles",
  "goat": "ramsey",
  "peanut": "peanuts"
};

/**
 * Normalizes a Pet name or ID to the asset filename key.
 */
export function normalizePetKey(nameOrId) {
  if (!nameOrId) return '';
  const clean = String(nameOrId).toLowerCase().trim().replace(/['\s-]+/g, '_');
  return PET_ALIASES[clean] || clean;
}

/**
 * Returns the local asset path (or live CDN URL for numbered NFT pets) or null.
 */
export function getPetIconPath(nameOrId, options = {}) {
  if (!nameOrId) return null;

  // Numbered NFT Pet (e.g. Pet #123)
  const isNumberId = typeof nameOrId === 'number' || (/^\d+$/.test(String(nameOrId).trim()));
  if (isNumberId) {
    const num = typeof nameOrId === 'number' ? nameOrId : parseInt(nameOrId, 10);
    const state = options.asleep ? 'sleepings' : 'idles';
    return `https://pets.sunflower-land.com/${state}/${num}_animated.webp`;
  }

  // Handle strings like "Pet #123"
  const matchNft = String(nameOrId).match(/^pet\s*#?(\d+)$/i);
  if (matchNft) {
    const num = parseInt(matchNft[1], 10);
    const state = options.asleep ? 'sleepings' : 'idles';
    return `https://pets.sunflower-land.com/${state}/${num}_animated.webp`;
  }

  const clean = normalizePetKey(nameOrId);
  if (options.asleep && AVAILABLE_PETS.has(`${clean}_asleep`)) {
    return `./public/icons/pets/${clean}_asleep.webp`;
  }

  if (AVAILABLE_PETS.has(clean)) {
    if (clean === 'pet_egg' || clean === 'pet_nft_egg') {
      return `./public/icons/pets/${clean}.png`;
    }
    return `./public/icons/pets/${clean}.webp`;
  }

  return null;
}

/**
 * Returns an HTML string rendering either the asset image icon or fallback emoji.
 */
export function getPetIconHtml(nameOrId, options = {}) {
  const fallback = options.fallbackEmoji || '🐾';
  const sizeClass = options.className || 'w-8 h-8 sm:w-9 sm:h-9';
  const imgPath = getPetIconPath(nameOrId, options);

  if (imgPath) {
    return `<img src="${imgPath}" class="${sizeClass} object-contain inline-block shrink-0 select-none" style="image-rendering: pixelated;" alt="${nameOrId}" loading="lazy" onerror="this.outerHTML='<span class=\\'${sizeClass} flex items-center justify-center text-xl select-none shrink-0\\'>${fallback}</span>'" />`;
  }

  return `<span class="${sizeClass} flex items-center justify-center text-xl select-none shrink-0">${fallback}</span>`;
}

if (typeof window !== 'undefined') {
  window.getPetIconHtml = getPetIconHtml;
  window.getPetIconPath = getPetIconPath;
}
