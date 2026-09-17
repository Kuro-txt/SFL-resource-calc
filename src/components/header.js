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

        <div class="sm:self-start flex items-end gap-2.5 pt-1 sm:pt-0">
          <!-- THEME TOGGLE BUTTON -->
          <button id="theme-toggle-btn" class="bg-amber-100 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-950 dark:text-amber-300 border-2 border-amber-300 dark:border-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
            <span>${isDark ? '☀️' : '🌙'}</span>
            <span>${isDark ? 'Light' : 'Dark'}</span>
          </button>

          <!-- DONATE WIDGET: CAT & SPEECH BUBBLE PERCHED DIRECTLY ABOVE DONATE BUTTON -->
          <div class="relative flex flex-col items-center group/cat cursor-pointer select-none -mt-4 sm:-mt-5" id="donate-cat-trigger" title="Click to feed me! (copies donation address)">
            <!-- Speech Bubble above cat with downward pointer -->
            <div class="relative mb-0.5 bg-amber-200/95 dark:bg-slate-800 text-amber-950 dark:text-amber-300 border border-amber-400/90 dark:border-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs whitespace-nowrap flex items-center gap-0.5 transition-transform group-hover/cat:scale-105">
              <span id="donate-bubble-text">Feed me 🐟</span>
              <!-- Downward pointer triangle -->
              <span class="absolute -bottom-1 left-1/2 -translate-x-1/2 border-x-3 border-x-transparent border-t-3 border-t-amber-400/90 dark:border-t-slate-600"></span>
            </div>

            <!-- Mini Sitting Black Cat perched directly on top of Donate button -->
            <div class="-mb-1.5 z-10 transition-transform duration-200 group-hover/cat:-translate-y-1">
              <svg class="w-6 h-6 inline-block drop-shadow-xs" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <!-- Curled Tail -->
                <path d="M6,22 C3,20 2,16 4,14 C5,13 6.5,14 6,15 C5,17 5.5,19 8,21 Z" fill="#18181b" stroke="#27272a" stroke-width="0.8" />
                <!-- Body -->
                <ellipse cx="14" cy="19" rx="6.5" ry="6" fill="#18181b" stroke="#27272a" stroke-width="0.8" />
                <!-- Front Paws with Pink Toe Beans -->
                <ellipse cx="11.5" cy="24" rx="2" ry="1.5" fill="#18181b" stroke="#3f3f46" stroke-width="0.8" />
                <ellipse cx="16.5" cy="24" rx="2" ry="1.5" fill="#18181b" stroke="#3f3f46" stroke-width="0.8" />
                <circle cx="11.5" cy="24.2" r="0.8" fill="#f472b6" />
                <circle cx="16.5" cy="24.2" r="0.8" fill="#f472b6" />
                <!-- Left Ear -->
                <polygon points="7,10 4,2 11,6" fill="#18181b" />
                <polygon points="7,9 5,4 10,7" fill="#f472b6" />
                <!-- Right Ear -->
                <polygon points="21,10 24,2 17,6" fill="#18181b" />
                <polygon points="21,9 23,4 18,7" fill="#f472b6" />
                <!-- Head -->
                <circle cx="14" cy="11" r="6.5" fill="#18181b" stroke="#27272a" stroke-width="0.8" />
                <!-- Eyes (Glowing Amber) -->
                <ellipse cx="11" cy="10.5" rx="1.8" ry="2.2" fill="#f59e0b" />
                <ellipse cx="17" cy="10.5" rx="1.8" ry="2.2" fill="#f59e0b" />
                <ellipse cx="11" cy="10.5" rx="0.9" ry="1.8" fill="#09090b" />
                <ellipse cx="17" cy="10.5" rx="0.9" ry="1.8" fill="#09090b" />
                <circle cx="10.5" cy="9.8" r="0.7" fill="#ffffff" />
                <circle cx="16.5" cy="9.8" r="0.7" fill="#ffffff" />
                <!-- Nose -->
                <polygon points="14,13 13,12.2 15,12.2" fill="#f472b6" />
                <!-- Whiskers -->
                <line x1="9" y1="12.5" x2="4" y2="12" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.9" />
                <line x1="9" y1="14" x2="4.5" y2="14.8" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.9" />
                <line x1="19" y1="12.5" x2="24" y2="12" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.9" />
                <line x1="19" y1="14" x2="23.5" y2="14.8" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.9" />
              </svg>
            </div>

            <!-- Donate Button directly below cat -->
            <button id="donate-btn" class="relative z-0 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-2.5 py-1 rounded-xl text-xs border-2 border-amber-600 shadow-xs transition cursor-pointer whitespace-nowrap">
              Donate
            </button>
          </div>
        </div>
      </div>

      <!-- COMPACT COLLAPSIBLE GUIDE BOX AT THE TOP OF PAGE -->
      <details class="group/guide bg-amber-50/90 dark:bg-slate-900/80 border-2 border-amber-300/80 dark:border-slate-700/80 rounded-2xl p-2.5 sm:p-3 text-xs text-sfl-wood dark:text-slate-200 shadow-sm transition-all">
        <summary class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 cursor-pointer list-none select-none font-bold text-xs sm:text-sm text-sfl-wood dark:text-amber-300">
          <div class="flex items-center gap-1.5">
            <span>📖</span>
            <span>How to Use Sun-Flux</span>
            <span class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-normal ml-1 group-open/guide:hidden">(click to expand)</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="bg-amber-200/90 dark:bg-slate-800 text-amber-900 dark:text-amber-300 border border-amber-400 dark:border-slate-600 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
              <span>🖥️</span> Tip: Desktop Mode recommended on mobile
            </span>
            <span class="text-xs transition-transform duration-200 group-open/guide:rotate-180">▼</span>
          </div>
        </summary>

        <div class="mt-2.5 pt-2.5 border-t border-amber-200/80 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-medium text-sfl-woodLight dark:text-slate-400">
          <div class="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-amber-200/70 dark:border-slate-700/70 space-y-1">
            <span class="font-bold text-sfl-dirt dark:text-amber-300 block text-xs">1. Link Farm & Sync</span>
            <p>Enter your <strong>Farm ID</strong> and click <strong>🔄 Sync Data</strong> to load resources, trades & dashboard.</p>
          </div>
          <div class="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-amber-200/70 dark:border-slate-700/70 space-y-1">
            <span class="font-bold text-sfl-dirt dark:text-amber-300 block text-xs">2. When Do Results Appear?</span>
            <p>Trades & inventory show <strong>instantly</strong>. If you link today, your first daily harvest report arrives <strong>tomorrow at 22:00 UTC</strong>.</p>
          </div>
          <div class="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-amber-200/70 dark:border-slate-700/70 space-y-1">
            <span class="font-bold text-sfl-dirt dark:text-amber-300 block text-xs">3. Automated Analytics</span>
            <p>Track Day / 7 Days / Month resources earned, spent, and trades ledger with live valuations.</p>
          </div>
        </div>
      </details>
    </div>
  `;

  bindThemeEvents();
}

function bindThemeEvents() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

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
