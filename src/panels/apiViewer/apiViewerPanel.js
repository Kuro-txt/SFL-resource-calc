/**
 * src/panels/apiViewer/apiViewerPanel.js
 * 
 * Interactive Raw API Explorer & Payload Inspector
 * Inspects raw JSON from all 8 backend & third-party endpoints.
 */

export const API_ENDPOINTS = [
  {
    id: 'farm',
    name: '🌾 Farm Data',
    path: '/api/get-farm',
    badge: 'SFL API',
    desc: 'Live inventory, bumpkin level, farm activity, NPCs, coordinates',
    needsFarmId: true,
    needsApiKey: true
  },
  {
    id: 'marketplace',
    name: '📜 Marketplace & Trades',
    path: '/api/get-marketplace',
    badge: 'SFL API',
    desc: 'Live trades, active marketplace listings, open buy offers',
    needsFarmId: true,
    needsApiKey: true
  },
  {
    id: 'prices',
    name: '💰 SFL.world Live Prices',
    path: '/api/get-data',
    badge: 'SFL.world',
    desc: 'Betty shop prices, peer-to-peer floor prices, flower unit prices',
    needsFarmId: false,
    needsApiKey: false
  },
  {
    id: 'land',
    name: '🏝️ Land & Island Layout',
    path: '/api/get-land',
    badge: 'SFL.world',
    desc: 'Island expansion level, plot coordinates, greenhouse layouts',
    needsFarmId: true,
    needsApiKey: false
  },
  {
    id: 'nfts',
    name: '🎨 NFT Items Catalog',
    path: '/api/nfts',
    badge: 'SFL.world',
    desc: 'All collectibles, pet wearables, chapter items, badges catalog',
    needsFarmId: false,
    needsApiKey: false
  },
  {
    id: 'trades',
    name: '☁️ TiDB Cloud Trades',
    path: '/api/trades',
    badge: 'TiDB Cloud',
    desc: 'Accumulated lifetime marketplace trades, taxes, counterparties',
    needsFarmId: true,
    needsApiKey: false
  },
  {
    id: 'yields',
    name: '📈 Supabase Daily Yields',
    path: '/api/yields',
    badge: 'Supabase',
    desc: 'Stored daily preharvest baselines & daily harvest yield rows',
    needsFarmId: true,
    needsApiKey: false
  },
  {
    id: 'health',
    name: '🩺 Backend Health Check',
    path: '/api/health',
    badge: 'Render Backend',
    desc: 'Server responsiveness, latency ping test & uptime status',
    needsFarmId: false,
    needsApiKey: false
  }
];

let selectedEndpointId = 'farm';
let lastResponseData = null;
let lastRawJsonText = '';

