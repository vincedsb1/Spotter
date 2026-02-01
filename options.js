document.addEventListener("DOMContentLoaded", () => {
  // --- Global ---
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  // --- Listes ---
  const listsContainer = document.getElementById("listsContainer");
  const addListBtn = document.getElementById("addListBtn");
  const modal = document.getElementById("editModal");
  const editName = document.getElementById("editName");
  const editColor = document.getElementById("editColor");
  const editEntries = document.getElementById("editEntries");
  const errorMsg = document.getElementById("errorMsg");
  const saveEditBtn = document.getElementById("saveEdit");
  const cancelEditBtn = document.getElementById("cancelEdit");

  // --- HIERARCHY : Categories ---
  const catPrevBtn = document.getElementById("catPrevBtn");
  const catNextBtn = document.getElementById("catNextBtn");
  const addCategoryBtn = document.getElementById("addCategoryBtn");
  const categoryNameInput = document.getElementById("categoryNameInput");
  const deleteCategoryBtn = document.getElementById("deleteCategoryBtn");

  // --- HIERARCHY : Groups (Forms) ---
  const groupPrevBtn = document.getElementById("groupPrevBtn");
  const groupNextBtn = document.getElementById("groupNextBtn");
  const addGroupBtn = document.getElementById("addGroupBtn");
  const groupNameInput = document.getElementById("groupNameInput");
  const deleteGroupBtn = document.getElementById("deleteGroupBtn");

  // --- HIERARCHY : Fields ---
  const formsContainer = document.getElementById("formsContainer");
  const addInputBtn = document.getElementById("addInputBtn");
  const addSeparatorBtn = document.getElementById("addSeparatorBtn");
  const addTextareaBtn = document.getElementById("addTextareaBtn");
  const fieldsCount = document.getElementById("fields-count");

  // --- IA Settings ---
  const aiApiKey = document.getElementById("aiApiKey");
  const saveAiSettingsBtn = document.getElementById("saveAiSettingsBtn");
  
  // IA Prompts Manager
  const promptPrevBtn = document.getElementById("promptPrevBtn");
  const promptNextBtn = document.getElementById("promptNextBtn");
  const addPromptBtn = document.getElementById("addPromptBtn");
  const deletePromptBtn = document.getElementById("deletePromptBtn");
  const promptNameInput = document.getElementById("promptNameInput");
  const promptModelSelect = document.getElementById("promptModelSelect");
  const aiSystemPrompt = document.getElementById("aiSystemPrompt"); // Content textarea
  const aiVariablesContainer = document.getElementById("aiVariablesContainer");
  const addVariableBtn = document.getElementById("addVariableBtn");

  // --- Settings ---
  const globalVariations = document.getElementById("globalVariations");
  const showFloatingButton = document.getElementById("showFloatingButton");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importInput = document.getElementById("importInput");

  // --- STATE ---
  let allLists = [];
  let formCategories = []; 
  let activeCategoryId = null;
  let activeGroupId = null;
  let currentEditingListId = null;

  // IA State
  let aiSettings = { apiKey: "", prompts: [] };
  let activePromptId = null;

  // --- INIT ---
  initTabs();
  loadData();
  initDragAndDrop(); 

  function initTabs() {
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabButtons.forEach((b) => b.classList.remove("active"));
        tabContents.forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        const targetId = btn.getAttribute("data-tab");
        document.getElementById(targetId).classList.add("active");
      });
    });
  }

  function loadData() {
    chrome.storage.local.get(["lists", "globalOptions", "forms", "formGroups", "formCategories", "aiSettings"], (result) => {
      // 1. Lists
      allLists = result.lists || [];
      const opts = result.globalOptions || { matchVariations: false, showFloatingButton: true };
      globalVariations.checked = opts.matchVariations;
      showFloatingButton.checked = opts.showFloatingButton !== false;
      renderLists();

      // 2. Hierarchy Migration
      if (result.formCategories) {
          formCategories = result.formCategories;
      } else {
          let groupsToMigrate = [];
          if (result.formGroups) {
              groupsToMigrate = result.formGroups;
          } else if (result.forms) {
              groupsToMigrate = [{ id: crypto.randomUUID(), name: "Général", fields: result.forms }];
          }
          if (groupsToMigrate.length === 0) {
              groupsToMigrate = [{ id: crypto.randomUUID(), name: "Nouveau formulaire", fields: [] }];
          }
          formCategories = [{
              id: crypto.randomUUID(),
              name: "Mes Formulaires",
              groups: groupsToMigrate
          }];
          saveData();
      }

      // 3. Initialize UI Selection (Forms)
      if (formCategories.length > 0) {
          if (!activeCategoryId || !formCategories.find(c => c.id === activeCategoryId)) {
              activeCategoryId = formCategories[0].id;
          }
          renderCategoriesUI();
      }

      // 4. IA Settings & Prompts Migration
      if (result.aiSettings) {
          aiSettings = result.aiSettings;
          
          // Migration: string -> array
          if (!aiSettings.prompts) {
              aiSettings.prompts = [{
                  id: crypto.randomUUID(),
                  name: "Défaut",
                  content: aiSettings.systemPrompt || "",
                  model: "gpt-3.5-turbo",
                  variables: []
              }];
              delete aiSettings.systemPrompt; // Cleanup old key if you want, or just ignore
          } else {
              // Ensure variables exist on all prompts
              aiSettings.prompts.forEach(p => {
                  if (!p.variables) p.variables = [];
              });
          }
      } else {
          // Fresh start
          aiSettings = {
              apiKey: "",
              prompts: [{ id: crypto.randomUUID(), name: "Défaut", content: "", model: "gpt-3.5-turbo", variables: [] }]
          };
      }

      // Init AI UI
      aiApiKey.value = aiSettings.apiKey || "";
      if (aiSettings.prompts.length > 0) {
          activePromptId = aiSettings.prompts[0].id; // Default to first
          renderPromptsUI();
      }
    });
  }

  // ==================================================================================
  // --- LOGIQUE IA (Prompts Manager) ---
  // ==================================================================================

  function renderPromptsUI() {
      const activePrompt = aiSettings.prompts.find(p => p.id === activePromptId);
      
      if (!activePrompt) {
          // Fallback if ID invalid (e.g. after deletion)
          if(aiSettings.prompts.length > 0) {
              activePromptId = aiSettings.prompts[0].id;
              renderPromptsUI();
          }
          return;
      }

      // UI Update
      promptNameInput.value = activePrompt.name;
      promptModelSelect.value = activePrompt.model || "gpt-3.5-turbo"; // Default fallback
      aiSystemPrompt.value = activePrompt.content;
      
      renderVariablesUI(activePrompt.variables || []);

      // Nav Buttons
      const multi = aiSettings.prompts.length > 1;
      promptPrevBtn.disabled = !multi;
      promptNextBtn.disabled = !multi;
      deletePromptBtn.disabled = !multi;
      deletePromptBtn.style.opacity = multi ? "1" : "0.5";
  }

  function changePrompt(delta) {
      if (aiSettings.prompts.length <= 1) return;
      let index = aiSettings.prompts.findIndex(p => p.id === activePromptId);
      index += delta;
      
      if (index < 0) index = aiSettings.prompts.length - 1;
      if (index >= aiSettings.prompts.length) index = 0;

      activePromptId = aiSettings.prompts[index].id;
      renderPromptsUI();
  }

  promptPrevBtn.addEventListener("click", () => changePrompt(-1));
  promptNextBtn.addEventListener("click", () => changePrompt(1));

  addPromptBtn.addEventListener("click", () => {
      const name = prompt("Nom du nouveau prompt :", "Nouveau Prompt");
      if (name) {
          const newPrompt = {
              id: crypto.randomUUID(),
              name: name,
              content: "",
              model: "gpt-3.5-turbo"
          };
          aiSettings.prompts.push(newPrompt);
          activePromptId = newPrompt.id;
          saveAiData(); // Save immediately to structure
          renderPromptsUI();
      }
  });

  deletePromptBtn.addEventListener("click", () => {
      if (aiSettings.prompts.length <= 1) return;
      if (confirm("Supprimer ce prompt ?")) {
          aiSettings.prompts = aiSettings.prompts.filter(p => p.id !== activePromptId);
          activePromptId = aiSettings.prompts[0].id;
          saveAiData();
          renderPromptsUI();
      }
  });

  // Inputs Change (Live update model but explicit save via Save Button for API Key)
  // Actually, for prompts structure we can save on change like forms, 
  // but API key is usually explicit. 
  // Let's make "Enregistrer" save EVERYTHING. 
  
  promptNameInput.addEventListener("change", (e) => {
      const p = aiSettings.prompts.find(p => p.id === activePromptId);
      if(p) p.name = e.target.value;
  });

  promptModelSelect.addEventListener("change", (e) => {
      const p = aiSettings.prompts.find(p => p.id === activePromptId);
      if(p) p.model = e.target.value;
  });

  aiSystemPrompt.addEventListener("change", (e) => {
      const p = aiSettings.prompts.find(p => p.id === activePromptId);
      if(p) p.content = e.target.value;
  });

  // --- Variable Management ---

  function syncVariablesState() {
      const p = aiSettings.prompts.find(p => p.id === activePromptId);
      if (!p) return;

      const varCards = aiVariablesContainer.querySelectorAll(".variable-card");
      p.variables = Array.from(varCards).map(card => {
          const name = card.querySelector(".var-name-input").value;
          const optsInputs = card.querySelectorAll(".opt-value-input");
          const options = Array.from(optsInputs).map(input => ({
              label: input.value, // Use value as label too
              value: input.value
          }));
          return { name, options };
      });
  }
  
  function renderVariablesUI(variables) {
      aiVariablesContainer.innerHTML = "";
      variables.forEach((v, vIndex) => {
          const card = document.createElement("div");
          card.className = "variable-card";
          card.style.background = "#fff";
          card.style.border = "1px solid #e2e8f0";
          card.style.borderRadius = "8px";
          card.style.padding = "16px";
          card.style.marginBottom = "16px";
          card.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
          
          // Header: Name + Delete
          const header = document.createElement("div");
          header.style.display = "flex";
          header.style.justifyContent = "space-between";
          header.style.alignItems = "center";
          header.style.marginBottom = "12px";
          header.style.gap = "10px";
          
          const nameInput = document.createElement("input");
          nameInput.type = "text";
          nameInput.placeholder = "Nom du sélecteur (ex: Langue)";
          nameInput.value = v.name || "";
          nameInput.className = "nav-input var-name-input";
          nameInput.style.fontWeight = "600";
          nameInput.style.flex = "1";
          
          const delBtn = document.createElement("button");
          delBtn.className = "btn-icon danger"; // Using existing class or style
          delBtn.innerHTML = '<span class="material-icons">delete</span>';
          delBtn.title = "Supprimer ce sélecteur";
          delBtn.style.color = "#ef4444";
          delBtn.style.background = "none";
          delBtn.style.border = "none";
          delBtn.style.cursor = "pointer";
          delBtn.onclick = () => {
              if(!confirm("Supprimer ce sélecteur ?")) return;
              syncVariablesState(); // Save others
              const p = aiSettings.prompts.find(p => p.id === activePromptId);
              if(p) {
                  p.variables.splice(vIndex, 1);
                  renderVariablesUI(p.variables);
              }
          };
          
          header.append(nameInput, delBtn);
          
          // Options List
          const optionsContainer = document.createElement("div");
          optionsContainer.className = "options-container";
          optionsContainer.style.display = "flex";
          optionsContainer.style.flexDirection = "column";
          optionsContainer.style.gap = "8px";
          
          (v.options || []).forEach((opt, oIndex) => {
              const row = document.createElement("div");
              row.style.display = "flex";
              row.style.alignItems = "center";
              row.style.gap = "8px";
              
              const bullet = document.createElement("span");
              bullet.className = "material-icons";
              bullet.textContent = "subdirectory_arrow_right";
              bullet.style.fontSize = "16px";
              bullet.style.color = "#cbd5e1";

              const valIn = document.createElement("input");
              valIn.placeholder = "Option (ex: Anglais)";
              valIn.value = opt.value || ""; // Use value (we treat label=value)
              valIn.className = "opt-value-input";
              valIn.style.flex = "1";
              valIn.style.padding = "8px";
              valIn.style.border = "1px solid #cbd5e1";
              valIn.style.borderRadius = "6px";
              valIn.style.fontSize = "13px";
              
              const delOpt = document.createElement("button");
              delOpt.innerHTML = '<span class="material-icons">close</span>';
              delOpt.style.color = "#94a3b8";
              delOpt.style.background = "none";
              delOpt.style.border = "none";
              delOpt.style.cursor = "pointer";
              delOpt.onclick = () => {
                   syncVariablesState();
                   const p = aiSettings.prompts.find(p => p.id === activePromptId);
                   if(p && p.variables[vIndex]) {
                       p.variables[vIndex].options.splice(oIndex, 1);
                       renderVariablesUI(p.variables);
                   }
              };
              
              row.append(bullet, valIn, delOpt);
              optionsContainer.appendChild(row);
          });
          
          const addOptBtn = document.createElement("button");
          addOptBtn.className = "btn-text";
          addOptBtn.textContent = "+ Ajouter une option";
          addOptBtn.style.marginTop = "8px";
          addOptBtn.style.color = "#3b82f6";
          addOptBtn.style.background = "none";
          addOptBtn.style.border = "none";
          addOptBtn.style.fontSize = "13px";
          addOptBtn.style.fontWeight = "600";
          addOptBtn.style.cursor = "pointer";
          addOptBtn.style.padding = "4px 0";
          addOptBtn.onclick = () => {
              syncVariablesState();
              const p = aiSettings.prompts.find(p => p.id === activePromptId);
              if(p && p.variables[vIndex]) {
                  if(!p.variables[vIndex].options) p.variables[vIndex].options = [];
                  p.variables[vIndex].options.push({label:"", value:""});
                  renderVariablesUI(p.variables);
              }
          };
          
          card.append(header, optionsContainer, addOptBtn);
          aiVariablesContainer.appendChild(card);
      });
  }

  addVariableBtn.addEventListener("click", () => {
      syncVariablesState();
      const p = aiSettings.prompts.find(p => p.id === activePromptId);
      if(p) {
          if(!p.variables) p.variables = [];
          p.variables.push({name: "", options: [{label:"", value:""}]});
          renderVariablesUI(p.variables);
      }
  });

  function saveAiData() {
      // Internal helper to sync state to storage, usually called by Save Button
      // But we call it for structural changes (add/delete)
      aiSettings.apiKey = aiApiKey.value.trim(); 
      chrome.storage.local.set({ aiSettings: aiSettings });
  }

  saveAiSettingsBtn.addEventListener("click", () => {
      // Explicit Save
      aiSettings.apiKey = aiApiKey.value.trim();
      
      // Ensure current prompt text is synced
      const p = aiSettings.prompts.find(p => p.id === activePromptId);
      if(p) {
          p.name = promptNameInput.value;
          p.content = aiSystemPrompt.value;
          p.model = promptModelSelect.value;
          
          // Scrape Variables from DOM (Final sync)
          syncVariablesState();
      }

      chrome.storage.local.set({ aiSettings: aiSettings }, () => {
          alert("Configuration IA enregistrée !");
      });
  });


  // ==================================================================================
  // --- DRAG AND DROP LOGIC (Vanilla JS) ---
  // ==================================================================================

  function initDragAndDrop() {
      formsContainer.addEventListener("dragstart", (e) => {
          const row = e.target.closest(".form-row");
          if (!row) return;
          row.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", row.dataset.id);
      });

      formsContainer.addEventListener("dragend", (e) => {
          const row = e.target.closest(".form-row");
          if (!row) return;
          row.classList.remove("dragging");
          saveNewOrder(); 
      });

      formsContainer.addEventListener("dragover", (e) => {
          e.preventDefault(); 
          const afterElement = getDragAfterElement(formsContainer, e.clientY);
          const draggable = document.querySelector(".dragging");
          if (!draggable) return;

          if (afterElement == null) {
              formsContainer.appendChild(draggable);
          } else {
              formsContainer.insertBefore(draggable, afterElement);
          }
      });
  }

  function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll(".form-row:not(.dragging)")];

      return draggableElements.reduce((closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = y - box.top - box.height / 2; 
          
          if (offset < 0 && offset > closest.offset) {
              return { offset: offset, element: child };
          } else {
              return closest;
          }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function saveNewOrder() {
      const cat = formCategories.find(c => c.id === activeCategoryId);
      if(!cat) return;
      const grp = cat.groups.find(g => g.id === activeGroupId);
      if(!grp) return;

      const newOrderIds = Array.from(formsContainer.querySelectorAll(".form-row")).map(row => row.dataset.id);
      
      const newFields = [];
      newOrderIds.forEach(id => {
          const field = grp.fields.find(f => f.id === id);
          if (field) newFields.push(field);
      });

      grp.fields = newFields;
      saveData();
  }


  // ==================================================================================
  // --- LOGIQUE HIERARCHIE (Categories > Groups > Fields) ---
  // ==================================================================================

  function saveData() {
      chrome.storage.local.set({ formCategories: formCategories }, () => {
          chrome.storage.local.remove(["forms", "formGroups"]);
          notifyContentScript();
      });
  }

  function notifyContentScript() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, { action: "refresh" }).catch(() => {});
          }
      });
  }

  // --- LEVEL 1: CATEGORIES ---

  function renderCategoriesUI() {
      const catIndex = formCategories.findIndex(c => c.id === activeCategoryId);
      const activeCat = formCategories[catIndex];

      if (!activeCat) return;

      categoryNameInput.value = activeCat.name;

      const multi = formCategories.length > 1;
      catPrevBtn.disabled = !multi;
      catNextBtn.disabled = !multi;
      deleteCategoryBtn.disabled = !multi;
      deleteCategoryBtn.style.opacity = multi ? "1" : "0.5";

      renderGroupsUI(activeCat);
  }

  function changeCategory(delta) {
      if (formCategories.length <= 1) return;
      let index = formCategories.findIndex(c => c.id === activeCategoryId);
      index += delta;
      if (index < 0) index = formCategories.length - 1;
      if (index >= formCategories.length) index = 0;

      activeCategoryId = formCategories[index].id;
      const cat = formCategories[index];
      activeGroupId = (cat.groups.length > 0) ? cat.groups[0].id : null;

      renderCategoriesUI();
  }

  catPrevBtn.addEventListener("click", () => changeCategory(-1));
  catNextBtn.addEventListener("click", () => changeCategory(1));

  addCategoryBtn.addEventListener("click", () => {
      const name = prompt("Nom de la nouvelle catégorie :", "Nouvelle catégorie");
      if (name) {
          const newCat = {
              id: crypto.randomUUID(),
              name: name,
              groups: [{ id: crypto.randomUUID(), name: "Défaut", fields: [] }]
          };
          formCategories.push(newCat);
          activeCategoryId = newCat.id;
          activeGroupId = newCat.groups[0].id;
          saveData();
          renderCategoriesUI();
      }
  });

  categoryNameInput.addEventListener("change", (e) => {
      const cat = formCategories.find(c => c.id === activeCategoryId);
      if (cat) {
          cat.name = e.target.value;
          saveData();
      }
  });

  deleteCategoryBtn.addEventListener("click", () => {
      if (formCategories.length <= 1) return;
      if (confirm("Supprimer cette catégorie et tous ses formulaires ?")) {
          formCategories = formCategories.filter(c => c.id !== activeCategoryId);
          activeCategoryId = formCategories[0].id;
          activeGroupId = formCategories[0].groups.length > 0 ? formCategories[0].groups[0].id : null;
          saveData();
          renderCategoriesUI();
      }
  });


  // --- LEVEL 2: GROUPS (Forms) ---

  function renderGroupsUI(category) {
      if (!category.groups || category.groups.length === 0) {
           groupNameInput.value = "Aucun formulaire";
           groupNameInput.disabled = true;
           groupPrevBtn.disabled = true;
           groupNextBtn.disabled = true;
           deleteGroupBtn.disabled = true;
           renderFields(null);
           return;
      }

      groupNameInput.disabled = false;

      if (!activeGroupId || !category.groups.find(g => g.id === activeGroupId)) {
          activeGroupId = category.groups[0].id;
      }

      const groupIndex = category.groups.findIndex(g => g.id === activeGroupId);
      const activeGroup = category.groups[groupIndex];

      if (activeGroup) {
          groupNameInput.value = activeGroup.name;
          
          const multi = category.groups.length > 1;
          groupPrevBtn.disabled = !multi;
          groupNextBtn.disabled = !multi;
          deleteGroupBtn.disabled = !multi;
          deleteGroupBtn.style.opacity = multi ? "1" : "0.5";
          
          renderFields(activeGroup.fields);
      }
  }

  function changeGroup(delta) {
      const cat = formCategories.find(c => c.id === activeCategoryId);
      if (!cat || cat.groups.length <= 1) return;

      let index = cat.groups.findIndex(g => g.id === activeGroupId);
      index += delta;
      if (index < 0) index = cat.groups.length - 1;
      if (index >= cat.groups.length) index = 0;

      activeGroupId = cat.groups[index].id;
      renderGroupsUI(cat);
  }

  groupPrevBtn.addEventListener("click", () => changeGroup(-1));
  groupNextBtn.addEventListener("click", () => changeGroup(1));

  addGroupBtn.addEventListener("click", () => {
      const cat = formCategories.find(c => c.id === activeCategoryId);
      if(!cat) return;

      const name = prompt("Nom du nouveau formulaire :", "Nouveau formulaire");
      if (name) {
          const newGroup = {
              id: crypto.randomUUID(),
              name: name,
              fields: []
          };
          cat.groups.push(newGroup);
          activeGroupId = newGroup.id;
          saveData();
          renderGroupsUI(cat);
      }
  });

  groupNameInput.addEventListener("change", (e) => {
      const cat = formCategories.find(c => c.id === activeCategoryId);
      if(cat) {
          const grp = cat.groups.find(g => g.id === activeGroupId);
          if(grp) {
              grp.name = e.target.value;
              saveData();
          }
      }
  });

  deleteGroupBtn.addEventListener("click", () => {
      const cat = formCategories.find(c => c.id === activeCategoryId);
      if (!cat || cat.groups.length <= 1) return;

      if (confirm("Supprimer ce formulaire ?")) {
          cat.groups = cat.groups.filter(g => g.id !== activeGroupId);
          activeGroupId = cat.groups[0].id;
          saveData();
          renderGroupsUI(cat);
      }
  });

  // --- LEVEL 3: FIELDS ---

  function renderFields(fields) {
      formsContainer.innerHTML = "";
      
      if (!fields) {
           fieldsCount.textContent = "0";
           formsContainer.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">Sélectionnez ou créez un formulaire.</div>';
           return;
      }

      fieldsCount.textContent = fields.length;

      if (fields.length === 0) {
          formsContainer.innerHTML = '<div style="text-align:center; color:#999; padding:20px;">Aucun champ dans ce formulaire.</div>';
          return;
      }

      fields.forEach((field, index) => {
          const row = document.createElement("div");
          row.dataset.id = field.id; 
          row.setAttribute("draggable", "true"); 

          const handle = document.createElement("div");
          handle.className = "drag-handle";
          handle.innerHTML = '<span class="material-icons">drag_indicator</span>';
          
          if (field.type === 'separator') {
              row.className = "form-row separator-row";
              
              const lineLeft = document.createElement("div");
              lineLeft.className = "separator-line";
              
              const label = document.createElement("span");
              label.className = "separator-label";
              label.textContent = "SÉPARATEUR";

              const lineRight = document.createElement("div");
              lineRight.className = "separator-line";

              const deleteWrapper = document.createElement("div");
              deleteWrapper.className = "delete-btn-wrapper";
              const delBtn = document.createElement("button");
              delBtn.className = "btn-icon danger";
              delBtn.title = "Supprimer le séparateur";
              delBtn.innerHTML = '<span class="material-icons">close</span>';
              delBtn.addEventListener("click", () => deleteField(index));
              deleteWrapper.appendChild(delBtn);

              row.append(handle, lineLeft, label, lineRight, deleteWrapper);

          } else {
              row.className = "form-row";

              const groupLabel = document.createElement("div");
              groupLabel.className = "input-group";
              const labelLabel = document.createElement("label");
              labelLabel.textContent = "Label";
              const inputLabel = document.createElement("input");
              inputLabel.type = "text";
              inputLabel.value = field.label;
              inputLabel.placeholder = "Label";
              inputLabel.addEventListener("change", (e) => updateField(index, "label", e.target.value));
              groupLabel.append(labelLabel, inputLabel);

              const groupValue = document.createElement("div");
              groupValue.className = "input-group";
              const labelValue = document.createElement("label");
              labelValue.textContent = "Valeur";
              
              let inputValue;
              if (field.type === 'textarea') {
                  inputValue = document.createElement("textarea");
                  inputValue.rows = 3;
              } else {
                  inputValue = document.createElement("input");
                  inputValue.type = "text";
              }
              
              inputValue.value = field.value;
              inputValue.placeholder = "Valeur";
              inputValue.addEventListener("change", (e) => updateField(index, "value", e.target.value));
              groupValue.append(labelValue, inputValue);

              const deleteWrapper = document.createElement("div");
              deleteWrapper.className = "delete-btn-wrapper";
              const delBtn = document.createElement("button");
              delBtn.className = "btn-icon danger";
              delBtn.title = "Supprimer le champ";
              delBtn.innerHTML = '<span class="material-icons">delete_outline</span>';
              delBtn.addEventListener("click", () => deleteField(index));
              deleteWrapper.appendChild(delBtn);

              row.append(handle, groupLabel, groupValue, deleteWrapper);
          }
          
          formsContainer.appendChild(row);
      });
  }

  function addField(type) {
      const cat = formCategories.find(c => c.id === activeCategoryId);
      if(cat) {
          const grp = cat.groups.find(g => g.id === activeGroupId);
          if (grp) {
              grp.fields.push({ 
                  id: crypto.randomUUID(), 
                  label: "", 
                  value: "",
                  type: type 
              });
              saveData();
              renderFields(grp.fields);
          }
      }
  }

  addInputBtn.addEventListener("click", () => addField('input'));
  addTextareaBtn.addEventListener("click", () => addField('textarea'));
  addSeparatorBtn.addEventListener("click", () => addField('separator'));

  function updateField(index, key, value) {
      const cat = formCategories.find(c => c.id === activeCategoryId);
      if(cat) {
          const grp = cat.groups.find(g => g.id === activeGroupId);
          if (grp && grp.fields[index]) {
              grp.fields[index][key] = value;
              saveData();
          }
      }
  }

  function deleteField(index) {
      const cat = formCategories.find(c => c.id === activeCategoryId);
      if(cat) {
          const grp = cat.groups.find(g => g.id === activeGroupId);
          if (grp) {
              grp.fields.splice(index, 1);
              saveData();
              renderFields(grp.fields);
          }
      }
  }

  // ==================================================================================
  // --- LOGIQUE LISTES (Legacy) ---
  // ==================================================================================

  function saveGlobalOptions() {
    chrome.storage.local.get(["globalOptions"], (res) => {
      const opts = res.globalOptions || {};
      opts.matchVariations = globalVariations.checked;
      opts.showFloatingButton = showFloatingButton.checked;
      chrome.storage.local.set({ globalOptions: opts }, notifyContentScript);
    });
  }
  globalVariations.addEventListener("change", saveGlobalOptions);
  showFloatingButton.addEventListener("change", saveGlobalOptions);

  addListBtn.addEventListener("click", () => openModal(null));
  cancelEditBtn.addEventListener("click", closeModal);
  saveEditBtn.addEventListener("click", saveList);

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
      toggle.addEventListener("change", () => toggleList(list.id, toggle.checked));
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
    if (idx > -1) { allLists[idx].enabled = enabled; saveAllLists(); }
    renderLists();
  }
  function deleteList(id) {
    if (!confirm("Voulez-vous vraiment supprimer cette liste ?")) return;
    allLists = allLists.filter((l) => l.id !== id);
    saveAllLists();
    renderLists();
  }
  function openModal(id) {
    currentEditingListId = id;
    errorMsg.classList.add("hidden");
    if (id) {
      const list = allLists.find((l) => l.id === id);
      editName.value = list.name;
      editColor.value = list.color;
      editEntries.value = list.entries.join("\n");
    } else {
      editName.value = "Nouvelle liste";
      editColor.value = "#ffe082";
      editEntries.value = "";
    }
    modal.classList.remove("hidden");
  }
  function closeModal() { modal.classList.add("hidden"); }
  function saveList() {
    const name = editName.value.trim();
    const color = editColor.value;
    const rawEntries = editEntries.value.split("\n");
    const entries = rawEntries.map((e) => e.trim()).filter((e) => e !== "");
    if (currentEditingListId) {
      const idx = allLists.findIndex((l) => l.id === currentEditingListId);
      allLists[idx].name = name; allLists[idx].color = color; allLists[idx].entries = entries;
    } else {
      allLists.push({ id: crypto.randomUUID(), name: name, color: color, entries: entries, enabled: true });
    }
    saveAllLists();
    closeModal();
    renderLists();
  }
  function saveAllLists() { chrome.storage.local.set({ lists: allLists }); }


  // --- Import / Export ---
  exportBtn.addEventListener("click", () => {
    chrome.storage.local.get(null, (items) => {
        const backup = {
            version: "1.3",
            timestamp: new Date().toISOString(),
            lists: items.lists || [],
            formCategories: formCategories,
            globalOptions: items.globalOptions || {},
            aiSettings: items.aiSettings || {}
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `spotter-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
  });

  importBtn.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target.result);
              if (confirm(`Remplacer toutes les données ?`)) {
                  let finalCategories = [];
                  if (data.formCategories) finalCategories = data.formCategories;
                  else if (data.formGroups) finalCategories = [{id: crypto.randomUUID(), name: "Import", groups: data.formGroups}];
                  
                  chrome.storage.local.set({
                      lists: data.lists || [],
                      formCategories: finalCategories,
                      globalOptions: data.globalOptions || {},
                      aiSettings: data.aiSettings || {}
                  }, () => {
                      alert("Importation réussie !");
                      location.reload();
                  });
              }
          } catch (err) { alert("Erreur fichier"); }
      };
      reader.readAsText(file);
      importInput.value = "";
  });
});