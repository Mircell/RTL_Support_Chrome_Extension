// Remove all RTL/LTR text-direction effects applied by this extension.
(function () {
  "use strict";

  const DIR_FLAG = "data-rtl-dir";

  const style = document.getElementById("custom-styles");
  if (style && style.parentNode) style.parentNode.removeChild(style);

  // Restore the original dir value for every element we modified, then drop
  // the marker attribute and our class.
  document.querySelectorAll("[" + DIR_FLAG + "]").forEach((el) => {
    const original = el.getAttribute(DIR_FLAG);
    el.removeAttribute(DIR_FLAG);
    if (original) el.setAttribute("dir", original);
    else el.removeAttribute("dir");
    el.classList.remove("rtl-text");
  });

  // Safety net: clear any leftover classes (e.g., from older versions).
  document
    .querySelectorAll(".rtl-text, .ltr-text")
    .forEach((el) => el.classList.remove("rtl-text", "ltr-text"));
})();