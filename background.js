chrome.runtime.onInstalled.addListener(() => {
  console.log("Spotter extension installed.");
  refreshContextMenus();
});

// Recharger les menus si les listes changent
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.lists) {
    refreshContextMenus();
  }
});

function refreshContextMenus() {
  chrome.contextMenus.removeAll(() => {
    // 1. Always add the Counter item
    chrome.contextMenus.create({
      id: "spotter-count",
      title: "Spotter: 0 char",
      contexts: ["selection"],
      enabled: false // Just for display
    });

    chrome.storage.local.get(["lists"], (result) => {
      const lists = result.lists || [];
      
      if (lists.length === 0) return;

      // Parent menu
      chrome.contextMenus.create({
        id: "spotter-parent",
        title: "Ajouter à Spotter",
        contexts: ["selection"]
      });

      // Sub-menus per list
      lists.forEach((list) => {
        chrome.contextMenus.create({
          id: `add-to-${list.id}`,
          parentId: "spotter-parent",
          title: list.name,
          contexts: ["selection"]
        });
      });
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId.startsWith("add-to-")) {
    const listId = info.menuItemId.replace("add-to-", "");
    const textToAdd = info.selectionText.trim();

    if (!textToAdd) return;

    chrome.storage.local.get(["lists"], (result) => {
      let lists = result.lists || [];
      const listIndex = lists.findIndex(l => l.id === listId);

      if (listIndex !== -1) {
        // Avoid duplicates
        if (!lists[listIndex].words.includes(textToAdd)) {
          lists[listIndex].words.push(textToAdd);
          chrome.storage.local.set({ lists }, () => {
            console.log(`Added "${textToAdd}" to list ${lists[listIndex].name}`);
          });
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateSelectionCount") {
    chrome.contextMenus.update("spotter-count", {
      title: `Spotter: ${request.count} char${request.count > 1 ? 's' : ''}`
    });
  } else if (request.action === "askAI") {
    handleAIRequest(request.text, request.promptContent, request.model, sendResponse);
    return true; // Indique que la réponse sera asynchrone
  }
});

async function handleAIRequest(userText, promptContent, model, sendResponse) {
  try {
    // 1. Récupérer la config
    const data = await chrome.storage.local.get(["aiSettings"]);
    const settings = data.aiSettings || {};

    if (!settings.apiKey) {
      sendResponse({ error: "Clé API manquante. Veuillez la configurer dans les options." });
      return;
    }

    // Utiliser le prompt spécifique envoyé, sinon un fallback
    const systemPrompt = promptContent || "Tu es un assistant utile.";
    
    // Utiliser le modèle spécifié, sinon le fallback historique
    const aiModel = model || "gpt-3.5-turbo";

    // 2. Appel OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "Erreur API OpenAI");
    }

    const json = await response.json();
    const reply = json.choices[0].message.content;

    sendResponse({ result: reply });

  } catch (error) {
    console.error("Spotter AI Error:", error);
    sendResponse({ error: error.message });
  }
}
