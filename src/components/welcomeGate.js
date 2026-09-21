// ─── Welcome / Entry Gate Component ──────────────────────────────────────────
// Requires visitors to register with Farm ID or sign in before entering Sun-Flux.
// Authentically styled to match the Sunflower Land retro pixel game vibes.

export function renderWelcomeGate() {
  const mount = document.getElementById('welcome-gate-mount');
  if (!mount) return;

  const savedFarmId = localStorage.getItem('sfl_farm_id') || '';
  const isDark = document.documentElement.classList.contains('dark');

  mount.innerHTML = `
    <div class="space-y-4 w-full">
      
      <!-- TOP HEADER ROW: Corner Badges & Center Cat Banner -->
      <div class="relative flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        
        <!-- Top-Left Corner: Network Status Badge -->
        <div class="w-full sm:w-auto flex items-center justify-start sm:self-start pt-1">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/90 dark:bg-slate-800/90 border-2 border-amber-300/80 dark:border-slate-700 text-xs font-bold text-sfl-dirt dark:text-amber-200 shadow-xs">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>🌻 Sun-Flux Terminal • SFL Live</span>
          </div>
        </div>

        <!-- Center: Bobbing Obsidian Cat & Banner Pill -->
        <div class="text-center space-y-1">
          <div class="relative inline-block group cursor-default pt-7">
            
            <!-- PEEKING CAT: Behind the banner pill (z-0), bobbing with cat-idle-bob -->
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

            <!-- MAIN BANNER PILL -->
            <div class="relative z-10 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 dark:from-slate-900 dark:via-amber-950/70 dark:to-slate-900 border-2 border-amber-600 dark:border-amber-500/50 px-8 py-2 rounded-full shadow-lg shadow-amber-500/25 dark:shadow-amber-500/10 backdrop-blur-sm transition-all duration-200">
              <h1 class="text-3xl sm:text-4xl font-pixel tracking-wider font-bold text-amber-950 dark:text-amber-300 flex items-center gap-2 justify-center uppercase drop-shadow-xs">
                <span>🌻</span> Sun-Flux
              </h1>
            </div>
          </div>
          <p class="text-xs font-semibold text-sfl-woodLight dark:text-slate-400">Live SFL market prices, NFT wishlist & automated crop tracker</p>
        </div>

        <!-- Top-Right Corner: Theme Switcher -->
        <div class="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2.5 pt-1 sm:pt-0 sm:self-start">
          <button type="button" id="gate-theme-toggle-btn" 
            class="bg-amber-100 hover:bg-amber-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-amber-950 dark:text-amber-300 border-2 border-amber-300 dark:border-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer">
            <span>${isDark ? '☀️' : '🌙'}</span>
            <span>${isDark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>

      <!-- MAIN SFL PANEL: Wide 2-column layout -->
      <div class="sfl-panel rounded-2xl p-5 sm:p-7 relative space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          <!-- LEFT COLUMN: Overview, Notice, Feature Slots -->
          <div class="lg:col-span-6 space-y-4">
            
            <!-- Welcome Header -->
            <div class="space-y-1">
              <h2 class="text-xl sm:text-2xl font-bold text-sfl-dirt dark:text-amber-200 flex items-center gap-2">
                <span>🌾</span> <span>Welcome to Sun-Flux</span>
              </h2>
              <p class="text-xs text-sfl-woodLight dark:text-slate-400 leading-relaxed">
                Automated daily harvest baselines, resource expenses & P2P marketplace analytics for Sunflower Land.
              </p>
            </div>

            <!-- Farmer Notice Box -->
            <div class="bg-amber-100/70 dark:bg-slate-800/80 p-3.5 rounded-2xl border-2 border-amber-300/80 dark:border-slate-700/80 space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-sfl-dirt dark:text-amber-300 text-xs flex items-center gap-1.5">
                  <span>📜</span> Notice for Farmers
                </span>
                <span class="text-[9px] font-bold text-amber-800 dark:text-amber-300 bg-amber-200/90 dark:bg-slate-700 px-2 py-0.5 rounded-md border border-amber-400/50">
                  NO REAL GMAIL NEEDED
                </span>
              </div>
              <p class="text-[11px] text-sfl-woodLight dark:text-slate-300 leading-relaxed">
                <strong>Registering an account is a must</strong> so please sign up — you don't need your real Gmail, just make sure it ends with <strong>@gmail.com</strong>. Enter your <strong>Farm ID</strong> to link snapshots!
              </p>
            </div>

            <!-- 3 Feature Preview Cards (Styled as SFL Inventory Slots) -->
            <div class="grid grid-cols-3 gap-2.5 text-center pt-1">
              
              <div class="bg-sfl-card/90 dark:bg-slate-800/90 border-2 border-sfl-cardBorder dark:border-slate-700 rounded-xl p-3 shadow-2xs space-y-1 hover:border-amber-500 transition-colors">
                <div class="text-2xl">⏱️</div>
                <div class="font-pixel text-base font-bold text-sfl-dirt dark:text-amber-200">00:00 UTC</div>
                <div class="text-[10px] font-semibold text-sfl-woodLight dark:text-slate-400 uppercase tracking-tight">Auto Baseline</div>
              </div>

              <div class="bg-sfl-card/90 dark:bg-slate-800/90 border-2 border-sfl-cardBorder dark:border-slate-700 rounded-xl p-3 shadow-2xs space-y-1 hover:border-amber-500 transition-colors">
                <div class="text-2xl">🌸</div>
                <div class="font-pixel text-base font-bold text-sfl-dirt dark:text-amber-200">LIVE SFL/USD</div>
                <div class="text-[10px] font-semibold text-sfl-woodLight dark:text-slate-400 uppercase tracking-tight">Trade History</div>
              </div>

              <div class="bg-sfl-card/90 dark:bg-slate-800/90 border-2 border-sfl-cardBorder dark:border-slate-700 rounded-xl p-3 shadow-2xs space-y-1 hover:border-amber-500 transition-colors">
                <div class="text-2xl">📊</div>
                <div class="font-pixel text-base font-bold text-sfl-dirt dark:text-amber-200">22:00 UTC</div>
                <div class="text-[10px] font-semibold text-sfl-woodLight dark:text-slate-400 uppercase tracking-tight">Harvest Reports</div>
              </div>

            </div>

            <!-- Security Note -->
            <p class="text-[10px] font-medium text-sfl-woodLight dark:text-slate-400 flex items-center gap-1.5 pt-1">
              <span>🔒</span>
              <span>Encrypted Supabase auth • No wallet signatures or private keys required</span>
            </p>

          </div>

          <!-- RIGHT COLUMN: Form & Mode Tabs -->
          <div class="lg:col-span-6 space-y-4">
            
            <!-- Mode Switcher Tabs (Matching Inside Nav Tabs) -->
            <div class="flex items-center gap-2 bg-sfl-card/80 dark:bg-slate-900/60 p-1.5 rounded-xl border-2 border-sfl-cardBorder dark:border-slate-700/70">
              <button type="button" id="gate-tab-register" 
                class="bg-sfl-wood text-amber-200 px-3 py-2 rounded-xl font-bold text-xs border-2 border-sfl-dirt shadow-md flex items-center justify-center gap-1.5 cursor-pointer flex-1 transition-all">
                <span>🌾</span>
                <span>New Farmer (Register)</span>
              </button>
              <button type="button" id="gate-tab-login" 
                class="bg-transparent text-sfl-woodLight dark:text-slate-400 px-3 py-2 rounded-xl font-bold text-xs border-2 border-transparent hover:bg-amber-100/60 dark:hover:bg-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer flex-1">
                <span>🚜</span>
                <span>Returning (Sign In)</span>
              </button>
            </div>

            <!-- Inline Status / Error Banner -->
            <div id="gate-alert" class="hidden p-3 rounded-xl text-xs font-bold border-2 transition-all"></div>

            <!-- Auth Form -->
            <form id="gate-form" onsubmit="return false;" class="space-y-3.5 text-left">
              
              <!-- Farm ID Field -->
              <div id="gate-farm-id-group" class="space-y-1">
                <div class="flex items-center justify-between">
                  <label for="gate-farm-id" class="text-xs font-bold text-sfl-wood dark:text-amber-300 flex items-center gap-1.5">
                    <span>🚜</span> Sunflower Land Farm ID
                  </label>
                  <button type="button" id="gate-farm-id-help-btn" class="text-[10px] text-amber-700 dark:text-amber-400 hover:underline font-bold cursor-pointer">
                    Where is my ID? ❓
                  </button>
                </div>

                <input 
                  type="number" 
                  id="gate-farm-id" 
                  placeholder="e.g. 12345" 
                  value="${savedFarmId}"
                  autocomplete="off"
                  class="w-full sfl-input rounded-xl px-3 py-2 text-xs font-bold text-sfl-dirt dark:text-amber-100 shadow-2xs focus:outline-none"
                  required
                >

                <div id="gate-farm-id-help" class="hidden p-2.5 rounded-xl bg-amber-200/70 dark:bg-slate-800 border-2 border-amber-300/80 dark:border-slate-600 text-[11px] font-semibold text-sfl-dirt dark:text-amber-200">
                  💡 You can find your Farm ID in Sunflower Land &gt; Settings.
                </div>
              </div>

              <!-- Email Field -->
              <div class="space-y-1">
                <label for="gate-email" class="block text-xs font-bold text-sfl-wood dark:text-amber-300 flex items-center justify-between">
                  <span class="flex items-center gap-1.5"><span>✉️</span> Account Email (Username)</span>
                  <span class="text-[10px] text-amber-700 dark:text-amber-400 font-bold">* ends with @gmail.com</span>
                </label>
                <input 
                  type="email" 
                  id="gate-email" 
                  placeholder="e.g. farmer123@gmail.com" 
                  autocomplete="username"
                  class="w-full sfl-input rounded-xl px-3 py-2 text-xs font-bold text-sfl-dirt dark:text-amber-100 shadow-2xs focus:outline-none"
                  required
                >
              </div>

              <!-- Password Field -->
              <div class="space-y-1">
                <label for="gate-password" class="block text-xs font-bold text-sfl-wood dark:text-amber-300 flex items-center justify-between">
                  <span class="flex items-center gap-1.5"><span>🔑</span> Password</span>
                  <span class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-normal">min 6 characters</span>
                </label>
                <input 
                  type="password" 
                  id="gate-password" 
                  placeholder="••••••••" 
                  autocomplete="current-password"
                  class="w-full sfl-input rounded-xl px-3 py-2 text-xs font-bold text-sfl-dirt dark:text-amber-100 shadow-2xs focus:outline-none"
                  required
                >
              </div>

              <!-- SUBMIT BUTTON (Tactile 3D Pixel Game Button) -->
              <button 
                type="button" 
                id="gate-btn-submit" 
                class="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 active:translate-y-0.5 border-2 border-sfl-dirt shadow-md hover:shadow-lg transition mt-2"
              >
                <span id="gate-btn-spinner" class="hidden animate-spin text-base">⏳</span>
                <span id="gate-btn-icon" class="text-base">🌾</span>
                <span id="gate-btn-text" class="font-pixel text-xl tracking-wider">REGISTER & ENTER FARM</span>
              </button>
            </form>

          </div>

        </div>
      </div>

    </div>
  `;

  bindWelcomeGateEvents();
}

