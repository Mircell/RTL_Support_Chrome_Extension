# Technical Documentation — ChatGPT RTL Support Chrome Extension

> This file is a technical memory/documentation for the project. It describes the architecture, modules, data flow, and key implementation details so that future development or maintenance can proceed with full context.

---

## 1. Project Overview

| Field | Value |
|-------|-------|
| **Name** | ChatGPT RTL Support (Farsi/Arabic) |
| **Version** | 1.6.0 |
| **Manifest Version** | 3 (Chrome Extension MV3) |
| **Author** | Reza Rastegar |
| **Repository** | https://github.com/Mircell/RTL_Support_Chrome_Extension |
| **Update URL** | https://clients2.google.com/service/update2/crx |

### Purpose
The extension improves reading and writing of Persian (Farsi) and Arabic text in AI chat interfaces. It:
1. Automatically injects a Persian-friendly web font (Estedad) into the page.
2. Detects RTL text on a per-element basis (by majority of RTL characters) and applies an explicit `direction` + `text-align` **to text blocks only**, without mirroring page layout/structure.
3. Provides an on/off toggle through the extension popup.

### Supported Hosts
- https://chatgpt.com/*
- https://chat.deepseek.com/*
- https://chat.z.ai/*
- https://chat.qwen.ai/*
- https://grok.com/*
- http://localhost/* (local DeepSeek Harness)
- http://127.0.0.1/*

---

## 2. Technology Stack

- **Platform:** Chrome Extension Manifest V3
- **Language:** Vanilla JavaScript (ES5/ES6 compatible, IIFE-scoped)
- **Styling:** Plain CSS
- **Storage:** `chrome.storage.local`
- **APIs used:** `chrome.scripting`, `chrome.storage`, `chrome.tabs`, `chrome.runtime`
- **External dependency:** `https://v1.fontapi.ir/css/Estedad` (web font CDN)
- **No build step** — the extension is loaded unpacked directly from source.

---

## 3. Directory / File Structure

```
chat_GPT_RTL_Support_Chrome_Extension/
├── manifest.json               # MV3 manifest: metadata, permissions, content scripts
├── background.js               # Service worker (install/update landing pages)
├── content.js                  # Auto-injects Estedad Persian font on supported hosts
├── popup.html                  # Popup UI markup
├── popup.css                   # Popup UI styles + toggle animations
├── popup.js                    # Popup logic: toggle state + script injection
├── assets/
│   ├── img/                    # logo.png, popup-optimized.webp
│   └── script/
│       ├── addContent.js       # Core RTL detection & class application
│       └── removeContent.js    # Reverts all RTL/LTR effects
├── README.md                   # Minimal readme
├── LICENSE.txt                 # License
└── memory.md                   # (this file) technical documentation
```

| File | Role |
|------|------|
| `manifest.json` | Declares MV3 config, host permissions, content script, CSP, popup action. |
| `background.js` | Service worker. Opens a landing/whats-new tab on install/update. |
| `content.js` | Runs automatically on all supported hosts; injects the Estedad font only. |
| `popup.html` | Popup markup: title, buy-me-a-coffee link, On/Off toggle, image, footer links. |
| `popup.css` | Styling and CSS keyframe animations for the toggle button. |
| `popup.js` | Manages the toggle state and injects/removes the RTL scripts. |
| `assets/script/addContent.js` | **Core logic**: scans DOM, classifies text direction, applies classes. |
| `assets/script/removeContent.js` | Removes injected `<style>` and all `rtl-text`/`ltr-text` classes. |

---

## 4. Architecture & Data Flow

