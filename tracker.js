// 1. SAVE / CUMULATIVE MERGE PRE-HARVEST BASELINE
document.getElementById('save-pre-harvest-btn')?.addEventListener('click', async () => {
  let baselineStock = {};

  // Step A: Load previously saved baseline items from localStorage first
  const existingRaw = localStorage.getItem('sfl_pre_harvest_stock');
  if (existingRaw) {
    try {
      const existingParsed = JSON.parse(existingRaw);
      let rawStock = existingParsed.stock || existingParsed || {};
      for (let k in rawStock) {
        let cleanK = normalizeItemKey(k);
        let val = typeof rawStock[k] === 'number' ? rawStock[k] : parseFloat(rawStock[k]?.amount || rawStock[k] || 0);
        if (val > 0) {
          baselineStock[cleanK] = val; // Keep previously saved items!
        }
      }
    } catch (e) {
      console.warn("Could not read previous snapshot, starting fresh:", e);
    }
  }

  let newlyAddedOrUpdated = false;

  // Step B: If basket has items, MERGE them into baselineStock (do NOT erase existing ones)
  if (typeof basket !== 'undefined' && Array.isArray(basket) && basket.length > 0) {
    basket.forEach(entry => {
      let cleanName = normalizeItemKey(entry.item);
      let addedQty = parseFloat(entry.qty) || 0;
      if (cleanName && addedQty > 0) {
        // Accumulate onto existing baseline stock or add as new item
        baselineStock[cleanName] = (baselineStock[cleanName] || 0) + addedQty;
        newlyAddedOrUpdated = true;
      }
    });
  } 
  
  // Step C: If basket is empty, fall back to full synced farm inventory
  else if (typeof farmInventoryData !== 'undefined' && farmInventoryData && Object.keys(farmInventoryData).length > 0) {
    for (let key in farmInventoryData) {
      let cleanName = normalizeItemKey(key);
      let val = typeof farmInventoryData[key] === 'number' 
        ? farmInventoryData[key] 
        : parseFloat(farmInventoryData[key]?.amount || 0);
      
      if (cleanName && val > 0) {
        baselineStock[cleanName] = val;
        newlyAddedOrUpdated = true;
      }
    }
  }

  if (Object.keys(baselineStock).length === 0) {
    alert("⚠️ Cannot save an empty snapshot! Please add items to your Farm Basket or sync your farm inventory first.");
    return;
  }

  const preHarvestPayload = {
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    stock: baselineStock
  };

  localStorage.setItem('sfl_pre_harvest_stock', JSON.stringify(preHarvestPayload));
  updatePreHarvestUI();
  alert("🚩 Pre-Harvest baseline saved! Items were accumulated without wiping previous snapshot data.");
});
