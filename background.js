// background.js

// Function to rebuild the context menu based on current lists
async function updateContextMenus() {
  // Utilisation de storage.local pour être cohérent avec options.js et content.js
  const data = await chrome.storage.local.get("lists");
  const lists = data.lists || [];

  chrome.contextMenus.removeAll();

  // Parent item
  chrome.contextMenus.create({
    id: "spotter-root",
    title: "Ajouter \"%s\" à...",
    contexts: ["selection"]
  });

  if (lists.length === 0) {
    chrome.contextMenus.create({
      parentId: "spotter-root",
      id: "no-lists",
      title: "Aucune liste disponible (créez-en une !)",
      contexts: ["selection"],
      enabled: false
    });
  } else {
    lists.forEach(list => {
      chrome.contextMenus.create({
        parentId: "spotter-root",
        id: `add-to-${list.id}`,
        title: list.name,
        contexts: ["selection"]
      });
    });
  }
}

// Initialize
chrome.runtime.onInstalled.addListener(async () => {
  // Default lists if empty - Utilisation de LOCAL
  const { lists, globalOptions } = await chrome.storage.local.get(["lists", "globalOptions"]);
  
  if (!lists) {
    const defaultList = {
      id: Date.now().toString(),
      name: "Green flags",
      color: "#86efac",
      entries: ["salary range", "remote work", "4 day work week"],
      enabled: true
    };
    await chrome.storage.local.set({ lists: [defaultList] });
  }

  if (!globalOptions) {
    await chrome.storage.local.set({ 
      globalOptions: { matchVariations: true, showFloatingButton: true } 
    });
  }

  await updateContextMenus();
});

// Watch for storage changes to update menus
chrome.storage.onChanged.addListener((changes, area) => {
  // On écoute 'local' maintenant
  if (area === 'local' && changes.lists) {
    updateContextMenus();
  }
});

// Handle Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId.startsWith("add-to-")) {
    const listId = info.menuItemId.replace("add-to-", "");
    const textToAdd = info.selectionText.trim();

    if (!textToAdd) return;

    // Utilisation de LOCAL
    const data = await chrome.storage.local.get("lists");
    const lists = data.lists || [];
    const targetList = lists.find(l => l.id === listId);

    if (targetList) {
      // Check duplicates (case insensitive)
      const exists = targetList.entries.some(e => e.toLowerCase() === textToAdd.toLowerCase());
      if (!exists) {
        targetList.entries.push(textToAdd);
        await chrome.storage.local.set({ lists });
        
        // Refresh highlighting on current tab
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, { action: "refresh" }).catch(() => {});
        }
      }
    }
  }
});

// Commands
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-highlight") {
    toggleInActiveTab();
  }
});

async function toggleInActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !tab.url || tab.url.startsWith("chrome://")) return;
  chrome.tabs.sendMessage(tab.id, { action: "toggle" }).catch(() => {});
}
