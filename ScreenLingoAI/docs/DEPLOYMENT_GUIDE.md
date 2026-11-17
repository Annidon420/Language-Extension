# ScreenLingo AI - Browser Extension Deployment Guide

This guide explains how to package, deploy, and publish **ScreenLingo AI** so real users around the world can install and use it.

---

## 📦 Ready-to-Upload Package

A production-ready zip archive has already been generated for you at:
📂 `C:\Users\acer\.gemini\antigravity\scratch\ScreenLingoAI\ScreenLingoAI-Extension.zip`

It contains all required files without test scripts or repository clutter:
- `manifest.json` (Manifest V3)
- `background/service-worker.js`
- `content/content-script.js` & `content/content-style.css`
- `popup/` (HTML, CSS, JS)
- `options/` (HTML, CSS, JS)
- `shared/` (Language catalog, translation engine, storage)
- `icons/` (16px, 32px, 48px, 128px)

---

## Method 1: Publish to the Chrome Web Store (Recommended)

Publishing to the Chrome Web Store makes ScreenLingo AI installable with 1-click for over 3 billion Chrome, Brave, and Opera users.

### Step-by-Step:
1. **Create a Developer Account**:
   - Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
   - Sign in with your Google account.
   - Pay the one-time \$5 USD registration fee (required by Google to prevent spam).

2. **Upload the Extension Package**:
   - In the Developer Dashboard, click **"New Item"**.
   - Drag and drop `ScreenLingoAI-Extension.zip`.

3. **Fill in Store Listing Details**:
   - **Title**: `ScreenLingo AI - Real-Time Webpage Translator`
   - **Summary**: `Ultra-fast real-time webpage translator for English, Hindi, Russian, Chinese, and Spanish with layout preservation.`
   - **Category**: `Productivity`
   - **Language**: `English`
   - **Icon**: Automatically extracted from `icons/icon128.png`.
   - **Screenshots**: Take 1 or 2 screenshots of the popup and translated page (1280x800 or 640x400 PNG).

4. **Privacy Practices Declaration**:
   - **Single Purpose**: *"Translates visible webpage text content into the user's selected language."*
   - **Permission Justification**:
     - `activeTab`: To read and translate text nodes on the currently opened webpage.
     - `storage`: To remember the user's preferred target language.
     - `contextMenus`: To allow right-click translation of highlighted text.
   - **Data Usage**: Select *"Does not collect or sell personal user data"*.

5. **Submit for Review**:
   - Click **"Submit for Review"**.
   - Google's automated and manual review typically completes within **24 to 48 hours**.
   - Once approved, your extension receives its own official Chrome Web Store URL!

---

## Method 2: Publish to Microsoft Edge Add-ons (100% Free)

Microsoft Edge has a free developer program with zero registration fees.

1. Go to the [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge).
2. Sign in with any Microsoft account (registration is completely free).
3. Click **"Create new extension"**.
4. Upload `ScreenLingoAI-Extension.zip`.
5. Enter description, upload screenshots, and click **"Submit"**.
6. Edge reviews and publishes it in 1–2 days.

---

## Method 3: Direct User Distribution (Instant & Free)

If you want your friends, team, or early testers to use it immediately without waiting for store approval:

1. Send them `ScreenLingoAI-Extension.zip` (via email, WhatsApp, Google Drive, or GitHub Releases).
2. Tell them to:
   - Extract the `.zip` file into a folder.
   - Open Chrome or Edge and go to `chrome://extensions/` or `edge://extensions/`.
   - Enable **Developer mode** (top-right toggle).
   - Click **"Load unpacked"** and select the unzipped folder.
   - The extension will be installed immediately!
