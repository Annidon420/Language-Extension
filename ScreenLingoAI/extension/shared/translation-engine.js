/**
 * ScreenLingo AI - Ultra-Fast Real Translation Engine
 * Optimized for English, Hindi, Russian, Chinese, Spanish with concurrent batching.
 */

import { identifyScriptLanguage, getApiLanguageCode } from './languages.js';

class TranslationEngine {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 4000;
  }

  /**
   * Translates a single string of text
   */
  async translate(text, sourceLang = 'auto', targetLang = 'en') {
    if (!text || text.trim().length === 0) {
      return { translatedText: '', detectedSource: sourceLang };
    }

    const trimmed = text.trim();
    const sl = getApiLanguageCode(sourceLang);
    const tl = getApiLanguageCode(targetLang);

    // If source and target are identical, return text directly
    if (sl !== 'auto' && sl === tl) {
      return { translatedText: trimmed, detectedSource: sl };
    }

    const cacheKey = `${sl}->${tl}::${trimmed}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Tier 1: Google GTX Endpoint (Ultra-fast)
    try {
      const gtxResult = await this.translateViaGtx(trimmed, sl, tl);
      if (gtxResult && gtxResult.translatedText) {
        this.setCache(cacheKey, gtxResult);
        return gtxResult;
      }
    } catch (e1) {
      // Failover to Tier 2
    }

    // Tier 2: MyMemory Translation API
    try {
      const myMemoryResult = await this.translateViaMyMemory(trimmed, sl, tl);
      if (myMemoryResult && myMemoryResult.translatedText) {
        this.setCache(cacheKey, myMemoryResult);
        return myMemoryResult;
      }
    } catch (e2) {
      // Failover to Tier 3
    }

    // Tier 3: Local / Offline Dictionary
    const detected = sl === 'auto' ? identifyScriptLanguage(trimmed) : sl;
    const offlineTranslated = this.getOfflineTranslation(trimmed, detected, tl);

    const result = {
      translatedText: offlineTranslated || trimmed,
      detectedSource: detected,
      fallbackUsed: true
    };
    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Tier 1: Google GTX Client Endpoint
   */
  async translateViaGtx(text, sourceLang, targetLang) {
    const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
    const tl = targetLang || 'en';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(
      sl
    )}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`GTX status ${response.status}`);
    }

    const data = await response.json();
    let translated = '';
    if (Array.isArray(data) && Array.isArray(data[0])) {
      translated = data[0].map((item) => (item ? item[0] : '')).join('');
    }

    const detectedLang =
      data && data[2]
        ? data[2]
        : sourceLang !== 'auto'
        ? sourceLang
        : identifyScriptLanguage(text);

    return {
      translatedText: translated || text,
      detectedSource: detectedLang,
      engine: 'gtx'
    };
  }

  /**
   * Tier 2: MyMemory Translation API
   */
  async translateViaMyMemory(text, sourceLang, targetLang) {
    const sl = sourceLang === 'auto' ? identifyScriptLanguage(text) : sourceLang;
    const tl = targetLang || 'en';
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=${encodeURIComponent(sl)}|${encodeURIComponent(tl)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`MyMemory status ${response.status}`);
    }

    const data = await response.json();
    if (data && data.responseData && data.responseData.translatedText) {
      return {
        translatedText: data.responseData.translatedText,
        detectedSource: sl,
        engine: 'mymemory'
      };
    }
    throw new Error('Invalid MyMemory response');
  }

  /**
   * High-Speed Concurrent Batch Translation
   * Chunks requests and executes up to 5 parallel HTTP workers simultaneously!
   */
  async translateBatch(texts, sourceLang = 'auto', targetLang = 'en') {
    if (!texts || texts.length === 0) return [];

    const results = new Array(texts.length);
    const CHUNK_SIZE = 35; // optimal size for Google GTX URL limits
    const DELIMITER = ' ___SL_SEP___ ';
    const chunks = [];

    for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
      chunks.push({
        startIndex: i,
        slice: texts.slice(i, i + CHUNK_SIZE)
      });
    }

    // Process up to 5 chunks in parallel concurrently!
    const CONCURRENCY = 5;
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const activeChunks = chunks.slice(i, i + CONCURRENCY);

      await Promise.all(
        activeChunks.map(async (chunk) => {
          const combined = chunk.slice.join(DELIMITER);
          try {
            const transRes = await this.translate(combined, sourceLang, targetLang);
            const translatedParts = transRes.translatedText.split(
              /___SL_SEP___|___\s*SL_SEP\s*___/
            );

            for (let j = 0; j < chunk.slice.length; j++) {
              results[chunk.startIndex + j] = {
                translatedText: (translatedParts[j] || chunk.slice[j]).trim(),
                detectedSource: transRes.detectedSource
              };
            }
          } catch (err) {
            // Fallback for this chunk
            for (let j = 0; j < chunk.slice.length; j++) {
              try {
                const single = await this.translate(chunk.slice[j], sourceLang, targetLang);
                results[chunk.startIndex + j] = single;
              } catch (e) {
                results[chunk.startIndex + j] = {
                  translatedText: chunk.slice[j],
                  detectedSource: sourceLang
                };
              }
            }
          }
        })
      );
    }

    return results;
  }

  /**
   * Offline / Sandbox dictionary for 5 core target languages
   */
  getOfflineTranslation(text, source, target) {
    const sl = (source || 'en').toLowerCase().split('-')[0];
    const tl = (target || 'en').toLowerCase().split('-')[0];
    const clean = text.toLowerCase().replace(/[.,!?;:]/g, '').trim();

    const DICT = {
      // -> English
      'es->en': {
        'hola mundo bienvenidos a la inteligencia artificial': 'Hello world, welcome to artificial intelligence',
        'hola mundo': 'Hello world',
        'iniciar sesion': 'Sign in',
        'configuracion de privacidad': 'Privacy settings',
        'traducir pantalla': 'Translate screen',
        'gracias': 'Thank you',
        'buenos dias': 'Good morning'
      },
      'fr->en': {
        'la vie est belle avec la technologie moderne': 'Life is beautiful with modern technology',
        'bonjour': 'Hello',
        'merci': 'Thank you'
      },
      // -> Hindi
      'en->hi': {
        'hello world': 'नमस्ते दुनिया',
        'good morning, how are you today': 'शुभ प्रभात, आज आप कैसे हैं?',
        'welcome': 'स्वागत हे',
        'privacy settings': 'गोपनीयता सेटिंग्स',
        'translate screen': 'स्क्रीन का अनुवाद करें'
      },
      'es->hi': {
        'hola mundo': 'नमस्ते दुनिया',
        'gracias': 'धन्यवाद'
      },
      // -> Russian
      'en->ru': {
        'hello world': 'Привет, мир',
        'privacy settings': 'Настройки конфиденциальности',
        'good morning': 'Доброе утро'
      },
      // -> Chinese
      'en->zh': {
        'hello world': '你好世界',
        'privacy settings': '隐私设置',
        'good morning': '早上好'
      },
      // -> Spanish
      'en->es': {
        'hello world': 'Hola mundo',
        'privacy settings': 'Configuración de privacidad',
        'sign in': 'Iniciar sesión'
      }
    };

    const pairKey = `${sl}->${tl}`;
    if (DICT[pairKey] && DICT[pairKey][clean]) {
      return DICT[pairKey][clean];
    }
    return null;
  }

  setCache(key, value) {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clearCache() {
    this.cache.clear();
  }
}

export const translationEngine = new TranslationEngine();
