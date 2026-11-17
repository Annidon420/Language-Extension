/**
 * ScreenLingo AI - Core Language Configuration
 * Streamlined to 5 Target Languages + Any Auto-Detected Source Language.
 */

// Target languages available for translation
export const TARGET_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇺🇸', apiCode: 'en' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳', apiCode: 'hi' },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺', apiCode: 'ru' },
  { code: 'zh', name: 'Chinese', native: '简体中文', flag: '🇨🇳', apiCode: 'zh-CN' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', apiCode: 'es' }
];

// Source languages: Auto Detect (detects any language) + manual overrides
export const SOURCE_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect (Any Language)', native: 'Automatic', flag: '🌐', apiCode: 'auto' },
  ...TARGET_LANGUAGES
];

// Unified list for backward compatibility
export const SUPPORTED_LANGUAGES = SOURCE_LANGUAGES;

export function getLanguageByCode(code) {
  if (!code) return TARGET_LANGUAGES[0];
  const normalized = code.toLowerCase().trim();
  return (
    TARGET_LANGUAGES.find(l => l.code === normalized || l.apiCode.toLowerCase() === normalized) ||
    SOURCE_LANGUAGES.find(l => l.code === normalized) ||
    TARGET_LANGUAGES[0]
  );
}

export function getApiLanguageCode(code) {
  if (!code || code === 'auto') return 'auto';
  const lang = getLanguageByCode(code);
  return lang ? lang.apiCode : code;
}

/**
 * Fast client-side script identification for fallback detection
 */
export function identifyScriptLanguage(text) {
  if (!text || text.trim().length === 0) return 'en';
  const sample = text.slice(0, 500);

  // Devanagari (Hindi)
  if (/[\u0900-\u097F]/.test(sample)) return 'hi';
  // Cyrillic (Russian)
  if (/[\u0400-\u04FF]/.test(sample)) return 'ru';
  // Chinese (Hanzi)
  if (/[\u4E00-\u9FFF]/.test(sample)) return 'zh';
  // Japanese
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(sample)) return 'ja';
  // Arabic
  if (/[\u0600-\u06FF]/.test(sample)) return 'ar';

  // Spanish keywords
  if (/\b(el|la|los|las|un|una|es|por|para|con|pero|hola|cómo|como|amigo|bienvenidos|gracias|buenos|días|noches|estás|estoy)\b/i.test(sample)) return 'es';
  // French
  if (/\b(le|la|les|un|une|des|est|sont|pour|avec|mais|bonjour|merci)\b/i.test(sample)) return 'fr';
  // German
  if (/\b(der|die|das|ein|eine|und|ist|sind|für|mit|aber|hallo|danke)\b/i.test(sample)) return 'de';

  return 'en';
}
