let currentBlacklist = [];

function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function applyBlacklist(blacklist) {
    const items = document.querySelectorAll('section[data-test-id="grid-elements"][type="PRODUCT_TILE"]');

    items.forEach(item => {
        const nameEl = item.querySelector('span[data-test-id="tile__highlighter"]');
        if (!nameEl) return;

        const text = normalizeText(nameEl.innerText || "");
        const shouldHide = blacklist.some(word => text.includes(word.toLowerCase()));

        item.style.display = shouldHide ? "none" : "";
    });
}

// Initial load
chrome.storage.sync.get(["blacklist"], ({ blacklist }) => {
    currentBlacklist = blacklist || [];
    applyBlacklist(currentBlacklist);

    // Watch for dynamically added products
    const observer = new MutationObserver(() => {
        applyBlacklist(currentBlacklist);
    });
    observer.observe(document.body, { childList: true, subtree: true });
});

// Listen for popup updates
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "BLACKLIST_UPDATED") {
        currentBlacklist = msg.blacklist || [];
        applyBlacklist(currentBlacklist);
    }
});
