let currentBlacklist = [];

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function getTiles() {
  // Glovo tiles look like: <div data-test-id="product-tile" ...>
  return document.querySelectorAll('[data-test-id="product-tile"]');
}

function getTileName(tile) {
  // Typical name element
  const nameEl = tile.querySelector('span[data-test-id="tile__highlighter"]');
  if (nameEl) return (nameEl.innerText || "").trim();

  // Fallbacks if DOM changes
  const alt = tile.querySelector(".tile__description, [class*='tile__description']");
  return alt ? (alt.innerText || "").trim() : "";
}

function addBlacklistButton(tile, rawName) {
  if (!rawName) return;

  // Prevent duplicates
  if (tile.querySelector(".blacklist-btn")) return;

  // Make sure the tile can position an absolute child
  const computedPos = getComputedStyle(tile).position;
  if (computedPos === "static") {
    tile.style.position = "relative";
  }

  const btn = document.createElement("button");
  btn.textContent = "B";
  btn.className = "blacklist-btn";
  Object.assign(btn.style, {
    position: "absolute",
    top: "6px",
    right: "6px",
    zIndex: "9999",
    background: "red",
    color: "white",
    border: "none",
    borderRadius: "50%",
    width: "24px",
    height: "24px",
    lineHeight: "24px",
    textAlign: "center",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 1px 4px rgba(0,0,0,.3)"
  });

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();

    chrome.storage.sync.get(["blacklist"], ({ blacklist }) => {
      const words = blacklist || [];
      if (!words.includes(rawName)) {
        words.push(rawName);
        chrome.storage.sync.set({ blacklist: words }, () => {
          currentBlacklist = words;
          // Hide immediately
          tile.style.display = "none";

          // Inform other parts (popup/other tabs) if needed
          chrome.runtime.sendMessage({
            type: "BLACKLIST_UPDATED",
            blacklist: words
          });
        });
      }
    });
  });

  tile.appendChild(btn);
}

function applyBlacklist(blacklist) {
  const tiles = getTiles();

  tiles.forEach((tile) => {
    const rawName = getTileName(tile);
    const text = normalizeText(rawName);
    const shouldHide = blacklist.some((word) =>
      text.includes(word.toLowerCase())
    );

    tile.style.display = shouldHide ? "none" : "";

    // Ensure the B button exists on each visible tile
    addBlacklistButton(tile, rawName);
  });
}

// Initial load
chrome.storage.sync.get(["blacklist"], ({ blacklist }) => {
  currentBlacklist = blacklist || [];
  applyBlacklist(currentBlacklist);

  // Watch for dynamically added/changed products
  const observer = new MutationObserver((mutations) => {
    // It’s fine to re-run; addBlacklistButton prevents duplicates per tile
    applyBlacklist(currentBlacklist);
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

// Listen for popup updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "BLACKLIST_UPDATED") {
    currentBlacklist = msg.blacklist || [];
    applyBlacklist(currentBlacklist);
  }
});
