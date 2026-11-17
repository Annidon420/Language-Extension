/**
 * ScreenLingo AI - Options & Settings Controller
 */

import { TARGET_LANGUAGES, SOURCE_LANGUAGES } from '../shared/languages.js';
import { storageManager } from '../shared/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      navItems.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`tab-${targetTab}`).classList.add('active');

      if (targetTab === 'history') {
        loadHistoryView();
      }
    });
  });

  // Elements
  const sourceSelect = document.getElementById('opt-source-lang');
  const targetSelect = document.getElementById('opt-target-lang');
  const floatingPillToggle = document.getElementById('opt-floating-pill');
  const selectionTooltipToggle = document.getElementById('opt-selection-tooltip');
  const autoTranslateToggle = document.getElementById('opt-auto-translate');
  const saveHistoryToggle = document.getElementById('opt-save-history');
  const clearHistoryBtn = document.getElementById('btn-clear-history');
  const blacklistedDomainsInput = document.getElementById('opt-blacklisted-domains');

  const historyListContainer = document.getElementById('history-list-container');
  const historySearchInput = document.getElementById('history-search');
  const exportHistoryBtn = document.getElementById('btn-export-history');
  const toast = document.getElementById('toast');

  // Populate Languages (5 Core Target Languages)
  populateLanguageSelects();

  // Load Saved Settings
  const settings = await storageManager.getSettings();
  sourceSelect.value = settings.sourceLanguage || 'auto';
  targetSelect.value = settings.targetLanguage || 'en';
  floatingPillToggle.checked = settings.enableFloatingButton !== false;
  selectionTooltipToggle.checked = settings.showSelectionTooltip !== false;
  autoTranslateToggle.checked = !!settings.autoTranslate;
  saveHistoryToggle.checked = !!settings.saveHistory;
  blacklistedDomainsInput.value = (settings.blacklistedDomains || []).join('\n');

  // Auto-save on change
  const saveAll = async () => {
    const updated = {
      sourceLanguage: sourceSelect.value,
      targetLanguage: targetSelect.value,
      enableFloatingButton: floatingPillToggle.checked,
      showSelectionTooltip: selectionTooltipToggle.checked,
      autoTranslate: autoTranslateToggle.checked,
      saveHistory: saveHistoryToggle.checked,
      blacklistedDomains: blacklistedDomainsInput.value
        .split('\n')
        .map((d) => d.trim())
        .filter((d) => d.length > 0)
    };
    await storageManager.saveSettings(updated);
    showToast('Settings Saved');
  };

  sourceSelect.addEventListener('change', saveAll);
  targetSelect.addEventListener('change', saveAll);
  floatingPillToggle.addEventListener('change', saveAll);
  selectionTooltipToggle.addEventListener('change', saveAll);
  autoTranslateToggle.addEventListener('change', saveAll);
  saveHistoryToggle.addEventListener('change', saveAll);
  blacklistedDomainsInput.addEventListener('blur', saveAll);

  // ── Voice Dubbing Settings ─────────────────────────────
  const optEnableVoiceDubber    = document.getElementById('opt-enable-voice-dubber');
  const optShowDubbingCaptions  = document.getElementById('opt-show-dubbing-captions');
  const optDubTargetLang        = document.getElementById('opt-dub-target-lang');
  const optDuckVolume           = document.getElementById('opt-duck-volume');
  const duckVolLabel            = document.getElementById('duck-vol-label');
  const optVoiceSpeed           = document.getElementById('opt-voice-speed');
  const voiceSpeedLabel         = document.getElementById('voice-speed-label');

  if (optEnableVoiceDubber) {
    // Load saved values
    optEnableVoiceDubber.checked   = !!settings.enableVoiceDubber;
    optShowDubbingCaptions.checked = settings.showDubbingCaptions !== false;
    optDubTargetLang.value         = settings.voiceDubTargetLang   || 'en';
    const savedDuck  = Math.round((settings.duckVolumeLevel  || 0.15) * 100);
    const savedSpeed = Math.round((settings.voiceSpeed       || 1.1)  * 10);
    optDuckVolume.value  = savedDuck;
    optVoiceSpeed.value  = savedSpeed;
    if (duckVolLabel)   duckVolLabel.textContent   = `${savedDuck}%`;
    if (voiceSpeedLabel) voiceSpeedLabel.textContent = `${(savedSpeed / 10).toFixed(1)}×`;

    const saveDubbing = async () => {
      const duckPct  = parseInt(optDuckVolume.value, 10);
      const speedVal = parseInt(optVoiceSpeed.value, 10);
      await storageManager.saveSettings({
        enableVoiceDubber:   optEnableVoiceDubber.checked,
        showDubbingCaptions: optShowDubbingCaptions.checked,
        voiceDubTargetLang:  optDubTargetLang.value,
        duckVolumeLevel:     duckPct  / 100,
        voiceSpeed:          speedVal / 10
      });
      showToast('Dubbing Settings Saved');
    };

    optEnableVoiceDubber.addEventListener('change', saveDubbing);
    optShowDubbingCaptions.addEventListener('change', saveDubbing);
    optDubTargetLang.addEventListener('change', saveDubbing);

    optDuckVolume.addEventListener('input', () => {
      if (duckVolLabel) duckVolLabel.textContent = `${optDuckVolume.value}%`;
    });
    optDuckVolume.addEventListener('change', saveDubbing);

    optVoiceSpeed.addEventListener('input', () => {
      if (voiceSpeedLabel) voiceSpeedLabel.textContent = `${(parseInt(optVoiceSpeed.value, 10) / 10).toFixed(1)}×`;
    });
    optVoiceSpeed.addEventListener('change', saveDubbing);
  }

  // Clear History
  clearHistoryBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to permanently delete all translation records?')) {
      await storageManager.clearHistory();
      showToast('History Cleared');
      loadHistoryView();
    }
  });

  // History Viewer
  let cachedHistory = [];
  async function loadHistoryView() {
    cachedHistory = await storageManager.getHistory();
    renderHistory(cachedHistory);
  }

  function renderHistory(items) {
    historyListContainer.innerHTML = '';
    if (!items || items.length === 0) {
      historyListContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #64748B;">
          No saved translation history.
        </div>`;
      return;
    }

    items.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'history-card';
      const dateStr = new Date(item.timestamp).toLocaleString();
      card.innerHTML = `
        <div class="history-card-header">
          <span class="history-lang">${item.sourceLang.toUpperCase()} ➔ ${item.targetLang.toUpperCase()}</span>
          <span class="history-date">${dateStr}</span>
        </div>
        <div class="history-translated">${escapeHtml(item.translated)}</div>
        <div class="history-original">${escapeHtml(item.original)}</div>
      `;
      historyListContainer.appendChild(card);
    });
  }

  historySearchInput.addEventListener('input', () => {
    const q = historySearchInput.value.toLowerCase().trim();
    if (!q) {
      renderHistory(cachedHistory);
    } else {
      const filtered = cachedHistory.filter(
        (h) =>
          h.translated.toLowerCase().includes(q) ||
          h.original.toLowerCase().includes(q)
      );
      renderHistory(filtered);
    }
  });

  exportHistoryBtn.addEventListener('click', () => {
    if (!cachedHistory || cachedHistory.length === 0) {
      alert('No history to export.');
      return;
    }
    const blob = new Blob([JSON.stringify(cachedHistory, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screenlingo-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  function populateLanguageSelects() {
    sourceSelect.innerHTML = '';
    targetSelect.innerHTML = '';

    SOURCE_LANGUAGES.forEach((lang) => {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = `${lang.flag} ${lang.name}`;
      sourceSelect.appendChild(opt);
    });

    TARGET_LANGUAGES.forEach((lang) => {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = `${lang.flag} ${lang.name} (${lang.native})`;
      targetSelect.appendChild(opt);
    });
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 2000);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
});
