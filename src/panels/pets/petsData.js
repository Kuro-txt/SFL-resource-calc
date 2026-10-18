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
export const KNOWN_PETS = {
  Barkley: { id: 2601, name: "Barkley", category: "Guardians", rarity: "Common", emoji: "🐶", desc: "Fetches Chewed Bones & Acorns." },
  Meowchi: { id: 2602, name: "Meowchi", category: "Hunters", rarity: "Common", emoji: "🐱", desc: "Fetches Ribbons & Acorns." },
  Twizzle: { id: 2603, name: "Twizzle", category: "Voyagers", rarity: "Common", emoji: "🦝", desc: "Fetches Ruffroot & Acorns." },
  Burro: { id: 2604, name: "Burro", category: "Voyagers", rarity: "Common", emoji: "🫏", desc: "Fetches Ruffroot & Acorns." },
  Mudhorn: { id: 2605, name: "Mudhorn", category: "Beasts", rarity: "Common", emoji: "🦏", desc: "Fetches Wild Grass & Acorns." },
  Nibbles: { id: 2606, name: "Nibbles", category: "Foragers", rarity: "Common", emoji: "🐿️", desc: "Fetches Dewberries & Acorns." },
  Waddles: { id: 2607, name: "Waddles", category: "Snowkins", rarity: "Common", emoji: "🦆", desc: "Fetches Frost Pebbles & Acorns." },
  Ramsey: { id: 2608, name: "Ramsey", category: "Guardians", rarity: "NFT", emoji: "🐏", desc: "NFT Ram fetching rare mountain finds." },
  Biscuit: { id: 2609, name: "Biscuit", category: "Guardians", rarity: "Common", emoji: "🐕", desc: "Fetches Chewed Bones & Acorns." },
  Cloudy: { id: 2610, name: "Cloudy", category: "Moonkin", rarity: "Common", emoji: "☁️", desc: "Fetches Heart Leaves & Acorns." },
  Butters: { id: 2611, name: "Butters", category: "Foragers", rarity: "Common", emoji: "🧈", desc: "Fetches Dewberries & Acorns." },
  Smokey: { id: 2612, name: "Smokey", category: "Hunters", rarity: "Common", emoji: "🦨", desc: "Fetches Ribbons & Acorns." },
  Flicker: { id: 2613, name: "Flicker", category: "Hunters", rarity: "Common", emoji: "🦊", desc: "Fetches Ribbons & Acorns." },
  Pippin: { id: 2614, name: "Pippin", category: "Voyagers", rarity: "Common", emoji: "🐦", desc: "Fetches Ruffroot & Acorns." },
  Pinto: { id: 2615, name: "Pinto", category: "Beasts", rarity: "Rare", emoji: "🐎", desc: "Fetches Wild Grass & Acorns." },
  Roan: { id: 2616, name: "Roan", category: "Beasts", rarity: "Rare", emoji: "🐴", desc: "Fetches Wild Grass & Acorns." },
  Stallion: { id: 2617, name: "Stallion", category: "Beasts", rarity: "NFT", emoji: "🦄", desc: "NFT Stallion fetching rare resources." },
  Bison: { id: 2618, name: "Bison", category: "Beasts", rarity: "Rare", emoji: "🦬", desc: "Fetches Wild Grass & Acorns." },
  Oxen: { id: 2619, name: "Oxen", category: "Guardians", rarity: "Rare", emoji: "🐂", desc: "Fetches Chewed Bones & Acorns." },
  Peanuts: { id: 2620, name: "Peanuts", category: "Foragers", rarity: "Common", emoji: "🥜", desc: "Fetches Dewberries & Acorns." },
  Pip: { id: 2621, name: "Pip", category: "Snowkins", rarity: "Common", emoji: "🐣", desc: "Fetches Frost Pebbles & Acorns." },
  Skipper: { id: 2622, name: "Skipper", category: "Snowkins", rarity: "Common", emoji: "🐧", desc: "Fetches Frost Pebbles & Acorns." },

  // 7 Official NFT Pet Types
  Dragon: { id: 2640, name: "Dragon", category: "Snowkins", rarity: "NFT", emoji: "🐉", desc: "NFT Dragon: 300 supply, multi-resource fetcher." },
  Phoenix: { id: 2641, name: "Phoenix", category: "Moonkin", rarity: "NFT", emoji: "🦅", desc: "NFT Phoenix: 450 supply, multi-resource fetcher." },
  Griffin: { id: 2642, name: "Griffin", category: "Voyagers", rarity: "NFT", emoji: "🦅", desc: "NFT Griffin: 450 supply, multi-resource fetcher." },
  Ram: { id: 2643, name: "Ram", category: "Hunters", rarity: "NFT", emoji: "🐏", desc: "NFT Ram: 450 supply, multi-resource fetcher." },
  Warthog: { id: 2644, name: "Warthog", category: "Beasts", rarity: "NFT", emoji: "🐗", desc: "NFT Warthog: 450 supply, multi-resource fetcher." },
  Wolf: { id: 2645, name: "Wolf", category: "Guardians", rarity: "NFT", emoji: "🐺", desc: "NFT Wolf: 450 supply, multi-resource fetcher." },
  Bear: { id: 2646, name: "Bear", category: "Foragers", rarity: "NFT", emoji: "🐻", desc: "NFT Bear: 450 supply, multi-resource fetcher." }
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
