// Cooking Recipes pulled from https://sfl.world/info/cooking
// Arranged in topological order: base crafted ingredients are declared before compound recipes that depend on them (e.g. Cheese before Blue Cheese).

export const COOKING_RECIPES = {
  // ── 1. BASE CRAFTED INGREDIENTS (Used as ingredients in other recipes) ──────
  "Cheese": {
    "name": "Cheese",
    "ingredients": {
      "Milk": 3
    }
  },
  "Mashed Potato": {
    "name": "Mashed Potato",
    "ingredients": {
      "Potato": 8
    }
  },
  "Boiled Eggs": {
    "name": "Boiled Eggs",
    "ingredients": {
      "Egg": 10
    }
  },
  "Roast Veggies": {
    "name": "Roast Veggies",
    "ingredients": {
      "Cauliflower": 15,
      "Carrot": 10
    }
  },
  "Goblin's Treat": {
    "name": "Goblin's Treat",
    "ingredients": {
      "Pumpkin": 10,
      "Radish": 20,
      "Cabbage": 10
    }
  },
  "Fancy Fries": {
    "name": "Fancy Fries",
    "ingredients": {
      "Sunflower": 500,
      "Potato": 500
    }
  },

  // ── 2. SINGLE-STAGE RECIPES (Require raw crops, fruits, animal goods, fish) ──
  "Rapid Roast": {
    "name": "Rapid Roast",
    "ingredients": {
      "Magic Mushroom": 1,
      "Pumpkin": 40
    }
  },
  "Popcorn": {
    "name": "Popcorn",
    "ingredients": {
      "Sunflower": 100,
      "Corn": 5
    }
  },
  "Antipasto": {
    "name": "Antipasto",
    "ingredients": {
      "Olive": 2,
      "Grape": 2
    }
  },
  "Rice Bun": {
    "name": "Rice Bun",
    "ingredients": {
      "Rice": 2,
      "Wheat": 50
    }
  },
  "Pumpkin Soup": {
    "name": "Pumpkin Soup",
    "ingredients": {
      "Pumpkin": 10
    }
  },
  "Reindeer Carrot": {
    "name": "Reindeer Carrot",
    "ingredients": {
      "Carrot": 5
    }
  },
  "Kale Omelette": {
    "name": "Kale Omelette",
    "ingredients": {
      "Egg": 40,
      "Kale": 5
    }
  },
  "Mushroom Soup": {
    "name": "Mushroom Soup",
    "ingredients": {
      "Wild Mushroom": 5
    }
  },
  "Rhubarb Tart": {
    "name": "Rhubarb Tart",
    "ingredients": {
      "Rhubarb": 3
    }
  },
  "Bumpkin Broth": {
    "name": "Bumpkin Broth",
    "ingredients": {
      "Carrot": 10,
      "Cabbage": 5
    }
  },
  "Fried Tofu": {
    "name": "Fried Tofu",
    "ingredients": {
      "Soybean": 15,
      "Sunflower": 200
    }
  },
  "Kale Stew": {
    "name": "Kale Stew",
    "ingredients": {
      "Kale": 10
    }
  },
  "Gumbo": {
    "name": "Gumbo",
    "ingredients": {
      "Potato": 50,
      "Pumpkin": 30,
      "Carrot": 20,
      "Red Snapper": 3
    }
  },
  "Furikake Sprinkle": {
    "name": "Furikake Sprinkle",
    "ingredients": {
      "Fish Flake": 1,
      "Seaweed": 1
    }
  },
  "Beetroot Blaze": {
    "name": "Beetroot Blaze",
    "ingredients": {
      "Magic Mushroom": 2,
      "Beetroot": 50
    }
  },
  "Sushi Roll": {
    "name": "Sushi Roll",
    "ingredients": {
      "Angelfish": 1,
      "Seaweed": 1,
      "Rice": 2
    }
  },
  "Mushroom Jacket Potatoes": {
    "name": "Mushroom Jacket Potatoes",
    "ingredients": {
      "Wild Mushroom": 10,
      "Potato": 5
    }
  },
  "Pancakes": {
    "name": "Pancakes",
    "ingredients": {
      "Wheat": 10,
      "Egg": 10,
      "Honey": 6
    }
  },
  "Ocean's Olive": {
    "name": "Ocean's Olive",
    "ingredients": {
      "Olive Flounder": 1,
      "Olive": 2
    }
  },
  "Steamed Red Rice": {
    "name": "Steamed Red Rice",
    "ingredients": {
      "Rice": 3,
      "Beetroot": 50
    }
  },
  "Fish Burger": {
    "name": "Fish Burger",
    "ingredients": {
      "Beetroot": 10,
      "Wheat": 10,
      "Horse Mackerel": 1
    }
  },
  "Fruit Salad": {
    "name": "Fruit Salad",
    "ingredients": {
      "Apple": 1,
      "Orange": 1,
      "Blueberry": 1
    }
  },
  "Seafood Basket": {
    "name": "Seafood Basket",
    "ingredients": {
      "Blowfish": 2,
      "Napoleanfish": 2,
      "Sunfish": 2
    }
  },
  "Tofu Scramble": {
    "name": "Tofu Scramble",
    "ingredients": {
      "Soybean": 20,
      "Egg": 20,
      "Cauliflower": 10
    }
  },
  "Sunflower Crunch": {
    "name": "Sunflower Crunch",
    "ingredients": {
      "Sunflower": 300
    }
  },
  "Fried Calamari": {
    "name": "Fried Calamari",
    "ingredients": {
      "Sunflower": 200,
      "Wheat": 15,
      "Squid": 1
    }
  },
  "Fish Omelette": {
    "name": "Fish Omelette",
    "ingredients": {
      "Egg": 40,
      "Surgeonfish": 1,
      "Butterflyfish": 2
    }
  },
  "Bumpkin ganoush": {
    "name": "Bumpkin ganoush",
    "ingredients": {
      "Eggplant": 30,
      "Potato": 50,
      "Parsnip": 10
    }
  },
  "Chowder": {
    "name": "Chowder",
    "ingredients": {
      "Beetroot": 10,
      "Wheat": 10,
      "Parsnip": 5,
      "Anchovy": 3
    }
  },
  "Cauliflower Burger": {
    "name": "Cauliflower Burger",
    "ingredients": {
      "Cauliflower": 15,
      "Wheat": 5
    }
  },
  "Bumpkin Salad": {
    "name": "Bumpkin Salad",
    "ingredients": {
      "Beetroot": 20,
      "Parsnip": 10
    }
  },
  "Club Sandwich": {
    "name": "Club Sandwich",
    "ingredients": {
      "Sunflower": 100,
      "Carrot": 25,
      "Wheat": 5
    }
  },
  "Surimi Rice Bowl": {
    "name": "Surimi Rice Bowl",
    "ingredients": {
      "Fish Stick": 1,
      "Rice": 1,
      "Onion": 1
    }
  },
  "Crimstone Infused Fish Oil": {
    "name": "Crimstone Infused Fish Oil",
    "ingredients": {
      "Fish Oil": 1,
      "Crimstone": 1
    }
  },
  "Shroom Syrup": {
    "name": "Shroom Syrup",
    "ingredients": {
      "Magic Mushroom": 3,
      "Honey": 20
    }
  },
  "Fermented Fish": {
    "name": "Fermented Fish",
    "ingredients": {
      "Tuna": 6
    }
  },
  "Blueberry Jam": {
    "name": "Blueberry Jam",
    "ingredients": {
      "Blueberry": 5
    }
  },
  "Sauerkraut": {
    "name": "Sauerkraut",
    "ingredients": {
      "Cabbage": 20
    }
  },
  "Fermented Carrots": {
    "name": "Fermented Carrots",
    "ingredients": {
      "Carrot": 20
    }
  },
  "Grape Juice": {
    "name": "Grape Juice",
    "ingredients": {
      "Grape": 5,
      "Radish": 20
    }
  },
  "Sour Shake": {
    "name": "Sour Shake",
    "ingredients": {
      "Lemon": 20
    }
  },
  "Purple Smoothie": {
    "name": "Purple Smoothie",
    "ingredients": {
      "Blueberry": 5,
      "Cabbage": 10
    }
  },
  "Power Smoothie": {
    "name": "Power Smoothie",
    "ingredients": {
      "Blueberry": 10,
      "Kale": 5
    }
  },
  "Orange Juice": {
    "name": "Orange Juice",
    "ingredients": {
      "Orange": 5
    }
  },
  "Apple Juice": {
    "name": "Apple Juice",
    "ingredients": {
      "Apple": 5
    }
  },
  "Bumpkin Detox": {
    "name": "Bumpkin Detox",
    "ingredients": {
      "Apple": 5,
      "Orange": 5,
      "Carrot": 10
    }
  },
  "The Lot": {
    "name": "The Lot",
    "ingredients": {
      "Blueberry": 1,
      "Orange": 1,
      "Grape": 1,
      "Apple": 1,
      "Banana": 1
    }
  },
  "Banana Blast": {
    "name": "Banana Blast",
    "ingredients": {
      "Banana": 10,
      "Egg": 10
    }
  },
  "Slow Juice": {
    "name": "Slow Juice",
    "ingredients": {
      "Grape": 10,
      "Kale": 100
    }
  },
  "Carrot Juice": {
    "name": "Carrot Juice",
    "ingredients": {
      "Carrot": 30
    }
  },
  "Quick Juice": {
    "name": "Quick Juice",
    "ingredients": {
      "Sunflower": 50,
      "Pumpkin": 40
    }
  },
  "Honey Cake": {
    "name": "Honey Cake",
    "ingredients": {
      "Honey": 10,
      "Wheat": 10,
      "Egg": 20
    }
  },
  "Orange Cake": {
    "name": "Orange Cake",
    "ingredients": {
      "Orange": 5,
      "Egg": 30,
      "Wheat": 10
    }
  },
  "Apple Pie": {
    "name": "Apple Pie",
    "ingredients": {
      "Apple": 5,
      "Wheat": 10,
      "Egg": 20
    }
  },
  "Kale & Mushroom Pie": {
    "name": "Kale & Mushroom Pie",
    "ingredients": {
      "Wild Mushroom": 10,
      "Kale": 5,
      "Wheat": 5
    }
  },
  "Sunflower Cake": {
    "name": "Sunflower Cake",
    "ingredients": {
      "Sunflower": 1000,
      "Wheat": 10,
      "Egg": 30
    }
  },
  "Potato Cake": {
    "name": "Potato Cake",
    "ingredients": {
      "Potato": 500,
      "Wheat": 10,
      "Egg": 30
    }
  },
  "Pumpkin Cake": {
    "name": "Pumpkin Cake",
    "ingredients": {
      "Pumpkin": 130,
      "Wheat": 10,
      "Egg": 30
    }
  },
  "Eggplant Cake": {
    "name": "Eggplant Cake",
    "ingredients": {
      "Eggplant": 30,
      "Wheat": 10,
      "Egg": 30
    }
  },
  "Carrot Cake": {
    "name": "Carrot Cake",
    "ingredients": {
      "Carrot": 120,
      "Wheat": 10,
      "Egg": 30
    }
  },
  "Cabbage Cake": {
    "name": "Cabbage Cake",
    "ingredients": {
      "Cabbage": 90,
      "Wheat": 10,
      "Egg": 30
    }
  },
  "Beetroot Cake": {
    "name": "Beetroot Cake",
    "ingredients": {
      "Beetroot": 100,
      "Wheat": 10,
      "Egg": 30
    }
  },
  "Parsnip Cake": {
    "name": "Parsnip Cake",
    "ingredients": {
      "Parsnip": 45,
      "Wheat": 10,
      "Egg": 30
    }
  },
  "Cauliflower Cake": {
    "name": "Cauliflower Cake",
    "ingredients": {
      "Cauliflower": 60,
      "Wheat": 10,
      "Egg": 30
    }
  },
  "Cornbread": {
    "name": "Cornbread",
    "ingredients": {
      "Corn": 15,
      "Wheat": 5,
      "Egg": 10
    }
  },
  "Radish Cake": {
    "name": "Radish Cake",
    "ingredients": {
      "Radish": 25,
      "Wheat": 10,
      "Egg": 30
    }
  },
  "Wheat Cake": {
    "name": "Wheat Cake",
    "ingredients": {
      "Wheat": 35,
      "Egg": 30
    }
  },

  // ── 3. COMPOUND RECIPES (Require other crafted recipe items from Section 1) ──
  "Blue Cheese": {
    "name": "Blue Cheese",
    "ingredients": {
      "Cheese": 2,
      "Blueberry": 10
    }
  },
  "Honey Cheddar": {
    "name": "Honey Cheddar",
    "ingredients": {
      "Cheese": 3,
      "Honey": 5
    }
  },
  "Pizza Margherita": {
    "name": "Pizza Margherita",
    "ingredients": {
      "Tomato": 30,
      "Cheese": 5,
      "Wheat": 20
    }
  },
  "Caprese Salad": {
    "name": "Caprese Salad",
    "ingredients": {
      "Cheese": 1,
      "Tomato": 25,
      "Kale": 20
    }
  },
  "Spaghetti al Limone": {
    "name": "Spaghetti al Limone",
    "ingredients": {
      "Wheat": 10,
      "Lemon": 15,
      "Cheese": 3
    }
  },
  "Creamy Crab Bite": {
    "name": "Creamy Crab Bite",
    "ingredients": {
      "Crab Stick": 1,
      "Cheese": 3
    }
  },
  "Lemon Cheesecake": {
    "name": "Lemon Cheesecake",
    "ingredients": {
      "Lemon": 20,
      "Cheese": 5,
      "Egg": 40
    }
  },
  "Cabbers n Mash": {
    "name": "Cabbers n Mash",
    "ingredients": {
      "Mashed Potato": 10,
      "Cabbage": 20
    }
  },
  "Bumpkin Roast": {
    "name": "Bumpkin Roast",
    "ingredients": {
      "Mashed Potato": 20,
      "Roast Veggies": 5
    }
  },
  "Goblin Brunch": {
    "name": "Goblin Brunch",
    "ingredients": {
      "Boiled Eggs": 5,
      "Goblin's Treat": 1
    }
  },
  "Fish n Chips": {
    "name": "Fish n Chips",
    "ingredients": {
      "Fancy Fries": 1,
      "Halibut": 1
    }
  }
};

