/**
 * ScreenLingo AI - Background Service Worker (Manifest V3)
 */

import { translationEngine } from '../shared/translation-engine.js';
import { storageManager, DEFAULT_SETTINGS } from '../shared/storage.js';

// Setup Context Menus on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'screenlingo-translate-selection',
    title: 'Translate Selection with ScreenLingo AI',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'screenlingo-translate-page',
    title: 'Translate Entire Webpage (Alt+T)',
    contexts: ['page']
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'screenlingo-translate-selection' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'TRANSLATE_SELECTION_TRIGGER',
      text: info.selectionText
    });
  } else if (info.menuItemId === 'screenlingo-translate-page') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'TRANSLATE_PAGE_TRIGGER'
    });
  }
});

// Handle Keyboard Shortcuts (Alt+T)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-translation') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'TRANSLATE_PAGE_TRIGGER' });
      }
    });
  }
});

// Message Listener for Content Scripts and Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, payload } = message;

  if (action === 'TRANSLATE_TEXT') {
    const { text, sourceLang, targetLang, saveHistory, url } = payload;
    translationEngine
      .translate(text, sourceLang, targetLang)
      .then(async (result) => {
        if (saveHistory) {
          await storageManager.saveHistoryItem({
            original: text,
            translated: result.translatedText,
            sourceLang: result.detectedSource || sourceLang,
            targetLang: targetLang,
            url: url || ''
          });
        }
        sendResponse({ success: true, data: result });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep channel open for async response
  }

  if (action === 'TRANSLATE_BATCH') {
    const { texts, sourceLang, targetLang } = payload;
    translationEngine
      .translateBatch(texts, sourceLang, targetLang)
      .then((results) => {
        sendResponse({ success: true, data: results });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (action === 'GET_SETTINGS') {
    storageManager.getSettings().then((settings) => {
      sendResponse({ success: true, data: settings });
    });
    return true;
  }

  if (action === 'SAVE_SETTINGS') {
    storageManager.saveSettings(payload).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (action === 'GET_HISTORY') {
    storageManager.getHistory().then((history) => {
      sendResponse({ success: true, data: history });
    });
    return true;
  }

  if (action === 'CLEAR_HISTORY') {
    storageManager.clearHistory().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (action === 'UPDATE_BADGE') {
    const tabId = sender.tab ? sender.tab.id : null;
    if (tabId && payload.text !== undefined) {
      chrome.action.setBadgeText({ tabId, text: payload.text });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#6366F1' });
    }
    sendResponse({ success: true });
    return true;
  }
});
