import { renderCropTrackerTemplate, renderCropTrackerRows } from './cropTable.js';
import { fetchAndApplyLandYields, fetchLiveCropDiff, saveCurrentActivityAsBaseline } from './cropSync.js';
import { loadCloudBaseYields, saveBaseYieldSettings, updateCropBaseYield, updateDailyCropHistoricalYield, applyGlobalYieldToAll, applyWeeklyGlobalYieldToAll, setGlobalAvgYield } from './cropState.js';
import { renderCropWeeklySummary } from './cropWeekly.js';

export let currentCropWeekOffset = 0;

export function initCropTrackerPanel() {
  renderCropTrackerTemplate();

  document.getElementById('refresh-crop-activity-btn')?.addEventListener('click', fetchLiveCropDiff);
  document.getElementById('save-base-yields-btn')?.addEventListener('click', () => saveBaseYieldSettings(true));
  document.getElementById('apply-global-yield-btn')?.addEventListener('click', applyGlobalYieldToAll);
  document.getElementById('apply-weekly-global-yield-btn')?.addEventListener('click', applyWeeklyGlobalYieldToAll);
  document.getElementById('autofill-land-yields-btn')?.addEventListener('click', () => fetchAndApplyLandYields(true));
  document.getElementById('autofill-weekly-land-yields-btn')?.addEventListener('click', () => fetchAndApplyLandYields(true));

  const globalYieldInput = document.getElementById('global-avg-yield-input');
  globalYieldInput?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 1.0;
    setGlobalAvgYield(val);
    localStorage.setItem('sfl_global_avg_yield', val.toString());
    // Note: To perfectly match we might need to access cropBaseYields and set ['_global'] = val;
    // but the original code was cropBaseYields['_global'] = val; inside index.js. 
    // Since cropBaseYields is imported, we can still modify its property:
    import('./cropState.js').then(module => {
      module.cropBaseYields['_global'] = val;
      module.syncWeeklyGlobalInput(val);
      module.debouncedCloudSave();
    });
  });

  const weeklyGlobalInput = document.getElementById('weekly-global-avg-yield-input');
  weeklyGlobalInput?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 1.0;
    setGlobalAvgYield(val);
    localStorage.setItem('sfl_global_avg_yield', val.toString());
    import('./cropState.js').then(module => {
      module.cropBaseYields['_global'] = val;
      module.syncMainGlobalInput(val);
      module.debouncedCloudSave();
    });
  });

  const modal = document.getElementById('crop-weekly-modal');
  const openBtn = document.getElementById('open-crop-weekly-btn');
  const closeBtn = document.getElementById('close-crop-weekly-modal-btn');
  const closeFooterBtn = document.getElementById('close-crop-weekly-modal-footer-btn');
  const prevBtn = document.getElementById('prev-crop-week-btn');
  const nextBtn = document.getElementById('next-crop-week-btn');

  openBtn?.addEventListener('click', () => {
    currentCropWeekOffset = 0;
    renderCropWeeklySummary();
    modal?.classList.remove('hidden');
  });

  const closeModal = () => modal?.classList.add('hidden');
  closeBtn?.addEventListener('click', closeModal);
  closeFooterBtn?.addEventListener('click', closeModal);

  prevBtn?.addEventListener('click', () => {
    currentCropWeekOffset--;
    renderCropWeeklySummary();
  });

  nextBtn?.addEventListener('click', () => {
    if (currentCropWeekOffset < 0) {
      currentCropWeekOffset++;
      renderCropWeeklySummary();
    }
  });

  loadCloudBaseYields();
}

window.updateCropBaseYield = updateCropBaseYield;
window.updateDailyCropHistoricalYield = updateDailyCropHistoricalYield;
window.saveCurrentActivityAsBaseline = saveCurrentActivityAsBaseline;
window.renderCropTrackerRows = renderCropTrackerRows;
window.renderCropWeeklySummary = renderCropWeeklySummary;
window.loadCloudBaseYields = loadCloudBaseYields;

export { 
  initCropTrackerPanel, 
  renderCropTrackerRows, 
  renderCropTrackerTemplate,
  fetchAndApplyLandYields, 
  fetchLiveCropDiff, 
  saveCurrentActivityAsBaseline,
  loadCloudBaseYields, 
  saveBaseYieldSettings, 
  updateCropBaseYield,
  updateDailyCropHistoricalYield, 
  applyGlobalYieldToAll, 
  applyWeeklyGlobalYieldToAll,
  renderCropWeeklySummary 
};
