// --- USER AUTHENTICATION & SUPABASE PROFILE MANAGEMENT ---

// Immediately hydrate memory state from localStorage on script parse
try {
  const localSaved = localStorage.getItem('sfl_tracked_targets');
  window.trackedTargets = localSaved ? (JSON.parse(localSaved) || []) : [];
} catch (e) {
  window.trackedTargets = [];
}

document.addEventListener('DOMContentLoaded', async () => {
  const savedFarmId = localStorage.getItem('sfl_farm_id');
  const savedApiKey = localStorage.getItem('sfl_api_key');

  if (savedFarmId) document.getElementById('farm-id').value = savedFarmId;
  if (savedApiKey) document.getElementById('api-key').value = savedApiKey;

  initAuth();
});

async function initAuth() {
  if (!window.supabaseClient && typeof supabaseClient !== 'undefined') {
    window.supabaseClient = supabaseClient;
  }
  if (!window.supabaseClient) return;

  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (session) {
    await setLoggedInUser(session.user);
  }

  window.supabaseClient.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      await setLoggedInUser(session.user);
    } else {
      setLoggedOutUser();
    }
  });
}

async function setLoggedInUser(user) {
  window.currentUser = user;
  
  document.getElementById('auth-logged-out')?.classList.add('hidden');
  document.getElementById('auth-logged-in')?.classList.remove('hidden');
  
  const emailDisplay = document.getElementById('user-email-display');
  if (emailDisplay) emailDisplay.textContent = user.email;

  // Load cloud profile first to prevent overwriting existing tracked_items
  await loadCloudUserData();

  const currentFarmId = document.getElementById('farm-id')?.value.trim();
  if (currentFarmId && window.supabaseClient) {
    await window.supabaseClient
      .from('profiles')
      .upsert({ 
        id: user.id, 
        farm_id: currentFarmId,
        tracked_items: window.trackedTargets || [] 
      }, { onConflict: 'id' });
  }
}

function setLoggedOutUser() {
  window.currentUser = null;
  window.trackedTargets = [];
  localStorage.setItem('sfl_tracked_targets', '[]');
  
  document.getElementById('auth-logged-out')?.classList.remove('hidden');
  document.getElementById('auth-logged-in')?.classList.add('hidden');
  
  if (typeof renderTrackedBadges === 'function') renderTrackedBadges();
  if (typeof renderSnapshotHistory === 'function') renderSnapshotHistory();
}

document.getElementById('btn-login')?.addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();

  if (!window.supabaseClient) return alert("❌ Supabase client is not initialized.");
  if (!email || !password) return alert("⚠️ Please enter email and password.");

  const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
  
  if (error) {
    alert("❌ Login Error: " + error.message);
  } else if (data.user) {
    alert("🎉 Logged in successfully!");
  }
});

document.getElementById('btn-signup')?.addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value.trim();
  const farmId = document.getElementById('farm-id').value.trim();

  if (!window.supabaseClient) return alert("❌ Supabase client is not initialized.");
  if (!email || !password) return alert("⚠️ Please enter email and password.");
  if (password.length < 6) return alert("⚠️ Password must be at least 6 characters.");
  if (!farmId) return alert("⚠️ Please enter your Farm ID below first!");

  const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
  
  if (error) {
    alert("❌ Sign Up Error: " + error.message);
  } else if (data.user) {
    const { error: profileErr } = await window.supabaseClient
      .from('profiles')
      .upsert({ 
        id: data.user.id, 
        farm_id: farmId,
        tracked_items: window.trackedTargets || [] 
      }, { onConflict: 'id' });

    if (profileErr) {
      console.error("Profile link error:", profileErr.message);
    }

    alert("🎉 Account created & Farm ID linked successfully!");
  }
});

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  if (window.supabaseClient) await window.supabaseClient.auth.signOut();
});

async function loadCloudUserData() {
  if (!window.currentUser || !window.supabaseClient) return;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffDateStr = cutoff.toISOString().split('T')[0];

  // Fetch full profile from Supabase
  const { data: profile } = await window.supabaseClient
    .from('profiles')
    .select('farm_id, tracked_items')
    .eq('id', window.currentUser.id)
    .maybeSingle();

  if (profile) {
    if (profile.farm_id) {
      const farmIdEl = document.getElementById('farm-id');
      if (farmIdEl) farmIdEl.value = profile.farm_id;
      localStorage.setItem('sfl_farm_id', profile.farm_id);
    }

    // Hydrate targets from database if present, otherwise fall back to local storage
    if (Array.isArray(profile.tracked_items) && profile.tracked_items.length > 0) {
      window.trackedTargets = profile.tracked_items;
      localStorage.setItem('sfl_tracked_targets', JSON.stringify(profile.tracked_items));
    } else {
      // If profile has no items in DB, keep what's currently stored in localStorage
      try {
        const localSaved = localStorage.getItem('sfl_tracked_targets');
        window.trackedTargets = localSaved ? (JSON.parse(localSaved) || []) : [];
      } catch (e) {
        window.trackedTargets = [];
      }
    }

    if (typeof renderTrackedBadges === 'function') renderTrackedBadges();
  }

  // Prune history older than 30 days
  await window.supabaseClient.from('daily_yields').delete().eq('user_id', window.currentUser.id).lt('yield_date', cutoffDateStr);
  await window.supabaseClient.from('preharvest_baselines').delete().eq('user_id', window.currentUser.id).lt('snapshot_date', cutoffDateStr);

  // Load yield history
  const { data: yields } = await window.supabaseClient
    .from('daily_yields')
    .select('*')
    .eq('user_id', window.currentUser.id)
    .order('yield_date', { ascending: false });

  if (yields && yields.length > 0) {
    let history = yields.map(y => ({
      date: y.yield_date,
      totalCount: parseFloat(y.total_count),
      netFlowers: y.net_flowers,
      crops: y.crops
    }));
    localStorage.setItem('sfl_daily_snapshots', JSON.stringify(history));
  }

  if (typeof renderSnapshotHistory === 'function') renderSnapshotHistory();
  if (typeof updatePreHarvestUI === 'function') updatePreHarvestUI();
}

document.getElementById('farm-id')?.addEventListener('input', async (e) => {
  const farmId = e.target.value.trim();
  localStorage.setItem('sfl_farm_id', farmId);
  if (window.currentUser && window.supabaseClient && farmId) {
    await window.supabaseClient
      .from('profiles')
      .upsert({ 
        id: window.currentUser.id, 
        farm_id: farmId,
        tracked_items: window.trackedTargets || [] 
      }, { onConflict: 'id' });
  }
});

document.getElementById('api-key')?.addEventListener('input', (e) => localStorage.setItem('sfl_api_key', e.target.value));
