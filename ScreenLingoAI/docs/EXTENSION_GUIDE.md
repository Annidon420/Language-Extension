# ScreenLingo AI - Browser Extension Guide (Chrome & Edge)

This guide explains how to install, test, and use the **ScreenLingo AI Browser Extension** in Google Chrome and Microsoft Edge.

---

## 1. Installation Instructions

The extension is Manifest V3 compliant and installs directly into Chromium browsers without requiring store publication.

### In Google Chrome:
1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in your address bar.
3. Enable the **"Developer mode"** toggle switch in the top-right corner.
4. Click the **"Load unpacked"** button in the top-left corner.
5. Select the `extension/` folder located at:
   ```
   C:\Users\acer\.gemini\antigravity\scratch\ScreenLingoAI\extension
   ```
6. The ScreenLingo AI icon will now appear in your browser toolbar! Pin it for quick access.

### In Microsoft Edge:
1. Open Microsoft Edge.
2. Navigate to `edge://extensions/`.
3. In the left sidebar, turn on **"Developer mode"**.
4. Click **"Load unpacked"** and select the `extension/` directory.

---

## 2. Verifying with the Included Interactive Demo Page

The project includes an interactive test webpage that exercises all features:
1. In Chrome or Edge, press `Ctrl + O` (or drag and drop into the browser) to open:
   ```
   C:\Users\acer\.gemini\antigravity\scratch\ScreenLingoAI\extension\tests\demo-page.html
   ```
2. You will see multilingual articles in Spanish, French, Hindi, and Japanese, along with code blocks and dynamic comment buttons.
3. **Whole Page Translation**:
   - Click the ScreenLingo AI toolbar icon to open the popup.
   - Choose your Target Language (e.g. English, Spanish, or Hindi).
   - Click **"Translate Entire Page"**.
   - Notice that the articles are translated while headings, formatting, and layout remain preserved.
4. **1-Click Original Toggle**:
   - In the popup or the floating pill, click **"Switch to Original Webpage"**.
   - The entire page instantly returns to its original text without reloading!
5. **Selection Translation Tooltip**:
   - Highlight any sentence on the page.
   - An inline tooltip appears with the detected language, translated text, a copy button, and an audio listen button.
6. **Code & Form Protection**:
   - Scroll to Section 5: Notice the code block (`function calculateScreenMetrics...`) and input fields remain untouched.
7. **Dynamic Content Translation**:
   - Click **"Add Dynamic Multilingual Comments"**.
   - The extension's `MutationObserver` detects newly inserted elements and translates them smoothly.

---

## 3. Running Automated Tests via Command Line

Run the automated test suite from PowerShell:

```powershell
cd C:\Users\acer\.gemini\antigravity\scratch\ScreenLingoAI\extension
npm.cmd test
```

This validates:
- Real-time language script identification across 7 language families.
- Real translation calls with failover tiers and offline dictionary.
- LRU cache hit latency (< 15ms).
- Batch translation delimiter parsing.
- 15 DOM tag and attribute exclusion filters.
