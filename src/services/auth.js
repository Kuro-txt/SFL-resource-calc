import { debounce } from '../utils/helpers.js';

export async function initAuth() {
  if (!window.supabaseClient && typeof supabaseClient !== 'undefined') {
    window.supabaseClient = supabaseClient;
  }

  try {
    const localSaved = localStorage.getItem('sfl_tracked_targets');
    window.trackedTargets = localSaved ? (JSON.parse(localSaved) || []) : [];
  } catch (e) {
    window.trackedTargets = [];
  }

  const savedFarmId = localStorage.getItem('sfl_farm_id');
  const savedApiKey = localStorage.getItem('sfl_api_key');

  const farmIdEl = document.getElementById('farm-id');
  const apiKeyEl = document.getElementById('api-key');

  if (savedFarmId && farmIdEl) farmIdEl.value = savedFarmId;
  if (savedApiKey && apiKeyEl) apiKeyEl.value = savedApiKey;

  bindAuthEventListeners();

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

export async function setLoggedInUser(user) {
  window.currentUser = user;
  
  document.getElementById('auth-logged-out')?.classList.add('hidden');
  document.getElementById('auth-logged-in')?.classList.remove('hidden');
  
  const emailDisplay = document.getElementById('user-email-display');
  if (emailDisplay) emailDisplay.textContent = user.email;

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

export function setLoggedOutUser() {
  window.currentUser = null;
  window.trackedTargets = [];
  localStorage.setItem('sfl_tracked_targets', '[]');
  
  document.getElementById('auth-logged-out')?.classList.remove('hidden');
  document.getElementById('auth-logged-in')?.classList.add('hidden');
  
  if (typeof window.renderTrackedBadges === 'function') window.renderTrackedBadges();
  if (typeof window.renderSnapshotHistory === 'function') window.renderSnapshotHistory();
}

export async function loadCloudUserData() {
  if (!window.currentUser || !window.supabaseClient) return;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffDateStr = cutoff.toISOString().split('T')[0];

  const { data: profile } = await window.supabaseClient
    .from('profiles')
    .select('farm_id, tracked_items, crop_base_yields')
    .eq('id', window.currentUser.id)
    .maybeSingle();

  if (profile) {
    if (profile.farm_id) {
      const farmIdEl = document.getElementById('farm-id');
      if (farmIdEl) farmIdEl.value = profile.farm_id;
      localStorage.setItem('sfl_farm_id', profile.farm_id);
    }

    if (Array.isArray(profile.tracked_items) && profile.tracked_items.length > 0) {
      window.trackedTargets = profile.tracked_items;
      localStorage.setItem('sfl_tracked_targets', JSON.stringify(profile.tracked_items));
    } else {
      try {
        const localSaved = localStorage.getItem('sfl_tracked_targets');
        window.trackedTargets = localSaved ? (JSON.parse(localSaved) || []) : [];
      } catch (e) {
        window.trackedTargets = [];
      }
    }

    if (profile.crop_base_yields) {
      localStorage.setItem('sfl_crop_base_yields', JSON.stringify(profile.crop_base_yields));
      if (typeof window.loadCloudBaseYields === 'function') window.loadCloudBaseYields();
    }

    if (typeof window.renderTrackedBadges === 'function') window.renderTrackedBadges();
  }

  await window.supabaseClient.from('daily_yields').delete().eq('user_id', window.currentUser.id).lt('yield_date', cutoffDateStr);
  await window.supabaseClient.from('preharvest_baselines').delete().eq('user_id', window.currentUser.id).lt('snapshot_date', cutoffDateStr);

  let yields = [];
  try {
    const { data } = await window.supabaseClient
      .from('daily_yields')
      .select('*')
      .eq('user_id', window.currentUser.id)
      .order('yield_date', { ascending: false });
    yields = data || [];
  } catch (e) {
    console.warn("Supabase yields fetch notice:", e.message);
  }

  // If Supabase returned 0 records (e.g. blocked by RLS), fallback to TiDB Cloud API
  if (yields.length === 0) {
    try {
      const farmId = profile?.farm_id || localStorage.getItem('sfl_farm_id') || '';
      const backend = window.BACKEND_URL || '';
      const res = await fetch(`${backend}/api/yields?farmId=${encodeURIComponent(farmId)}&userId=${encodeURIComponent(window.currentUser.id)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        yields = json.data;
      }
    } catch (e) {
      console.warn("TiDB yields fallback fetch notice:", e.message);
    }
  }

  if (yields && yields.length > 0) {
    let existingLocal = [];
    try {
      existingLocal = JSON.parse(localStorage.getItem('sfl_daily_snapshots') || '[]');
    } catch(e) { existingLocal = []; }

    const mergedMap = new Map();
    if (Array.isArray(existingLocal)) {
      existingLocal.forEach(item => {
        const d = item.date || item.yield_date;
        if (d) mergedMap.set(d, item);
      });
    }

    yields.forEach(y => {
      const d = y.yield_date || y.date;
      if (!d) return;

      const existing = mergedMap.get(d) || {};
      const cloudCrops = Array.isArray(y.crops) && y.crops.length > 0 ? y.crops : [];
      const cloudActs = Array.isArray(y.crop_activity_yields) ? y.crop_activity_yields : (y.cropActivityYields || []);

      let effectiveCrops = cloudCrops;
      if (effectiveCrops.length === 0 && cloudActs.length > 0) {
        effectiveCrops = cloudActs.map(c => ({
          name: c.crop || c.name || 'Crop',
          qty: parseFloat(c.totalProduced || c.qty || c.harvestCount || 0),
          flowers: parseFloat(c.netFlowers || c.flowers || 0)
        }));
      }

      if (effectiveCrops.length === 0 && Array.isArray(existing.crops) && existing.crops.length > 0) {
        effectiveCrops = existing.crops;
      }

      mergedMap.set(d, {
        date: d,
        totalCount: parseFloat(y.total_count || y.totalCount || existing.totalCount || 0),
        crops: effectiveCrops,
        cropActivityYields: cloudActs.length > 0 ? cloudActs : (existing.cropActivityYields || []),
        netFlowers: parseFloat(y.net_flowers || y.netFlowers || existing.netFlowers || 0).toFixed(3)
      });
    });

    const finalHistory = Array.from(mergedMap.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    localStorage.setItem('sfl_daily_snapshots', JSON.stringify(finalHistory));
  }

  if (typeof window.renderSnapshotHistory === 'function') window.renderSnapshotHistory();
  if (typeof window.updatePreHarvestUI === 'function') window.updatePreHarvestUI();
  if (typeof window.loadCloudBaseYields === 'function') window.loadCloudBaseYields();
}

function bindAuthEventListeners() {
  document.getElementById('btn-login')?.addEventListener('click', async () => {
    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value.trim();

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
    const email = document.getElementById('auth-email')?.value.trim();
    const password = document.getElementById('auth-password')?.value.trim();
    const farmId = document.getElementById('farm-id')?.value.trim();

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

  const syncFarmIdToCloud = debounce(async (farmId) => {
    if (window.currentUser && window.supabaseClient && farmId) {
      await window.supabaseClient
        .from('profiles')
        .upsert({ 
          id: window.currentUser.id, 
          farm_id: farmId,
          tracked_items: window.trackedTargets || [] 
        }, { onConflict: 'id' });
    }
  }, 400);

  document.getElementById('farm-id')?.addEventListener('input', (e) => {
    const farmId = e.target.value.trim();
    localStorage.setItem('sfl_farm_id', farmId);
    syncFarmIdToCloud(farmId);
  });

  document.getElementById('api-key')?.addEventListener('input', (e) => {
    localStorage.setItem('sfl_api_key', e.target.value);
  });
}
