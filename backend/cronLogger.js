/**
 * Shared Cron Metrics and Logging Helper
 * Standardizes execution duration, success/fail counts, and log banners for Render.
 */

/**
 * Format milliseconds into human-readable duration:
 * - < 1s   -> "450ms"
 * - < 60s  -> "45.2s"
 * - >= 60s -> "14m 32s (872.4s)"
 * - >= 1h  -> "1h 12m 30s (4350.0s)"
 */
function formatDuration(ms) {
  if (typeof ms !== 'number' || isNaN(ms) || ms < 0) return '0ms';
  const totalSeconds = ms / 1000;
  if (totalSeconds < 1) return `${Math.round(ms)}ms`;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSec = Math.floor(totalSeconds % 60);
  if (minutes < 60) {
    return `${minutes}m ${remainingSec}s (${totalSeconds.toFixed(1)}s)`;
  }

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m ${remainingSec}s (${totalSeconds.toFixed(1)}s)`;
}

/**
 * Output standardized summary banner in console logs (Render).
 */
function logCronSummary(taskName, options = {}) {
  const {
    startTime,
    total = 0,
    succeeded = 0,
    failed = 0,
    skipped = 0,
    failedIds = [],
    skippedIds = [],
    extraMetrics = []
  } = options;

  const elapsedMs = typeof startTime === 'number' ? Math.max(0, Date.now() - startTime) : 0;
  const durationStr = formatDuration(elapsedMs);
  const successPct = total > 0 ? ((succeeded / total) * 100).toFixed(1) : '100.0';
  const failPct = total > 0 ? ((failed / total) * 100).toFixed(1) : '0.0';

  console.log('\n' + '='.repeat(80));
  console.log(`🏁 [CRON SUMMARY] ${taskName}`);
  console.log(`⏱️  Total Duration : ${durationStr}`);
  console.log(`📊 Total Farms    : ${total}`);
  console.log(`✅ Succeeded      : ${succeeded} (${successPct}%)`);

  if (failed > 0) {
    console.log(`❌ Failed         : ${failed} (${failPct}%)`);
    const idList = Array.isArray(failedIds) ? failedIds : [];
    console.log(`⚠️  Failed Farm IDs: [${idList.join(', ')}]`);
  } else {
    console.log(`❌ Failed         : 0 (0.0%)`);
  }

  if (skipped > 0) {
    console.log(`ℹ️  Skipped        : ${skipped}`);
    const skipList = Array.isArray(skippedIds) ? skippedIds : [];
    if (skipList.length > 0 && skipList.length <= 15) {
      console.log(`ℹ️  Skipped IDs    : [${skipList.join(', ')}]`);
    }
  }

  if (Array.isArray(extraMetrics)) {
    for (const m of extraMetrics) {
      if (m && m.label && m.value !== undefined) {
        console.log(`📦 ${String(m.label).padEnd(16)}: ${m.value}`);
      }
    }
  }

  console.log('='.repeat(80) + '\n');

  return {
    taskName,
    elapsedMs,
    duration: durationStr,
    total,
    succeeded,
    failed,
    skipped,
    failedIds: Array.isArray(failedIds) ? failedIds : [],
    successPct: parseFloat(successPct),
    failPct: parseFloat(failPct)
  };
}

module.exports = {
  formatDuration,
  logCronSummary
};
