const HIGHLIGHT_CLASS = "ext-highlighter-span";

const ACCENT_MAP = {
  a: "[aàáâãäå]",
  c: "[cç]",
  e: "[eèéêë]",
  i: "[iìíîï]",
  n: "[nñ]",
  o: "[oòóôõöø]",
  u: "[uùúûü]",
  y: "[yýÿ]",
  z: "[zž]",
};

class SpotterUI {
  constructor(highlighter) {
    this.highlighter = highlighter;
    this.shadowRoot = null;
    this.isOpen = false;
    this.isLocked = false; 
    this.activeTab = "controls"; 
    
    // Data State
    this.formCategories = [];
    this.aiPrompts = []; 
    this.activeCatIndex = 0;
    this.activeGroupIndex = 0;
    this.activePromptIndex = 0;
    
    this.init();
  }

  async init() {
    const data = await chrome.storage.local.get(["globalOptions", "uiPosition"]);
    const showButton = data.globalOptions
      ? data.globalOptions.showFloatingButton !== false
      : true;

    const existing = document.getElementById("spotter-ui-host");
    if (existing) existing.remove();

    if (showButton) {
      this.createHost(data.uiPosition);
    }
  }

  getIconUrl() {
    return chrome.runtime.getURL("icons/web-app-manifest-512x512.png");
  }