```
┌─────────────────────────┐
│  Chrome Extension Load  │
└───────────┬─────────────┘
            │
   ┌────────▼─────────┐        ┌──────────────────────────┐
   │  background.js   │        │  content.js (auto)       │
   │ (service worker) │        │  injects Estedad font    │
   │ install/update   │        │  on every supported host │
   │ → opens website  │        └──────────────────────────┘
   └──────────────────┘
            │
   User opens popup (popup.html + popup.js)
            │
   ┌────────▼─────────────────────────────────────────────┐
   │ popup.js:                                            │
   │  - reads chrome.storage.local["buttonOn"]            │
   │  - updates UI (eye icon + toggle animation)          │
   │  - on click: flips state and persists it             │
   │  - injects addContent.js OR removeContent.js via     │
   │    chrome.scripting.executeScript (allFrames:true)   │
   └────────┬─────────────────────────────────────────────┘
            │
   ┌────────▼──────────────────────┐   ┌───────────────────────────┐
   │ addContent.js (RTL ON)        │   │ removeContent.js (RTL OFF)│
   │ - ensureStyle() adds CSS      │   │ - removes <style>          │
   │ - classify() adds rtl-text /  │   │ - removes rtl-text /       │
   │   ltr-text classes            │   │   ltr-text classes         │
   │ - MutationObserver watches    │   └───────────────────────────┘
   │   for dynamic content         │
   └───────────────────────────────┘
```

### State Persistence
- Key: `buttonOn` in `chrome.storage.local`.
- `true` → RTL support enabled (addContent.js injected).
- `false`/undefined → disabled (removeContent.js injected).

---

## 5. Core Modules & Key Logic

### 5.1 `content.js` — Font Injection
- IIFE, `"use strict"`.
- Guards against duplicate injection using `FONT_ID = "custom-font-family-cdn"`.
- Creates a `<style>` element with:
  - `@import url('https://v1.fontapi.ir/css/Estedad');`
  - Sets `font-family: Estedad, sans-serif !important;` on body and text elements.
- **Does NOT change text direction** — direction is handled separately by `addContent.js`.
- Appends the style to `<head>` or `<html>`.

### 5.2 `assets/script/addContent.js` — RTL Detection Engine
This is the heart of the extension.

**Constants:**
- `STYLE_ID = "custom-styles"` — id of the injected `<style>`.
- `TEXT_SELECTOR` — text-bearing tags: `p, li, h1..h6, blockquote, td, th, caption, dt, dd, figcaption, summary, label, div, span`.
- `BLOCK_CHILD_SELECTOR` — block-level descendants that disqualify a `div`/`span` from being treated as a text node (prevents layout mirroring).
- `SKIP_SELECTOR` — never touched: `pre, code, kbd, samp, var, textarea, input, select, script, style, svg, math, canvas, video, audio, [contenteditable='true'], .cm-editor, .monaco-editor`.
- `RTL_RE` — Unicode ranges for Hebrew/Arabic/Persian (used to count RTL chars):
  `\u0590-\u05FF, \u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF, \uFB1D-\uFDFF, \uFE70-\uFEFF`.
- `NEUTRAL_RE` — everything that is not a word char, whitespace, or RTL char (used to count "visible" characters).
- `RTL_RATIO_THRESHOLD = 0.3` — above this RTL ratio a block is treated as RTL.
- `DIR_FLAG = "data-rtl-dir"` — marker attribute that stores the element's original `dir` value so it can be restored on cleanup.

**Key functions:**
- `ensureStyle()` — injects the CSS:
  ```css
  .rtl-text { direction: rtl !important; text-align: right !important; }
  .ltr-text { direction: ltr !important; text-align: left !important; }
  .rtl-text blockquote { border-right: 3px solid #8a8a8a !important; border-left: none !important; padding-right: .75em !important; padding-left: 0 !important; }
  pre, code, kbd, samp { direction: ltr !important; unicode-bidi: isolate !important; text-align: left !important; }
  ```
  `direction` and `text-align` are applied explicitly (no `unicode-bidi: plaintext`, which previously conflicted). Code is always LTR and bidi-isolated.
- `isSkipped(el)` — true if the element is inside any `SKIP_SELECTOR` ancestor.
- `isTextOnlyContainer(el)` — for `div`/`span`, returns true only if it has **no** block-level descendants (keeps layout boxes untouched).
- `clearDir(el)` — removes `.rtl-text`/`.ltr-text` and restores the element's original `dir` (or removes `dir` if there was none).
- `classify(el)` — the core classifier:
  1. Skip if `isSkipped` or not a text-only container.
  2. Get trimmed `textContent`; skip if empty.
  3. Count RTL characters; if none → `clearDir(el)` and return.
  4. Count "visible" (non-neutral) characters; skip if zero.
  5. Compute `ratio = rtlCount / visible`.
  6. Remember the original `dir` once (in `DIR_FLAG`).
  7. If `ratio > 0.3` → `dir="rtl"` + `.rtl-text`; else → `dir="ltr"` + `.ltr-text`.