let currentGateMode = 'register'; // 'register' | 'login'

function setGateMode(mode) {
  currentGateMode = mode;
  const tabReg = document.getElementById('gate-tab-register');
  const tabLog = document.getElementById('gate-tab-login');
  const farmIdGroup = document.getElementById('gate-farm-id-group');
  const btnText = document.getElementById('gate-btn-text');
  const btnIcon = document.getElementById('gate-btn-icon');
  const alertEl = document.getElementById('gate-alert');

  if (alertEl) alertEl.classList.add('hidden');

  if (mode === 'register') {
    tabReg?.classList.remove('bg-transparent', 'hover:bg-amber-100/60', 'dark:hover:bg-slate-800', 'border-transparent', 'text-sfl-woodLight', 'dark:text-slate-400');
    tabReg?.classList.add('bg-sfl-wood', 'text-amber-200', 'border-sfl-dirt', 'shadow-md');

    tabLog?.classList.remove('bg-sfl-wood', 'text-amber-200', 'border-sfl-dirt', 'shadow-md');
    tabLog?.classList.add('bg-transparent', 'hover:bg-amber-100/60', 'dark:hover:bg-slate-800', 'border-transparent', 'text-sfl-woodLight', 'dark:text-slate-400');

    if (farmIdGroup) farmIdGroup.classList.remove('hidden');
    if (btnText) btnText.textContent = 'REGISTER & ENTER FARM';
    if (btnIcon) btnIcon.textContent = '🌾';
  } else {
    tabLog?.classList.remove('bg-transparent', 'hover:bg-amber-100/60', 'dark:hover:bg-slate-800', 'border-transparent', 'text-sfl-woodLight', 'dark:text-slate-400');
    tabLog?.classList.add('bg-sfl-wood', 'text-amber-200', 'border-sfl-dirt', 'shadow-md');

    tabReg?.classList.remove('bg-sfl-wood', 'text-amber-200', 'border-sfl-dirt', 'shadow-md');
    tabReg?.classList.add('bg-transparent', 'hover:bg-amber-100/60', 'dark:hover:bg-slate-800', 'border-transparent', 'text-sfl-woodLight', 'dark:text-slate-400');

    // Hide farm ID group on login since it loads automatically from user's Supabase profile
    if (farmIdGroup) farmIdGroup.classList.add('hidden');
    if (btnText) btnText.textContent = 'SIGN IN & ENTER FARM';
    if (btnIcon) btnIcon.textContent = '🚜';
  }
}

