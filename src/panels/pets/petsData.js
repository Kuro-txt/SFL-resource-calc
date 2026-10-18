// Catalog of Sunflower Land Pets, Categories, Fetching Costs & Energy Data
export const PET_CATEGORIES = {
  Guardians: { name: "Guardians", resource: "Chewed Bone", icon: "🦴", energyCost: 200 },
  Hunters: { name: "Hunters", resource: "Ribbon", icon: "🎀", energyCost: 200 },
  Voyagers: { name: "Voyagers", resource: "Ruffroot", icon: "🌿", energyCost: 200 },
  Beasts: { name: "Beasts", resource: "Wild Grass", icon: "🌾", energyCost: 200 },
  Moonkin: { name: "Moonkin", resource: "Heart Leaf", icon: "💚", energyCost: 200 },
  Snowkins: { name: "Snowkins", resource: "Frost Pebble", icon: "❄️", energyCost: 200 },
  Foragers: { name: "Foragers", resource: "Dewberry", icon: "🫐", energyCost: 200 }
};

export const FETCHING_ENERGY_COSTS = {
  Acorn: 100,
  CategoryResource: 200,
  "Fossil Shell": 300,
  Moonfur: 1000
};

// Known Pet catalog with categories, IDs, and resource affinities
export const RESOURCE_ICONS = {
  "Acorn": "🌰",
  "Chewed Bone": "🦴",
  "Ribbon": "🎀",
  "Ruffroot": "🌿",
  "Wild Grass": "🌾",
  "Heart Leaf": "💚",
  "Frost Pebble": "❄️",
  "Dewberry": "🫐",
  "Fossil Shell": "🐚",
  "Moonfur": "✨"
};