  render() {
    const iconUrl = this.getIconUrl();

    const style = `
      <style>
        :host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box; line-height: 1.5; font-size: 14px; }
        * { box-sizing: border-box; }
        
        /* FAB */
        .fab { position: absolute; top: 0; right: 0; width: 48px; height: 48px; background: white; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s, border-color 0.2s; border: 2px solid transparent; overflow: hidden; user-select: none; z-index: 1000; }
        .fab:hover { transform: scale(1.05); }
        .fab.active { border-color: #22c55e; }
        .fab.inactive { border-color: #cbd5e1; filter: grayscale(100%); }
        .fab.locked { border-color: #f59e0b; background-color: #fffbeb; }
        .fab.locked svg { color: #d97706; }
        .fab img { width: 48px; height: 48px; border-radius: 4px; pointer-events: none; object-fit: cover; }
        .fab svg { width: 24px; height: 24px; color: #64748b; }

        /* Menu Container */
        .menu { 
            position: absolute; 
            top: 60px; 
            right: 0; 
            width: 400px; 
            background: white; 
            border-radius: 12px; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.2); 
            display: none; 
            flex-direction: column; 
            overflow: hidden; 
            z-index: 999; 
            border: 1px solid #e2e8f0;
            
            /* Dynamic Height Logic */
            height: auto;
            max-height: 85vh; /* Safety Cap */
            min-height: 200px;
            transition: height 0.2s ease-out;
        }
        .menu.open { display: flex; }

        /* Header */
        .menu-header-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 8px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            flex-shrink: 0;
        }

        .tabs-header { display: flex; flex: 1; }
        .tab-btn { flex: 1; padding: 12px 8px; border: none; background: none; cursor: pointer; font-size: 13px; font-weight: 600; color: #64748b; transition: all 0.2s; border-bottom: 3px solid transparent; outline: none; }
        .tab-btn:hover { color: #334155; background: #f1f5f9; }
        .tab-btn.active { color: #3b82f6; border-bottom-color: #3b82f6; background: white; }

        .close-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; background: none; cursor: pointer; color: #94a3b8; border-radius: 4px; margin-left: 4px; }
        .close-btn:hover { background: #e2e8f0; color: #ef4444; }

        /* Tab Content */
        .tab-content { 
            padding: 16px; 
            display: none; 
            overflow-y: auto; 
            background: white; 
            flex-grow: 1; 
            min-height: 0; 
            flex-direction: column;
        }
        .tab-content.active { display: flex !important; }

        /* --- Controls & Forms Styles (Condensed for brevity) --- */
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 8px; font-weight: 700; flex-shrink: 0; }
        .main-toggle-btn { width: 100%; padding: 10px; border-radius: 8px; border: none; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; flex-shrink: 0; }
        .btn-on { background: #22c55e; color: white; } .btn-on:hover { background: #16a34a; }
        .btn-off { background: #ef4444; color: white; } .btn-off:hover { background: #dc2626; }
        .lists-container { display: flex; flex-direction: column; gap: 4px; flex-grow: 1; }
        .list-row { display: flex; align-items: center; padding: 8px; background: #f8fafc; border-radius: 6px; border: 1px solid #f1f5f9; }
        .color-dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 12px; border: 1px solid rgba(0,0,0,0.1); }
        .list-name { flex: 1; font-size: 14px; font-weight: 500; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .switch { position: relative; display: inline-block; width: 36px; height: 20px; } .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        input:checked + .slider { background-color: #3b82f6; } input:checked + .slider:before { transform: translateX(16px); }
        .hierarchy-nav { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; flex-shrink: 0; }
        .nav-row { display: flex; align-items: center; justify-content: space-between; padding: 6px; border-radius: 6px; }
        .nav-row.category-row { background: #e2e8f0; color: #334155; } .nav-row.group-row { background: #f1f5f9; color: #475569; }
        .nav-btn { background: none; border: none; cursor: pointer; padding: 2px; color: inherit; display: flex; align-items: center; justify-content: center; opacity: 0.7; }
        .nav-btn:hover { opacity: 1; } .nav-btn:disabled { opacity: 0.3; cursor: default; }
        .nav-title { font-weight: 600; font-size: 12px; text-align: center; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 8px; }
        .forms-container { display: flex; flex-direction: column; gap: 10px; flex-grow: 1; }
        .form-item { display: flex; align-items: center; justify-content: space-between; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; transition: border-color 0.2s; }
        .form-item:hover { border-color: #cbd5e1; }
        .form-item.separator-item { background: transparent; border: none; padding: 5px 0; justify-content: center; flex-shrink: 0; }
        .form-item.separator-item .separator-line { height: 1px; background: #e2e8f0; width: 100%; }
        .form-info { flex: 1; overflow: hidden; margin-right: 12px; min-width: 0; }
        .form-label { display: block; font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 2px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .form-value { display: block; font-size: 14px; color: #1e293b; font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .copy-btn { background: white; border: 1px solid #cbd5e1; border-radius: 6px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: all 0.2s; flex-shrink: 0; }
        .copy-btn:hover { border-color: #3b82f6; color: #3b82f6; background: #eff6ff; }
        .copy-success { color: #22c55e !important; border-color: #22c55e !important; background: #f0fdf4 !important; }

        /* --- AI Tab Styles --- */
        .ai-container { display: flex; flex-direction: column; gap: 12px; flex-grow: 1; min-height: 0; }
        
        .ai-input, .ai-output { 
            width: 100%; 
            padding: 10px; 
            border: 1px solid #cbd5e1; 
            border-radius: 8px; 
            font-family: inherit; 
            font-size: 14px; 
            resize: none; 
            box-sizing: border-box; 
        }
        
        .ai-input { height: 80px; flex-shrink: 0; }
        .ai-input:focus { height: 100px; }
        
        /* Removed flex-grow:1 to prevent empty taking space. Use min-height only. */
        .ai-output { 
            background: #f8fafc; 
            color: #334155; 
            min-height: 60px; /* Small default */
            height: auto;
            overflow-y: hidden; /* Hide scroll until max-height logic kicks in via container */
        }
        
        .ai-btn { background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s; flex-shrink: 0; }
        .ai-btn:hover { background: #2563eb; }
        .ai-btn:disabled { background: #94a3b8; cursor: not-allowed; }
        .ai-status { font-size: 12px; color: #ef4444; text-align: center; min-height: 16px; flex-shrink: 0; }
        .nav-row.prompt-row { background: #e0f2fe; color: #1e40af; margin-bottom: 8px; flex-shrink: 0; }
      </style>
    `;

    const container = document.createElement("div");
    container.innerHTML = `
      ${style}
      <div class="fab ${this.highlighter.isActive ? "active" : "inactive"}" id="spotter-fab" title="Ouvrir / Verrouiller">
        <div id="fab-content">
            <img src="${iconUrl}" alt="Spotter" draggable="false">
        </div>
      </div>
      
      <div class="menu" id="spotter-menu">
        <div class="menu-header-bar">
            <div class="tabs-header">
                <button class="tab-btn active" id="tab-btn-controls">Contrôles</button>
                <button class="tab-btn" id="tab-btn-forms">Formulaires</button>
                <button class="tab-btn" id="tab-btn-ai">I.A.</button>
            </div>
            <button class="close-btn" id="menu-close-btn" title="Fermer">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        <!-- CONTROLS TAB -->
        <div class="tab-content active" id="tab-content-controls">
            <button id="main-toggle" class="main-toggle-btn ${this.highlighter.isActive ? "btn-off" : "btn-on"}">
                <span>${this.highlighter.isActive ? "Désactiver" : "Activer"}</span>
            </button>
            <div class="section-title">Vos Listes</div>
            <div class="lists-container" id="lists-rows">
                <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 13px;">Chargement...</div>
            </div>
        </div>

        <!-- FORMS TAB -->
        <div class="tab-content" id="tab-content-forms">
            <div class="hierarchy-nav" id="hierarchy-nav">
                <div class="nav-row category-row">
                    <button class="nav-btn" id="prev-cat-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <span class="nav-title" id="current-cat-title">...</span>
                    <button class="nav-btn" id="next-cat-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                </div>
                <div class="nav-row group-row">
                    <button class="nav-btn" id="prev-group-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <span class="nav-title" id="current-group-title">...</span>
                    <button class="nav-btn" id="next-group-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                </div>
            </div>
            <div class="forms-container" id="forms-rows">
                <div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 13px;">Sélectionnez un groupe</div>
            </div>
        </div>

        <!-- AI TAB -->
        <div class="tab-content" id="tab-content-ai">
            <div class="ai-container">
                <div class="nav-row prompt-row" id="prompt-nav">
                    <button class="nav-btn" id="prev-prompt-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <span class="nav-title" id="current-prompt-title">...</span>
                    <button class="nav-btn" id="next-prompt-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                </div>

                <div class="section-title">Entrée</div>
                <textarea id="ai-input" class="ai-input" placeholder="Entrez vos données ici..."></textarea>
                
                <button id="ai-generate-btn" class="ai-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
                    Générer
                </button>
                <div id="ai-status" class="ai-status"></div>

                <div class="section-title">Résultat</div>
                <textarea id="ai-output" class="ai-output" placeholder="La réponse apparaîtra ici..." readonly></textarea>
            </div>
        </div>

      </div>
    `;

    this.shadowRoot.appendChild(container);
    this.bindEvents();
  }

