/**
 * Shared NPC Icon Resolver for Sunflower Land NPCs.
 * Renders local pixel-art animated WebP icons with graceful fallback to emojis.
 */

// Normalized set of available NPC asset keys in public/icons/npcs/
export const AVAILABLE_NPCS = new Set([
  "adam", "bailey", "barlow", "bella", "bert", "betty", "billy", "birdie", "blacksmith",
  "boneyard_betty", "bruce", "buttercup", "buttons", "chaac", "chase", "chef_ebon",
  "chef_lumen", "chef_maple", "chef_tuck", "chicken", "chun_long", "cluck_e_cheese",
  "corale", "cornwell", "craig", "damien", "daphne", "digby", "dreadhorn", "dusk",
  "eins", "eldric", "elf", "evie", "farmer_flesh", "felga", "finley", "finn", "flopsy",
  "flora", "frankie", "gabi", "gambit", "garbo", "garth", "gaucho", "gilda", "ginger",
  "glinteye", "gloomwick", "goblet", "goldtooth", "gordo", "gordy", "gorga", "grabnab",
  "graxle", "greedclaw", "grimbly", "grimtooth", "grizzle", "grommy", "grubnuk",
  "gunter", "guria", "hammerin_harry", "hank", "haymitch", "hopper", "igor", "jafar",
  "jake", "jester", "lady_day", "luna", "marcus", "maximus", "mayor", "memory",
  "minewhack", "miranda", "misty", "misty_marvel", "murmur", "neville", "new_year_pete",
  "nyx", "old_salty", "orlin", "otis", "peggy", "pet", "petro", "phantom_face", "pharaoh",
  "pirate_skeleton", "poppy", "portaller", "pumpkin_pete", "raven", "reelin_roy",
  "reginald", "richie", "robert", "rocket_man", "santa", "shadow", "skelly_joe",
  "slime_jim", "slime_joe", "sofia", "solara", "stella", "stevie", "streamer", "tango",
  "timmy", "tywin", "vampire_jim", "victoria", "wanderleaf", "wizard", "wobble", "worried_pete"
]);

/**
 * Normalizes an NPC name or ID to the asset filename key.
 * e.g., "Pumpkin' Pete" -> "pumpkin_pete", "old salty" -> "old_salty"
 */
export function normalizeNpcKey(nameOrId) {
  if (!nameOrId || typeof nameOrId !== 'string') return '';
  return nameOrId.toLowerCase().trim().replace(/['\s-]+/g, '_');
}

/**
 * Returns the local asset path for an NPC icon, or null if not found.
 */
export function getNpcIconPath(nameOrId) {
  const key = normalizeNpcKey(nameOrId);
  if (AVAILABLE_NPCS.has(key)) {
    return `./public/icons/npcs/${key}.webp`;
  }
  return null;
}

/**
 * Renders an HTML string for an NPC icon.
 * Includes pixelated rendering style and fallback to emoji.
 */
export function getNpcIconHtml(nameOrId, options = {}) {
  const key = normalizeNpcKey(nameOrId);
  const fallback = options.fallbackEmoji || '🧑‍🌾';
  const sizeClass = options.className || 'w-8 h-8 sm:w-9 sm:h-9';
  const imgPath = getNpcIconPath(key);

  if (imgPath) {
    return `<img src="${imgPath}" class="${sizeClass} object-contain inline-block shrink-0 select-none" style="image-rendering: pixelated;" alt="${nameOrId}" loading="eager" decoding="async" onerror="this.outerHTML='<span class=\\'${sizeClass} flex items-center justify-center text-xl select-none shrink-0\\'>${fallback}</span>'" />`;
  }

  return `<span class="${sizeClass} flex items-center justify-center text-xl select-none shrink-0">${fallback}</span>`;
}

/**
 * Preloads NPC images into browser memory cache for zero-latency instant display.
 */
export function preloadNpcIcons(npcList = []) {
  if (typeof window === 'undefined') return;
  const list = npcList.length > 0 ? npcList : [
    'betty', 'pumpkin_pete', 'blacksmith', 'bert', 'finley', 'raven',
    'tywin', 'old_salty', 'miranda', 'finn', 'corale', 'cornwell',
    'victoria', 'jester'
  ];
  list.forEach(name => {
    const p = getNpcIconPath(name);
    if (p) {
      const img = new Image();
      img.src = p;
    }
  });
}

if (typeof window !== 'undefined') {
  window.getNpcIconHtml = getNpcIconHtml;
  window.getNpcIconPath = getNpcIconPath;
  window.preloadNpcIcons = preloadNpcIcons;
}

