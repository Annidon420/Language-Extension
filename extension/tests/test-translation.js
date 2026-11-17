/**
 * ScreenLingo AI - Automated Test Suite for 5 Core Target Languages
 */

import { translationEngine } from '../shared/translation-engine.js';
import { identifyScriptLanguage, getLanguageByCode, TARGET_LANGUAGES } from '../shared/languages.js';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 ScreenLingo AI Test Suite (5 Core Languages)');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // TEST 1: Exactly 5 Target Languages
  console.log('Test 1: Target Languages Specification');
  assert(TARGET_LANGUAGES.length === 5, 'Contains exactly 5 target languages');
  const targetCodes = TARGET_LANGUAGES.map(l => l.code);
  assert(targetCodes.includes('en'), 'Includes English');
  assert(targetCodes.includes('hi'), 'Includes Hindi');
  assert(targetCodes.includes('ru'), 'Includes Russian');
  assert(targetCodes.includes('zh'), 'Includes Chinese');
  assert(targetCodes.includes('es'), 'Includes Spanish');

  // TEST 2: Script Language Identification
  console.log('\nTest 2: Script Language Identification');
  assert(identifyScriptLanguage('नमस्ते भारत') === 'hi', 'Detects Hindi / Devanagari script');
  assert(identifyScriptLanguage('Привет мир') === 'ru', 'Detects Russian / Cyrillic script');
  assert(identifyScriptLanguage('你好世界') === 'zh', 'Detects Chinese Hanzi script');
  assert(identifyScriptLanguage('Hola amigo, cómo estás?') === 'es', 'Detects Spanish text');
  assert(identifyScriptLanguage('Hello world') === 'en', 'Detects English text');

  // TEST 3: Language Metadata Lookups
  console.log('\nTest 3: Language Metadata Lookups');
  assert(getLanguageByCode('hi').name === 'Hindi', 'Resolves Hindi metadata');
  assert(getLanguageByCode('ru').name === 'Russian', 'Resolves Russian metadata');
  assert(getLanguageByCode('zh').name === 'Chinese', 'Resolves Chinese metadata');
  assert(getLanguageByCode('es').name === 'Spanish', 'Resolves Spanish metadata');
  assert(getLanguageByCode('en').name === 'English', 'Resolves English metadata');

  // TEST 4: Translation to English
  console.log('\nTest 4: Translation to English');
  const resEn = await translationEngine.translate('Hola mundo', 'es', 'en');
  assert(resEn.translatedText && /hello\s*world/i.test(resEn.translatedText), 'Translates Spanish to English');

  // TEST 5: Translation to Hindi
  console.log('\nTest 5: Translation to Hindi');
  const resHi = await translationEngine.translate('Hello world', 'en', 'hi');
  assert(resHi.translatedText && resHi.translatedText.length > 0, 'Translates English to Hindi');

  // TEST 6: Translation to Russian
  console.log('\nTest 6: Translation to Russian');
  const resRu = await translationEngine.translate('Hello world', 'en', 'ru');
  assert(resRu.translatedText && resRu.translatedText.length > 0, 'Translates English to Russian');

  // TEST 7: Translation to Chinese
  console.log('\nTest 7: Translation to Chinese');
  const resZh = await translationEngine.translate('Hello world', 'en', 'zh');
  assert(resZh.translatedText && resZh.translatedText.length > 0, 'Translates English to Chinese');

  // TEST 8: Translation to Spanish
  console.log('\nTest 8: Translation to Spanish');
  const resEs = await translationEngine.translate('Hello world', 'en', 'es');
  assert(resEs.translatedText && /hola\s*mundo/i.test(resEs.translatedText), 'Translates English to Spanish');

  // TEST 9: Batch DOM Translation
  console.log('\nTest 9: Concurrent Batch Translation');
  const batchRes = await translationEngine.translateBatch(['Iniciar sesión', 'Configuración de privacidad'], 'es', 'en');
  assert(batchRes.length === 2 && batchRes.every(r => r.translatedText.length > 0), 'Translates batch items concurrently');

  // TEST 10: Cache Hit (< 15ms)
  console.log('\nTest 10: Cache Hit Latency');
  const tStart = performance.now();
  await translationEngine.translate('Hello world', 'en', 'es');
  const dur = performance.now() - tStart;
  assert(dur < 15, `Instant cache return in ${dur.toFixed(2)}ms (< 15ms)`);

  console.log('\n====================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests();
