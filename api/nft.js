export default async function handler(req, res) {
  try {
    const response = await fetch('https://sfl.world/api/v1/nfts', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://sfl.world/',
        'Origin': 'https://sfl.world'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `API responded with status ${response.status}` });
    }

    let rawData = await response.json();

    let rawItems = [];
    if (Array.isArray(rawData)) {
      rawItems = rawData;
    } else if (rawData && typeof rawData === 'object') {
      rawItems = rawData.data || rawData.nfts || rawData.items || Object.values(rawData);
    }

    const cleanedList = rawItems.map(item => {
      if (!item || typeof item !== 'object') return null;
      const name = String(item.name || item.title || item.itemName || '').trim();
      if (!name || name === 'Unknown NFT') return null;

      const rawPrice = item.floor ?? item.price ?? item.lastSalePrice ?? 0;
      const price = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 0;

      const boostText = String(item.boost_text || item.boost || '').trim();
      let boost = "No Boost";
      if (boostText) {
        boost = boostText;
      } else if (item.have_boost) {
        boost = "Boost Active";
      }

      return { name, price, boost };
    }).filter(Boolean);

    if (cleanedList.length > 0) {
      return res.status(200).json(cleanedList);
    }

    return res.status(500).json({ error: "Parsed items array is empty" });
  } catch (err) {
    return res.status(500).json({ error: `Failed to fetch live NFTs: ${err.message}` });
  }
}
