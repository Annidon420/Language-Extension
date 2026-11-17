/**
 * ScreenLingo AI - Storage Manager
 * Handles user preferences, caching, and privacy-respecting history.
 */

export const DEFAULT_SETTINGS = {
  sourceLanguage: 'auto',
  targetLanguage: 'en',
  autoDetect: true,
  autoTranslate: false,
  showSelectionTooltip: true,
  showOriginalOnHover: false,
  saveHistory: false, // Strict privacy: disabled by default
  enableFloatingButton: true,
  enableVoiceDubber: true,
  voiceDubSourceLang: 'auto', // 'auto', 'ru', 'en', 'es', 'zh', 'hi'
  voiceDubTargetLang: 'hi',
  voiceGender: 'auto', // 'auto', 'female', 'male'
  voiceExpression: 'expressive', // 'expressive', 'conversational', 'lively'
  duckVolumeLevel: 0.15, // Real video voice lowers to 15% when translation speaks
  voiceSpeed: 1.2,
  showDubbingCaptions: true,
  blacklistedDomains: []
};

class StorageManager {
  constructor() {
    this.isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
    this.memoryFallback = new Map();
  }

  async getSettings() {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
          resolve(items || DEFAULT_SETTINGS);
        });
      });
    }
    return Object.assign({}, DEFAULT_SETTINGS);
  }

  async saveSettings(newSettings) {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.sync.set(newSettings, () => {
          resolve(true);
        });
      });
    }
    return true;
  }

  async getHistory() {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.get({ translationHistory: [] }, (res) => {
          resolve(res.translationHistory || []);
        });
      });
    }
    return [];
  }

  async saveHistoryItem(item) {
    const settings = await this.getSettings();
    if (!settings.saveHistory) {
      // Respect user's explicit privacy setting
      return false;
    }

    if (!item.original || !item.translated) return false;

    const historyRecord = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      original: item.original.trim(),
      translated: item.translated.trim(),
      sourceLang: item.sourceLang || 'auto',
      targetLang: item.targetLang || 'en',
      timestamp: Date.now(),
      url: item.url || ''
    };

    if (this.isExtension) {
      const current = await this.getHistory();
      // Keep up to 100 recent entries
      const updated = [historyRecord, ...current.slice(0, 99)];
      return new Promise((resolve) => {
        chrome.storage.local.set({ translationHistory: updated }, () => resolve(true));
      });
    }
    return true;
  }

  async clearHistory() {
    if (this.isExtension) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ translationHistory: [] }, () => resolve(true));
      });
    }
    return true;
  }
}

export const storageManager = new StorageManager();
