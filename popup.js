const listEl = document.getElementById("list");
const inputEl = document.getElementById("word");
const addBtn = document.getElementById("add");

// Collator for Polish-aware sorting (fallback to user's locale)
const collator = new Intl.Collator('pl', { sensitivity: 'base', ignorePunctuation: true });

// Normalize for comparisons/deduping: trim, collapse spaces, NFC, lowercase
function normalizeForCompare(s) {
    if (!s) return "";
    return s.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Return a sorted copy (doesn't mutate original array)
function sortedCopy(words) {
    return [...words].sort((a, b) => collator.compare(a, b));
}

function renderList(words) {
    // Ensure we are working with an array
    words = Array.isArray(words) ? words : [];

    listEl.innerHTML = "";

    // Sort a copy for display
    const sorted = sortedCopy(words);

    sorted.forEach((word) => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        li.style.margin = "2px 0";
        li.style.padding = "2px 6px";
        li.style.background = "#f5f5f5";
        li.style.borderRadius = "4px";

        const span = document.createElement("span");
        span.textContent = word;
        span.style.flex = "1";
        span.style.marginRight = "8px";
        span.style.wordBreak = "break-word";

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "x";
        removeBtn.style.background = "red";
        removeBtn.style.color = "white";
        removeBtn.style.border = "none";
        removeBtn.style.borderRadius = "3px";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.padding = "0 6px";

        // Remove by value (dedupe-safe) — not by index
        removeBtn.onclick = () => {
            chrome.storage.sync.get(["blacklist"], ({ blacklist }) => {
                const old = Array.isArray(blacklist) ? blacklist : [];
                const newList = old.filter(w => normalizeForCompare(w) !== normalizeForCompare(word));
                chrome.storage.sync.set({ blacklist: newList }, () => {
                    renderList(newList);
                    notifyContent(newList);
                });
            });
        };

        li.appendChild(span);
        li.appendChild(removeBtn);
        listEl.appendChild(li);
    });
}

// Notify active tab (content script) about updates
function notifyContent(list) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, { type: "BLACKLIST_UPDATED", blacklist: list });
        }
    });
}

// Load list on popup open
chrome.storage.sync.get(["blacklist"], ({ blacklist }) => {
    const words = Array.isArray(blacklist) ? blacklist : [];
    renderList(words);
});

addBtn.onclick = () => {
    const wordRaw = inputEl.value || "";
    const word = wordRaw.trim();
    if (!word) return;

    chrome.storage.sync.get(["blacklist"], ({ blacklist }) => {
        const words = Array.isArray(blacklist) ? blacklist : [];

        // Avoid duplicates (case/space-insensitive)
        const exists = words.some(w => normalizeForCompare(w) === normalizeForCompare(word));
        if (!exists) {
            words.push(word);
        }

        // Sort before saving
        const toSave = sortedCopy(words);

        chrome.storage.sync.set({ blacklist: toSave }, () => {
            inputEl.value = "";
            renderList(toSave);
            notifyContent(toSave);
        });
    });
};
