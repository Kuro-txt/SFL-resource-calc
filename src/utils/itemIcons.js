/**
 * Shared Item Icon Resolver for Dashboard and UI Panels.
 * Resolves local game asset icons with dynamic Edge CDN resolution and seamless fallback to emojis.
 */
import { normalizeItemKey } from './formatters.js';
import { KNOWN_IDS, ITEM_IDS } from '../data/knownIds.js';
import { TRANSPARENT_BOOST_SPRITES } from '../data/transparentBoostSprites.js';

export const ITEM_IMAGE_PATHS = {
  "greenhousegoodie": "./public/icons/aging/greenhouse_goodie.webp",
  "refinedsalt": "./public/icons/aging/refined_salt.webp",
  "sproutrootsurprise": "./public/icons/aging/sproutroot_surprise.webp",
  "turbofruitmix": "./public/icons/aging/turbofruit_mix.webp",
  "egg": "./public/icons/animals/egg.png",
  "feather": "./public/icons/animals/feather.webp",
  "barndelight": "./public/icons/animals/food/barn_delight.webp",
  "hay": "./public/icons/animals/food/hay.webp",
  "kernelblend": "./public/icons/animals/food/kernel_blend.webp",
  "mixedgrain": "./public/icons/animals/food/mixed_grain.webp",
  "nutribarley": "./public/icons/animals/food/nutri_barley.webp",
  "leather": "./public/icons/animals/leather.webp",
  "merinowool": "./public/icons/animals/merino_wool.webp",
  "milk": "./public/icons/animals/milk.webp",
  "wool": "./public/icons/animals/wool.webp",
  "basicbear": "./public/icons/bears/basic_bear.png",
  "spabear": "./public/icons/bears/spa_bear.webp",
  "cowbed": "./public/icons/beds/cow_bed.webp",
  "desertbed": "./public/icons/beds/desert_bed.webp",
  "fisherbed": "./public/icons/beds/fisher_bed.webp",
  "flowerbed": "./public/icons/beds/flower_bed.webp",
  "piratebed": "./public/icons/beds/pirate_bed.webp",
  "royalbed": "./public/icons/beds/royal_bed.webp",
  "sturdybed": "./public/icons/beds/sturdy_bed.webp",
  "craftingbox": "./public/icons/buildings/crafting_box.webp",
  "lavapit": "./public/icons/buildings/lava_pit.webp",
  "bumpkinemblem": "./public/icons/bumpkin_emblem.webp",
  "camelbone": "./public/icons/camel_bone.webp",
  "chest": "./public/icons/chest.png",
  "cockleshell": "./public/icons/cockle_shell.webp",
  "compost": "./public/icons/composters/compost.png",
  "earthworm": "./public/icons/composters/earthworm.png",
  "fishinglure": "./public/icons/composters/fishing_lure.png",
  "fruitfulblend": "./public/icons/composters/fruitful_blend.png",
  "grub": "./public/icons/composters/grub.png",
  "rapidroot": "./public/icons/composters/rapid_root.png",
  "redwiggler": "./public/icons/composters/red_wiggler.png",
  "sproutmix": "./public/icons/composters/sprout_mix.png",
  "crimstone": "./public/icons/crimstone.png",
  "artichoke": "./public/icons/crops/artichoke.png",
  "barley": "./public/icons/crops/barley.png",
  "beetroot": "./public/icons/crops/beetroot.png",
  "broccoli": "./public/icons/crops/broccoli.png",
  "cabbage": "./public/icons/crops/cabbage.png",
  "carrot": "./public/icons/crops/carrot.png",
  "cauliflower": "./public/icons/crops/cauliflower.png",
  "corn": "./public/icons/crops/corn.png",
  "eggplant": "./public/icons/crops/eggplant.png",
  "kale": "./public/icons/crops/kale.png",
  "onion": "./public/icons/crops/onion.png",
  "parsnip": "./public/icons/crops/parsnip.png",
  "pepper": "./public/icons/crops/pepper.png",
  "potato": "./public/icons/crops/potato.png",
  "pumpkin": "./public/icons/crops/pumpkin.png",
  "radish": "./public/icons/crops/radish.png",
  "rhubarb": "./public/icons/crops/rhubarb.png",
  "soybean": "./public/icons/crops/soybean.png",
  "sunflower": "./public/icons/crops/sunflower.png",
  "turnip": "./public/icons/crops/turnip.png",
  "wheat": "./public/icons/crops/wheat.png",
  "yam": "./public/icons/crops/yam.png",
  "zucchini": "./public/icons/crops/zucchini.png",
  "anglerdoll": "./public/icons/dolls/angler_doll.webp",
  "bigfindoll": "./public/icons/dolls/bigfin_doll.webp",
  "bloomdoll": "./public/icons/dolls/bloom_doll.webp",
  "buzzdoll": "./public/icons/dolls/buzz_doll.webp",
  "clukydoll": "./public/icons/dolls/cluky_doll.webp",
  "cosmodoll": "./public/icons/dolls/cosmo_doll.webp",
  "crudedoll": "./public/icons/dolls/crude_doll.webp",
  "doll": "./public/icons/dolls/doll.webp",
  "dunedoll": "./public/icons/dolls/dune_doll.webp",
  "emberdoll": "./public/icons/dolls/ember_doll.webp",
  "frostydoll": "./public/icons/dolls/frosty_doll.webp",
  "gildeddoll": "./public/icons/dolls/gilded_doll.webp",
  "grubbydoll": "./public/icons/dolls/grubby_doll.webp",
  "harvestdoll": "./public/icons/dolls/harvest_doll.webp",
  "juicydoll": "./public/icons/dolls/juicy_doll.webp",
  "lumberdoll": "./public/icons/dolls/lumber_doll.webp",
  "lunardoll": "./public/icons/dolls/lunar_doll.webp",
  "moodoll": "./public/icons/dolls/moo_doll.webp",
  "mousedoll": "./public/icons/dolls/mouse_doll.webp",
  "nefaridoll": "./public/icons/dolls/nefari_doll.webp",
  "saltdoll": "./public/icons/dolls/salt_doll.webp",
  "shadowdoll": "./public/icons/dolls/shadow_doll.webp",
  "sizzlerdoll": "./public/icons/dolls/sizzler_doll.webp",
  "solardoll": "./public/icons/dolls/solar_doll.webp",
  "woolydoll": "./public/icons/dolls/wooly_doll.webp",
  "anchovy": "./public/icons/fish/anchovy.png",
  "angelfish": "./public/icons/fish/angel_fish.png",
  "barredknifejaw": "./public/icons/fish/barred_knifejaw.png",
  "battlefish": "./public/icons/fish/battle_fish.webp",
  "blowfish": "./public/icons/fish/blowfish.png",
  "bluemarlin": "./public/icons/fish/blue_marlin.png",
  "butterflyfish": "./public/icons/fish/butterfly_fish.png",
  "clownfish": "./public/icons/fish/clownfish.png",
  "coelacanth": "./public/icons/fish/coelacanth.png",
  "copia": "./public/icons/fish/copia.png",
  "cowfish": "./public/icons/fish/cow_fish.webp",
  "crimsoncarp": "./public/icons/fish/crimson_carp.png",
  "crystalshrimp": "./public/icons/fish/crystal_shrimp.webp",
  "deepseapig": "./public/icons/fish/deep_sea_pig.webp",
  "deepseaslug": "./public/icons/fish/deep_sea_slug.webp",
  "dollocaris": "./public/icons/fish/dollocaris.webp",
  "footballfish": "./public/icons/fish/football_fish.png",
  "gildedswordfish": "./public/icons/fish/gilded_swordfish.png",
  "halibut": "./public/icons/fish/halibut.png",
  "hammerheadshark": "./public/icons/fish/hammerhead_shark.png",
  "horsemackerel": "./public/icons/fish/horse_mackerel.png",
  "isopod": "./public/icons/fish/isopod.webp",
  "jellyfish": "./public/icons/fish/jellyfish.webp",
  "lemonshark": "./public/icons/fish/lemon_shark.webp",
  "mahimahi": "./public/icons/fish/mahi_mahi.png",
  "morayeel": "./public/icons/fish/moray_eel.png",
  "muskellunge": "./public/icons/fish/muskellunge.png",
  "napoleonfish": "./public/icons/fish/napoleonfish.png",
  "nautilus": "./public/icons/fish/nautilus.webp",
  "oarfish": "./public/icons/fish/oarfish.png",
  "oliveflounder": "./public/icons/fish/olive_flounder.png",
  "parrotfish": "./public/icons/fish/parrot_fish.png",
  "phantombarracuda": "./public/icons/fish/phantom_barracuda.png",
  "pinkdolphin": "./public/icons/fish/pink_dolphin.webp",
  "porgy": "./public/icons/fish/porgy.png",
  "radiantray": "./public/icons/fish/radiant_ray.png",
  "ray": "./public/icons/fish/ray.png",
  "redsnapper": "./public/icons/fish/red_snapper.png",
  "rockblackfish": "./public/icons/fish/rock_blackfish.png",
  "sawshark": "./public/icons/fish/saw_shark.png",
  "seahorse": "./public/icons/fish/seahorse.png",
  "seabass": "./public/icons/fish/sea_bass.png",
  "squid": "./public/icons/fish/squid.png",
  "starlighttuna": "./public/icons/fish/starlight_tuna.png",
  "sunfish": "./public/icons/fish/sunfish.png",
  "surgeonfish": "./public/icons/fish/surgeonfish.png",
  "tilapia": "./public/icons/fish/tilapia.png",
  "trout": "./public/icons/fish/trout.png",
  "tuna": "./public/icons/fish/tuna.png",
  "twilightanglerfish": "./public/icons/fish/twilight_anglerfish.png",
  "walleye": "./public/icons/fish/walleye.png",
  "weakfish": "./public/icons/fish/weak_fish.png",
  "whaleshark": "./public/icons/fish/whale_shark.png",
  "whiteshark": "./public/icons/fish/white_shark.png",
  "zebraturkeyfish": "./public/icons/fish/zebra_turkeyfish.png",
  "blueballoonflower": "./public/icons/flowers/blue_balloon_flower.webp",
  "bluecarnation": "./public/icons/flowers/blue_carnation.png",
  "blueclover": "./public/icons/flowers/blue_clover.webp",
  "bluecosmos": "./public/icons/flowers/blue_cosmos.webp",
  "bluedaffodil": "./public/icons/flowers/blue_daffodil.webp",
  "blueedelweiss": "./public/icons/flowers/blue_edelweiss.png",
  "bluegladiolus": "./public/icons/flowers/blue_gladiolus.png",
  "bluelavender": "./public/icons/flowers/blue_lavender.webp",
  "bluelotus": "./public/icons/flowers/blue_lotus.webp",
  "bluepansy": "./public/icons/flowers/blue_pansy.webp",
  "celestialfrostbloom": "./public/icons/flowers/celestial_frostbloom.webp",
  "chamomile": "./public/icons/flowers/chamomile.webp",
  "lunalist": "./public/icons/flowers/lunalist.webp",
  "primulaenigma": "./public/icons/flowers/primula_enigma.webp",
  "prismpetal": "./public/icons/flowers/prism_petal.webp",
  "petbed": "./public/icons/pets/pet_bed.webp",
  "petbowls": "./public/icons/pets/pet_bowls.webp",
  "petcookie": "./public/icons/pets/pet_cookie.webp",
  "petegg": "./public/icons/pets/pet_egg.png",
  "petkennel": "./public/icons/pets/pet_kennel.webp",
  "petnftegg": "./public/icons/pets/pet_nft_egg.png",
  "petnipplant": "./public/icons/pets/petnip_plant.webp",
  "petplayground": "./public/icons/pets/pet_playground.webp",
  "petrug": "./public/icons/pets/pet_rug.webp",
  "pettinghand": "./public/icons/pets/petting_hand.webp",
  "pettoys": "./public/icons/pets/pet_toys.webp",
  "pettree": "./public/icons/pets/pet_tree.webp",
  "purpleballoonflower": "./public/icons/flowers/purple_balloon_flower.webp",
  "purplecarnation": "./public/icons/flowers/purple_carnation.png",
  "purpleclover": "./public/icons/flowers/purple_clover.webp",
  "purplecosmos": "./public/icons/flowers/purple_cosmos.webp",
  "purpledaffodil": "./public/icons/flowers/purple_daffodil.webp",
  "purpleedelweiss": "./public/icons/flowers/purple_edelweiss.png",
  "purplegladiolus": "./public/icons/flowers/purple_gladiolus.png",
  "purplelavender": "./public/icons/flowers/purple_lavender.webp",
  "purplelotus": "./public/icons/flowers/purple_lotus.webp",
  "purplepansy": "./public/icons/flowers/purple_pansy.webp",
  "redballoonflower": "./public/icons/flowers/red_balloon_flower.webp",
  "redcarnation": "./public/icons/flowers/red_carnation.png",
  "redclover": "./public/icons/flowers/red_clover.webp",
  "redcosmos": "./public/icons/flowers/red_cosmos.webp",
  "reddaffodil": "./public/icons/flowers/red_daffodil.webp",
  "rededelweiss": "./public/icons/flowers/red_edelweiss.png",
  "redgladiolus": "./public/icons/flowers/red_gladiolus.png",
  "redlavender": "./public/icons/flowers/red_lavender.webp",
  "redlotus": "./public/icons/flowers/red_lotus.webp",
  "redpansy": "./public/icons/flowers/red_pansy.webp",
  "venusbumpkintrap": "./public/icons/flowers/venus_bumpkin_trap.webp",
  "whiteballoonflower": "./public/icons/flowers/white_balloon_flower.webp",
  "whitecarnation": "./public/icons/flowers/white_carnation.png",
  "whiteclover": "./public/icons/flowers/white_clover.webp",
  "whitecosmos": "./public/icons/flowers/white_cosmos.webp",
  "whitedaffodil": "./public/icons/flowers/white_daffodil.webp",
  "whiteedelweiss": "./public/icons/flowers/white_edelweiss.png",
  "whitegladiolus": "./public/icons/flowers/white_gladiolus.png",
  "whitelavender": "./public/icons/flowers/white_lavender.webp",
  "whitelotus": "./public/icons/flowers/white_lotus.webp",
  "whitepansy": "./public/icons/flowers/white_pansy.webp",
  "yellowballoonflower": "./public/icons/flowers/yellow_balloon_flower.webp",
  "yellowcarnation": "./public/icons/flowers/yellow_carnation.png",
  "yellowclover": "./public/icons/flowers/yellow_clover.webp",
  "yellowcosmos": "./public/icons/flowers/yellow_cosmos.webp",
  "yellowdaffodil": "./public/icons/flowers/yellow_daffodil.webp",
  "yellowedelweiss": "./public/icons/flowers/yellow_edelweiss.png",
  "yellowgladiolus": "./public/icons/flowers/yellow_gladiolus.png",
  "yellowlavender": "./public/icons/flowers/yellow_lavender.webp",
  "yellowlotus": "./public/icons/flowers/yellow_lotus.webp",
  "yellowpansy": "./public/icons/flowers/yellow_pansy.webp",
  "antipasto": "./public/icons/food/antipasto.webp",
  "applejuice": "./public/icons/food/apple_juice.png",
  "applepie": "./public/icons/food/apple_pie.png",
  "bananablast": "./public/icons/food/banana_blast.png",
  "beetrootblaze": "./public/icons/food/beetroot_blaze.png",
  "blueberryjam": "./public/icons/food/blueberry_jam.png",
  "bluecheese": "./public/icons/food/blue_cheese.webp",
  "boiledeggs": "./public/icons/food/boiled_eggs.png",
  "bumpkinbroth": "./public/icons/food/bumpkin_broth.png",
  "bumpkindetox": "./public/icons/food/bumpkin_detox.png",
  "bumpkinganoush": "./public/icons/food/bumpkin_ganoush.png",
  "bumpkinroast": "./public/icons/food/bumpkin_roast.png",
  "bumpkinsalad": "./public/icons/food/bumpkin_salad.png",
  "cabbersnmash": "./public/icons/food/cabbers_n_mash.png",
  "beetrootcake": "./public/icons/food/cakes/beetroot_cake.png",
  "cabbagecake": "./public/icons/food/cakes/cabbage_cake.png",
  "carrotcake": "./public/icons/food/cakes/carrot_cake.png",
  "cauliflowercake": "./public/icons/food/cakes/cauliflower_cake.png",
  "eggplantcake": "./public/icons/food/cakes/eggplant_cake.png",
  "honeycake": "./public/icons/food/cakes/honey_cake.png",
  "orangecake": "./public/icons/food/cakes/orange_cake.png",
  "parsnipcake": "./public/icons/food/cakes/parsnip_cake.png",
  "piratecake": "./public/icons/food/cakes/pirate_cake.webp",
  "potatocake": "./public/icons/food/cakes/potato_cake.png",
  "pumpkincake": "./public/icons/food/cakes/pumpkin_cake.png",
  "radishcake": "./public/icons/food/cakes/radish_cake.png",
  "sunflowercake": "./public/icons/food/cakes/sunflower_cake.png",
  "wheatcake": "./public/icons/food/cakes/wheat_cake.png",
  "caponata": "./public/icons/food/caponata.webp",
  "capresesalad": "./public/icons/food/caprese_salad.webp",
  "carrotjuice": "./public/icons/food/carrot_juice.webp",
  "carrotsandwich": "./public/icons/food/carrot_sandwich.png",
  "cauliflowerburger": "./public/icons/food/cauliflower_burger.png",
  "cheese": "./public/icons/food/cheese.webp",
  "chickendrumstick": "./public/icons/food/chicken_drumstick.png",
  "chowder": "./public/icons/food/chowder.png",
  "clubsandwich": "./public/icons/food/club_sandwich.png",
  "cornbread": "./public/icons/food/corn_bread.png",
  "fancyfries": "./public/icons/food/fancy_fries.png",
  "fermentedcarrots": "./public/icons/food/fermented_carrots.png",
  "fermentedfish": "./public/icons/food/fermented_fish.png",
  "fishandchips": "./public/icons/food/fish_and_chips.webp",
  "fishburger": "./public/icons/food/fish_burger.webp",
  "fishomelette": "./public/icons/food/fish_omelette.webp",
  "friedcalamari": "./public/icons/food/fried_calamari.webp",
  "friedtofu": "./public/icons/food/fried_tofu.png",
  "fruitsalad": "./public/icons/food/fruit_salad.png",
  "glazedcarrots": "./public/icons/food/glazed_carrots.webp",
  "goblinstreat": "./public/icons/food/goblins_treat.png",
  "goblinbrunch": "./public/icons/food/goblin_brunch.png",
  "grapejuice": "./public/icons/food/grape_juice.webp",
  "gumbo": "./public/icons/food/gumbo.png",
  "honeychedder": "./public/icons/food/honey_chedder.webp",
  "honeytreat": "./public/icons/food/honey_treat.webp",
  "kaleomelette": "./public/icons/food/kale_omelette.png",
  "kalestew": "./public/icons/food/kale_stew.png",
  "lemoncheesecake": "./public/icons/food/lemon_cheesecake.webp",
  "mashedpotato": "./public/icons/food/mashed_potato.png",
  "mushroomjacketpotato": "./public/icons/food/mushroom_jacket_potato.png",
  "mushroomkalepie": "./public/icons/food/mushroom_kale_pie.png",
  "mushroomsoup": "./public/icons/food/mushroom_soup.png",
  "oceansolive": "./public/icons/food/oceans_olive.webp",
  "orangejuice": "./public/icons/food/orange_juice.png",
  "paella": "./public/icons/food/paella.webp",
  "pancakes": "./public/icons/food/pancakes.png",
  "pizzamarguerita": "./public/icons/food/pizza_marguerita.webp",
  "popcorn": "./public/icons/food/popcorn.png",
  "powersmoothie": "./public/icons/food/power_smoothie.png",
  "pumpkinsoup": "./public/icons/food/pumpkin_soup.png",
  "purplesmoothie": "./public/icons/food/purple_smoothie.png",
  "quickjuice": "./public/icons/food/quick_juice.webp",
  "radishpie": "./public/icons/food/radish_pie.png",
  "rapidroast": "./public/icons/food/rapid_roast.png",
  "redrice": "./public/icons/food/red_rice.webp",
  "reindeercarrot": "./public/icons/food/reindeer_carrot.png",
  "rhubarbtart": "./public/icons/food/rhubarb_tart.webp",
  "ricebun": "./public/icons/food/rice_bun.webp",
  "roastedcauliflower": "./public/icons/food/roasted_cauliflower.png",
  "roastveggies": "./public/icons/food/roast_veggies.png",
  "saltlick": "./public/icons/food/salt_lick.webp",
  "sauerkraut": "./public/icons/food/sauerkraut.png",
  "seafoodbasket": "./public/icons/food/seafood_basket.webp",
  "shroomsyrup": "./public/icons/food/shroom_syrup.png",
  "slowjuice": "./public/icons/food/slow_juice.webp",
  "sourshake": "./public/icons/food/sour_shake.webp",
  "spaghettiallimone2": "./public/icons/food/spaghetti_al_limone2.webp",
  "spicebase": "./public/icons/food/spice_base.webp",
  "sunflowercrunch": "./public/icons/food/sunflower_crunch.png",
  "sushiroll": "./public/icons/food/sushi_roll.webp",
  "thelot": "./public/icons/food/the_lot.webp",
  "tofuscramble": "./public/icons/food/tofu_scramble.png",
  "tradecake": "./public/icons/food/trade_cake.webp",
  "apple": "./public/icons/fruit/apple.png",
  "banana": "./public/icons/fruit/banana.png",
  "blueberry": "./public/icons/fruit/blueberry.png",
  "lemon": "./public/icons/fruit/lemon.webp",
  "orange": "./public/icons/fruit/orange.png",
  "tomato": "./public/icons/fruit/tomato.webp",
  "gem": "./public/icons/gem.webp",
  "goblinemblem": "./public/icons/goblin_emblem.webp",
  "gold": "./public/icons/gold.png",
  "grape": "./public/icons/greenhouse/grape.webp",
  "olive": "./public/icons/greenhouse/olive.webp",
  "rice": "./public/icons/greenhouse/rice.webp",
  "heartleaf": "./public/icons/heartleaf.webp",
  "hieroglyph": "./public/icons/hieroglyph.webp",
  "honey": "./public/icons/honey.png",
  "iron": "./public/icons/iron.png",
  "moonfur": "./public/icons/moonfur.webp",
  "nightshadeemblem": "./public/icons/nightshade_emblem.webp",
  "obsidian": "./public/icons/obsidian.webp",
  "oil": "./public/icons/oil.webp",
  "pickledbroccoli": "./public/icons/pickled/pickled_broccoli.webp",
  "pickledcabbage": "./public/icons/pickled/pickled_cabbage.webp",
  "pickledonion": "./public/icons/pickled/pickled_onion.webp",
  "pickledpepper": "./public/icons/pickled/pickled_pepper.webp",
  "pickledradish": "./public/icons/pickled/pickled_radish.webp",
  "pickledtomato": "./public/icons/pickled/pickled_tomato.webp",
  "pickledzucchini": "./public/icons/pickled/pickled_zucchini.webp",
  "crabstick": "./public/icons/processed/crab_stick.webp",
  "creamycrabbite": "./public/icons/processed/creamy_crab_bite.webp",
  "crimstoneinfusedfishoil": "./public/icons/processed/crimstone_infused_fish_oil.webp",
  "fishflake": "./public/icons/processed/fish_flake.webp",
  "fishoil": "./public/icons/processed/fish_oil.webp",
  "fishstick": "./public/icons/processed/fish_stick.webp",
  "furikakesprinkle": "./public/icons/processed/furikake_sprinkle.webp",
  "surimiricebowl": "./public/icons/processed/surimi_rice_bowl.webp",
  "ruffroot": "./public/icons/ruffroot.webp",
  "salt": "./public/icons/salt.webp",
  "sand": "./public/icons/sand.webp",
  "scarab": "./public/icons/scarab.webp",
  "stone": "./public/icons/stone.png",
  "sunflorianemblem": "./public/icons/sunflorian_emblem.webp",
  "sunstone": "./public/icons/sunstone.png",
  "wood": "./public/icons/wood.png",
  "greenbeetle": "./public/icons/green_beetle.webp",
  "bluebeetle": "./public/icons/blue_beetle.webp",
  "pinkbeetle": "./public/icons/pink_beetle.webp",
  "amberbeetle": "./public/icons/amber_beetle.webp",
  "pigbristles": "./public/icons/pig_bristles.webp",
  "pigbristle": "./public/icons/pig_bristles.webp",
  "truffle": "./public/icons/truffle.webp",
  "truffles": "./public/icons/truffle.webp",
  "coins": "./assets/coins.webp",
  "coin": "./assets/coins.webp",
  "currentcoins": "./assets/coins.webp",
  "flower": "./assets/flower.webp",
  "flowers": "./assets/flower.webp",
  "sfl": "./assets/flower.webp",
  "flowertoken": "./assets/flower.webp",
  "deliveryflowers": "./assets/flower.webp",
  "gems": "./public/icons/gem.webp"
};

