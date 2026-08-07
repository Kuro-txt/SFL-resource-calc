export const StorageService = {
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

  getTrackedTargets() {
    return this.get('sfl_tracked_targets', []);
  },

  saveTrackedTargets(targets) {
    this.set('sfl_tracked_targets', targets);
    window.trackedTargets = targets;
  },

  getDailySnapshots() {
    return this.get('sfl_daily_snapshots', []);
  },

  saveDailySnapshots(snapshots) {
    this.set('sfl_daily_snapshots', snapshots);
  }
};
