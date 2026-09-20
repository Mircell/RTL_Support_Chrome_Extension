// Inject a Persian-friendly font for text content only.
// Runs on every supported host; does NOT change layout direction.
(function () {
  "use strict";

  const FONT_ID = "custom-font-family-cdn";
  if (document.getElementById(FONT_ID)) return;

  const style = document.createElement("style");
  style.id = FONT_ID;
  style.textContent = [
    "@import url('https://v1.fontapi.ir/css/Estedad');",
    "body, p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th, caption, dd, dt, figcaption, summary, label, button, input, textarea {",
    "  font-family: Estedad, sans-serif !important;",
    "}"
  ].join("\n");

  (document.head || document.documentElement).appendChild(style);
})();