/**
 * Look up recipe by name with normalized fallback
 */
export function getRecipe(name) {
  if (!name) return null;
  if (COOKING_RECIPES[name]) return COOKING_RECIPES[name];
  const lower = String(name).toLowerCase().trim();
  for (const [key, val] of Object.entries(COOKING_RECIPES)) {
    if (key.toLowerCase().trim() === lower) return val;
  }
  const clean = lower.replace(/[^a-z0-9]/g, '');
  for (const [key, val] of Object.entries(COOKING_RECIPES)) {
    if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === clean) return val;
  }
  return null;
}

/**
 * Returns direct ingredients for a recipe
 */
export function getRecipeIngredients(name) {
  const r = getRecipe(name);
  return r ? r.ingredients : null;
}

/**
 * Recursively resolves a recipe down to its base raw ingredients.
 * For example: "Blue Cheese" requires 2 Cheese and 10 Blueberries.
 * Since Cheese requires 3 Milk, this resolves to { Milk: 6, Blueberry: 10 }.
 */
export function getBaseIngredients(name, multiplier = 1, visited = new Set()) {
  const r = getRecipe(name);
  if (!r || !r.ingredients) return { [name]: multiplier };
  if (visited.has(name)) return { [name]: multiplier };
  visited.add(name);

  const baseTotals = {};
  for (const [ingName, count] of Object.entries(r.ingredients)) {
    const totalCount = count * multiplier;
    const subRecipe = getRecipe(ingName);
    if (subRecipe && subRecipe.ingredients) {
      const subBases = getBaseIngredients(ingName, totalCount, new Set(visited));
      for (const [bName, bCount] of Object.entries(subBases)) {
        baseTotals[bName] = (baseTotals[bName] || 0) + bCount;
      }
    } else {
      baseTotals[ingName] = (baseTotals[ingName] || 0) + totalCount;
    }
  }
  return baseTotals;
}

/**
 * Checks if a recipe is craftable from current inventory.
 * Supports intermediate recipe crafting: if a recipe requires an item like "Cheese",
 * and the player has 0 Cheese but has enough "Milk" (3 Milk per Cheese),
 * it correctly determines that Cheese can be crafted.
 */
export function canCraftRecipe(recipeName, inventory = {}) {
  const recipe = getRecipe(recipeName);
  if (!recipe || !recipe.ingredients) return false;

  for (const [ingName, count] of Object.entries(recipe.ingredients)) {
    const inBag = Math.floor(parseFloat(inventory?.[ingName] || 0));
    if (inBag >= count) continue;

    // Check if missing ingredient can be crafted from sub-recipe
    const subRecipe = getRecipe(ingName);
    if (!subRecipe || !subRecipe.ingredients) return false;

    const neededSubCount = count - inBag;
    const subBases = getBaseIngredients(ingName, neededSubCount);
    for (const [baseName, baseCount] of Object.entries(subBases)) {
      const baseInBag = Math.floor(parseFloat(inventory?.[baseName] || 0));
      if (baseInBag < baseCount) return false;
    }
  }

  return true;
}
