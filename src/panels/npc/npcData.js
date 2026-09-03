// Strict catalog of 14 NPCs with verified Milestone Rewards & Total Flower Point values
export const NPC_CATALOG = [
  {
    id: "betty",
    name: "Betty",
    location: "Plaza",
    icon: "👩‍🌾",
    milestones: [
      { pts: 10, reward: "Coins: 120" },
      { pts: 20, reward: "Coins: 960, Recipe: Basic Bed" },
      { pts: 40, reward: "Treasure Key: 1, Recipe: Doll" },
      { pts: 110, reward: "Radish Cake: 1, Recipe: Buzz Doll" }
    ],
    repeatInterval: 100,
    repeatReward: "Treasure Key: 1",
    favorites: [
      { name: "Red Pansy", pts: 8 },
      { name: "Yellow Pansy", pts: 8 },
      { name: "Purple Pansy", pts: 8 },
      { name: "White Pansy", pts: 8 },
      { name: "Blue Pansy", pts: 8 }
    ]
  },
  {
    id: "Pumpkin' Pete",
    name: "Pumpkin' Pete",
    location: "Plaza",
    icon: "🎃",
    milestones: [
      { pts: 5, reward: "Coins: 160" },
      { pts: 12, reward: "Treasure Key: 1" },
      { pts: 50, reward: "Pumpkin Hat: 1" },
      { pts: 100, reward: "Coins: 640" }
    ],
    repeatInterval: 100,
    repeatReward: "Coins: 640, Treasure Key: 1",
    favorites: [
      { name: "Yellow Cosmos", pts: 9 }
    ]
  },
  {
    id: "blacksmith",
    name: "Blacksmith",
    location: "Plaza",
    icon: "🔨",
    milestones: [
      { pts: 50, reward: "Treasure Key: 1, Recipe: Timber" },
      { pts: 110, reward: "Coins: 760, Recipe: Cushion" },
      { pts: 200, reward: "Coins: 1600, Recipe: Hardened Leather" },
      { pts: 320, reward: "Pickaxe: 10, Recipe: Crimsteel" }
    ],
    repeatInterval: 150,
    repeatReward: "Coins: 960, Treasure Key: 1",
    favorites: [
      { name: "Red Carnation", pts: 10 }
    ]
  },
  {
    id: "bert",
    name: "Bert",
    location: "Plaza",
    icon: "🍄",
    milestones: [
      { pts: 60, reward: "Tattered Jacket: 1, Recipe: Wooly Doll" },
      { pts: 100, reward: "Gem: 20, Recipe: Cluck Doll" },
      { pts: 210, reward: "Pirate Cake: 3, Recipe: Cow Bed" },
      { pts: 330, reward: "Greyed Glory: 1, Recipe: Moo Doll" }
    ],
    repeatInterval: 150,
    repeatReward: "Rare Key: 1",
    favorites: [
      { name: "Red Lotus", pts: 13 },
      { name: "Yellow Lotus", pts: 13 },
      { name: "Purple Lotus", pts: 13 },
      { name: "White Lotus", pts: 13 },
      { name: "Blue Lotus", pts: 13 }
    ]
  },
  {
    id: "finley",
    name: "Finley",
    location: "Beach",
    icon: "🎣",
    milestones: [
      { pts: 25, reward: "Fishing Lure: 3, Recipe: Fisher Bed" },
      { pts: 95, reward: "Coins: 3200" },
      { pts: 150, reward: "Tuna: 5" }
    ],
    repeatInterval: 100,
    repeatReward: "Fishing Lure: 5",
    favorites: [
      { name: "Red Daffodil", pts: 12 },
      { name: "Yellow Daffodil", pts: 12 },
      { name: "Purple Daffodil", pts: 12 },
      { name: "White Daffodil", pts: 12 },
      { name: "Blue Daffodil", pts: 12 }
    ]
  },
  {
    id: "raven",
    name: "Raven",
    location: "Plaza",
    icon: "🧙‍♀️",
    milestones: [
      { pts: 50, reward: "Time Warp Totem: 1" },
      { pts: 140, reward: "Coins: 2560, Recipe: Lunar Doll" },
      { pts: 220, reward: "Victorian Hat: 1" },
      { pts: 330, reward: "Coins: 1600, Eggplant Seed: 50, Recipe: Shadow Doll" },
      { pts: 700, reward: "Bat Wings: 1" }
    ],
    repeatInterval: 160,
    repeatReward: "Rare Key: 1",
    favorites: [
      { name: "Purple Carnation", pts: 11 },
      { name: "Purple Lotus", pts: 12 },
      { name: "Purple Daffodil", pts: 11 },
      { name: "Purple Pansy", pts: 7 },
      { name: "Purple Cosmos", pts: 7 },
      { name: "Purple Balloon Flower", pts: 9 },
      { name: "Purple Gladiolus", pts: 7 },
      { name: "Purple Lavender", pts: 8 },
      { name: "Purple Clover", pts: 7 },
      { name: "Purple Edelweiss", pts: 8 }
    ]
  },
  {
    id: "tywin",
    name: "Tywin",
    location: "Plaza",
    icon: "👑",
    milestones: [
      { pts: 35, reward: "Rare Key: 1" },
      { pts: 175, reward: "Coins: 3200" },
      { pts: 330, reward: "Pirate Cake: 5" }
    ],
    repeatInterval: 160,
    repeatReward: "Luxury Key: 1",
    favorites: [
      { name: "Primula Enigma", pts: 19 },
      { name: "Celestial Frostbloom", pts: 18 }
    ]
  },
  {
    id: "old_salty",
    name: "Old Salty",
    location: "Beach",
    icon: "🏴‍☠️",
    milestones: [
      { pts: 30, reward: "Coins: 80, Striped Blue Shirt: 1" },
      { pts: 90, reward: "Coins: 260, Peg Leg: 1, Recipe: Gilded Doll" },
      { pts: 500, reward: "Pirate Potion: 1, Recipe: Pirate Bed" },
      { pts: 850, reward: "Pirate Bounty: 1, Pirate Hat: 1, Recipe: Ocean's Treasure" }
    ],
    repeatInterval: 250,
    repeatReward: "Coins: 2500",
    favorites: [
      { name: "Blue Carnation", pts: 11 },
      { name: "Blue Lotus", pts: 12 },
      { name: "Blue Daffodil", pts: 11 },
      { name: "Blue Pansy", pts: 7 },
      { name: "Blue Balloon Flower", pts: 10 },
      { name: "Blue Cosmos", pts: 7 },
      { name: "Blue Gladiolus", pts: 8 },
      { name: "Blue Lavender", pts: 7 },
      { name: "Blue Clover", pts: 8 },
      { name: "Blue Edelweiss", pts: 7 }
    ]
  },
  {
    id: "miranda",
    name: "Miranda",
    location: "Beach",
    icon: "🐚",
    milestones: [
      { pts: 30, reward: "Time Warp Totem: 1, Recipe: Floral Bed" },
      { pts: 90, reward: "Coins: 960, Fruit Picker Shirt: 1" },
      { pts: 260, reward: "Fruit Picker Apron: 1, Recipe: Desert Bed" },
      { pts: 500, reward: "Coins: 6400, Fruit Bowl: 1, Recipe: Juicy Doll" }
    ],
    repeatInterval: 100,
    repeatReward: "Blueberry Seed: 5, Apple Seed: 5, Banana Plant: 5, Orange Seed: 5",
    favorites: [
      { name: "Yellow Carnation", pts: 11 },
      { name: "Yellow Lotus", pts: 12 },
      { name: "Yellow Daffodil", pts: 11 },
      { name: "Yellow Pansy", pts: 7 },
      { name: "Yellow Balloon Flower", pts: 10 },
      { name: "Yellow Cosmos", pts: 7 },
      { name: "Yellow Gladiolus", pts: 8 },
      { name: "Yellow Lavender", pts: 8 },
      { name: "Yellow Clover", pts: 8 },
      { name: "Yellow Edelweiss", pts: 8 }
    ]
  },
  {
    id: "finn",
    name: "Finn",
    location: "Beach",
    icon: "🐡",
    milestones: [
      { pts: 40, reward: "Rod: 10" },
      { pts: 150, reward: "Coins: 960" }
    ],
    repeatInterval: 130,
    repeatReward: "Rare Key: 1",
    favorites: [
      { name: "White Cosmos", pts: 8 },
      { name: "Blue Cosmos", pts: 8 }
    ]
  },
  {
    id: "corale",
    name: "Corale",
    location: "Beach",
    icon: "🪸",
    milestones: [
      { pts: 45, reward: "Coins: 960" },
      { pts: 150, reward: "Gem: 40, Recipe: Synthetic Fabric" },
      { pts: 320, reward: "Pink Ponytail: 1, Recipe: Kelp Fibre" }
    ],
    repeatInterval: 200,
    repeatReward: "Coins: 3200",
    favorites: [
      { name: "Prism Petal", pts: 18 }
    ]
  },
  {
    id: "cornwell",
    name: "Cornwell",
    location: "Plaza",
    icon: "🌽",
    milestones: [
      { pts: 65, reward: "Rare Key: 1, Recipe: Sturdy Bed" },
      { pts: 175, reward: "Gem: 20" },
      { pts: 340, reward: "Wise Robes: 1, Recipe: Harvest Doll" },
      { pts: 600, reward: "Wise Beard: 1, Recipe: Ember Doll" }
    ],
    repeatInterval: 200,
    repeatReward: "Luxury Key: 1",
    favorites: [
      { name: "Red Balloon Flower", pts: 10 },
      { name: "Yellow Balloon Flower", pts: 10 },
      { name: "Purple Balloon Flower", pts: 10 },
      { name: "White Balloon Flower", pts: 10 },
      { name: "Blue Balloon Flower", pts: 10 }
    ]
  },
  {
    id: "victoria",
    name: "Victoria",
    location: "Kingdom",
    icon: "👸",
    milestones: [
      { pts: 50, reward: "Coins: 2560" },
      { pts: 140, reward: "Time Warp Totem: 1, Recipe: Royal Bed" },
      { pts: 340, reward: "Royal Dress: 1" },
      { pts: 520, reward: "Coins: 16000" },
      { pts: 850, reward: "Queen's Crown: 1" }
    ],
    repeatInterval: 160,
    repeatReward: "Rare Key: 1",
    favorites: [
      { name: "Primula Enigma", pts: 20 }
    ]
  },
  {
    id: "jester",
    name: "Jester",
    location: "Kingdom",
    icon: "🃏",
    milestones: [
      { pts: 50, reward: "Time Warp Totem: 1, Recipe: Royal Bedding" },
      { pts: 140, reward: "Rare Key: 1, Recipe: Royal Ornament" },
      { pts: 340, reward: "Cap n Bells: 1" },
      { pts: 520, reward: "Coins: 16000" },
      { pts: 740, reward: "Motley: 1" }
    ],
    repeatInterval: 90,
    repeatReward: "Treasure Key: 1",
    favorites: [
      { name: "Red Balloon Flower", pts: 11 },
      { name: "Red Carnation", pts: 11 }
    ]
  }
];