- `scan(root)` — classifies `root` (if it matches) and all matching descendants.
- Initial run: `ensureStyle(); scan(document.body || document.documentElement);`
- **Single `MutationObserver`** on `document.documentElement` (childList, subtree, characterData) re-scans added nodes and re-classifies on text changes. This handles dynamically rendered chat messages.

**Design principle:** text direction only — the page layout is never mirrored.

### 5.3 `assets/script/removeContent.js` — Cleanup
- Removes the `<style id="custom-styles">` element if present (this also removes the global `pre, code` LTR/isolation rule).
- For every element carrying `data-rtl-dir`, restores its original `dir` value (or removes `dir` if it had none) and removes the `.rtl-text` class.
- Safety net: removes any leftover `rtl-text` / `ltr-text` classes (e.g., from older versions).
- Used when the user toggles RTL support off.

### 5.4 `popup.js` — UI & Injection Control
- `SUPPORTED_HOSTS` array + `checkURL(url)` to validate the active tab's host (exact match or subdomain).
- `updateUI(buttonOn)` — swaps the eye emoji (`📡` on / `🤖` off) and triggers CSS keyframe animations (`transformToBlue`/`transformToYellow`, `moveCircleRight`/`moveCircleLeft`).
- `getCurrentTab()` — async helper using `chrome.tabs.query`.
- `injectFile(file)` — injects a JS file into the active tab via `chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: [file] })`.
- `callAddStyle()` → injects `assets/script/addContent.js`.
- `removeScript()` → injects `assets/script/removeContent.js`.
- `initPopup()` — reads stored `buttonOn`, restores UI, and re-applies/removes styles.
- On `DOMContentLoaded`:
  - If the active URL is not supported, shows a message in `.messageAlert` and hides the toggle.
  - Otherwise calls `initPopup()`.
- Toggle click handler flips `buttonOn`, persists it, updates the UI, and injects/removes the corresponding script.

### 5.5 `background.js` — Service Worker
- Listens to `chrome.runtime.onInstalled`.
- On `install`: opens `https://rastegar.info/chatgpt-rtl-support/?utm_term=install&utm_source=chromewebstore`.
- On `update`: opens `https://rastegar.info/chatgpt-rtl-support/#whats-new`.
- No other background logic.

### 5.6 `popup.html` — Markup
- `.popup` container with:
  - "Buy Me a Coffee ☕️" link.
  - `<h1>` title with `<span class="eye">🤖</span>`.
  - `<p class="messageAlert">` for unsupported-host messaging.
  - `.button` toggle with `.half` labels ("On"/"Off") and `.circle` indicator.
  - Promo image `assets/img/popup-optimized.webp`.
- `.links` footer: About, Privacy policy, Source code, Report issue.
- Loads `popup.css` and `popup.js`.

---

## 6. Permissions & Security

### `manifest.json` permissions
- `"scripting"` — required for `chrome.scripting.executeScript`.
- `"storage"` — required for `chrome.storage.local`.
- `"tabs"` — required to query the active tab.

### Host permissions
Granted for all 7 supported hosts (see section 1).

### Content Security Policy
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; style-src 'self' 'unsafe-inline' https://v1.fontapi.ir;"
}
```
- Scripts are restricted to the extension's own package (`'self'`).
- Styles allow `'unsafe-inline'` (needed for the injected `<style>`) and the font CDN `https://v1.fontapi.ir`.

### Security notes
- No remote code execution; only local scripts are injected.
- The only external network dependency is the Estedad font CSS from `v1.fontapi.ir`.
- `executeScript` runs with `allFrames: true`, so it also applies inside iframes on supported hosts.

---

## 7. Storage Schema

| Key | Type | Meaning |
|-----|------|---------|
| `buttonOn` | boolean | `true` = RTL support ON; `false`/absent = OFF |

Stored via `chrome.storage.local` (per-machine, not synced).

---

## 8. Supported Hosts & Manifest Config

