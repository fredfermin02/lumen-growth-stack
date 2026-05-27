// Lumen subscription radio — Phase 4 A/B test scaffolding.
//
// Watches the subscription selector inputs and mirrors the current choice
// into a `lumen_is_sub` cookie that the Custom Pixel sandbox can read.
//
// The selector itself is rendered in
//   theme/snippets/lumen-subscription-selector.liquid
// and pre-selected via lumen-experiment.js for users in the treatment arm.

(() => {
  const COOKIE_NAME = "lumen_is_sub";
  const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

  function writeCookie(value) {
    const parts = [
      `${COOKIE_NAME}=${value}`,
      "path=/",
      `max-age=${ONE_YEAR_SECONDS}`,
      "samesite=lax",
    ];
    if (window.location.protocol === "https:") parts.push("secure");
    document.cookie = parts.join("; ");
  }

  function syncFromDom() {
    const checked = document.querySelector(
      '[data-subscription-selector] input[type="radio"]:checked',
    );
    if (!checked) return;
    writeCookie(checked.value === "subscribe" ? "true" : "false");
  }

  function init() {
    const selector = document.querySelector("[data-subscription-selector]");
    if (!selector) return;

    // Sync on load (the variant assignment may have pre-selected one option).
    syncFromDom();

    // Sync on every change.
    selector.addEventListener("change", (event) => {
      if (event.target && event.target.matches('input[type="radio"]')) {
        syncFromDom();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
