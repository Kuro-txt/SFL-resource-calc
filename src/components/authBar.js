export function renderAuthBar() {
  const container = document.getElementById('auth-mount');
  if (!container) return;

  container.innerHTML = `
    <div id="auth-panel" class="bg-sfl-wood text-amber-100 p-3 rounded-xl border-2 border-sfl-dirt flex flex-col sm:flex-row justify-between items-center gap-3 shadow-md">
      <form id="auth-logged-out" onsubmit="return false;" class="w-full flex flex-col sm:flex-row items-center justify-between gap-2">
        <span class="text-xs font-bold text-amber-200 flex items-center gap-1.5">
          <span>☁️</span> Multi-Device Sync: Log in to save settings & snapshots across devices
        </span>
        <div class="flex items-center gap-2 w-full sm:w-auto">
          <input type="email" id="auth-email" placeholder="Email" autocomplete="username" class="sfl-input px-2 py-1 text-xs text-sfl-dirt rounded w-full sm:w-36">
          <input type="password" id="auth-password" placeholder="Password" autocomplete="current-password" class="sfl-input px-2 py-1 text-xs text-sfl-dirt rounded w-full sm:w-32">
          <button type="button" id="btn-login" class="bg-sfl-green text-white font-bold px-3 py-1 rounded text-xs hover:bg-green-700 transition whitespace-nowrap">Sign In</button>
          <button type="button" id="btn-signup" class="bg-amber-600 text-white font-bold px-3 py-1 rounded text-xs hover:bg-amber-700 transition whitespace-nowrap">Sign Up</button>
        </div>
      </form>

      <div id="auth-logged-in" class="hidden w-full flex justify-between items-center">
        <span class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
          <span>✅</span> Logged in as: <span id="user-email-display" class="text-white font-semibold"></span>
        </span>
        <button id="btn-logout" class="bg-sfl-accent text-white font-bold px-3 py-1 rounded text-xs hover:bg-red-700 transition">Sign Out</button>
      </div>
    </div>
  `;
}