export const FALLBACK_EMOJIS = {
  "coins": "🪙",
  "coin": "🪙",
  "gem": "💎",
  "gems": "💎",
  "egg": "🥚",
  "milk": "🥛",
  "feather": "🪶",
  "leather": "👞",
  "wool": "🧶",
  "merinowool": "🐑",
  "honey": "🍯",
  "wood": "🪵",
  "stone": "🪨",
  "iron": "⛓️",
  "gold": "🪙",
  "crimstone": "💎",
  "obsidian": "⬛",
  "salt": "🧂",
  "greenbeetle": "🪲",
  "bluebeetle": "🪲",
  "pinkbeetle": "🪲",
  "amberbeetle": "🪲",
  "pigbristles": "🐗",
  "pigbristle": "🐗",
  "truffle": "🍄",
  "truffles": "🍄",
  "sunflower": "🌻",
  "potato": "🥔",
  "pumpkin": "🎃",
  "carrot": "🥕",
  "cabbage": "🥬",
  "beetroot": "🟣",
  "cauliflower": "🥦",
  "parsnip": "🥕",
  "eggplant": "🍆",
  "corn": "🌽",
  "radish": "🔴",
  "wheat": "🌾",
  "kale": "🥬",
  "soybean": "🫘",
  "barley": "🌾",
  "rhubarb": "🌱",
  "zucchini": "🥒",
  "yam": "🍠",
  "broccoli": "🥦",
  "pepper": "🌶️",
  "onion": "🧅",
  "turnip": "🪴",
  "artichoke": "🌿",
  "duskberry": "🫐",
  "lunara": "✨",
  "celestine": "💎",
  "grape": "🍇",
  "rice": "🌾",
  "olive": "🫒",
  "tomato": "🍅",
  "lemon": "🍋",
  "blueberry": "🫐",
  "orange": "🍊",
  "apple": "🍎",
  "banana": "🍌",
  "goblinemblem": "👺",
  "bumpkinemblem": "🧑‍🌾",
  "sunflorianemblem": "🌻",
  "nightshadeemblem": "🌙",
  "ruffroot": "🌿",
  "chewedbone": "🦴",
  "heartleaf": "🍃",
  "crystalleaf": "🍃",
  "moonfur": "🐾",
  "ribbon": "🎀",
  "dewberry": "🫐",
  "wildgrass": "🌾",
  "frostpebble": "🪨",
  "capsulebait": "💊",
  "umbrellabait": "☂️",
  "crimsonbaitfish": "🐟",
  "chest": "📦"
};

