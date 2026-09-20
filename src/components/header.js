export function renderHeader() {
  const container = document.getElementById('header-mount');
  if (!container) return;

  const isDark = document.documentElement.classList.contains('dark');

  container.innerHTML = `
    <div class="space-y-3">
      <!-- HEADER BANNER & SUBTITLE -->
      <div class="relative flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div class="hidden sm:block w-28"></div>

        <div class="text-center space-y-1">
          <!-- BANNER WRAPPER WITH PEEKING CAT -->
          <div class="relative inline-block group cursor-default pt-7">

            <!-- PEEKING CAT: BEHIND the banner (z-0), tucked down so ears & eyes peek over the rim -->
            <div class="cat-peeker absolute top-0 left-1/2 -translate-x-1/2 z-0 pointer-events-none transition-all duration-300 ease-out group-hover:-translate-y-2">
              <svg class="w-16 h-14" viewBox="0 0 64 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Left Ear -->
                <polygon points="14,22 6,4 24,13" fill="#18181b" />
                <polygon points="14,20 9,7 21,14" fill="#f472b6" />
                <!-- Right Ear -->
                <polygon points="50,22 58,4 40,13" fill="#18181b" />
                <polygon points="50,20 55,7 43,14" fill="#f472b6" />

                <!-- Head Base (Midnight Obsidian Black) -->
                <path d="M14,22 C14,12 22,10 32,10 C42,10 50,12 50,22 C55,24 59,30 58,36 C57,43 51,48 44,50 C38,52 26,52 20,50 C13,48 7,43 6,36 C5,30 9,24 14,22 Z" fill="#18181b" stroke="#27272a" stroke-width="1.2" />

                <!-- Forehead Brow Tone -->
                <path d="M26,16 Q32,14 38,16" stroke="#3f3f46" stroke-width="1.5" stroke-linecap="round" fill="none" />

                <!-- Eyes (Radiant Glowing Amber) -->
                <ellipse cx="22" cy="27" rx="5" ry="5.5" fill="#f59e0b" />
                <ellipse cx="42" cy="27" rx="5" ry="5.5" fill="#f59e0b" />
                <!-- Pupils -->
                <ellipse cx="22" cy="27" rx="2.5" ry="4.5" fill="#09090b" />
                <ellipse cx="42" cy="27" rx="2.5" ry="4.5" fill="#09090b" />
                <!-- Sparkles -->
                <circle cx="20.5" cy="25" r="1.8" fill="#ffffff" />
                <circle cx="40.5" cy="25" r="1.8" fill="#ffffff" />
                <circle cx="23.5" cy="28.5" r="1" fill="#fde68a" />
                <circle cx="43.5" cy="28.5" r="1" fill="#fde68a" />

                <!-- Nose -->
                <polygon points="32,34 30,32 34,32" fill="#ec4899" />
                <path d="M29,35 Q32,38 32,36 Q32,38 35,35" stroke="#f472b6" stroke-width="1.4" fill="none" stroke-linecap="round" />

                <!-- Whiskers -->
                <line x1="10" y1="33" x2="2" y2="31" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.9" />
                <line x1="10" y1="36" x2="1" y2="38" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.9" />
                <line x1="54" y1="33" x2="62" y2="31" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.9" />
                <line x1="54" y1="36" x2="63" y2="38" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.9" />
              </svg>
            </div>

            <!-- MAIN BANNER PILL (relative z-10 so it sits in front of the cat body!) -->
            <div class="relative z-10 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 dark:from-slate-900 dark:via-amber-950/70 dark:to-slate-900 border-2 border-amber-600 dark:border-amber-500/50 px-7 py-2 rounded-full shadow-lg shadow-amber-500/25 dark:shadow-amber-500/10 backdrop-blur-sm transition-all duration-200">
              <h1 class="text-2xl sm:text-4xl font-pixel tracking-wider font-bold text-amber-950 dark:text-amber-300 flex items-center gap-2 justify-center uppercase drop-shadow-xs">
                <span>🌻</span> Sun-Flux
              </h1>
            </div>
          </div>
          <p class="text-xs font-semibold text-sfl-woodLight dark:text-slate-400">Live SFL market prices, NFT wishlist & automated crop tracker</p>
        </div>

        <div class="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2.5 pt-1 sm:pt-0 sm:self-start">
          <!-- GUIDE BUTTON -->
          <button id="guide-toggle-btn" class="bg-amber-100 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-950 dark:text-amber-300 border-2 border-amber-300 dark:border-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer whitespace-nowrap" title="How to Use Sun-Flux guide">
            <span>📖</span>
            <span>Guide</span>
          </button>

          <!-- THEME TOGGLE BUTTON -->
          <button id="theme-toggle-btn" class="bg-amber-100 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-950 dark:text-amber-300 border-2 border-amber-300 dark:border-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
            <span>${isDark ? '☀️' : '🌙'}</span>
            <span>${isDark ? 'Light' : 'Dark'}</span>
          </button>

          <!-- DONATE BUTTON -->
          <button id="donate-btn" class="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-3 py-1.5 rounded-xl text-xs border-2 border-amber-600 shadow-xs transition cursor-pointer whitespace-nowrap" title="Copy donation address (Polygon POL)">
            Donate
          </button>
        </div>
      </div>

      <!-- COMPACT COLLAPSIBLE GUIDE BOX AT THE TOP OF PAGE -->
      <details id="sunflux-guide-details" class="group/guide bg-amber-50/95 dark:bg-slate-900/90 border-2 border-amber-300/80 dark:border-slate-700/80 rounded-2xl p-2.5 sm:p-3 text-xs text-sfl-wood dark:text-slate-200 shadow-sm transition-all">
        <summary class="flex items-center justify-between cursor-pointer list-none select-none font-bold text-xs sm:text-sm text-sfl-wood dark:text-amber-300">
          <div class="flex items-center gap-2 flex-wrap">
            <span>📖</span>
            <span>How to Use Sun-Flux</span>
            <span class="bg-rose-500 text-white font-black text-[9px] sm:text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider shadow-2xs animate-pulse">PLEASE READ</span>
            <span class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-normal ml-1 group-open/guide:hidden">(click to expand)</span>
          </div>
          <span class="text-xs transition-transform duration-200 group-open/guide:rotate-180 text-sfl-woodLight dark:text-amber-300">▼</span>
        </summary>

        <div class="mt-2.5 pt-2.5 border-t border-amber-200/80 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-medium text-sfl-woodLight dark:text-slate-400">
          <div class="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-amber-200/70 dark:border-slate-700/70 space-y-1">
            <span class="font-bold text-sfl-dirt dark:text-amber-300 block text-xs flex items-center gap-1.5">
              <span>🚜</span> 1. Register, Link Farm ID & Sync
            </span>
            <p><strong>Registering an account below is a must</strong> so please sign up — you don't need to enter your actual Gmail, just make sure it ends with <strong>@gmail.com</strong>. Then enter your <strong>Farm ID</strong> in the top header and click <strong>🔄 Sync Data</strong> to link your farm.</p>
          </div>
          <div class="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-amber-200/70 dark:border-slate-700/70 space-y-1">
            <span class="font-bold text-sfl-dirt dark:text-amber-300 block text-xs flex items-center gap-1.5">
              <span>⏱️</span> 2. When Do Reports Appear?
            </span>
            <p>Sun-Flux calculates daily net harvest & expenses against automated <strong>00:00 UTC baselines</strong>. If you link your farm today, your first daily harvest report will arrive <strong>tomorrow at 22:00 UTC</strong>.</p>
          </div>
        </div>
      </details>


      <!-- COMPACT MULTI-DEVICE CLOUD AUTH BAR (Directly below How to Use) -->
      <div id="auth-panel" class="bg-sfl-wood/95 dark:bg-slate-900/90 text-amber-100 p-2.5 rounded-2xl border-2 border-sfl-dirt dark:border-slate-700/80 flex flex-col sm:flex-row justify-between items-center gap-2 shadow-sm text-xs">
        <form id="auth-logged-out" onsubmit="return false;" class="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
          <span class="text-[11px] font-semibold text-amber-200 dark:text-amber-300 flex items-center gap-1.5">
            <span>☁️</span> <strong>Cloud Sync:</strong> Sign in to backup your snapshots & settings across devices
          </span>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <input type="email" id="auth-email" placeholder="Email" autocomplete="username" class="sfl-input px-2 py-1 text-xs text-sfl-dirt rounded w-full sm:w-36">
            <input type="password" id="auth-password" placeholder="Password" autocomplete="current-password" class="sfl-input px-2 py-1 text-xs text-sfl-dirt rounded w-full sm:w-32">
            <button type="button" id="btn-login" class="bg-sfl-green text-white font-bold px-3 py-1 rounded text-xs hover:bg-green-700 transition whitespace-nowrap cursor-pointer">Sign In</button>
            <button type="button" id="btn-signup" class="bg-amber-600 text-white font-bold px-3 py-1 rounded text-xs hover:bg-amber-700 transition whitespace-nowrap cursor-pointer">Sign Up</button>
          </div>
        </form>

        <div id="auth-logged-in" class="hidden w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold text-amber-300 dark:text-amber-300 flex items-center gap-1.5">
              <span>✅</span> Cloud Sync Active:
            </span>
            <span id="user-email-display" class="text-white font-semibold font-mono text-xs select-all"></span>
            <button type="button" id="toggle-username-btn" class="bg-amber-900/70 hover:bg-amber-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-200 hover:text-white px-2 py-0.5 rounded-lg transition cursor-pointer text-xs font-bold flex items-center gap-1 border border-amber-400/40 dark:border-slate-600 shadow-2xs" title="Hide or show username">
              <span id="toggle-username-icon">👁️</span>
              <span id="toggle-username-text" class="text-[10px]">Hide</span>
            </button>
          </div>
          <button id="btn-logout" class="bg-sfl-accent text-white font-bold px-3 py-1 rounded text-xs hover:bg-red-700 transition cursor-pointer shrink-0">Sign Out</button>
        </div>
      </div>
    </div>
  `;

  bindHeaderEvents();
}

function bindHeaderEvents() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isCurrentlyDark = document.documentElement.classList.contains('dark');
      
      if (isCurrentlyDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('sfl_theme', 'light');
        toggleBtn.innerHTML = `<span>🌙</span><span>Dark</span>`;
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('sfl_theme', 'dark');
        toggleBtn.innerHTML = `<span>☀️</span><span>Light</span>`;
      }
    });
  }

  const guideBtn = document.getElementById('guide-toggle-btn');
  const guideDetails = document.getElementById('sunflux-guide-details');
  if (guideBtn && guideDetails) {
    guideBtn.addEventListener('click', () => {
      guideDetails.open = !guideDetails.open;
      if (guideDetails.open) {
        guideDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }
}