### `content_scripts.matches` and `host_permissions` (identical set)
| Host | Purpose |
|------|---------|
| `https://chatgpt.com/*` | ChatGPT |
| `https://chat.deepseek.com/*` | DeepSeek Chat |
| `https://chat.z.ai/*` | Z.ai |
| `https://chat.qwen.ai/*` | Qwen Chat |
| `https://grok.com/*` | Grok |
| `http://localhost/*` | Local DeepSeek Harness |
| `http://127.0.0.1/*` | Local DeepSeek Harness (loopback IP) |

### `action`
- `default_title`: "ChatGPT RTL Support"
- `default_popup`: `popup.html`

### Icons
`assets/img/logo.png` for sizes 16/32/48/128.

---

## 9. Build / Load / Test Instructions

There is **no build step**. To run the extension:

1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the project root:
   `d:\PorgrammingProject\RTL_Support\chat_GPT_RTL_Support_Chrome_Extension`.
4. Visit any supported host (e.g., https://chatgpt.com).
5. Click the extension icon to open the popup, then toggle **On**.
6. Verify Persian/Arabic text is right-aligned and rendered in Estedad.

### Testing checklist
- [ ] Font (Estedad) loads on a supported host.
- [ ] RTL text blocks get right-aligned.
- [ ] Code blocks / editors / inputs are **not** affected.
- [ ] Page layout (grids, sidebars) is **not** mirrored.
- [ ] Dynamically added chat messages are classified (MutationObserver).
- [ ] Toggling Off removes all effects.
- [ ] Unsupported sites show the "only works on…" message.

---

## 10. Known Limitations & Notes

- **Text-only direction:** The extension intentionally does not mirror page layout. This is by design (`isTextOnlyContainer`).
- **Majority-based direction:** Each text block's direction is decided by the ratio of RTL characters (`> 0.3` → RTL). A mostly-Persian line that begins with a Latin word is therefore still right-aligned, while embedded Latin runs stay LTR internally.
- **Code isolation:** `pre`/`code`/`kbd`/`samp` are forced to `direction: ltr` with `unicode-bidi: isolate` so they never reorder or mirror inside Persian text.
- **RTL lists:** Markdown ordered/unordered lists inside RTL blocks render their markers on the right, which is standard RTL behavior.
- **External font dependency:** `content.js` relies on `https://v1.fontapi.ir/css/Estedad`. If the CDN is unavailable, the font falls back to `sans-serif`.
- **Duplicate guards:** Both `content.js` (font) and `addContent.js` (styles) guard against duplicate injection using element IDs (`custom-font-family-cdn`, `custom-styles`).
- **`allFrames: true`:** Scripts are injected into all frames of the active tab.
- **No sync:** Toggle state is stored locally, not synced across devices.
- **README is minimal:** The project's public documentation is essentially just a title; this `memory.md` serves as the internal technical reference.

---

## 11. Version History / Changelog

| Version | Notes |
|---------|-------|
| 1.6.0 | Current version. Adds support for Z.ai, Qwen, Grok, and local DeepSeek Harness; text-only RTL classification with safeguards; automatic Estedad font injection. |

> For a full changelog, see the project website: https://rastegar.info/chatgpt-rtl-support/

---

## 12. Key Code References (Quick Index)

| Concept | Location |
|---------|----------|
| MV3 config, hosts, CSP | `manifest.json` |
| Install/update landing pages | `background.js` |
| Estedad font injection | `content.js` |
| RTL regex ranges | `assets/script/addContent.js` (`RTL_RE`) |
| Skip rules | `assets/script/addContent.js` (`SKIP_SELECTOR`) |
| Layout protection | `assets/script/addContent.js` (`isTextOnlyContainer`) |
| Direction classification (ratio) | `assets/script/addContent.js` (`classify`) |
| Code LTR + isolation | `assets/script/addContent.js` (`ensureStyle` CSS) |
| Revert original `dir` | `assets/script/addContent.js` (`clearDir`) / `removeContent.js` |
| Dynamic content handling | `assets/script/addContent.js` (`MutationObserver`) |
| Cleanup / revert | `assets/script/removeContent.js` |
| Toggle state & injection | `popup.js` |
| Popup markup | `popup.html` |
| Popup styles & animations | `popup.css` |

---

*Last updated: 2026 — generated as part of project technical documentation.*