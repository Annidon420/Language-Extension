# ScreenLingo AI: Real-Time Browser Webpage Translator

> **Ultra-fast, AI-powered real-time translation extension for Chromium Browsers (Google Chrome, Microsoft Edge, Brave).**  
> Translates whole webpages and highlighted text across **110+ languages** in real time while preserving original page layout, styling, images, links, and buttons.

---

## 🌟 Key Features

- **🌐 110+ Worldwide Languages**: Full global coverage including English, Spanish, Hindi, French, German, Japanese, Chinese (Simplified & Traditional), Arabic, Russian, Portuguese, Italian, Korean, Dutch, Turkish, Vietnamese, Polish, Bengali, Tamil, Telugu, Marathi, Urdu, Thai, and 90+ more.
- **⚡ Ultra-Fast Concurrent Engine**: Uses parallel worker chunking and streaming DOM replacement, translating complex news sites, social feeds, and long articles in 1–2 seconds.
- **🛡️ 100% DOM Layout Preservation**: Non-destructive `TreeWalker` translation only modifies text node values without breaking CSS classes, layout grids, images, hyperlinks, or JavaScript event listeners.
- **↩️ 1-Click Original / Translated Toggle**: Switch back and forth between the original and translated page instantly with zero reload delay.
- **⌨️ Keyboard Shortcut (`Alt + T`)**: Press `Alt + T` on any webpage to instantly translate or restore the original text!
- **💬 Selection Tooltip**: Highlight any sentence or paragraph to pop up an instant inline translation card with **Copy** (`📋`) and **Audio Pronunciation** (`🔊`).
- **🔄 Dynamic Content Observer**: `MutationObserver` watches for dynamically loaded content (infinite scroll feeds, live comments, news streams) and translates them automatically.
- **🔒 Privacy First & Exclusions**:
  - Automatically protects code blocks (`<pre>`, `<code>`, `<kbd>`, `<samp>`).
  - Protects user input and passwords (`<input>`, `<textarea>`, `contenteditable`).
  - Zero browsing history tracking and zero cloud data collection.
  - Custom domain blacklist in Settings for sensitive banking/intranet sites.

---

## 📁 Repository Structure

```
ScreenLingoAI/
├── README.md                           # Main documentation & quickstart
├── docs/
│   ├── ARCHITECTURE.md                 # System architecture & performance design
│   └── EXTENSION_GUIDE.md              # Installation & live website guide
│
└── extension/                          # Browser Extension (Chrome & Edge, Manifest V3)
    ├── manifest.json                   # Manifest V3 configuration with Alt+T shortcut
    ├── package.json                    # Automated test scripts
    ├── background/
    │   └── service-worker.js           # MV3 Service Worker (message routing, context menus)
    ├── content/
    │   ├── content-script.js           # TreeWalker DOM parser, layout preservation, tooltip
    │   └── content-style.css           # Scoped styling for tooltip and floating pill
    ├── popup/
    │   ├── popup.html                  # Sleek glassmorphic popup UI
    │   ├── popup.css                   # Popup styling
    │   └── popup.js                    # Popup controller with popular & A-Z optgroups
    ├── options/
    │   ├── options.html                # Settings, privacy controls, domain blacklist
    │   ├── options.css                 # Options styling
    │   └── options.js                  # Options controller & JSON history exporter
    ├── shared/
    │   ├── languages.js                # 110+ language catalog & script identifier
    │   ├── translation-engine.js       # Concurrent batch translation engine with cache
    │   └── storage.js                  # Synchronized user preferences & privacy
    ├── icons/                          # Extension icons (16px, 32px, 48px, 128px)
    └── tests/
        ├── demo-page.html              # Multilingual interactive demo webpage
        ├── test-translation.js         # Automated translation engine verification
        └── test-dom-preservation.js    # Automated DOM layout preservation tests
```

---

## 🚀 How to Install in Chrome or Edge (30 Seconds)

1. Open **Google Chrome** or **Microsoft Edge**.
2. Go to `chrome://extensions/` or `edge://extensions/` in your address bar.
3. Turn **ON** the **"Developer mode"** toggle (top-right corner).
4. Click **"Load unpacked"** (or if already added, click the **Reload 🔄** icon on ScreenLingo AI).
5. Select the folder:
   ```
   C:\Users\acer\.gemini\antigravity\scratch\ScreenLingoAI\extension
   ```
6. Click the puzzle icon (`🧩`) in your toolbar and pin **ScreenLingo AI (📌)**.

---

## 💡 How to Use on Any Live Website

1. Navigate to any website (e.g., [`https://es.wikipedia.org`](https://es.wikipedia.org), [`https://elpais.com`](https://elpais.com), [`https://lemonde.fr`](https://lemonde.fr)).
2. **Translate Entire Page**:
   - Press **`Alt + T`**, OR
   - Click the **文A** icon in your toolbar and click **"Translate Entire Page"**, OR
   - Click **"Page"** on the floating pill in the bottom-right corner.
3. **Switch to Original**:
   - Press **`Alt + T`** again, or click **"Switch to Original Webpage"**.
4. **Translate Selected Text**:
   - Highlight any text with your mouse. An instant tooltip pops up with the translation, a copy button, and an audio listen button.

---

## 🧪 Automated Testing

Run the test suite from PowerShell:
```powershell
cd C:\Users\acer\.gemini\antigravity\scratch\ScreenLingoAI\extension
npm.cmd test
```

**Results:**
- ✅ 15 Translation Engine & Language Detection tests passed.
- ✅ 15 DOM Exclusion & Layout Preservation checks passed.