export function initApiViewerPanel() {
  const container = document.getElementById('raw-api-section');
  if (!container) return;

  container.innerHTML = `
    <div class="space-y-5">
      <!-- HEADER -->
      <div class="bg-sfl-card/90 p-4 rounded-xl border-2 border-sfl-cardBorder flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-sm">
        <div>
          <h3 class="text-sm font-bold text-sfl-wood uppercase flex items-center gap-2">
            <span>🌐</span> Raw API Explorer & Payload Inspector
          </h3>
          <p class="text-[11px] text-sfl-woodLight font-semibold">
            Inspect, test, and export raw unparsed JSON payloads directly from all 8 Sunflower Land & Backend APIs
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-sfl-dirt border border-amber-300">
            8 Endpoints Ready
          </span>
        </div>
      </div>

      <!-- ENDPOINT SELECTOR BUTTONS -->
      <div class="bg-white/80 border-2 border-sfl-cardBorder p-3 rounded-xl shadow-xs space-y-2">
        <label class="text-xs font-bold text-sfl-wood block">Select API Endpoint to Inspect:</label>
        <div id="api-endpoint-chips" class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          ${API_ENDPOINTS.map(ep => `
            <button data-endpoint="${ep.id}" class="api-chip-btn text-left p-2 rounded-lg border text-xs font-bold transition cursor-pointer flex flex-col justify-between gap-1 shadow-2xs ${
              ep.id === selectedEndpointId 
                ? 'border-sfl-dirt bg-sfl-wood text-amber-200' 
                : 'border-sfl-cardBorder bg-white text-sfl-dirt hover:bg-amber-50'
            }">
              <div class="flex items-center justify-between">
                <span>${ep.name}</span>
              </div>
              <div class="text-[9px] font-mono opacity-80 truncate">${ep.path}</div>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- REQUEST CONTROLS & QUERY PARAMS -->
      <div class="bg-white/80 border-2 border-sfl-cardBorder p-4 rounded-xl shadow-xs space-y-3">
        <div class="flex flex-col sm:flex-row gap-3 items-end">
          <div id="api-param-farm-container" class="w-full sm:w-1/3 space-y-1">
            <label class="text-[11px] font-bold text-sfl-wood block">Farm ID:</label>
            <input type="text" id="api-viewer-farm-id" placeholder="e.g. 162318" 
              class="w-full sfl-input rounded-lg px-2.5 py-1.5 text-xs font-bold text-sfl-dirt">
          </div>

          <div id="api-param-key-container" class="w-full sm:w-1/2 space-y-1">
            <label class="text-[11px] font-bold text-sfl-wood block">API Key (Optional / VIP):</label>
            <input type="text" id="api-viewer-api-key" placeholder="Paste your SFL Community API Key" 
              class="w-full sfl-input rounded-lg px-2.5 py-1.5 text-xs font-bold text-sfl-dirt">
          </div>

          <div class="w-full sm:w-auto">
            <button id="api-viewer-fetch-btn" 
              class="w-full sm:w-auto bg-sfl-green text-white px-5 py-2 rounded-xl text-xs font-bold border-2 border-green-800 hover:bg-green-700 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
              <span>🚀</span> Fetch Raw JSON
            </button>
          </div>
        </div>

        <!-- URL PREVIEW BAR -->
        <div class="flex items-center gap-2 bg-amber-50/70 border border-amber-300/80 px-3 py-1.5 rounded-lg text-xs font-mono text-sfl-wood overflow-x-auto">
          <span class="text-[10px] font-bold uppercase bg-amber-200 text-sfl-dirt px-1.5 py-0.5 rounded shrink-0">GET</span>
          <span id="api-viewer-url-preview" class="truncate select-all text-[11px]">/api/get-farm</span>
        </div>
      </div>

      <!-- RESPONSE VIEWER CONTAINER -->
      <div class="bg-white/90 border-2 border-sfl-cardBorder rounded-xl overflow-hidden shadow-sm">
        <!-- RESPONSE TOOLBAR -->
        <div class="bg-sfl-wood text-amber-200 px-4 py-2 text-xs font-bold flex flex-wrap justify-between items-center gap-2 border-b-2 border-sfl-dirt">
          <div class="flex items-center gap-3">
            <span id="api-viewer-status-badge" class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-800 text-amber-100 font-mono">
              Ready
            </span>
            <span id="api-viewer-timing" class="text-[11px] text-amber-300 font-mono">- ms</span>
            <span id="api-viewer-size" class="text-[11px] text-amber-300 font-mono">- KB</span>
          </div>

          <div class="flex items-center gap-2">
            <input type="text" id="api-viewer-search" placeholder="🔍 Find in JSON..." 
              class="sfl-input rounded-md px-2 py-0.5 text-xs text-sfl-dirt bg-white w-36 sm:w-48 placeholder:text-gray-400">
            <button id="api-viewer-copy-btn" 
              class="bg-amber-100 hover:bg-amber-200 text-sfl-dirt px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer border border-amber-400">
              📋 Copy
            </button>
            <button id="api-viewer-download-btn" 
              class="bg-amber-100 hover:bg-amber-200 text-sfl-dirt px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer border border-amber-400">
              💾 Download
            </button>
          </div>
        </div>

        <!-- CODE BLOCK OUTPUT -->
        <div class="relative bg-gray-950 p-4 max-h-[600px] overflow-auto">
          <pre id="api-viewer-output" class="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre select-text">Click "Fetch Raw JSON" to inspect payload...</pre>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  setupApiViewerListeners();
  syncInputsWithStorage();
  updateUrlPreview();
}

function syncInputsWithStorage() {
  const farmInput = document.getElementById('api-viewer-farm-id');
  const keyInput = document.getElementById('api-viewer-api-key');

  const storedFarm = localStorage.getItem('sfl_farm_id') || document.getElementById('farm-id')?.value || '';
  const storedKey = localStorage.getItem('sfl_api_key') || document.getElementById('api-key')?.value || '';

  if (farmInput && storedFarm) farmInput.value = storedFarm.trim();
  if (keyInput && storedKey) keyInput.value = storedKey.trim();
}

function getActiveUrl() {
  const ep = API_ENDPOINTS.find(e => e.id === selectedEndpointId) || API_ENDPOINTS[0];
  const farmId = document.getElementById('api-viewer-farm-id')?.value.trim() || '';
  const apiKey = document.getElementById('api-viewer-api-key')?.value.trim() || '';

  const params = new URLSearchParams();
  if (ep.needsFarmId && farmId) params.append('farmId', farmId);
  if (ep.needsApiKey && apiKey) params.append('apiKey', apiKey);

  const queryStr = params.toString();
  return queryStr ? `${ep.path}?${queryStr}` : ep.path;
}

function updateUrlPreview() {
  const previewEl = document.getElementById('api-viewer-url-preview');
  if (previewEl) previewEl.textContent = getActiveUrl();

  const ep = API_ENDPOINTS.find(e => e.id === selectedEndpointId);
  const farmContainer = document.getElementById('api-param-farm-container');
  const keyContainer = document.getElementById('api-param-key-container');

  if (farmContainer) {
    if (ep?.needsFarmId) farmContainer.classList.remove('opacity-40');
    else farmContainer.classList.add('opacity-40');
  }
  if (keyContainer) {
    if (ep?.needsApiKey) keyContainer.classList.remove('opacity-40');
    else keyContainer.classList.add('opacity-40');
  }
}

