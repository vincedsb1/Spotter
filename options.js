document.addEventListener("DOMContentLoaded", () => {
  // Éléments DOM
  const listsContainer = document.getElementById("listsContainer");
  const addListBtn = document.getElementById("addListBtn");
    const globalVariations = document.getElementById("globalVariations");
    const showFloatingButton = document.getElementById("showFloatingButton");
  
    const modal = document.getElementById("editModal");
    const editName = document.getElementById("editName");
    const editColor = document.getElementById("editColor");
    const editEntries = document.getElementById("editEntries");
    const errorMsg = document.getElementById("errorMsg");
    const saveEditBtn = document.getElementById("saveEdit");
    const cancelEditBtn = document.getElementById("cancelEdit");
  
    let currentEditingId = null;
    let allLists = [];
  
    // Initialisation
    loadData();
  
    // Listeners Globaux
    function saveGlobalOptions() {
      chrome.storage.local.get(["globalOptions"], (res) => {
        const opts = res.globalOptions || {};
        opts.matchVariations = globalVariations.checked;
        opts.showFloatingButton = showFloatingButton.checked;
        chrome.storage.local.set({ globalOptions: opts }, () => {
          // Notify content scripts to update UI immediately
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0] && tabs[0].id) {
                  chrome.tabs.sendMessage(tabs[0].id, { action: "refresh" }).catch(() => {});
              }
          });
        });
      });
    }
  
    globalVariations.addEventListener("change", saveGlobalOptions);
    showFloatingButton.addEventListener("change", saveGlobalOptions);
  
    addListBtn.addEventListener("click", () => {
      openModal(null); // Mode création
    });
  
    cancelEditBtn.addEventListener("click", closeModal);
    saveEditBtn.addEventListener("click", saveList);
  
    function loadData() {
      chrome.storage.local.get(["lists", "globalOptions"], (result) => {
        allLists = result.lists || [];
        const opts = result.globalOptions || { matchVariations: false, showFloatingButton: true };
  
        globalVariations.checked = opts.matchVariations;
        // Default to true if undefined
        showFloatingButton.checked = opts.showFloatingButton !== false;
        
        renderLists();
      });
    }
  function renderLists() {
    listsContainer.innerHTML = "";
    allLists.forEach((list) => {
      const card = document.createElement("div");
      card.className = "card list-card";

      const header = document.createElement("div");
      header.className = "card-header";

      const titleGroup = document.createElement("div");
      titleGroup.className = "title-group";

      const color = document.createElement("div");
      color.className = "color-preview";
      color.style.backgroundColor = list.color;

      const name = document.createElement("h3");
      name.textContent = list.name;
      if (!list.enabled) name.style.opacity = "0.5";

      titleGroup.append(color, name);

      const actions = document.createElement("div");
      actions.className = "actions-group";

      const toggleLabel = document.createElement("label");
      toggleLabel.className = "switch";
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = list.enabled;
      toggle.addEventListener("change", () =>
        toggleList(list.id, toggle.checked),
      );
      const slider = document.createElement("span");
      slider.className = "slider round";
      toggleLabel.append(toggle, slider);

      const editBtn = document.createElement("button");
      editBtn.className = "btn btn-secondary btn-sm";
      editBtn.textContent = "Éditer";
      editBtn.addEventListener("click", () => openModal(list.id));

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-danger btn-sm";
      delBtn.textContent = "Supprimer";
      delBtn.addEventListener("click", () => deleteList(list.id));

      actions.append(toggleLabel, editBtn, delBtn);
      header.append(titleGroup, actions);

      const summary = document.createElement("div");
      summary.className = "list-summary";
      summary.textContent = `${list.entries.length} entrée(s)`;

      card.append(header, summary);
      listsContainer.appendChild(card);
    });
  }

  function toggleList(id, enabled) {
    const idx = allLists.findIndex((l) => l.id === id);
    if (idx > -1) {
      allLists[idx].enabled = enabled;
      saveAllLists();
    }
    renderLists();
  }

  function deleteList(id) {
    if (!confirm("Voulez-vous vraiment supprimer cette liste ?")) return;
    allLists = allLists.filter((l) => l.id !== id);
    saveAllLists();
    renderLists();
  }

  function openModal(id) {
    currentEditingId = id;
    errorMsg.classList.add("hidden");

    if (id) {
      // Mode édition
      const list = allLists.find((l) => l.id === id);
      editName.value = list.name;
      editColor.value = list.color;
      editEntries.value = list.entries.join("\n");
    } else {
      // Mode création
      editName.value = "Nouvelle liste";
      editColor.value = "#ffe082";
      editEntries.value = "";
    }

    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
  }

  function saveList() {
    const name = editName.value.trim();
    const color = editColor.value;
    const rawEntries = editEntries.value.split("\n");

    // Nettoyage des entrées
    const entries = rawEntries.map((e) => e.trim()).filter((e) => e !== "");

    // Validation Doublons Inter-Listes
    // On récupère toutes les entrées des AUTRES listes
    const otherLists = allLists.filter((l) => l.id !== currentEditingId);
    const existingEntries = new Set();
    const conflictMap = new Map(); // entry -> listName

    otherLists.forEach((l) => {
      l.entries.forEach((e) => {
        const norm = e.toLowerCase(); // Comparaison simple insensible casse pour doublon
        existingEntries.add(norm);
        conflictMap.set(norm, l.name);
      });
    });

    const conflicts = [];
    const uniqueNewEntries = new Set(); // Pour éviter doublons internes

    entries.forEach((entry) => {
      const norm = entry.toLowerCase();
      if (existingEntries.has(norm)) {
        conflicts.push(`"${entry}" (dans : ${conflictMap.get(norm)})`);
      }
      uniqueNewEntries.add(entry); // On garde la casse de l'input utilisateur
    });

    if (conflicts.length > 0) {
      errorMsg.textContent = `Erreur : Doublons détectés. \n${conflicts.join("\n")}`;
      errorMsg.classList.remove("hidden");
      return;
    }

    const finalEntries = Array.from(uniqueNewEntries);

    if (currentEditingId) {
      // Update
      const idx = allLists.findIndex((l) => l.id === currentEditingId);
      allLists[idx].name = name;
      allLists[idx].color = color;
      allLists[idx].entries = finalEntries;
    } else {
      // Create
      allLists.push({
        id: crypto.randomUUID(),
        name: name,
        color: color,
        entries: finalEntries,
        enabled: true,
      });
    }

    saveAllLists();
    closeModal();
    renderLists();
  }

  function saveAllLists() {
    chrome.storage.local.set({ lists: allLists });
  }
});