// Pre-compute lowercased lookup maps for fast case-insensitive item resolution
const LOWER_KNOWN_IDS = Object.fromEntries(
  Object.entries(KNOWN_IDS || {}).map(([k, v]) => [k.toLowerCase().trim(), v])
);
const LOWER_ITEM_IDS = Object.fromEntries(
  Object.entries(ITEM_IDS || {}).map(([k, v]) => [k.toLowerCase().trim(), v])
);

/**
 * Resolves remote Edge CDN URLs for game items (Collectibles/SFTs and Bumpkin Wearables).
 * Prioritizes raw in-game transparent sprites from Sunflower Land repo without background.
 */
export function getItemCdnUrls(name, options = {}) {
  if (!name) return null;
  const rawClean = String(name).toLowerCase().trim();
  const normalized = normalizeItemKey(name);

  // 1. Transparent in-game boost sprite check (Zero background!)
  const boostSpritePath = TRANSPARENT_BOOST_SPRITES[rawClean] || TRANSPARENT_BOOST_SPRITES[normalized];
  if (boostSpritePath && (options.isBoost || options.preferTransparent)) {
    return {
      type: 'transparent',
      primary: `https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/${boostSpritePath}`,
      fallback: `https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/${boostSpritePath}`
    };
  }

  // 2. Wearables check
  const preferWearable = options.isWearable || (options.isBoost && normalized === 'parsnip');

  if (preferWearable) {
    const wearableId = LOWER_ITEM_IDS[rawClean] || LOWER_ITEM_IDS[normalized];
    if (wearableId) {
      return {
        id: wearableId,
        type: 'wearable',
        primary: `https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/wearables/${wearableId}.webp`,
        fallback: `https://sunflower-land.com/play/wearables/images/${wearableId}.png`
      };
    }
  }

  // 3. Fallback transparent sprite check if present
  if (boostSpritePath) {
    return {
      type: 'transparent',
      primary: `https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/${boostSpritePath}`,
      fallback: `https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/${boostSpritePath}`
    };
  }

  // 4. Collectibles / ERC1155 check
  const sftId = LOWER_KNOWN_IDS[rawClean] || LOWER_KNOWN_IDS[normalized];
  if (sftId) {
    return {
      id: sftId,
      type: 'sft',
      primary: `https://sunflower-land.com/play/erc1155/images/${sftId}.webp`,
      fallback: `https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/public/erc1155/images/${sftId}.webp`
    };
  }

  // 5. Fallback check in wearables if not found in collectibles
  const wearableId = LOWER_ITEM_IDS[rawClean] || LOWER_ITEM_IDS[normalized];
  if (wearableId) {
    return {
      id: wearableId,
      type: 'wearable',
      primary: `https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/wearables/${wearableId}.webp`,
      fallback: `https://sunflower-land.com/play/wearables/images/${wearableId}.png`
    };
  }

  return null;
}

