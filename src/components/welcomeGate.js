// ─── Welcome / Entry Gate Component ──────────────────────────────────────────
// Requires visitors to register with Farm ID or sign in before entering Sun-Flux.

export function renderWelcomeGate() {
  const mount = document.getElementById('welcome-gate-mount');
  if (!mount) return;

  const savedFarmId = localStorage.getItem('sfl_farm_id') || '';

  mount.innerHTML = `
    <div class="sfl-panel rounded-3xl p-6 sm:p-8 border-4 border-amber-800/80 dark:border-slate-700 shadow-2xl bg-amber-50/95 dark:bg-slate-900/95 text-sfl-dirt dark:text-slate-100 transition-all duration-300 max-w-lg mx-auto">
      
      <!-- Brand Header -->
      <div class="text-center space-y-2 mb-6">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-700/60 shadow-sm mb-1">
          <img src="./assets/flower.webp" onerror="this.onerror=null;this.src='https://raw.githubusercontent.com/sunflower-land/sunflower-land/main/src/assets/icons/sfl.png';" class="w-10 h-10 sfl-icon animate-bounce" alt="Sun-Flux">
        </div>
        <div class="flex items-center justify-center gap-2">
          <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-sfl-dirt dark:text-amber-200">Sun-Flux</h1>
          <span class="bg-rose-500 text-white font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider shadow-2xs animate-pulse">WELCOME</span>
        </div>
        <p class="text-xs font-semibold text-sfl-woodLight dark:text-slate-400 max-w-sm mx-auto">
          Automated daily harvest baselines, resource expenses & P2P marketplace analytics for Sunflower Land.
        </p>
      </div>

      <!-- Mode Selector Tabs (Register vs Sign In) -->
      <div class="grid grid-cols-2 gap-1.5 p-1 bg-amber-200/60 dark:bg-slate-800/80 rounded-xl border border-amber-300/80 dark:border-slate-700 mb-5 text-xs font-bold">
        <button type="button" id="gate-tab-register" class="py-2 rounded-lg transition-all cursor-pointer bg-sfl-green text-white shadow-xs">
          🌾 New Farmer (Register)
        </button>
        <button type="button" id="gate-tab-login" class="py-2 rounded-lg transition-all cursor-pointer text-sfl-wood dark:text-slate-300 hover:bg-amber-100/70 dark:hover:bg-slate-700/50">
          🚜 Returning Farmer (Sign In)
        </button>
      </div>

      <!-- Inline Status / Error Message Banner -->
      <div id="gate-alert" class="hidden p-3 rounded-xl text-xs font-bold mb-4 border transition-all"></div>

      <!-- Auth Form -->
      <form id="gate-form" onsubmit="return false;" class="space-y-4 text-left">
        
        <!-- Farm ID Field (Shown on Register, Optional/Hidden on Login if already saved) -->
        <div id="gate-farm-id-group" class="space-y-1">
          <label for="gate-farm-id" class="block text-xs font-bold text-sfl-wood dark:text-amber-300 flex items-center justify-between">
            <span>🚜 Sunflower Land Farm ID</span>
            <span class="text-[10px] text-rose-500 dark:text-rose-400 font-bold">* REQUIRED</span>
          </label>
          <input 
            type="number" 
            id="gate-farm-id" 
            placeholder="e.g. 8472883706403914" 
            value="${savedFarmId}"
            autocomplete="off"
            class="w-full px-3 py-2 text-sm font-mono rounded-xl border-2 border-amber-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100 focus:outline-none focus:ring-2 focus:ring-sfl-green shadow-xs transition"
            required
          >
          <p class="text-[10px] text-sfl-woodLight dark:text-slate-400">
            Enter your numeric Farm ID to link automated snapshots & harvest tracking.
          </p>
        </div>

        <!-- Email Field -->
        <div class="space-y-1">
          <label for="gate-email" class="block text-xs font-bold text-sfl-wood dark:text-amber-300 flex items-center justify-between">
            <span>✉️ Account Email (Username)</span>
            <span class="text-[10px] text-amber-600 dark:text-amber-400 font-medium">ends with @gmail.com</span>
          </label>
          <input 
            type="email" 
            id="gate-email" 
            placeholder="e.g. yourname@gmail.com" 
            autocomplete="username"
            class="w-full px-3 py-2 text-sm rounded-xl border-2 border-amber-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100 focus:outline-none focus:ring-2 focus:ring-sfl-green shadow-xs transition"
            required
          >
          <p id="gate-email-tip" class="text-[10px] text-sfl-woodLight dark:text-slate-400">
            You don't need your real Gmail — any handle ending with <strong>@gmail.com</strong> works!
          </p>
        </div>

        <!-- Password Field -->
        <div class="space-y-1">
          <label for="gate-password" class="block text-xs font-bold text-sfl-wood dark:text-amber-300 flex items-center justify-between">
            <span>🔑 Password</span>
            <span class="text-[10px] text-sfl-woodLight dark:text-slate-400 font-normal">min 6 chars</span>
          </label>
          <input 
            type="password" 
            id="gate-password" 
            placeholder="••••••••" 
            autocomplete="current-password"
            class="w-full px-3 py-2 text-sm rounded-xl border-2 border-amber-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-sfl-dirt dark:text-amber-100 focus:outline-none focus:ring-2 focus:ring-sfl-green shadow-xs transition"
            required
          >
        </div>

        <!-- Submit Button -->
        <button 
          type="button" 
          id="gate-btn-submit" 
          class="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-sfl-green hover:bg-green-700 active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
        >
          <span id="gate-btn-spinner" class="hidden animate-spin">⏳</span>
          <span id="gate-btn-text">🌾 Register & Enter Farm</span>
        </button>
      </form>

      <!-- Value Proposition Highlights -->
      <div class="mt-6 pt-5 border-t border-amber-200/80 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-[10px] font-semibold text-sfl-woodLight dark:text-slate-400">
        <div class="p-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-amber-200/60 dark:border-slate-700/60 space-y-0.5">
          <span class="text-base block">⏱️</span>
          <span class="font-bold text-sfl-dirt dark:text-amber-200 block">00:00 UTC</span>
          <span>Daily Baseline</span>
        </div>
        <div class="p-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-amber-200/60 dark:border-slate-700/60 space-y-0.5">
          <span class="text-base block">📊</span>
          <span class="font-bold text-sfl-dirt dark:text-amber-200 block">22:00 UTC</span>
          <span>Harvest Report</span>
        </div>
        <div class="p-2 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-amber-200/60 dark:border-slate-700/60 space-y-0.5">
          <span class="text-base block">⚖️</span>
          <span class="font-bold text-sfl-dirt dark:text-amber-200 block">5x Daily</span>
          <span>Trade Sync</span>
        </div>
      </div>

      <!-- Help hint -->
      <p class="text-[10px] text-center text-sfl-woodLight dark:text-slate-500 mt-4">
        Where to find your Farm ID? Open <em>Sunflower Land &gt; Menu &gt; Settings</em> or check your farm profile URL.
      </p>

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
  const alertEl = document.getElementById('gate-alert');

  if (alertEl) alertEl.classList.add('hidden');

  if (mode === 'register') {
    tabReg?.classList.add('bg-sfl-green', 'text-white', 'shadow-xs');
    tabReg?.classList.remove('text-sfl-wood', 'dark:text-slate-300');
    tabLog?.classList.remove('bg-sfl-green', 'text-white', 'shadow-xs');
    tabLog?.classList.add('text-sfl-wood', 'dark:text-slate-300');

    if (farmIdGroup) farmIdGroup.classList.remove('hidden');
    if (btnText) btnText.textContent = '🌾 Register & Enter Farm';
  } else {
    tabLog?.classList.add('bg-sfl-green', 'text-white', 'shadow-xs');
    tabLog?.classList.remove('text-sfl-wood', 'dark:text-slate-300');
    tabReg?.classList.remove('bg-sfl-green', 'text-white', 'shadow-xs');
    tabReg?.classList.add('text-sfl-wood', 'dark:text-slate-300');

    // Hide farm ID group on login since it loads automatically from the user's profile
    if (farmIdGroup) farmIdGroup.classList.add('hidden');
    if (btnText) btnText.textContent = '🚜 Sign In & Enter';
  }
}

function showGateAlert(message, type = 'error') {
  const alertEl = document.getElementById('gate-alert');
  if (!alertEl) return;

  alertEl.className = type === 'error'
    ? 'p-3 rounded-xl text-xs font-bold mb-4 border bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
    : 'p-3 rounded-xl text-xs font-bold mb-4 border bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200';

  alertEl.textContent = message;
  alertEl.classList.remove('hidden');
}

function setGateLoading(isLoading) {
  const btn = document.getElementById('gate-btn-submit');
  const spinner = document.getElementById('gate-btn-spinner');
  if (btn) btn.disabled = isLoading;
  if (spinner) {
    if (isLoading) spinner.classList.remove('hidden');
    else spinner.classList.add('hidden');
  }
}

function bindWelcomeGateEvents() {
  document.getElementById('gate-tab-register')?.addEventListener('click', () => setGateMode('register'));
  document.getElementById('gate-tab-login')?.addEventListener('click', () => setGateMode('login'));

  document.getElementById('gate-form')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('gate-btn-submit')?.click();
    }
  });

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
