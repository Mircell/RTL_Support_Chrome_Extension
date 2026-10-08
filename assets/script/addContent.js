// RTL Support - text-only direction. Does NOT flip layout/structure.
// Strategy: decide the base direction of each text block from the MAJORITY of
// its characters (not just the first strong one), then apply an explicit
// direction + text-align. Code/pre stay LTR and are bidi-isolated.
(function () {
  "use strict";

  const STYLE_ID = "custom-styles";
  // Marker attribute storing the element's ORIGINAL dir value ("" if none),
  // so cleanup can restore it exactly.
  const DIR_FLAG = "data-rtl-dir";

  // True text-bearing elements, plus generic containers. A div/span is only
  // treated as text when it holds no block-level descendants (see
  // isTextOnlyContainer), so page LAYOUT is never mirrored.
  const TEXT_SELECTOR = [
    "p", "li", "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "td", "th", "caption", "dt", "dd",
    "figcaption", "summary", "label",
    "div", "span"
  ].join(",");

  // If a div/span contains any of these, it is a layout box, not a text node.
  const BLOCK_CHILD_SELECTOR =
    "div,p,ul,ol,li,pre,table,section,article,header,footer,main,nav,aside,form,blockquote,h1,h2,h3,h4,h5,h6";

  // Never touch code, inputs, or anything editable/interactive.
  const SKIP_SELECTOR = [
    "pre", "code", "kbd", "samp", "var", "textarea", "input", "select",
    "script", "style", "svg", "math", "canvas", "video", "audio",
    "[contenteditable='true']", ".cm-editor", ".monaco-editor"
  ].join(",");

  // Hebrew / Arabic / Persian code points.
  const RTL_RE = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g;
  // Anything that is not a word char, whitespace, or RTL char.
  const NEUTRAL_RE = /[^\w\s\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g;

  // Above this ratio of RTL characters a block is treated as RTL.
  const RTL_RATIO_THRESHOLD = 0.3;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = [
      ".rtl-text { direction: rtl !important; text-align: right !important; }",
      ".ltr-text { direction: ltr !important; text-align: left !important; }",
      ".rtl-text blockquote { border-right: 3px solid #8a8a8a !important; border-left: none !important; padding-right: .75em !important; padding-left: 0 !important; }",
      // Code must always stay LTR and be isolated from the surrounding bidi
      // context so it never reorders or mirrors inside Persian text.
      "pre, code, kbd, samp { direction: ltr !important; unicode-bidi: isolate !important; text-align: left !important; }"
    ].join("\n");
    (document.head || document.documentElement).appendChild(s);
  }

  function isSkipped(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
    if (el.closest(SKIP_SELECTOR)) return true;
    return false;
  }

  // A div/span counts as a text node only when it holds no block-level
  // descendants. This keeps layout boxes from being mirrored.
  function isTextOnlyContainer(el) {
    const tag = el.tagName;
    if (tag !== "DIV" && tag !== "SPAN") return true;
    return !el.querySelector(BLOCK_CHILD_SELECTOR);
  }

  // Revert an element that we previously modified.
  function clearDir(el) {
    el.classList.remove("rtl-text", "ltr-text");
    if (!el.hasAttribute(DIR_FLAG)) return;
    const original = el.getAttribute(DIR_FLAG);
    el.removeAttribute(DIR_FLAG);
    if (original) el.setAttribute("dir", original);
    else el.removeAttribute("dir");
  }

  function classify(el) {
    if (isSkipped(el)) return;
    if (!isTextOnlyContainer(el)) return;

    const text = (el.textContent || "").trim();
    if (!text) return;

    const rtlCount = (text.match(RTL_RE) || []).length;
    if (rtlCount === 0) {
      // No RTL characters: undo anything we may have applied earlier.
      clearDir(el);
      return;
    }

    const visible = text.replace(NEUTRAL_RE, "").length;
    if (visible === 0) return;

    // Remember the original dir once, so repeated scans are idempotent.
    if (!el.hasAttribute(DIR_FLAG)) {
      el.setAttribute(DIR_FLAG, el.getAttribute("dir") || "");
    }

    if (rtlCount / visible > RTL_RATIO_THRESHOLD) {
      el.setAttribute("dir", "rtl");
      el.classList.add("rtl-text");
      el.classList.remove("ltr-text");
    } else {
      el.setAttribute("dir", "ltr");
      el.classList.add("ltr-text");
      el.classList.remove("rtl-text");
    }
  }

  function scan(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches && root.matches(TEXT_SELECTOR)) classify(root);
    if (root.querySelectorAll) {
      root.querySelectorAll(TEXT_SELECTOR).forEach(classify);
    }
  }

  ensureStyle();
  scan(document.body || document.documentElement);

  // ONE observer for the whole document instead of one per element.
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "childList") {
        m.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) scan(node);
          else if (node.nodeType === Node.TEXT_NODE && node.parentElement) classify(node.parentElement);
        });
      } else if (m.type === "characterData" && m.target.parentElement) {
        classify(m.target.parentElement);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
})();