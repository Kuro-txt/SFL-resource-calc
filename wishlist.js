// Fetch NFT catalog from server endpoint
async function loadNftCatalog() {
  const menu = document.getElementById('wishlist-search-menu');
  try {
    const res = await fetch(`${BACKEND_URL}/api/nfts`);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    
    let rawList = Array.isArray(data) ? data : (data.data || data.nfts || Object.values(data));

    allNfts = rawList.map(item => {
      const name = item.name || item.title || 'Unknown NFT';
      const price = parseFloat(item.floor ?? item.price ?? item.lastSalePrice ?? 0) || 0;
      const boost = item.boost_text || item.boost || (item.have_boost ? "Boost Active" : "No Boost");

      return {
        name: String(name).trim(),
        price: price,
        boost: String(boost).trim()
      };
    }).filter(item => item.name !== 'Unknown NFT');

    // Sync saved items with live prices
    wishlistItems.forEach(savedItem => {
      let match = allNfts.find(n => n.name.toLowerCase() === savedItem.name.toLowerCase());
      if (match) {
        savedItem.price = match.price;
        savedItem.boost = match.boost;
      }
    });

    saveWishlist();
    renderWishlist();
  } catch (err) {
    console.error("Failed to load NFT catalog from server:", err.message);
    if (menu) {
      menu.innerHTML = `<li class="p-3 text-sfl-accent font-bold text-xs">⚠️ Server offline or waking up. Please refresh in 20 seconds.</li>`;
    }
  }
}
