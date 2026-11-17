/**
 * ScreenLingo AI - Fast Popup Controller
 * Supports English, Hindi, Russian, Chinese, and Spanish target languages.
 */

import { TARGET_LANGUAGES, SOURCE_LANGUAGES } from '../shared/languages.js';
import { storageManager } from '../shared/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const sourceSelect = document.getElementById('source-lang');
  const targetSelect = document.getElementById('target-lang');
  const swapBtn = document.getElementById('swap-lang-btn');
  const translatePageBtn = document.getElementById('btn-translate-page');
  const translatePageText = document.getElementById('btn-translate-text');
  const toggleOriginalBtn = document.getElementById('btn-toggle-original');
  const statusBadge = document.getElementById('status-badge');
  const statusLabel = statusBadge.querySelector('.status-label');

  const quickInput = document.getElementById('quick-input');
  const quickTranslateBtn = document.getElementById('btn-quick-translate');
  const quickResultBox = document.getElementById('quick-result-box');
  const quickResultText = document.getElementById('quick-result-text');
  const quickResultLang = document.getElementById('quick-result-lang');
  const quickCopyBtn = document.getElementById('btn-quick-copy');

  const toggleAutoTranslate = document.getElementById('toggle-auto-translate');
  const toggleSelectionTooltip = document.getElementById('toggle-selection-tooltip');
  const linkOptions = document.getElementById('link-options');

  // Populate Languages (Clean 5 Core Target Languages)
  populateLanguageSelects();

  // Load Settings
  const settings = await storageManager.getSettings();
  sourceSelect.value = settings.sourceLanguage || 'auto';
  targetSelect.value = settings.targetLanguage || 'en';
  toggleAutoTranslate.checked = !!settings.autoTranslate;
  toggleSelectionTooltip.checked = settings.showSelectionTooltip !== false;

  // Query Active Tab Status
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab && activeTab.id) {
    chrome.tabs.sendMessage(activeTab.id, { action: 'GET_PAGE_STATUS' }, (res) => {
      if (chrome.runtime.lastError || !res) {
        statusLabel.textContent = 'Ready';
        return;
      }
      if (res.isPageTranslated) {
        statusBadge.classList.add('active');
        statusLabel.textContent = `Translated (${(res.targetLang || targetSelect.value).toUpperCase()})`;
        translatePageText.textContent = 'Page Translated';
        toggleOriginalBtn.style.display = 'block';
      }
    });
  }

  // Events
  sourceSelect.addEventListener('change', async () => {
    await updateSettings({ sourceLanguage: sourceSelect.value });
  });

  targetSelect.addEventListener('change', async () => {
    await updateSettings({ targetLanguage: targetSelect.value });
  });

  swapBtn.addEventListener('click', async () => {
    if (sourceSelect.value !== 'auto') {
      const temp = sourceSelect.value;
      sourceSelect.value = targetSelect.value;
      targetSelect.value = temp;
      await updateSettings({
        sourceLanguage: sourceSelect.value,
        targetLanguage: targetSelect.value
      });
    }
  });

  toggleAutoTranslate.addEventListener('change', async () => {
    await updateSettings({ autoTranslate: toggleAutoTranslate.checked });
  });

  toggleSelectionTooltip.addEventListener('change', async () => {
    await updateSettings({ showSelectionTooltip: toggleSelectionTooltip.checked });
  });

  // Page Translation: Passes chosen target and source languages directly!
  translatePageBtn.addEventListener('click', async () => {
    if (!activeTab || !activeTab.id) return;
    translatePageBtn.classList.add('translating');
    translatePageText.textContent = `Translating to ${targetSelect.selectedOptions[0].text}...`;

    chrome.tabs.sendMessage(
      activeTab.id,
      {
        action: 'TRANSLATE_PAGE_TRIGGER',
        payload: {
          targetLang: targetSelect.value,
          sourceLang: sourceSelect.value
        }
      },
      (res) => {
        translatePageBtn.classList.remove('translating');
        if (res && res.isTranslated) {
          statusBadge.classList.add('active');
          statusLabel.textContent = `Translated (${targetSelect.value.toUpperCase()})`;
          translatePageText.textContent = 'Page Translated';
          toggleOriginalBtn.style.display = 'block';
        } else {
          statusBadge.classList.remove('active');
          statusLabel.textContent = 'Ready';
          translatePageText.textContent = 'Translate Entire Page';
          toggleOriginalBtn.style.display = 'none';
        }
      }
    );
  });

  toggleOriginalBtn.addEventListener('click', async () => {
    if (!activeTab || !activeTab.id) return;
    chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE_ORIGINAL_TRIGGER' }, (res) => {
      if (res && res.isTranslated) {
        statusBadge.classList.add('active');
        statusLabel.textContent = `Translated (${targetSelect.value.toUpperCase()})`;
        toggleOriginalBtn.querySelector('span').textContent = '↩ Switch to Original Webpage';
      } else {
        statusBadge.classList.remove('active');
        statusLabel.textContent = 'Original';
        toggleOriginalBtn.querySelector('span').textContent = '🌐 Show Translated Webpage';
      }
    });
  });

  // Quick In-Popup Translator Box
  quickTranslateBtn.addEventListener('click', async () => {
    const text = quickInput.value.trim();
    if (!text) return;

    quickTranslateBtn.textContent = 'Translating...';
    chrome.runtime.sendMessage(
      {
        action: 'TRANSLATE_TEXT',
        payload: {
          text: text,
          sourceLang: sourceSelect.value,
          targetLang: targetSelect.value,
          saveHistory: settings.saveHistory,
          url: activeTab ? activeTab.url : ''
        }
      },
      (res) => {
        quickTranslateBtn.textContent = 'Translate';
        if (res && res.success && res.data) {
          quickResultBox.style.display = 'block';
          quickResultText.textContent = res.data.translatedText;
          quickResultLang.textContent = `${(res.data.detectedSource || 'auto').toUpperCase()} ➔ ${targetSelect.value.toUpperCase()}`;
        }
      }
    );
  });

  quickCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(quickResultText.textContent).then(() => {
      quickCopyBtn.textContent = '✓';
      setTimeout(() => { quickCopyBtn.textContent = '📋'; }, 1000);
    });
  });

  // Options Link
  linkOptions.addEventListener('click', (e) => {
    e.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });

  function populateLanguageSelects() {
    sourceSelect.innerHTML = '';
    targetSelect.innerHTML = '';

    // Source Languages
    SOURCE_LANGUAGES.forEach((lang) => {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = `${lang.flag} ${lang.name}`;
      sourceSelect.appendChild(opt);
    });

    // Target Languages (English, Hindi, Russian, Chinese, Spanish)
    TARGET_LANGUAGES.forEach((lang) => {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = `${lang.flag} ${lang.name} (${lang.native})`;
      targetSelect.appendChild(opt);
    });
  }

  async function updateSettings(partial) {
    const current = await storageManager.getSettings();
    const updated = Object.assign({}, current, partial);
    await storageManager.saveSettings(updated);

    if (activeTab && activeTab.id) {
      chrome.tabs.sendMessage(activeTab.id, { action: 'SETTINGS_UPDATED' });
    }
  }
});
