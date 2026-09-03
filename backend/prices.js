const CROP_FLOWER_PRICES = {
  "sunflower": 0.0003,
  "potato": 0.00031,
  "pumpkin": 0.0010,
  "carrot": 0.00186,
  "cabbage": 0.00146,
  "beetroot": 0.0060,
  "cauliflower": 0.00675,
  "parsnip": 0.0120,
  "eggplant": 0.0080,
  "corn": 0.0111,
  "radish": 0.00859,
  "wheat": 0.01866,
  "kale": 0.0185,
  "soybean": 0.0018,
  "barley": 0.0200,
  "rhubarb": 0.00058,
  "zucchini": 0.00061,
  "yam": 0.00251,
  "broccoli": 0.00363,
  "pepper": 0.00697,
  "onion": 0.01214,
  "turnip": 0.01061,
  "artichoke": 0.00983,
  "grape": 0.23666,
  "rice": 0.25658,
  "olive": 0.29894,
  "tomato": 0.00478,
  "lemon": 0.00986,
  "blueberry": 0.01384,
  "orange": 0.01399,
  "apple": 0.01830,
  "banana": 0.01998
};

  function getFlowerUnitPrice(cleanKey) {
    let matchedKey = Object.keys(flatPrices).find(k => {
      let norm = k.replace(/^\[.*?\]\s*/, '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      return norm === cleanKey;
    });
    if (matchedKey) {
      let p = parseFloat(flatPrices[matchedKey]) || 0;
      if (p > 0) return p > 100 ? p / 1000 : p;
    }
    if (CROP_FLOWER_PRICES[cleanKey] !== undefined) {
      return CROP_FLOWER_PRICES[cleanKey];
    }
    return 0.01;
  }

module.exports = {
  CROP_FLOWER_PRICES,
  getFlowerUnitPrice
};
