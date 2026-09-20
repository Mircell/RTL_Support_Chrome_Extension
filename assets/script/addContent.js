// RTL Support - text-only direction. Does NOT flip layout/structure.
(function () {
  "use strict";

  const STYLE_ID = "custom-styles";

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

  const RTL_RE = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g;
  const NEUTRAL_RE = /[^\w\s\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = [
      ".rtl-text { direction: rtl !important; text-align: right !important; unicode-bidi: plaintext !important; }",
      ".ltr-text { direction: ltr !important; text-align: left !important; unicode-bidi: plaintext !important; }",
      ".rtl-text ul, .rtl-text ol { direction: rtl !important; }",
      ".rtl-text blockquote { border-right: 3px solid #8a8a8a !important; border-left: none !important; padding-right: .75em !important; padding-left: 0 !important; }"
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

  function classify(el) {
    if (isSkipped(el)) return;
    if (!isTextOnlyContainer(el)) return;

    const text = (el.textContent || "").trim();
    if (!text) return;

    const rtl = (text.match(RTL_RE) || []).length;
    if (rtl === 0) return;

    const visible = text.replace(NEUTRAL_RE, "").length;
    if (visible === 0) return;

    const ratio = rtl / visible;
    if (ratio > 0.3) {
      el.classList.add("rtl-text");
      el.classList.remove("ltr-text");
    } else {
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