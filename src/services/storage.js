
// --- CENTRALIZED LOCAL STORAGE & SUPABASE PERSISTENCE SERVICE ---

export const StorageService = {
  // LocalStorage Helpers
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to write key '${key}' to localStorage`, e);
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  // Tracked Targets Sync
  getTrackedTargets() {
    return this.get('sfl_tracked_targets', []);
  },

  saveTrackedTargets(targets) {
    this.set('sfl_tracked_targets', targets);
    window.trackedTargets = targets;
  },

  // Daily Yield Snapshots
  getDailySnapshots() {
    return this.get('sfl_daily_snapshots', []);
  },

  saveDailySnapshots(snapshots) {
    this.set('sfl_daily_snapshots', snapshots);
  },

  // Cloud Sync Helpers via Supabase
  async syncProfileToCloud(userId, farmId, trackedTargets) {
    const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
    if (!client || !userId) return;

    return await client
      .from('profiles')
      .upsert({
        id: userId,
        farm_id: farmId,
        tracked_items: trackedTargets || []
      }, { onConflict: 'id' });
  },

  async syncYieldToCloud(userId, yieldData) {
    const client = window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
    if (!client || !userId) return;

    return await client
      .from('daily_yields')
      .upsert({
        user_id: userId,
        yield_date: yieldData.date,
        total_count: yieldData.totalCount,
        net_flowers: yieldData.netFlowers,
        crops: yieldData.crops
      }, { onConflict: 'user_id,yield_date' });
  }
};