function setupApiViewerListeners() {
  // Endpoint selection buttons
  const chipBtns = document.querySelectorAll('.api-chip-btn');
  chipBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const epId = btn.getAttribute('data-endpoint');
      if (!epId) return;
      selectedEndpointId = epId;

      chipBtns.forEach(b => {
        b.className = "api-chip-btn text-left p-2 rounded-lg border text-xs font-bold transition cursor-pointer flex flex-col justify-between gap-1 shadow-2xs border-sfl-cardBorder bg-white text-sfl-dirt hover:bg-amber-50";
      });
      btn.className = "api-chip-btn text-left p-2 rounded-lg border text-xs font-bold transition cursor-pointer flex flex-col justify-between gap-1 shadow-2xs border-sfl-dirt bg-sfl-wood text-amber-200";

      updateUrlPreview();
    });
  });

  // Input changes update URL
  document.getElementById('api-viewer-farm-id')?.addEventListener('input', updateUrlPreview);
  document.getElementById('api-viewer-api-key')?.addEventListener('input', updateUrlPreview);

  // Fetch button
  document.getElementById('api-viewer-fetch-btn')?.addEventListener('click', fetchRawApi);

  // Copy button
  document.getElementById('api-viewer-copy-btn')?.addEventListener('click', () => {
    if (!lastRawJsonText) return;
    navigator.clipboard.writeText(lastRawJsonText).then(() => {
      const copyBtn = document.getElementById('api-viewer-copy-btn');
      if (copyBtn) {
        const oldText = copyBtn.textContent;
        copyBtn.textContent = "✅ Copied!";
        setTimeout(() => copyBtn.textContent = oldText, 2000);
      }
    });
  });

  // Download button
  document.getElementById('api-viewer-download-btn')?.addEventListener('click', () => {
    if (!lastRawJsonText) return;
    const blob = new Blob([lastRawJsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sfl-${selectedEndpointId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Search inside JSON
  document.getElementById('api-viewer-search')?.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    const outputEl = document.getElementById('api-viewer-output');
    if (!outputEl || !lastRawJsonText) return;

    if (!query) {
      outputEl.textContent = lastRawJsonText;
      return;
    }

    // Filter lines containing query
    const lines = lastRawJsonText.split('\n');
    const matched = lines.filter(line => line.toLowerCase().includes(query));
    outputEl.textContent = `// Found ${matched.length} matching lines for "${query}":\n\n` + matched.join('\n');
  });
}

export async function fetchRawApi() {
  const url = getActiveUrl();
  const outputEl = document.getElementById('api-viewer-output');
  const statusBadge = document.getElementById('api-viewer-status-badge');
  const timingEl = document.getElementById('api-viewer-timing');
  const sizeEl = document.getElementById('api-viewer-size');
  const fetchBtn = document.getElementById('api-viewer-fetch-btn');

  if (outputEl) outputEl.textContent = "⏳ Requesting " + url + " ...";
  if (statusBadge) {
    statusBadge.textContent = "Fetching...";
    statusBadge.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 text-white font-mono";
  }
  if (fetchBtn) fetchBtn.disabled = true;

  const startTime = performance.now();

  try {
    const res = await fetch(url);
    const endTime = performance.now();
    const elapsed = Math.round(endTime - startTime);

    const rawText = await res.text();
    const sizeKb = (rawText.length / 1024).toFixed(1);

    let parsed;
    try {
      parsed = JSON.parse(rawText);
      lastRawJsonText = JSON.stringify(parsed, null, 2);
    } catch {
      lastRawJsonText = rawText;
    }
    lastResponseData = parsed || rawText;

    if (timingEl) timingEl.textContent = `${elapsed} ms`;
    if (sizeEl) sizeEl.textContent = `${sizeKb} KB`;

    if (statusBadge) {
      statusBadge.textContent = `${res.status} ${res.statusText || (res.ok ? 'OK' : 'ERROR')}`;
      statusBadge.className = `px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
        res.ok ? 'bg-green-700 text-white' : 'bg-red-700 text-white'
      }`;
    }

    if (outputEl) {
      outputEl.className = `text-xs font-mono leading-relaxed whitespace-pre select-text ${
        res.ok ? 'text-emerald-400' : 'text-red-400'
      }`;
      outputEl.textContent = lastRawJsonText;
    }
  } catch (err) {
    const endTime = performance.now();
    const elapsed = Math.round(endTime - startTime);
    if (timingEl) timingEl.textContent = `${elapsed} ms`;
    if (statusBadge) {
      statusBadge.textContent = "Network Error";
      statusBadge.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-red-700 text-white font-mono";
    }
    if (outputEl) {
      outputEl.className = "text-xs font-mono text-red-400 leading-relaxed whitespace-pre select-text";
      outputEl.textContent = `❌ Failed to fetch ${url}:\n\n${err.message}`;
    }
  } finally {
    if (fetchBtn) fetchBtn.disabled = false;
  }
}

export function renderApiViewerPanel() {
  syncInputsWithStorage();
  updateUrlPreview();
}