function showGateAlert(message, type = 'error') {
  const alertEl = document.getElementById('gate-alert');
  if (!alertEl) return;

  alertEl.className = type === 'error'
    ? 'p-3 rounded-xl text-xs font-bold border-2 bg-rose-100 dark:bg-rose-950/70 border-rose-400 dark:border-rose-800 text-rose-800 dark:text-rose-200'
    : 'p-3 rounded-xl text-xs font-bold border-2 bg-emerald-100 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200';

  alertEl.textContent = message;
  alertEl.classList.remove('hidden');
}

function setGateLoading(isLoading) {
  const btn = document.getElementById('gate-btn-submit');
  const spinner = document.getElementById('gate-btn-spinner');
  const icon = document.getElementById('gate-btn-icon');

  if (btn) btn.disabled = isLoading;
  if (spinner) {
    if (isLoading) spinner.classList.remove('hidden');
    else spinner.classList.add('hidden');
  }
  if (icon) {
    if (isLoading) icon.classList.add('hidden');
    else icon.classList.remove('hidden');
  }
}

function bindWelcomeGateEvents() {
  // Theme Toggle Button
  const themeBtn = document.getElementById('gate-theme-toggle-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const isCurrentlyDark = document.documentElement.classList.contains('dark');
      const insideThemeBtn = document.getElementById('theme-toggle-btn');
      if (isCurrentlyDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('sfl_theme', 'light');
        themeBtn.innerHTML = `<span>🌙</span><span>Dark</span>`;
        if (insideThemeBtn) insideThemeBtn.innerHTML = `<span>🌙</span><span>Dark</span>`;
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('sfl_theme', 'dark');
        themeBtn.innerHTML = `<span>☀️</span><span>Light</span>`;
        if (insideThemeBtn) insideThemeBtn.innerHTML = `<span>☀️</span><span>Light</span>`;
      }
    });
  }

  // Farm ID Help Hint Toggle
  const helpBtn = document.getElementById('gate-farm-id-help-btn');
  const helpBox = document.getElementById('gate-farm-id-help');
  if (helpBtn && helpBox) {
    helpBtn.addEventListener('click', () => {
      helpBox.classList.toggle('hidden');
    });
  }

  // Mode Selection Tabs
  document.getElementById('gate-tab-register')?.addEventListener('click', () => setGateMode('register'));
  document.getElementById('gate-tab-login')?.addEventListener('click', () => setGateMode('login'));

  // Enter Key Submit Support
  document.getElementById('gate-form')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('gate-btn-submit')?.click();
    }
  });

  // Submit Handler
  document.getElementById('gate-btn-submit')?.addEventListener('click', async () => {
    const email = document.getElementById('gate-email')?.value.trim();
    const password = document.getElementById('gate-password')?.value.trim();
    const farmId = document.getElementById('gate-farm-id')?.value.trim();
    const client = window.supabaseClient;

    if (!client) {
      return showGateAlert("Supabase client is not initialized. Please refresh.", "error");
    }

    if (!email) {
      return showGateAlert("Please enter your email address (ending with @gmail.com).", "error");
    }

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return showGateAlert("Please make sure your email address ends with @gmail.com", "error");
    }

    if (!password || password.length < 6) {
      return showGateAlert("Password must be at least 6 characters long.", "error");
    }

    if (currentGateMode === 'register') {
      if (!farmId || isNaN(farmId) || parseInt(farmId, 10) <= 0) {
        return showGateAlert("Please enter your valid numeric Sunflower Land Farm ID.", "error");
      }

      setGateLoading(true);
      try {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) {
          setGateLoading(false);
          return showGateAlert(error.message, "error");
        }

        if (data.user) {
          // If session was not immediately returned, sign in directly to activate session
          if (!data.session) {
            try {
              const loginRes = await client.auth.signInWithPassword({ email, password });
              if (loginRes.data?.user) {
                data.user = loginRes.data.user;
              }
            } catch (_) {}
          }

          // Link Farm ID into Supabase profiles table
          const { error: profileErr } = await client
            .from('profiles')
            .upsert({
              id: data.user.id,
              farm_id: farmId,
              tracked_items: window.trackedTargets || []
            }, { onConflict: 'id' });

          if (profileErr) {
            console.warn("Profile link note:", profileErr.message);
          }

          localStorage.setItem('sfl_farm_id', farmId);
          const farmIdEl = document.getElementById('farm-id');
          if (farmIdEl) farmIdEl.value = farmId;

          showGateAlert("🎉 Account created! Entering farm...", "success");

          // Unlock app gate
          if (typeof window.unlockAppGate === 'function') {
            await window.unlockAppGate(data.user, farmId);
          }
        }
      } catch (err) {
        showGateAlert(err.message, "error");
      } finally {
        setGateLoading(false);
      }
    } else {
      // Login Mode
      setGateLoading(true);
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          setGateLoading(false);
          return showGateAlert(error.message, "error");
        }

        if (data.user) {
          showGateAlert("🎉 Signed in! Loading your farm...", "success");

          // If farm ID was entered, ensure it is saved
          if (farmId) {
            localStorage.setItem('sfl_farm_id', farmId);
            const farmIdEl = document.getElementById('farm-id');
            if (farmIdEl) farmIdEl.value = farmId;
          }

          // Unlock app gate
          if (typeof window.unlockAppGate === 'function') {
            await window.unlockAppGate(data.user, farmId);
          }
        }
      } catch (err) {
        showGateAlert(err.message, "error");
      } finally {
        setGateLoading(false);
      }
    }
  });
}
