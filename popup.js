const listEl = document.getElementById("list");
const inputEl = document.getElementById("word");
const addBtn = document.getElementById("add");

function renderList(words) {
    listEl.innerHTML = "";
    words.forEach((word, i) => {
        const li = document.createElement("li");
        li.textContent = word + " ";

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "x";
        removeBtn.onclick = () => {
            words.splice(i, 1);
            chrome.storage.sync.set({ blacklist: words }, () => {
                renderList(words);

                // Notify active tab about blacklist update
                chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                    if (tabs[0]?.id) {
                        chrome.tabs.sendMessage(tabs[0].id, { 
                            type: "BLACKLIST_UPDATED", 
                            blacklist: words 
                        });
                    }
                });
            });
        };

        li.appendChild(removeBtn);
        listEl.appendChild(li);
    });
}

// Load list on popup open
chrome.storage.sync.get(["blacklist"], ({ blacklist }) => {
    renderList(blacklist || []);
});

addBtn.onclick = () => {
    const word = inputEl.value.trim();
    if (!word) return;

    chrome.storage.sync.get(["blacklist"], ({ blacklist }) => {
        const words = blacklist || [];
        words.push(word);

        chrome.storage.sync.set({ blacklist: words }, () => {
            inputEl.value = "";
            renderList(words);

            // Notify active tab about blacklist update
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, { 
                        type: "BLACKLIST_UPDATED", 
                        blacklist: words 
                    });
                }
            });
        });
    });
};
