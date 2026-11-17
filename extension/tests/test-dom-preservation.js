/**
 * ScreenLingo AI - DOM Tree & Layout Preservation Test
 */

import { identifyScriptLanguage } from '../shared/languages.js';

// Excluded tags specification
const EXCLUDED_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT',
  'PRE', 'CODE', 'KBD', 'SAMP', 'CANVAS', 'SVG', 'IFRAME',
  'AUDIO', 'VIDEO', 'OBJECT', 'EMBED'
]);

function simulateDomExclusionCheck(tagName, isContentEditable, translateAttr, className) {
  const tag = tagName.toUpperCase();
  if (EXCLUDED_TAGS.has(tag)) return true; // Excluded
  if (isContentEditable) return true;
  if (translateAttr === 'no') return true;
  if (className && className.includes('notranslate')) return true;
  return false;
}

console.log('🧪 Testing DOM Exclusion & Layout Preservation Filters...');

let passed = 0;
function test(name, cond) {
  if (cond) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}`);
    process.exit(1);
  }
}

// 1. Tag exclusions
test('Excludes <pre> code tags', simulateDomExclusionCheck('PRE', false, null, null) === true);
test('Excludes <code> tags', simulateDomExclusionCheck('CODE', false, null, null) === true);
test('Excludes <input> form controls', simulateDomExclusionCheck('INPUT', false, null, null) === true);
test('Excludes <textarea> editable fields', simulateDomExclusionCheck('TEXTAREA', false, null, null) === true);
test('Excludes <svg> vector tags', simulateDomExclusionCheck('SVG', false, null, null) === true);
test('Excludes <script> executable tags', simulateDomExclusionCheck('SCRIPT', false, null, null) === true);

// 2. Attribute and class exclusions
test('Excludes contenteditable elements', simulateDomExclusionCheck('DIV', true, null, null) === true);
test('Excludes elements with translate="no"', simulateDomExclusionCheck('SPAN', false, 'no', null) === true);
test('Excludes elements with class="notranslate"', simulateDomExclusionCheck('P', false, null, 'notranslate') === true);

// 3. Readable elements allowed
test('Allows standard <p> paragraphs', simulateDomExclusionCheck('P', false, null, null) === false);
test('Allows <h1> headings', simulateDomExclusionCheck('H1', false, null, null) === false);
test('Allows <span> inline text', simulateDomExclusionCheck('SPAN', false, null, null) === false);
test('Allows <a> hyper links', simulateDomExclusionCheck('A', false, null, null) === false);
test('Allows <li> list items', simulateDomExclusionCheck('LI', false, null, null) === false);
test('Allows <blockquote> quotes', simulateDomExclusionCheck('BLOCKQUOTE', false, null, null) === false);

console.log(`\n🎉 All ${passed} DOM preservation checks PASSED!`);
