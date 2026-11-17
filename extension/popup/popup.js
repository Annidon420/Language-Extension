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

  // ── Voice Dubbing Controls ──────────────────────────────
  const toggleVoiceDubbing = document.getElementById('toggle-voice-dubbing');
  const dubSettingsRow     = document.getElementById('dub-settings-row');
  const dubSourceLang      = document.getElementById('dub-source-lang');
  const dubTargetLang      = document.getElementById('dub-target-lang');
  const dubVoiceGender     = document.getElementById('dub-voice-gender');
  const dubVoiceExpression = document.getElementById('dub-voice-expression');
  const videoStatusChip    = document.getElementById('video-status-chip');

  if (toggleVoiceDubbing) {
    // Populate dub target language select
    if (dubTargetLang) {
      dubTargetLang.innerHTML = '';
      TARGET_LANGUAGES.forEach((lang) => {
        const opt = document.createElement('option');
        opt.value = lang.code;
        opt.textContent = `${lang.flag} ${lang.name}`;
        dubTargetLang.appendChild(opt);
      });
    }

    // Load saved dub settings (Storage is source of truth)
    const dubEnabled    = settings.enableVoiceDubber !== false;
    const dubSource     = settings.voiceDubSourceLang || 'auto';
    const dubLang       = settings.voiceDubTargetLang || 'hi';
    const dubGender     = settings.voiceGender || 'auto';
    const dubExpression = settings.voiceExpression || 'expressive';

    toggleVoiceDubbing.checked = dubEnabled;
    if (dubSourceLang) dubSourceLang.value = dubSource;
    if (dubTargetLang) dubTargetLang.value = dubLang;
    if (dubVoiceGender) dubVoiceGender.value = dubGender;
    if (dubVoiceExpression) dubVoiceExpression.value = dubExpression;
    if (dubSettingsRow) dubSettingsRow.style.display = dubEnabled ? 'flex' : 'none';

    // Helper to send updated settings to active tab
    function syncDubSettingsToTab() {
      if (activeTab && activeTab.id) {
        chrome.tabs.sendMessage(activeTab.id, {
          action: 'SET_VOICE_DUBBING',
          payload: {
            enabled: toggleVoiceDubbing.checked,
            sourceLang: dubSourceLang ? dubSourceLang.value : 'auto',
            targetLang: dubTargetLang ? dubTargetLang.value : 'hi',
            gender: dubVoiceGender ? dubVoiceGender.value : 'auto',
            expression: dubVoiceExpression ? dubVoiceExpression.value : 'expressive',
            duckLevel: 0.15,
            speed: 1.2
          }
        });
      }
    }

    // Query active tab for video status with auto-injection fallback
    async function checkVideoStatus() {
      if (!activeTab || !activeTab.id) return;

      // Cannot run content scripts on chrome:// or edge:// pages
      if (activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('chrome-extension://'))) {
        if (videoStatusChip) {
          videoStatusChip.textContent = 'Browser Internal Page';
        }
        return;
      }

      function sendDubQuery() {
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(
            activeTab.id,
            { action: 'GET_VOICE_DUBBING_STATUS' },
            (res) => {
              if (chrome.runtime.lastError || !res) {
                resolve(null);
              } else {
                resolve(res);
              }
            }
          );
        });
      }

      let res = await sendDubQuery();

      // If connection failed (e.g. extension was just updated or reloaded), auto-inject into tab
      if (!res && chrome.scripting) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id, allFrames: true },
            files: ['content/content-script.js', 'content/video-voice-dubber.js']
          });
          await chrome.scripting.insertCSS({
            target: { tabId: activeTab.id, allFrames: true },
            files: ['content/content-style.css']
          }).catch(() => {});

          // Small delay for script init, then retry
          await new Promise((r) => setTimeout(r, 150));
          res = await sendDubQuery();
        } catch (e) {
          console.warn('Auto script injection error:', e);
        }
      }

      if (!res) {
        if (videoStatusChip) {
          videoStatusChip.textContent = '🔄 Refresh page (F5)';
          videoStatusChip.title = 'Tab was open before extension reload. Press F5 on the page once to connect.';
        }
        return;
      }

      if (videoStatusChip) {
        if (res.hasVideos) {
          videoStatusChip.textContent = `✅ Video Found (${res.videoCount || 1})`;
          videoStatusChip.classList.add('has-video');
        } else {
          videoStatusChip.textContent = 'No video on page';
          videoStatusChip.classList.remove('has-video');
        }
      }

      // Sync active tab state if user has dubbing enabled
      if (dubEnabled) {
        syncDubSettingsToTab();
      }
    }

    checkVideoStatus();

    // Toggle dubbing on/off
    toggleVoiceDubbing.addEventListener('change', async () => {
      const enabled = toggleVoiceDubbing.checked;
      if (dubSettingsRow) dubSettingsRow.style.display = enabled ? 'flex' : 'none';
      await updateSettings({
        enableVoiceDubber: enabled,
        voiceDubSourceLang: dubSourceLang ? dubSourceLang.value : 'auto',
        voiceDubTargetLang: dubTargetLang ? dubTargetLang.value : 'hi',
        voiceGender: dubVoiceGender ? dubVoiceGender.value : 'auto',
        voiceExpression: dubVoiceExpression ? dubVoiceExpression.value : 'expressive'
      });
      syncDubSettingsToTab();
    });

    // Change original video source language
    if (dubSourceLang) {
      dubSourceLang.addEventListener('change', async () => {
        await updateSettings({ voiceDubSourceLang: dubSourceLang.value });
        syncDubSettingsToTab();
      });
    }

    // Change target dub language
    if (dubTargetLang) {
      dubTargetLang.addEventListener('change', async () => {
        await updateSettings({ voiceDubTargetLang: dubTargetLang.value });
        syncDubSettingsToTab();
      });
    }

    // Change voice gender
    if (dubVoiceGender) {
      dubVoiceGender.addEventListener('change', async () => {
        await updateSettings({ voiceGender: dubVoiceGender.value });
        syncDubSettingsToTab();
      });
    }

    // Change voice expression
    if (dubVoiceExpression) {
      dubVoiceExpression.addEventListener('change', async () => {
        await updateSettings({ voiceExpression: dubVoiceExpression.value });
        syncDubSettingsToTab();
      });
    }
  }

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
