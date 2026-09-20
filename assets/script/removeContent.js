// Remove all RTL/LTR text-direction effects applied by this extension.
(function () {
  "use strict";

  const style = document.getElementById("custom-styles");
  if (style && style.parentNode) style.parentNode.removeChild(style);

  document
    .querySelectorAll(".rtl-text, .ltr-text")
    .forEach((el) => el.classList.remove("rtl-text", "ltr-text"));
})();