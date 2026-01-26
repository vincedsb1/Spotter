// popup.js

// 32 Tailwind CSS Pastel Colors (Shades 200 & 300)
const COLORS = [
  "#fecaca", "#fca5a5", // Red
  "#fed7aa", "#fdba74", // Orange
  "#fde68a", "#fcd34d", // Amber
  "#fef08a", "#fde047", // Yellow
  "#d9f99d", "#bef264", // Lime
  "#bbf7d0", "#86efac", // Green
  "#a7f3d0", "#6ee7b7", // Emerald
  "#99f6e4", "#5eead4", // Teal
  "#a5f3fc", "#67e8f9", // Cyan
  "#bae6fd", "#7dd3fc", // Sky
  "#bfdbfe", "#93c5fd", // Blue
  "#c7d2fe", "#a5b4fc", // Indigo
  "#ddd6fe", "#c4b5fd", // Violet
  "#e9d5ff", "#d8b4fe", // Purple
  "#f0abfc", "#e879f9", // Fuchsia
  "#fbcfe8", "#f9a8d4", // Pink
  "#fda4af", "#fb7185", // Rose
  "#e2e8f0", "#cbd5e1"  // Slate
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
  
  await loadState();
  await loadLists();
  initColorGrid();

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
      if (child.style.backgroundColor === color || rgbToHex(child.style.backgroundColor) === color) {
        child.classList.add("selected");
      } else {
        child.classList.remove("selected");
      }
    });
  }
  
  // Helper to compare computed styles if needed (browsers return rgb)
  function rgbToHex(rgb) {
    if (rgb.startsWith("#")) return rgb;
    const sep = rgb.indexOf(",") > -1 ? "," : " ";
    const rgbVal = rgb.substr(4).split(")")[0].split(sep);
    let r = (+rgbVal[0]).toString(16),
        g = (+rgbVal[1]).toString(16),
        b = (+rgbVal[2]).toString(16);
    if (r.length == 1) r = "0" + r;
    if (g.length == 1) g = "0" + g;
    if (b.length == 1) b = "0" + b;
    return "#" + r + g + b;
  }

  async function loadState() {
    const data = await chrome.storage.local.get("extensionEnabled");
    setToggleUI(!!data.extensionEnabled);
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
    notifyContentScript(); // Still useful to trigger instant refresh of lists
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
    // We keep this to refresh LISTS content immediately
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "refresh" }).catch(() => {});
      }
    });
  }

  async function toggleGlobalState() {
    const data = await chrome.storage.local.get("extensionEnabled");
    const newState = !data.extensionEnabled;
    
    // Save to storage -> triggers onChanged in content.js -> toggles UI
    await chrome.storage.local.set({ extensionEnabled: newState });
    setToggleUI(newState);
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
