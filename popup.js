// popup.js

// Constants
const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#fb7185",
  "#9ca3af", "#6b7280", "#4b5563", "#374151", "#1f2937", "#000000"
];

document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements
  const toggleBtn = document.getElementById("toggleBtn");
  const listsList = document.getElementById("listsList");
  const openOptionsBtn = document.getElementById("openOptions");
  const addListBtn = document.getElementById("addListBtn");
  
  // Modal Elements
  const modal = document.getElementById("editModal");
  const modalTitle = document.getElementById("modalTitle");
  const editName = document.getElementById("editName");
  const colorGrid = document.getElementById("colorGrid");
  const editColorInput = document.getElementById("editColor");
  const editEntries = document.getElementById("editEntries");
  const errorMsg = document.getElementById("errorMsg");
  const saveEditBtn = document.getElementById("saveEdit");
  const cancelEditBtn = document.getElementById("cancelEdit");

  let currentEditingId = null;
  let allLists = [];

  // --- Initialization ---
  
  await loadLists();
  initColorGrid();
  checkActiveTab();

  // --- Event Listeners ---

  toggleBtn.addEventListener("click", toggleGlobalState);
  openOptionsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
  
  addListBtn.addEventListener("click", () => openModal(null));
  cancelEditBtn.addEventListener("click", closeModal);
  saveEditBtn.addEventListener("click", saveList);

  // --- Functions ---

  function initColorGrid() {
    colorGrid.innerHTML = "";
    COLORS.forEach(color => {
      const div = document.createElement("div");
      div.className = "color-option";
      div.style.backgroundColor = color;
      div.addEventListener("click", () => selectColor(color));
      colorGrid.appendChild(div);
    });
  }

  function selectColor(color) {
    editColorInput.value = color;
    // Update visual selection
    Array.from(colorGrid.children).forEach(child => {
      // Use includes to handle rgb vs hex discrepancies
      if (child.style.backgroundColor.includes(hexToRgb(color)) || child.style.backgroundColor === color) {
        child.classList.add("selected");
      } else {
        child.classList.remove("selected");
      }
    });
  }
  
  function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return r + ", " + g + ", " + b; // standard CSS format is "rgb(r, g, b)"
  }

  async function loadLists() {
    const data = await chrome.storage.local.get("lists");
    allLists = data.lists || [];
    renderLists();
  }

  function renderLists() {
    listsList.innerHTML = "";

    if (allLists.length === 0) {
      listsList.innerHTML = "<p style='padding:10px; color:#666; text-align:center'>Aucune liste. Créez-en une !</p>";
      return;
    }

    allLists.forEach(list => {
      const row = document.createElement("div");
      row.className = "list-item-row";

      const colorDot = document.createElement("span");
      colorDot.className = "color-dot";
      colorDot.style.backgroundColor = list.color;

      const listName = document.createElement("span");
      listName.className = "list-name";
      listName.textContent = list.name;

      // Edit Button (Pencil)
      const editBtn = document.createElement("button");
      editBtn.className = "btn-icon";
      editBtn.innerHTML = `<span class="material-icons" style="font-size:16px;">edit</span>`;
      editBtn.title = "Modifier";
      editBtn.onclick = () => openModal(list.id);

      // Toggle Switch
      const switchLabel = document.createElement("label");
      switchLabel.className = "switch";
      const switchInput = document.createElement("input");
      switchInput.type = "checkbox";
      switchInput.checked = list.enabled;
      switchInput.onchange = (e) => toggleListEnabled(list.id, e.target.checked);
      
      const switchSlider = document.createElement("span");
      switchSlider.className = "slider round";
      switchLabel.append(switchInput, switchSlider);

      row.append(colorDot, listName, editBtn, switchLabel);
      listsList.appendChild(row);
    });
  }

  function openModal(id) {
    currentEditingId = id;
    errorMsg.classList.add("hidden");

    if (id) {
      const list = allLists.find(l => l.id === id);
      if (list) {
        modalTitle.textContent = "Modifier la liste";
        editName.value = list.name;
        selectColor(list.color);
        editEntries.value = list.entries.join("\n");
      }
    } else {
      modalTitle.textContent = "Nouvelle liste";
      editName.value = "";
      selectColor(COLORS[0]); // Default color
      editEntries.value = "";
    }
    modal.classList.remove("hidden");
  }

  function closeModal() {
    modal.classList.add("hidden");
    currentEditingId = null;
  }

  async function saveList() {
    const name = editName.value.trim();
    const color = editColorInput.value;
    const rawEntries = editEntries.value.split("\n");
    
    // Normalize and clean entries
    const entries = rawEntries
        .map(e => e.trim())
        .filter(e => e.length > 0);
    const uniqueEntries = [...new Set(entries)]; // Remove dupes inside list

    if (!name) {
        showError("Le nom de la liste est requis.");
        return;
    }

    if (currentEditingId) {
        const index = allLists.findIndex(l => l.id === currentEditingId);
        if (index !== -1) {
            allLists[index].name = name;
            allLists[index].color = color;
            allLists[index].entries = uniqueEntries;
        }
    } else {
        allLists.push({
            id: crypto.randomUUID(),
            name: name,
            color: color,
            entries: uniqueEntries,
            enabled: true
        });
    }

    await chrome.storage.local.set({ lists: allLists });
    notifyContentScript();
    closeModal();
    renderLists();
  }

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove("hidden");
  }

  async function toggleListEnabled(id, enabled) {
    const index = allLists.findIndex(l => l.id === id);
    if (index !== -1) {
        allLists[index].enabled = enabled;
        await chrome.storage.local.set({ lists: allLists });
        notifyContentScript();
    }
  }

  function notifyContentScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "refresh" }).catch(() => {});
      }
    });
  }

  async function checkActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !tab.url || tab.url.startsWith("chrome://")) {
        toggleBtn.disabled = true;
        toggleBtn.textContent = "Non disponible";
        return;
    }
    chrome.tabs.sendMessage(tab.id, { action: "getState" }, (response) => {
        if (!chrome.runtime.lastError) {
            setToggleUI(response && response.isActive);
        }
    });
  }

  async function toggleGlobalState() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: "toggle" }, (res) => {
            const isNowActive = !toggleBtn.classList.contains("active");
            setToggleUI(isNowActive);
        });
    }
  }

  function setToggleUI(isActive) {
    if (isActive) {
        toggleBtn.textContent = "Désactiver le surlignage";
        toggleBtn.classList.add("btn-danger", "active");
        toggleBtn.classList.remove("btn-primary");
    } else {
        toggleBtn.textContent = "Activer le surlignage";
        toggleBtn.classList.add("btn-primary");
        toggleBtn.classList.remove("btn-danger", "active");
    }
  }
});
