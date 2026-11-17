/**
 * ScreenLingo AI - Ultra-Fast Content Script
 * High-speed DOM deduplication, streaming concurrent batching,
 * layout preservation, selection tooltip, and Alt+T shortcut.
 */

(function () {
  'use strict';

  if (window.__screenLingoInjected) return;
  window.__screenLingoInjected = true;

  // Active State
  let isPageTranslated = false;
  let isTranslating = false;
  let activeTargetLang = 'en';
  let activeSourceLang = 'auto';
  let translatedNodes = new Set();
  let mutationObserver = null;
  let activeTooltip = null;
  let floatingPill = null;

  let cachedSettings = {
    sourceLanguage: 'auto',
    targetLanguage: 'en',
    autoTranslate: false,
    showSelectionTooltip: true,
    showOriginalOnHover: false,
    saveHistory: false,
    enableFloatingButton: true
  };

  // Strictly excluded tags that must NEVER be touched
  const EXCLUDED_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT',
    'PRE', 'CODE', 'KBD', 'SAMP', 'CANVAS', 'SVG', 'IFRAME',
    'AUDIO', 'VIDEO', 'OBJECT', 'EMBED'
  ]);

  // Load Settings
  function loadSettings() {
    chrome.runtime.sendMessage({ action: 'GET_SETTINGS' }, (response) => {
      if (response && response.success && response.data) {
        cachedSettings = Object.assign(cachedSettings, response.data);
        activeTargetLang = cachedSettings.targetLanguage || 'en';
        activeSourceLang = cachedSettings.sourceLanguage || 'auto';

        if (cachedSettings.enableFloatingButton) {
          createFloatingPill();
        } else if (floatingPill) {
          floatingPill.remove();
          floatingPill = null;
        }

        if (cachedSettings.autoTranslate) {
          translateWebpage(activeTargetLang, activeSourceLang);
        }
      }
    });
  }

  function isExcludedNode(node) {
    let curr = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (curr && curr !== document.body) {
      if (!curr.tagName) break;
      const tag = curr.tagName.toUpperCase();
      if (EXCLUDED_TAGS.has(tag)) return true;
      if (curr.isContentEditable) return true;
      if (curr.getAttribute('translate') === 'no') return true;
      if (curr.classList && curr.classList.contains('notranslate')) return true;
      if (curr.id && curr.id.startsWith('sl-')) return true;
      curr = curr.parentElement;
    }
    return false;
  }

  /**
   * Fast text node collector
   */
  function collectTextNodes(root = document.body) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          const val = node.nodeValue;
          if (!val || val.trim().length === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          // Skip trivial numbers, dates, symbols (e.g. "2026", "|", "•")
          if (/^[\s\d\p{P}\p{S}]+$/u.test(val)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (isExcludedNode(node)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }
    return textNodes;
  }

  /**
   * Ultra-Fast Webpage Translation with Deduplication & Parallel Streaming
   */
  async function translateWebpage(targetLang = activeTargetLang, sourceLang = activeSourceLang) {
    if (isTranslating) return;
    isTranslating = true;
    activeTargetLang = targetLang || 'en';
    activeSourceLang = sourceLang || 'auto';
    updatePillLoading(true);

    const nodes = collectTextNodes(document.body);
    const textToNodesMap = new Map();

    // Group and deduplicate text nodes across the entire page
    for (const node of nodes) {
      if (!node._slOriginal) {
        node._slOriginal = node.nodeValue;
      }

      // If already in target language, skip
      if (node._slTargetLang === activeTargetLang && node.nodeValue === node._slTranslated) {
        continue;
      }

      const raw = node._slOriginal.trim();
      if (!textToNodesMap.has(raw)) {
        textToNodesMap.set(raw, []);
      }
      textToNodesMap.get(raw).push(node);
    }

    const uniqueTexts = Array.from(textToNodesMap.keys());

    if (uniqueTexts.length === 0) {
      switchToTranslated();
      isTranslating = false;
      updatePillLoading(false);
      return;
    }

    // Chunk into batches of 35 unique texts
    const BATCH_SIZE = 35;
    const batches = [];
    for (let i = 0; i < uniqueTexts.length; i += BATCH_SIZE) {
      batches.push(uniqueTexts.slice(i, i + BATCH_SIZE));
    }

    try {
      // Execute 4 batches in parallel concurrently
      const CONCURRENCY = 4;
      for (let i = 0; i < batches.length; i += CONCURRENCY) {
        const activeBatches = batches.slice(i, i + CONCURRENCY);

        await Promise.all(
          activeBatches.map(async (batchSlice) => {
            return new Promise((resolve) => {
              chrome.runtime.sendMessage(
                {
                  action: 'TRANSLATE_BATCH',
                  payload: {
                    texts: batchSlice,
                    sourceLang: activeSourceLang,
                    targetLang: activeTargetLang
                  }
                },
                (response) => {
                  if (response && response.success && response.data) {
                    const results = response.data;
                    // Stream DOM replacement immediately as each batch resolves!
                    for (let j = 0; j < batchSlice.length; j++) {
                      const originalText = batchSlice[j];
                      const transObj = results[j];
                      if (!transObj || !transObj.translatedText) continue;

                      const targetNodes = textToNodesMap.get(originalText) || [];
                      for (const node of targetNodes) {
                        node._slTranslated = transObj.translatedText;
                        node._slTargetLang = activeTargetLang;

                        // Preserve leading and trailing whitespace
                        const leading = (node._slOriginal || '').match(/^\s*/)[0];
                        const trailing = (node._slOriginal || '').match(/\s*$/)[0];
                        node.nodeValue = leading + transObj.translatedText + trailing;
                        translatedNodes.add(node);
                      }
                    }
                  }
                  resolve();
                }
              );
            });
          })
        );
      }

      isPageTranslated = true;
      isTranslating = false;
      updatePillState();
      chrome.runtime.sendMessage({
        action: 'UPDATE_BADGE',
        payload: { text: activeTargetLang.toUpperCase() }
      });
      observeMutations();
    } catch (e) {
      console.error('ScreenLingo translation error:', e);
      isTranslating = false;
    } finally {
      updatePillLoading(false);
    }
  }

  /**
   * Switch to original text
   */
  function switchToOriginal() {
    for (const node of translatedNodes) {
      if (node._slOriginal !== undefined) {
        node.nodeValue = node._slOriginal;
      }
    }
    isPageTranslated = false;
    updatePillState();
    chrome.runtime.sendMessage({
      action: 'UPDATE_BADGE',
      payload: { text: '' }
    });
  }

  /**
   * Switch back to translated
   */
  function switchToTranslated() {
    for (const node of translatedNodes) {
      if (node._slTranslated !== undefined && node._slTargetLang === activeTargetLang) {
        const leading = (node._slOriginal || '').match(/^\s*/)[0];
        const trailing = (node._slOriginal || '').match(/\s*$/)[0];
        node.nodeValue = leading + node._slTranslated + trailing;
      }
    }
    isPageTranslated = true;
    updatePillState();
    chrome.runtime.sendMessage({
      action: 'UPDATE_BADGE',
      payload: { text: activeTargetLang.toUpperCase() }
    });
  }

  /**
   * Dynamic content observer
   */
  function observeMutations() {
    if (mutationObserver) return;

    let debounceTimer = null;
    mutationObserver = new MutationObserver((mutations) => {
      if (!isPageTranslated) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        let hasNewNodes = false;
        for (const mut of mutations) {
          if (mut.addedNodes.length > 0) {
            hasNewNodes = true;
            break;
          }
        }
        if (hasNewNodes) {
          translateWebpage(activeTargetLang, activeSourceLang);
        }
      }, 500);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Selection Tooltip
   */
  document.addEventListener('mouseup', (event) => {
    if (event.target.closest('.sl-selection-tooltip') || event.target.closest('.sl-floating-pill')) {
      return;
    }

    if (!cachedSettings.showSelectionTooltip) {
      removeSelectionTooltip();
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    if (!selectedText || selectedText.length < 2) {
      removeSelectionTooltip();
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const top = window.scrollY + rect.bottom + 8;
    const left = window.scrollX + Math.max(10, rect.left);

    showSelectionTooltip(selectedText, top, left);
  });

  function showSelectionTooltip(text, top, left) {
    removeSelectionTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'sl-selection-tooltip';
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    tooltip.innerHTML = `
      <div class="sl-tooltip-header">
        <span class="sl-tooltip-langs">Translating...</span>
        <div class="sl-tooltip-actions">
          <button class="sl-tooltip-btn" id="sl-btn-speak" title="Listen">🔊</button>
          <button class="sl-tooltip-btn" id="sl-btn-copy" title="Copy">📋</button>
          <button class="sl-tooltip-btn" id="sl-btn-close" title="Close">✖</button>
        </div>
      </div>
      <div class="sl-tooltip-body"><div class="sl-spinner"></div> Translating...</div>
      <div class="sl-tooltip-original">${escapeHtml(text)}</div>
    `;

    document.body.appendChild(tooltip);
    activeTooltip = tooltip;

    tooltip.querySelector('#sl-btn-close').addEventListener('click', () => {
      removeSelectionTooltip();
    });

    chrome.runtime.sendMessage(
      {
        action: 'TRANSLATE_TEXT',
        payload: {
          text: text,
          sourceLang: activeSourceLang,
          targetLang: activeTargetLang,
          saveHistory: cachedSettings.saveHistory,
          url: window.location.href
        }
      },
      (res) => {
        if (!activeTooltip || activeTooltip !== tooltip) return;

        if (res && res.success && res.data) {
          const { translatedText, detectedSource } = res.data;
          const header = tooltip.querySelector('.sl-tooltip-langs');
          const body = tooltip.querySelector('.sl-tooltip-body');

          header.textContent = `${(detectedSource || 'auto').toUpperCase()} ➔ ${activeTargetLang.toUpperCase()}`;
          body.textContent = translatedText;

          tooltip.querySelector('#sl-btn-copy').addEventListener('click', () => {
            navigator.clipboard.writeText(translatedText).then(() => {
              tooltip.querySelector('#sl-btn-copy').textContent = '✓';
              setTimeout(() => {
                if (tooltip.querySelector('#sl-btn-copy')) {
                  tooltip.querySelector('#sl-btn-copy').textContent = '📋';
                }
              }, 1200);
            });
          });

          tooltip.querySelector('#sl-btn-speak').addEventListener('click', () => {
            if ('speechSynthesis' in window) {
              const utterance = new SpeechSynthesisUtterance(translatedText);
              utterance.lang = activeTargetLang;
              window.speechSynthesis.speak(utterance);
            }
          });
        } else {
          tooltip.querySelector('.sl-tooltip-body').textContent = 'Translation unavailable';
        }
      }
    );
  }

  function removeSelectionTooltip() {
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
  }

  /**
   * Floating Webpage Control Pill
   */
  function createFloatingPill() {
    if (floatingPill || document.getElementById('sl-floating-pill')) return;

    const pill = document.createElement('div');
    pill.id = 'sl-floating-pill';
    pill.className = 'sl-floating-pill';

    pill.innerHTML = `
      <div class="sl-pill-icon">文A</div>
      <span class="sl-pill-text">Translate</span>
      <button class="sl-pill-btn" id="sl-pill-toggle">Page</button>
      <span class="sl-pill-close" id="sl-pill-close" title="Hide">×</span>
    `;

    document.body.appendChild(pill);
    floatingPill = pill;

    pill.querySelector('#sl-pill-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (isPageTranslated) {
        switchToOriginal();
      } else {
        translateWebpage(activeTargetLang, activeSourceLang);
      }
    });

    pill.querySelector('#sl-pill-close').addEventListener('click', (e) => {
      e.stopPropagation();
      pill.remove();
      floatingPill = null;
    });

    updatePillState();
  }

  function updatePillState() {
    if (!floatingPill) return;
    const btn = floatingPill.querySelector('#sl-pill-toggle');
    const text = floatingPill.querySelector('.sl-pill-text');
    if (isPageTranslated) {
      text.textContent = `Translated (${activeTargetLang.toUpperCase()})`;
      btn.textContent = 'Original';
    } else {
      text.textContent = 'Translate';
      btn.textContent = 'Page';
    }
  }

  function updatePillLoading(loading) {
    if (!floatingPill) return;
    const btn = floatingPill.querySelector('#sl-pill-toggle');
    if (loading) {
      btn.innerHTML = '<span class="sl-spinner"></span>';
    } else {
      updatePillState();
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Keyboard Shortcut: Alt + T
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 't' || e.key === 'T')) {
      e.preventDefault();
      if (isPageTranslated) {
        switchToOriginal();
      } else {
        translateWebpage(activeTargetLang, activeSourceLang);
      }
    }
  });

  // Message Handler
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'TRANSLATE_PAGE_TRIGGER') {
      const target = (message.payload && message.payload.targetLang) || activeTargetLang;
      const source = (message.payload && message.payload.sourceLang) || activeSourceLang;

      // If user selected a new target language or page not yet translated
      if (!isPageTranslated || target !== activeTargetLang) {
        translateWebpage(target, source);
        sendResponse({ isTranslated: true });
      } else {
        switchToOriginal();
        sendResponse({ isTranslated: false });
      }
    } else if (message.action === 'TOGGLE_ORIGINAL_TRIGGER') {
      if (isPageTranslated) {
        switchToOriginal();
      } else {
        switchToTranslated();
      }
      sendResponse({ isTranslated: isPageTranslated });
    } else if (message.action === 'GET_PAGE_STATUS') {
      sendResponse({
        isPageTranslated,
        isTranslating,
        targetLang: activeTargetLang
      });
    } else if (message.action === 'SETTINGS_UPDATED') {
      loadSettings();
      sendResponse({ success: true });
    }
    return true;
  });

  loadSettings();
})();