/**
 * Returns an HTML string rendering either the asset image icon, dynamic Edge CDN icon, or a fallback emoji.
 * Sized appropriately for dashboard item rows and badges.
 */
export function getItemIcon(name, options = {}) {
  const clean = normalizeItemKey(name);
  const imgPath = ITEM_IMAGE_PATHS[clean];
  const isParsnipWearable = options.isWearable || (options.isBoost && clean === 'parsnip');
  const fallback = options.fallback || (isParsnipWearable ? '⚡' : FALLBACK_EMOJIS[clean]) || (options.isBoost ? '⚡' : '📦');
  const sizeClass = options.className || 'w-5 h-5 sm:w-5.5 sm:h-5.5';

  // For boosts, always prioritize the transparent sprite over any local crop/resource image
  if (options.isBoost) {
    const cdn = getItemCdnUrls(name, options);
    if (cdn) {
      return `<img src="${cdn.primary}" class="${sizeClass} object-contain inline-block shrink-0 select-none align-middle" alt="${name}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='${cdn.fallback}'; this.onerror=function(){ this.outerHTML='<span class=\\'select-none\\'>${fallback}</span>'; };" />`;
    }
  }

  // 1. If local static asset exists in repository, use it directly (unless wearable override or forceRemote is requested)
  if (imgPath && !options.forceRemote && !isParsnipWearable) {
    return `<img src="${imgPath}" class="${sizeClass} object-contain inline-block shrink-0 select-none align-middle" alt="${name}" loading="lazy" decoding="async" onerror="this.outerHTML='<span class=\\'select-none\\'>${fallback}</span>'" />`;
  }

  // 2. Otherwise resolve dynamically from Sunflower Land Edge CDN (zero repo storage)
  const cdn = getItemCdnUrls(name, options);
  if (cdn) {
    return `<img src="${cdn.primary}" class="${sizeClass} object-contain inline-block shrink-0 select-none align-middle" alt="${name}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='${cdn.fallback}'; this.onerror=function(){ this.outerHTML='<span class=\\'select-none\\'>${fallback}</span>'; };" />`;
  }

  // 3. Fallback to emoji if no icon ID found
  return `<span class="select-none text-base sm:text-lg shrink-0">${fallback}</span>`;
}

/**
 * Returns the raw asset path if available, or remote CDN URL, or null.
 */
export function getItemIconPath(name, options = {}) {
  const clean = normalizeItemKey(name);
  if (ITEM_IMAGE_PATHS[clean] && !options.forceRemote) {
    return ITEM_IMAGE_PATHS[clean];
  }
  const cdn = getItemCdnUrls(name, options);
  return cdn ? cdn.primary : null;
}

/**
 * Returns the fallback emoji for the item name.
 */
export function getItemFallbackEmoji(name) {
  const clean = normalizeItemKey(name);
  return FALLBACK_EMOJIS[clean] || '📦';
}