// Official Species Fetch Progression according to https://sfl.world/info/pets
export const PET_SPECIES = {
  Dog: {
    species: "Dog",
    categories: ["Guardian", "Hunter"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Chewed Bone", level: 3, energyCost: 200, icon: "🦴" },
      { resource: "Ribbon", level: 7, energyCost: 200, icon: "🎀" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" }
    ]
  },
  Cat: {
    species: "Cat",
    categories: ["Hunter", "Moonkin"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Ribbon", level: 3, energyCost: 200, icon: "🎀" },
      { resource: "Heart Leaf", level: 7, energyCost: 200, icon: "💚" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" }
    ]
  },
  Owl: {
    species: "Owl",
    categories: ["Moonkin", "Forager"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Heart Leaf", level: 3, energyCost: 200, icon: "💚" },
      { resource: "Dewberry", level: 7, energyCost: 200, icon: "🫐" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" }
    ]
  },
  Horse: {
    species: "Horse",
    categories: ["Voyager", "Beast"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Ruffroot", level: 3, energyCost: 200, icon: "🌿" },
      { resource: "Wild Grass", level: 7, energyCost: 200, icon: "🌾" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" }
    ]
  },
  Bull: {
    species: "Bull",
    categories: ["Beast", "Snowkin"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Wild Grass", level: 3, energyCost: 200, icon: "🌾" },
      { resource: "Frost Pebble", level: 7, energyCost: 200, icon: "❄️" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" }
    ]
  },
  Hamster: {
    species: "Hamster",
    categories: ["Forager", "Guardian"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Dewberry", level: 3, energyCost: 200, icon: "🫐" },
      { resource: "Chewed Bone", level: 7, energyCost: 200, icon: "🦴" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" }
    ]
  },
  Penguin: {
    species: "Penguin",
    categories: ["Snowkin", "Voyager"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Frost Pebble", level: 3, energyCost: 200, icon: "❄️" },
      { resource: "Ruffroot", level: 7, energyCost: 200, icon: "🌿" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" }
    ]
  },
  // 7 Official NFT Pets
  Dragon: {
    species: "Dragon",
    isNft: true,
    categories: ["Snowkin", "Guardian", "Voyager"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Frost Pebble", level: 3, energyCost: 200, icon: "❄️" },
      { resource: "Chewed Bone", level: 7, energyCost: 200, icon: "🦴" },
      { resource: "Moonfur", level: 12, energyCost: 1000, icon: "✨" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" },
      { resource: "Ruffroot", level: 25, energyCost: 200, icon: "🌿" }
    ]
  },
  Phoenix: {
    species: "Phoenix",
    isNft: true,
    categories: ["Moonkin", "Beast", "Guardian"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Heart Leaf", level: 3, energyCost: 200, icon: "💚" },
      { resource: "Wild Grass", level: 7, energyCost: 200, icon: "🌾" },
      { resource: "Moonfur", level: 12, energyCost: 1000, icon: "✨" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" },
      { resource: "Chewed Bone", level: 25, energyCost: 200, icon: "🦴" }
    ]
  },
  Griffin: {
    species: "Griffin",
    isNft: true,
    categories: ["Voyager", "Forager", "Beast"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Ruffroot", level: 3, energyCost: 200, icon: "🌿" },
      { resource: "Dewberry", level: 7, energyCost: 200, icon: "🫐" },
      { resource: "Moonfur", level: 12, energyCost: 1000, icon: "✨" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" },
      { resource: "Wild Grass", level: 25, energyCost: 200, icon: "🌾" }
    ]
  },
  Ram: {
    species: "Ram",
    isNft: true,
    categories: ["Hunter", "Voyager", "Moonkin"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Ribbon", level: 3, energyCost: 200, icon: "🎀" },
      { resource: "Ruffroot", level: 7, energyCost: 200, icon: "🌿" },
      { resource: "Moonfur", level: 12, energyCost: 1000, icon: "✨" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" },
      { resource: "Heart Leaf", level: 25, energyCost: 200, icon: "💚" }
    ]
  },
  Warthog: {
    species: "Warthog",
    isNft: true,
    categories: ["Beast", "Snowkin", "Hunter"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Wild Grass", level: 3, energyCost: 200, icon: "🌾" },
      { resource: "Frost Pebble", level: 7, energyCost: 200, icon: "❄️" },
      { resource: "Moonfur", level: 12, energyCost: 1000, icon: "✨" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" },
      { resource: "Ribbon", level: 25, energyCost: 200, icon: "🎀" }
    ]
  },
  Wolf: {
    species: "Wolf",
    isNft: true,
    categories: ["Guardian", "Hunter", "Forager"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Chewed Bone", level: 3, energyCost: 200, icon: "🦴" },
      { resource: "Ribbon", level: 7, energyCost: 200, icon: "🎀" },
      { resource: "Moonfur", level: 12, energyCost: 1000, icon: "✨" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" },
      { resource: "Dewberry", level: 25, energyCost: 200, icon: "🫐" }
    ]
  },
  Bear: {
    species: "Bear",
    isNft: true,
    categories: ["Forager", "Moonkin", "Snowkin"],
    fetches: [
      { resource: "Acorn", level: 1, energyCost: 100, icon: "🌰" },
      { resource: "Dewberry", level: 3, energyCost: 200, icon: "🫐" },
      { resource: "Heart Leaf", level: 7, energyCost: 200, icon: "💚" },
      { resource: "Moonfur", level: 12, energyCost: 1000, icon: "✨" },
      { resource: "Fossil Shell", level: 20, energyCost: 300, icon: "🐚" },
      { resource: "Frost Pebble", level: 25, energyCost: 200, icon: "❄️" }
    ]
  }
};

// Known Pet catalog with categories, IDs, and resource affinities
export const KNOWN_PETS = {
  Barkley: { id: 2601, name: "Barkley", species: "Dog", category: "Guardians", rarity: "Common", emoji: "🐶", desc: "Dog: Fetches Chewed Bones, Ribbons & Acorns." },
  Meowchi: { id: 2602, name: "Meowchi", species: "Cat", category: "Hunters", rarity: "Common", emoji: "🐱", desc: "Cat: Fetches Ribbons, Heart Leaves & Acorns." },
  Twizzle: { id: 2603, name: "Twizzle", species: "Owl", category: "Moonkin", rarity: "Common", emoji: "🦉", desc: "Owl: Fetches Heart Leaves, Dewberries & Acorns." },
  Burro: { id: 2604, name: "Burro", species: "Horse", category: "Voyagers", rarity: "Common", emoji: "🫏", desc: "Horse: Fetches Ruffroot, Wild Grass & Acorns." },
  Mudhorn: { id: 2605, name: "Mudhorn", species: "Bull", category: "Beasts", rarity: "Common", emoji: "🦏", desc: "Bull: Fetches Wild Grass, Frost Pebbles & Acorns." },
  Nibbles: { id: 2606, name: "Nibbles", species: "Hamster", category: "Foragers", rarity: "Common", emoji: "🐹", desc: "Hamster: Fetches Dewberries, Chewed Bones & Acorns." },
  Waddles: { id: 2607, name: "Waddles", species: "Penguin", category: "Snowkins", rarity: "Common", emoji: "🐧", desc: "Penguin: Fetches Frost Pebbles, Ruffroot & Acorns." },
  Ramsey: { id: 2608, name: "Ramsey", species: "Dog", category: "Guardians", rarity: "NFT", emoji: "🐏", desc: "NFT Ram fetching rare mountain finds." },
  Biscuit: { id: 2609, name: "Biscuit", species: "Dog", category: "Guardians", rarity: "Common", emoji: "🐕", desc: "Dog: Fetches Chewed Bones, Ribbons & Acorns." },
  Cloudy: { id: 2610, name: "Cloudy", species: "Dog", category: "Guardians", rarity: "Common", emoji: "☁️", desc: "Dog: Fetches Chewed Bones, Ribbons & Acorns." },
  Butters: { id: 2611, name: "Butters", species: "Cat", category: "Hunters", rarity: "Common", emoji: "🐱", desc: "Cat: Fetches Ribbons, Heart Leaves & Acorns." },
  Smokey: { id: 2612, name: "Smokey", species: "Cat", category: "Hunters", rarity: "Common", emoji: "🐱", desc: "Cat: Fetches Ribbons, Heart Leaves & Acorns." },
  Flicker: { id: 2613, name: "Flicker", species: "Owl", category: "Moonkin", rarity: "Common", emoji: "🦉", desc: "Owl: Fetches Heart Leaves, Dewberries & Acorns." },
  Pippin: { id: 2614, name: "Pippin", species: "Owl", category: "Moonkin", rarity: "Common", emoji: "🦉", desc: "Owl: Fetches Heart Leaves, Dewberries & Acorns." },
  Pinto: { id: 2615, name: "Pinto", species: "Horse", category: "Voyagers", rarity: "Rare", emoji: "🐎", desc: "Horse: Fetches Ruffroot, Wild Grass & Acorns." },
  Roan: { id: 2616, name: "Roan", species: "Horse", category: "Voyagers", rarity: "Rare", emoji: "🐴", desc: "Horse: Fetches Ruffroot, Wild Grass & Acorns." },
  Stallion: { id: 2617, name: "Stallion", species: "Horse", category: "Voyagers", rarity: "NFT", emoji: "🦄", desc: "Horse: Fetches Ruffroot, Wild Grass & Acorns." },
  Bison: { id: 2618, name: "Bison", species: "Bull", category: "Beasts", rarity: "Rare", emoji: "🦬", desc: "Bull: Fetches Wild Grass, Frost Pebbles & Acorns." },
  Oxen: { id: 2619, name: "Oxen", species: "Bull", category: "Beasts", rarity: "Rare", emoji: "🐂", desc: "Bull: Fetches Wild Grass, Frost Pebbles & Acorns." },
  Peanuts: { id: 2620, name: "Peanuts", species: "Hamster", category: "Foragers", rarity: "Common", emoji: "🐹", desc: "Hamster: Fetches Dewberries, Chewed Bones & Acorns." },
  Pip: { id: 2621, name: "Pip", species: "Penguin", category: "Snowkins", rarity: "Common", emoji: "🐧", desc: "Penguin: Fetches Frost Pebbles, Ruffroot & Acorns." },
  Skipper: { id: 2622, name: "Skipper", species: "Penguin", category: "Snowkins", rarity: "Common", emoji: "🐧", desc: "Penguin: Fetches Frost Pebbles, Ruffroot & Acorns." },

  // 7 Official NFT Pet Types
  Dragon: { id: 2640, name: "Dragon", species: "Dragon", category: "Snowkins", rarity: "NFT", emoji: "🐉", desc: "NFT Dragon: 300 supply, multi-resource fetcher." },
  Phoenix: { id: 2641, name: "Phoenix", species: "Phoenix", category: "Moonkin", rarity: "NFT", emoji: "🦅", desc: "NFT Phoenix: 450 supply, multi-resource fetcher." },
  Griffin: { id: 2642, name: "Griffin", species: "Griffin", category: "Voyagers", rarity: "NFT", emoji: "🦅", desc: "NFT Griffin: 450 supply, multi-resource fetcher." },
  Ram: { id: 2643, name: "Ram", species: "Ram", category: "Hunters", rarity: "NFT", emoji: "🐏", desc: "NFT Ram: 450 supply, multi-resource fetcher." },
  Warthog: { id: 2644, name: "Warthog", species: "Warthog", category: "Beasts", rarity: "NFT", emoji: "🐗", desc: "NFT Warthog: 450 supply, multi-resource fetcher." },
  Wolf: { id: 2645, name: "Wolf", species: "Wolf", category: "Guardians", rarity: "NFT", emoji: "🐺", desc: "NFT Wolf: 450 supply, multi-resource fetcher." },
  Bear: { id: 2646, name: "Bear", species: "Bear", category: "Foragers", rarity: "NFT", emoji: "🐻", desc: "NFT Bear: 450 supply, multi-resource fetcher." }
};

// Energy yield level perks
export const ENERGY_LEVEL_PERKS = [
  { level: 5, bonusEnergy: 5, label: "+5 Energy per pet food" },
  { level: 15, decimalYield: 0.1, label: "+0.1 extra fetched resource" },
  { level: 18, acornBonus: 1.0, label: "+1 Acorn yield per fetch" },
  { level: 20, unlocksFossil: true, label: "Unlocks Fossil Shell (300E)" },
  { level: 35, bonusEnergy: 10, label: "+10 Total Energy per pet food" },
  { level: 50, decimalYield: 0.15, label: "+0.15 Total extra fetched resource" },
  { level: 75, bonusEnergy: 15, label: "+15 Total Energy per pet food" },
  { level: 100, decimalYield: 0.25, label: "+0.25 Total extra fetched resource" }
];

// Foods that pets will NEVER request (contain fish or mushrooms)
export const NON_REQUESTED_FOODS = [
  "Rapid Roast",
  "Beetroot Blaze",
  "Mushroom Soup",
  "Mushroom Jacket Potatoes",
  "Kale & Mushroom Pie",
  "Shroom Syrup",
  "Furikake Sprinkle",
  "Creamy Crab Bite",
  "Crimstone Infused Fish Oil",
  "Surimi Rice Bowl"
];

// Fallback market prices for popular pet food items in Flower / SFL
export const PET_FOOD_FALLBACK_PRICES = {
  "Carrot Juice": 0.05,
  "Goblin's Treat": 0.12,
  "Caprese Salad": 0.28,
  "Mashed Potato": 0.03,
  "Boiled Eggs": 0.04,
  "Pancake": 0.08,
  "Roast Veggies": 0.10,
  "Chowder": 0.15,
  "Pumpkin Soup": 0.06,
  "Rhubarb Tart": 0.18,
  "Apple Pie": 0.22,
  "Sushi": 0.35,
  "Orange Cake": 0.20,
  "Sunflower Cake": 0.15,
  "Beetroot Cake": 0.18
};

// Fallback market prices for resources retrieved by pets (from sfl.world/info/pets)
export const FETCHED_RESOURCE_FALLBACK_PRICES = {
  "Acorn": 0.080,
  "Chewed Bone": 0.360,
  "Ribbon": 0.350,
  "Ruffroot": 0.370,
  "Wild Grass": 0.380,
  "Heart Leaf": 0.360,
  "Frost Pebble": 0.370,
  "Dewberry": 0.400,
  "Fossil Shell": 0.500,
  "Moonfur": 3.170
};

// Base Energy provided by difficulty tier
export const TIER_BASE_ENERGY = {
  Easy: 20,
  Medium: 100,
  Hard: 300
};

// Walrus Onesie wearable boost (+5 Energy to all pet food requests)
export const WALRUS_ONESIE_ENERGY_BOOST = 5;

// Official Pet Food Difficulty Tiers (from sfl.world/info/pets)
export const PET_FOOD_DIFFICULTY_TIERS = {
  // Easy Requests (Base: 20 Energy)
  "mashed potato": { tier: "Easy", baseEnergy: 20 },
  "rhubarb tart": { tier: "Easy", baseEnergy: 20 },
  "pumpkin soup": { tier: "Easy", baseEnergy: 20 },
  "reindeer carrot": { tier: "Easy", baseEnergy: 20 },
  "bumpkin broth": { tier: "Easy", baseEnergy: 20 },
  "popcorn": { tier: "Easy", baseEnergy: 20 },
  "sunflower crunch": { tier: "Easy", baseEnergy: 20 },
  "roast veggies": { tier: "Easy", baseEnergy: 20 },
  "club sandwich": { tier: "Easy", baseEnergy: 20 },
  "fruit salad": { tier: "Easy", baseEnergy: 20 },
  "cheese": { tier: "Easy", baseEnergy: 20 },
  "quick juice": { tier: "Easy", baseEnergy: 20 },
  "carrot juice": { tier: "Easy", baseEnergy: 20 },
  "purple smoothie": { tier: "Easy", baseEnergy: 20 },

  // Medium Requests (Base: 100 Energy)
  "boiled eggs": { tier: "Medium", baseEnergy: 100 },
  "boiled egg": { tier: "Medium", baseEnergy: 100 },
  "cabbers n mash": { tier: "Medium", baseEnergy: 100 },
  "fried tofu": { tier: "Medium", baseEnergy: 100 },
  "kale stew": { tier: "Medium", baseEnergy: 100 },
  "cauliflower burger": { tier: "Medium", baseEnergy: 100 },
  "bumpkin salad": { tier: "Medium", baseEnergy: 100 },
  "goblin's treat": { tier: "Medium", baseEnergy: 100 },
  "goblins treat": { tier: "Medium", baseEnergy: 100 },
  "pancakes": { tier: "Medium", baseEnergy: 100 },
  "pancake": { tier: "Medium", baseEnergy: 100 },
  "bumpkin ganoush": { tier: "Medium", baseEnergy: 100 },
  "tofu scramble": { tier: "Medium", baseEnergy: 100 },
  "sunflower cake": { tier: "Medium", baseEnergy: 100 },
  "cornbread": { tier: "Medium", baseEnergy: 100 },
  "pumpkin cake": { tier: "Medium", baseEnergy: 100 },
  "potato cake": { tier: "Medium", baseEnergy: 100 },
  "apple pie": { tier: "Medium", baseEnergy: 100 },
  "orange cake": { tier: "Medium", baseEnergy: 100 },
  "carrot cake": { tier: "Medium", baseEnergy: 100 },
  "fermented carrots": { tier: "Medium", baseEnergy: 100 },
  "fermented carrot": { tier: "Medium", baseEnergy: 100 },
  "blueberry jam": { tier: "Medium", baseEnergy: 100 },
  "sauerkraut": { tier: "Medium", baseEnergy: 100 },
  "fancy fries": { tier: "Medium", baseEnergy: 100 },
  "orange juice": { tier: "Medium", baseEnergy: 100 },
  "apple juice": { tier: "Medium", baseEnergy: 100 },
  "power smoothie": { tier: "Medium", baseEnergy: 100 },
  "bumpkin detox": { tier: "Medium", baseEnergy: 100 },
  "sour shake": { tier: "Medium", baseEnergy: 100 },

  // Hard Requests (Base: 300 Energy)
  "kale omelette": { tier: "Hard", baseEnergy: 300 },
  "rice bun": { tier: "Hard", baseEnergy: 300 },
  "antipasto": { tier: "Hard", baseEnergy: 300 },
  "pizza margherita": { tier: "Hard", baseEnergy: 300 },
  "bumpkin roast": { tier: "Hard", baseEnergy: 300 },
  "goblin brunch": { tier: "Hard", baseEnergy: 300 },
  "steamed red rice": { tier: "Hard", baseEnergy: 300 },
  "caprese salad": { tier: "Hard", baseEnergy: 300 },
  "spaghetti al limone": { tier: "Hard", baseEnergy: 300 },
  "cabbage cake": { tier: "Hard", baseEnergy: 300 },
  "wheat cake": { tier: "Hard", baseEnergy: 300 },
  "cauliflower cake": { tier: "Hard", baseEnergy: 300 },
  "radish cake": { tier: "Hard", baseEnergy: 300 },
  "beetroot cake": { tier: "Hard", baseEnergy: 300 },
  "parsnip cake": { tier: "Hard", baseEnergy: 300 },
  "eggplant cake": { tier: "Hard", baseEnergy: 300 },
  "honey cake": { tier: "Hard", baseEnergy: 300 },
  "lemon cheesecake": { tier: "Hard", baseEnergy: 300 },
  "blue cheese": { tier: "Hard", baseEnergy: 300 },
  "honey cheddar": { tier: "Hard", baseEnergy: 300 },
  "banana blast": { tier: "Hard", baseEnergy: 300 },
  "grape juice": { tier: "Hard", baseEnergy: 300 },
  "slow juice": { tier: "Hard", baseEnergy: 300 },
  "the lot": { tier: "Hard", baseEnergy: 300 }
};

