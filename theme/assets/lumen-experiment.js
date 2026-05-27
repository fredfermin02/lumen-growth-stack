// Lumen experiment assignment — Phase 4 (experiment 001: subscription-default-on).
//
// Responsibilities:
//   1. Ensure a stable per-browser identifier (`lumen_upid`) exists in a
//      first-party cookie so both the storefront and the Custom Pixel
//      sandbox observe the same value.
//   2. Deterministically bucket the user into control or treatment via
//      SHA-256(upid + ":" + experiment_id) mod 2. Same hash function is
//      used by the Python traffic generator at
//        experiments/001-subscription-default-on/simulate.py
//      so synthetic and real traffic land in the same arms for a given upid.
//   3. Stamp the assignment into a `lumen_exp` cookie that the pixel reads
//      and forwards as `data.experiment_id` + `data.variant` on every event.
//   4. Apply the default radio state on the PDP subscription selector for
//      users in the treatment arm.
//
// Runs as an ES module on PDP only (registered in theme/snippets/scripts.liquid).

const EXPERIMENT_ID = "001";
const COOKIE_UPID = "lumen_upid";
const COOKIE_EXP = "lumen_exp";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 days

function readCookie(name) {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name, value) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "path=/",
    `max-age=${COOKIE_MAX_AGE_SECONDS}`,
    "samesite=lax",
  ];
  if (window.location.protocol === "https:") parts.push("secure");
  document.cookie = parts.join("; ");
}

// UUIDv4 — crypto.randomUUID isn't on every browser we care about (older Safari).
function uuid() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Bucket by the low byte of the digest. Two arms, 50/50, deterministic.
// Mirrors the simulate.py implementation.
async function assignVariant(upid, experimentId) {
  const digest = await sha256Hex(`${upid}:${experimentId}`);
  const bucket = parseInt(digest.slice(-2), 16); // 0..255
  return bucket % 2 === 0 ? "control" : "treatment";
}

function applyDefaultRadio(variant) {
  const treatmentRadio = document.querySelector(
    '[data-subscription-selector] [data-subscription-radio="treatment"]',
  );
  const controlRadio = document.querySelector(
    '[data-subscription-selector] [data-subscription-radio="control"]',
  );
  if (!treatmentRadio || !controlRadio) return;

  if (variant === "treatment") {
    treatmentRadio.checked = true;
    controlRadio.checked = false;
  } else {
    treatmentRadio.checked = false;
    controlRadio.checked = true;
  }

  // Notify lumen-subscription-radio.js so it writes the `lumen_is_sub` cookie
  // immediately, rather than waiting for the user to interact.
  treatmentRadio.dispatchEvent(new Event("change", { bubbles: true }));
}

async function run() {
  // 1. Stable identifier
  let upid = readCookie(COOKIE_UPID);
  if (!upid) {
    upid = uuid();
    writeCookie(COOKIE_UPID, upid);
  }

  // 2. Bucket
  const variant = await assignVariant(upid, EXPERIMENT_ID);

  // 3. Stamp assignment
  writeCookie(COOKIE_EXP, `${EXPERIMENT_ID}:${variant}`);

  // Also expose on window for any other theme script that wants to know
  // without re-reading the cookie. Pixel sandbox cannot read window globals,
  // so it still goes through the cookie.
  window.lumenExperiment = { experimentId: EXPERIMENT_ID, variant, upid };

  // 4. Apply UI default
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => applyDefaultRadio(variant));
  } else {
    applyDefaultRadio(variant);
  }
}

run().catch((err) => {
  // Don't crash the page; failed assignment is logged as an exclusion at
  // analysis time when `data.experiment_id` is missing.
  console.warn("[lumen-experiment] assignment failed:", err);
});