  bindEvents() {
    const fab = this.shadowRoot.getElementById("spotter-fab");
    const menu = this.shadowRoot.getElementById("spotter-menu");
    const closeBtn = this.shadowRoot.getElementById("menu-close-btn");
    const mainToggle = this.shadowRoot.getElementById("main-toggle");
    
    // Tabs
    const btnControls = this.shadowRoot.getElementById("tab-btn-controls");
    const btnForms = this.shadowRoot.getElementById("tab-btn-forms");
    const btnAi = this.shadowRoot.getElementById("tab-btn-ai");
    
    const contentControls = this.shadowRoot.getElementById("tab-content-controls");
    const contentForms = this.shadowRoot.getElementById("tab-content-forms");
    const contentAi = this.shadowRoot.getElementById("tab-content-ai");

    const switchTab = (tab) => {
        this.activeTab = tab;
        
        btnControls.classList.toggle("active", tab === "controls");
        btnForms.classList.toggle("active", tab === "forms");
        btnAi.classList.toggle("active", tab === "ai");

        contentControls.classList.toggle("active", tab === "controls");
        contentForms.classList.toggle("active", tab === "forms");
        contentAi.classList.toggle("active", tab === "ai");

        if (this.isOpen) this.adjustMenuConstraints();
    };

    btnControls.addEventListener("click", (e) => { e.stopPropagation(); switchTab("controls"); });
    btnForms.addEventListener("click", (e) => { e.stopPropagation(); switchTab("forms"); });
    btnAi.addEventListener("click", (e) => { e.stopPropagation(); switchTab("ai"); });

    // AI Logic
    const aiBtn = this.shadowRoot.getElementById("ai-generate-btn");
    const aiInput = this.shadowRoot.getElementById("ai-input");
    const aiOutput = this.shadowRoot.getElementById("ai-output");
    const aiStatus = this.shadowRoot.getElementById("ai-status");

    this.shadowRoot.getElementById("prev-prompt-btn").addEventListener("click", (e) => { e.stopPropagation(); this.changePrompt(-1); });
    this.shadowRoot.getElementById("next-prompt-btn").addEventListener("click", (e) => { e.stopPropagation(); this.changePrompt(1); });

    aiBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const text = aiInput.value.trim();
        if(!text) return;
        const currentPrompt = this.aiPrompts[this.activePromptIndex];
        const promptContent = currentPrompt ? currentPrompt.content : "";
        aiBtn.disabled = true;
        aiBtn.innerHTML = "Génération...";
        aiStatus.textContent = "";
        
        // Reset height before generating
        aiOutput.value = "";
        aiOutput.style.height = "60px";

        chrome.runtime.sendMessage({ action: "askAI", text: text, promptContent: promptContent }, (response) => {
            aiBtn.disabled = false;
            aiBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg> Générer`;
            if (chrome.runtime.lastError) { aiStatus.textContent = "Erreur extension."; return; }
            if (response.error) { aiStatus.textContent = response.error; } else { 
                aiOutput.value = response.result;
                // Auto-Resize Logic
                aiOutput.style.height = "auto";
                const newHeight = Math.min(aiOutput.scrollHeight, 600); // 600px max arbitrary for inner el
                aiOutput.style.height = newHeight + "px";
            }
        });
    });

    this.shadowRoot.getElementById("prev-cat-btn").addEventListener("click", (e) => { e.stopPropagation(); this.changeCat(-1); });
    this.shadowRoot.getElementById("next-cat-btn").addEventListener("click", (e) => { e.stopPropagation(); this.changeCat(1); });
    this.shadowRoot.getElementById("prev-group-btn").addEventListener("click", (e) => { e.stopPropagation(); this.changeGroup(-1); });
    this.shadowRoot.getElementById("next-group-btn").addEventListener("click", (e) => { e.stopPropagation(); this.changeGroup(1); });

    fab.addEventListener("click", (e) => {
      e.stopPropagation(); 
      if (!this.isOpen) {
          this.isOpen = true;
          this.isLocked = false; 
          this.refreshUI();
          menu.classList.add("open");
          this.adjustMenuConstraints();
      } else {
          this.toggleLock();
      }
      this.updateFabVisuals();
    });

    closeBtn.addEventListener("click", (e) => { e.stopPropagation(); this.closeMenu(); });
    this.setupLongPressDrag(fab);
    document.addEventListener("click", () => { if (this.isOpen && !this.isLocked) { this.closeMenu(); } });
    menu.addEventListener("click", (e) => e.stopPropagation());
    mainToggle.addEventListener("click", async () => { await this.highlighter.toggle(); this.updateState(); });
  }

  // Adjusted Logic: Simply cap max-height via CSS calc based on viewport
  adjustMenuConstraints() {
      const menu = this.shadowRoot.getElementById("spotter-menu");
      const fab = this.shadowRoot.getElementById("spotter-fab");
      if(!menu || !fab) return;
      
      const rect = fab.getBoundingClientRect();
      // Calculate how much space is available below the FAB
      // We reserve 20px bottom margin
      const availableHeight = window.innerHeight - (rect.top + 60) - 20;
      
      // If there is very little space below (<300px), we might want to default to standard behavior or implement flip logic
      // For now, let's just ensure we respect the viewport bottom
      if (availableHeight > 200) {
          menu.style.maxHeight = `${availableHeight}px`;
      } else {
          menu.style.maxHeight = `calc(100vh - 100px)`; // Fallback constraint
      }
  }

  closeMenu() { this.isOpen = false; this.isLocked = false; this.shadowRoot.getElementById("spotter-menu").classList.remove("open"); this.updateFabVisuals(); }
  toggleLock() { this.isLocked = !this.isLocked; }
  updateFabVisuals() {
      const fab = this.shadowRoot.getElementById("spotter-fab");
      const content = this.shadowRoot.getElementById("fab-content");
      const iconUrl = this.getIconUrl();
      if (this.isLocked) { fab.classList.add("locked"); content.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`; } 
      else { fab.classList.remove("locked"); content.innerHTML = `<img src="${iconUrl}" alt="Spotter" draggable="false">`; }
  }

  createHost(position) {
    const host = document.createElement("div");
    host.id = "spotter-ui-host";
    let top = 20; let right = 20;
    if (position) {
      if (typeof position.top === 'number' && !isNaN(position.top)) top = position.top;
      if (typeof position.right === 'number' && !isNaN(position.right)) right = position.right;
      const winW = window.innerWidth; const winH = window.innerHeight;
      if (top < 0 || top > winH - 50) top = 20; if (right < 0 || right > winW - 50) right = 20;
    }
    host.style.cssText = `position: fixed; top: ${top}px; right: ${right}px; z-index: 2147483647; width: 0; height: 0;`;
    document.body.appendChild(host);
    this.shadowRoot = host.attachShadow({ mode: "open" });
    this.render();
  }

  setupLongPressDrag(el) {
    const LONG_PRESS_THRESHOLD = 300; 
    let pressTimer; let isLongPress = false; let startX, startY, startTop, startRight;
    const host = document.getElementById("spotter-ui-host");
    const onMouseMove = (e) => {
      const deltaX = e.clientX - startX; const deltaY = e.clientY - startY;
      if (!isLongPress && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) { clearTimeout(pressTimer); return; }
      if (isLongPress) { host.style.right = `${startRight - deltaX}px`; host.style.top = `${startTop + deltaY}px`; }
    };
    const onMouseUp = (e) => {
      clearTimeout(pressTimer); document.removeEventListener("mousemove", onMouseMove); document.removeEventListener("mouseup", onMouseUp);
      el.style.cursor = ""; 
      if (isLongPress) {
        const style = window.getComputedStyle(host);
        const newPos = { top: parseInt(style.top, 10), right: parseInt(style.right, 10), };
        chrome.storage.local.set({ uiPosition: newPos });
        this.adjustMenuConstraints(); // Recalc height on drop
      }
      isLongPress = false; 
    };
    el.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return; 
      startX = e.clientX; startY = e.clientY; isLongPress = false;
      const style = window.getComputedStyle(host);
      startTop = parseInt(style.top, 10) || 0; startRight = parseInt(style.right, 10) || 0;
      pressTimer = setTimeout(() => { isLongPress = true; el.style.cursor = "grabbing"; document.addEventListener("mousemove", onMouseMove); document.addEventListener("mouseup", onMouseUp); }, LONG_PRESS_THRESHOLD);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  async refreshUI() {
    const data = await chrome.storage.local.get(["lists", "formCategories", "aiSettings"]);
    this.renderLists(data.lists || []);
    this.formCategories = data.formCategories || [];
    if (this.activeCatIndex >= this.formCategories.length) this.activeCatIndex = 0;
    this.aiPrompts = (data.aiSettings && data.aiSettings.prompts) ? data.aiSettings.prompts : [];
    if (this.activePromptIndex >= this.aiPrompts.length) this.activePromptIndex = 0;
    this.refreshFormsView();
    this.refreshAIView();
  }

  changeCat(delta) {
      if (this.formCategories.length <= 1) return;
      this.activeCatIndex += delta;
      if (this.activeCatIndex < 0) this.activeCatIndex = this.formCategories.length - 1;
      if (this.activeCatIndex >= this.formCategories.length) this.activeCatIndex = 0;
      this.activeGroupIndex = 0; 
      this.refreshFormsView();
  }

  changeGroup(delta) {
      const currentCat = this.formCategories[this.activeCatIndex];
      if (!currentCat || !currentCat.groups || currentCat.groups.length <= 1) return;
      this.activeGroupIndex += delta;
      if (this.activeGroupIndex < 0) this.activeGroupIndex = currentCat.groups.length - 1;
      if (this.activeGroupIndex >= currentCat.groups.length) this.activeGroupIndex = 0;
      this.refreshFormsView();
  }

  changePrompt(delta) {
      if (this.aiPrompts.length <= 1) return;
      this.activePromptIndex += delta;
      if (this.activePromptIndex < 0) this.activePromptIndex = this.aiPrompts.length - 1;
      if (this.activePromptIndex >= this.aiPrompts.length) this.activePromptIndex = 0;
      this.refreshAIView();
  }

  refreshAIView() {
      const titleEl = this.shadowRoot.getElementById("current-prompt-title");
      const prevBtn = this.shadowRoot.getElementById("prev-prompt-btn");
      const nextBtn = this.shadowRoot.getElementById("next-prompt-btn");
      if (this.aiPrompts.length === 0) { titleEl.textContent = "Aucun prompt"; prevBtn.disabled = nextBtn.disabled = true; return; }
      const currentPrompt = this.aiPrompts[this.activePromptIndex];
      titleEl.textContent = currentPrompt.name;
      const multi = this.aiPrompts.length > 1;
      prevBtn.disabled = nextBtn.disabled = !multi;
  }

  refreshFormsView() {
      const catTitle = this.shadowRoot.getElementById("current-cat-title");
      const groupTitle = this.shadowRoot.getElementById("current-group-title");
      const container = this.shadowRoot.getElementById("forms-rows");
      const prevCat = this.shadowRoot.getElementById("prev-cat-btn");
      const nextCat = this.shadowRoot.getElementById("next-cat-btn");
      const prevGroup = this.shadowRoot.getElementById("prev-group-btn");
      const nextGroup = this.shadowRoot.getElementById("next-group-btn");
      if (this.formCategories.length === 0) {
          catTitle.textContent = "Aucune catégorie"; groupTitle.textContent = "-";
          container.innerHTML = '<div style="color:#94a3b8; text-align:center; padding:15px; font-size:13px;">Rien à afficher</div>';
          prevCat.disabled = nextCat.disabled = prevGroup.disabled = nextGroup.disabled = true; return;
      }
      const currentCat = this.formCategories[this.activeCatIndex];
      catTitle.textContent = currentCat.name;
      const multiCat = this.formCategories.length > 1;
      prevCat.disabled = nextCat.disabled = !multiCat;
      if (!currentCat.groups || currentCat.groups.length === 0) {
          groupTitle.textContent = "Aucun formulaire";
          container.innerHTML = '<div style="color:#94a3b8; text-align:center; padding:15px; font-size:13px;">Catégorie vide</div>';
          prevGroup.disabled = nextGroup.disabled = true; return;
      }
      if (this.activeGroupIndex >= currentCat.groups.length) this.activeGroupIndex = 0;
      const currentGroup = currentCat.groups[this.activeGroupIndex];
      groupTitle.textContent = currentGroup.name;
      const multiGroup = currentCat.groups.length > 1;
      prevGroup.disabled = nextGroup.disabled = !multiGroup;
      container.innerHTML = "";
      const validFields = (currentGroup.fields || []).filter(f => f.label || f.value || f.type === 'separator');
      if (validFields.length === 0) { container.innerHTML = '<div style="color:#94a3b8; text-align:center; padding:15px; font-size:13px;">Formulaire vide</div>'; return; }
      validFields.forEach(form => {
        const item = document.createElement("div");
        if (form.type === 'separator') { item.className = "form-item separator-item"; const line = document.createElement("div"); line.className = "separator-line"; item.appendChild(line); } 
        else {
            item.className = "form-item"; const info = document.createElement("div"); info.className = "form-info";
            const label = document.createElement("span"); label.className = "form-label"; label.textContent = form.label || "Sans titre";
            const value = document.createElement("span"); value.className = "form-value"; value.textContent = form.value;
            info.append(label, value);
            const copyBtn = document.createElement("button"); copyBtn.className = "copy-btn";
            copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
            copyBtn.onclick = (e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(form.value).then(() => {
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                    copyBtn.classList.add("copy-success");
                    setTimeout(() => { copyBtn.innerHTML = originalHTML; copyBtn.classList.remove("copy-success"); }, 1500);
                });
            };
            item.append(info, copyBtn);
        }
        container.appendChild(item);
      });
  }

  renderLists(lists) {
    const listContainer = this.shadowRoot.getElementById("lists-rows");
    listContainer.innerHTML = "";
    if (lists.length === 0) { listContainer.innerHTML = '<div style="color:#94a3b8; text-align:center; padding:15px; font-size:13px;">Aucune liste active</div>'; return; }
    lists.forEach((list) => {
      const row = document.createElement("div"); row.className = "list-row";
      const dot = document.createElement("span"); dot.className = "color-dot"; dot.style.backgroundColor = list.color;
      const name = document.createElement("span"); name.className = "list-name"; name.textContent = list.name;
      const label = document.createElement("label"); label.className = "switch";
      const input = document.createElement("input"); input.type = "checkbox"; input.checked = list.enabled;
      input.onchange = async (e) => {
        const newState = e.target.checked; const currentData = await chrome.storage.local.get("lists"); const currentLists = currentData.lists || [];
        const targetIdx = currentLists.findIndex((l) => l.id === list.id);
        if (targetIdx !== -1) { currentLists[targetIdx].enabled = newState; await chrome.storage.local.set({ lists: currentLists }); if (this.highlighter.isActive) { this.highlighter.reApply(); } }
      };
      const slider = document.createElement("span"); slider.className = "slider";
      label.append(input, slider); row.append(dot, name, label); listContainer.appendChild(row);
    });
  }
  updateState() {
    const fab = this.shadowRoot.getElementById("spotter-fab"); const mainToggle = this.shadowRoot.getElementById("main-toggle"); const toggleText = mainToggle.querySelector('span');
    if (this.highlighter.isActive) { fab.className = "fab active"; mainToggle.className = "main-toggle-btn btn-off"; if(toggleText) toggleText.textContent = "Désactiver"; } 
    else { fab.className = "fab inactive"; mainToggle.className = "main-toggle-btn btn-on"; if(toggleText) toggleText.textContent = "Activer"; }
  }
}

class SpotterHighlighter {
  constructor() {
    this.isActive = false; this.lists = []; this.matchVariations = false; this.listProcessors = []; this.observer = null; this.debounceTimer = null;
    this.ui = new SpotterUI(this); 
    this.restoreState(); this.listen(); this.listenStorage();
  }
  listen() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "toggle") { this.toggle(); } 
      else if (request.action === "refresh") { this.ui.init(); if (this.isActive) this.reApply(); } 
      else if (request.action === "getState") { sendResponse({ isActive: this.isActive }); }
    });
  }
  listenStorage() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.extensionEnabled) {
        if (changes.extensionEnabled.newValue) { if (!this.isActive) { this.start().then(() => this.ui.updateState()); } } 
        else { if (this.isActive) { this.stop(); this.ui.updateState(); } } 
      }
    });
  }
  async restoreState() { const data = await chrome.storage.local.get("extensionEnabled"); if (data.extensionEnabled) { await this.start(); this.ui.updateState(); } }
  async toggle() { await chrome.storage.local.set({ extensionEnabled: !this.isActive }); }
  async start() { this.isActive = true; await this.loadConfig(); this.scan(document.body); this.observe(); }
  stop() { this.isActive = false; this.disconnectObserver(); this.removeHighlightsDOM(); }
  async reApply() { if (!this.isActive) return; this.removeHighlightsDOM(); await this.loadConfig(); this.scan(document.body); }
  async loadConfig() {
    const data = await chrome.storage.local.get(["lists", "globalOptions"]);
    this.lists = data.lists || [];
    this.matchVariations = data.globalOptions ? data.globalOptions.matchVariations : false;
    const activeLists = this.lists.filter((l) => l.enabled && l.entries.length > 0);
    this.listProcessors = activeLists.map((list) => {
        const validEntries = list.entries.filter((e) => e && e.trim().length > 0);
        if (validEntries.length === 0) return null;
        const patterns = validEntries.map((entry) => this.generatePattern(entry)).join("|");
        return { id: list.id, color: list.color, regex: new RegExp(`(?<!\\p{L})(${patterns})(?!\\p{L})`, "giu") };
      }).filter((p) => p !== null);
  }
  observe() {
    if (this.observer) return;
    this.observer = new MutationObserver((mutations) => { if (!this.isActive) return; clearTimeout(this.debounceTimer); this.debounceTimer = setTimeout(() => { this.scan(document.body); }, 500); });
    this.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  disconnectObserver() { if (this.observer) { this.observer.disconnect(); this.observer = null; } }
  scan(rootNode) {
    if (this.listProcessors.length === 0) return;
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        const tag = node.parentElement.tagName;
        if (node.parentElement.id === "spotter-ui-host") return NodeFilter.FILTER_REJECT;
        if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT"].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.isContentEditable) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.classList.contains(HIGHLIGHT_CLASS)) return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodesToProcess = []; while (walker.nextNode()) { nodesToProcess.push(walker.currentNode); }
    nodesToProcess.forEach((node) => this.processNode(node));
  }
  removeHighlightsDOM() { const highlights = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`); highlights.forEach((span) => { const parent = span.parentNode; if (parent) { const text = document.createTextNode(span.textContent); parent.replaceChild(text, span); parent.normalize(); } }); }
  processNode(textNode) {
    const text = textNode.nodeValue; if (!text) return;
    let allMatches = [];
    this.listProcessors.forEach((proc) => {
      let match; proc.regex.lastIndex = 0;
      while ((match = proc.regex.exec(text)) !== null) {
        if (match[0].length === 0) { proc.regex.lastIndex++; continue; }
        allMatches.push({ start: match.index, end: match.index + match[0].length, length: match[0].length, color: proc.color });
      }
    });
    if (allMatches.length === 0) return;
    allMatches.sort((a, b) => { if (a.start !== b.start) return a.start - b.start; return b.length - a.length; });
    const uniqueMatches = []; let lastEnd = 0;
    for (const m of allMatches) { if (m.start >= lastEnd) { uniqueMatches.push(m); lastEnd = m.end; } }
    for (let i = uniqueMatches.length - 1; i >= 0; i--) {
      const match = uniqueMatches[i];
      try { const midNode = textNode.splitText(match.start); midNode.splitText(match.length); const span = document.createElement("span"); span.className = HIGHLIGHT_CLASS; span.style.backgroundColor = match.color; span.textContent = midNode.nodeValue; midNode.parentNode.replaceChild(span, midNode); } catch (e) {}
    }
  }
  generatePattern(entry) {
    let safeEntry = entry.replace(/[.*+?^${}()|[\\]/g, "\\$&amp;"); let accentInsensitivePattern = "";
    for (let char of safeEntry) { const lower = char.toLowerCase(); if (ACCENT_MAP[lower] && /[a-z]/i.test(char)) { accentInsensitivePattern += ACCENT_MAP[lower]; } else { accentInsensitivePattern += char; } } 
    if (this.matchVariations) { return `${accentInsensitivePattern}(?:es|s)?`; } return accentInsensitivePattern;
  }
}
new SpotterHighlighter();
