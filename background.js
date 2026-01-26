chrome.runtime.onInstalled.addListener(() => {
  console.log("Spotter extension installed.");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "askAI") {
    handleAIRequest(request.text, request.promptContent, sendResponse);
    return true; // Indique que la réponse sera asynchrone
  }
});

async function handleAIRequest(userText, promptContent, sendResponse) {
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

    // 2. Appel OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Rapide et économique pour ce genre d'usage
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
