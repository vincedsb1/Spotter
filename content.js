const HIGHLIGHT_CLASS = "ext-highlighter-span";

// Mapping for accent-insensitive matching
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

/**
 * UI Manager: Handles the floating button and menu inside Shadow DOM
 */
class SpotterUI {
  constructor(highlighter) {
    this.highlighter = highlighter;
    this.shadowRoot = null;
    this.isOpen = false;
    this.init();
  }

  async init() {
    const data = await chrome.storage.local.get("globalOptions");
    // Default to true if not set
    const showButton = data.globalOptions
      ? data.globalOptions.showFloatingButton !== false
      : true;

    // Remove existing if checking again (e.g. option changed)
    const existing = document.getElementById("spotter-ui-host");
    if (existing) existing.remove();

    if (showButton) {
      this.createHost();
    }
  }

  createHost() {
    const host = document.createElement("div");
    host.id = "spotter-ui-host";
    // Position fixed, high z-index, top right
    host.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      width: 0;
      height: 0;
    `;
    document.body.appendChild(host);

    this.shadowRoot = host.attachShadow({ mode: "open" });
    this.render();
  }

  getIconUrl() {
    // Corriger le chemin de l'icône pour utiliser l'image spécifiée.
    // getURL est la bonne méthode pour les chemins d'assets d'extension.
    return chrome.runtime.getURL("icons/web-app-manifest-512x512.png");
  }

  render() {
    const iconUrl = this.getIconUrl();

    const style = `
      <style>
        :host { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }

        .fab {
          position: absolute;
          top: 0;
          right: 0;
          width: 48px;
          height: 48px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
          border: 2px solid transparent;
          overflow: hidden;
        }

        .fab:hover { transform: scale(1.05); }

        .fab.active { border-color: #22c55e; }
        .fab.inactive { border-color: #cbd5e1; filter: grayscale(100%); }

        .fab img {
          width: 48px;
          height: 48px;
          border-radius: 4px;
        }

        .menu {
          position: absolute;
          top: 60px;
          right: 0;
          width: 220px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          padding: 12px;
          display: none;
          flex-direction: column;
          gap: 10px;
        }

        .menu.open { display: flex; }

        .menu-header {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 5px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #333;
        }

        .main-toggle-btn {
          width: 100%;
          padding: 8px;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-on { background: #22c55e; color: white; }
        .btn-on:hover { background: #16a34a; }
        .btn-off { background: #ef4444; color: white; }
        .btn-off:hover { background: #dc2626; }

        .lists-container {
          max-height: 200px;
          overflow-y: auto;
          border-top: 1px solid #f1f5f9;
          padding-top: 8px;
        }

        .list-row {
          display: flex;
          align-items: center;
          padding: 4px 0;
          font-size: 13px;
          color: #333;
        }

        .color-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 8px;
        }

        .list-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Toggle Switch Mini */
        .switch { position: relative; display: inline-block; width: 30px; height: 18px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #3b82f6; }
        input:checked + .slider:before { transform: translateX(12px); }
      </style>
    `;

    const container = document.createElement("div");
    container.innerHTML = `
      ${style}
      <div class="fab ${this.highlighter.isActive ? "active" : "inactive"}" id="spotter-fab" title="Spotter Menu">
        <img src="${iconUrl}" alt="Spotter">
      </div>
      <div class="menu" id="spotter-menu">
        <div class="menu-header">
          Spotter Controls
        </div>
        <button id="main-toggle" class="main-toggle-btn ${this.highlighter.isActive ? "btn-off" : "btn-on"}">
          ${this.highlighter.isActive ? "Désactiver" : "Activer"}
        </button>
        <div class="lists-container" id="lists-rows">
          <!-- Lists go here -->
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(container);
    this.bindEvents();
  }

  bindEvents() {
    const fab = this.shadowRoot.getElementById("spotter-fab");
    const menu = this.shadowRoot.getElementById("spotter-menu");
    const mainToggle = this.shadowRoot.getElementById("main-toggle");

    fab.addEventListener("click", (e) => {
      e.stopPropagation();
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.refreshMenuList();
        menu.classList.add("open");
      } else {
        menu.classList.remove("open");
      }
    });

    document.addEventListener("click", () => {
      if (this.isOpen) {
        this.isOpen = false;
        menu.classList.remove("open");
      }
    });

    menu.addEventListener("click", (e) => e.stopPropagation());

    mainToggle.addEventListener("click", async () => {
      await this.highlighter.toggle();
      this.updateState();
    });
  }

  async refreshMenuList() {
    const listContainer = this.shadowRoot.getElementById("lists-rows");
    const data = await chrome.storage.local.get("lists");
    const lists = data.lists || [];

    listContainer.innerHTML = "";

    if (lists.length === 0) {
      listContainer.innerHTML =
        '<div style="color:#999; text-align:center; padding:5px;">Aucune liste</div>';
      return;
    }

    lists.forEach((list) => {
      const row = document.createElement("div");
      row.className = "list-row";

      const dot = document.createElement("span");
      dot.className = "color-dot";
      dot.style.backgroundColor = list.color;

      const name = document.createElement("span");
      name.className = "list-name";
      name.textContent = list.name;

      const label = document.createElement("label");
      label.className = "switch";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = list.enabled;

      // Handle individual list toggle
      input.onchange = async (e) => {
        const newState = e.target.checked;
        const currentData = await chrome.storage.local.get("lists");
        const currentLists = currentData.lists || [];
        const targetIdx = currentLists.findIndex((l) => l.id === list.id);
        if (targetIdx !== -1) {
          currentLists[targetIdx].enabled = newState;
          await chrome.storage.local.set({ lists: currentLists });
          // Trigger refresh if active
          if (this.highlighter.isActive) {
            this.highlighter.reApply();
          }
        }
      };

      const slider = document.createElement("span");
      slider.className = "slider";

      label.append(input, slider);
      row.append(dot, name, label);
      listContainer.appendChild(row);
    });
  }

  updateState() {
    const fab = this.shadowRoot.getElementById("spotter-fab");
    const mainToggle = this.shadowRoot.getElementById("main-toggle");

    if (this.highlighter.isActive) {
      fab.className = "fab active";
      mainToggle.className = "main-toggle-btn btn-off";
      mainToggle.textContent = "Désactiver";
    } else {
      fab.className = "fab inactive";
      mainToggle.className = "main-toggle-btn btn-on";
      mainToggle.textContent = "Activer";
    }
  }
}

/**
 * Highlighting Engine
 */
class SpotterHighlighter {
  constructor() {
    this.isActive = false;
    this.lists = [];
    this.matchVariations = false;
    this.listProcessors = [];
    this.observer = null;
    this.debounceTimer = null;

    this.ui = new SpotterUI(this); // Initialize UI
    this.listen();
  }

  listen() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "toggle") {
        this.toggle().then(() => {
          if (this.ui.shadowRoot) this.ui.updateState();
        });
      } else if (request.action === "refresh") {
        // If lists changed from Options page, re-init UI and apply if active
        this.ui.init();
        if (this.isActive) this.reApply();
      } else if (request.action === "getState") {
        sendResponse({ isActive: this.isActive });
      }
    });
  }

  async toggle() {
    if (this.isActive) {
      this.stop();
    } else {
      await this.start();
    }
  }

  async start() {
    this.isActive = true;
    await this.loadConfig();
    this.scan(document.body); // Initial scan
    this.observe(); // Start watching for changes
  }

  stop() {
    this.isActive = false;
    this.disconnectObserver();
    this.removeHighlightsDOM();
  }

  async reApply() {
    if (!this.isActive) return;
    this.removeHighlightsDOM();
    await this.loadConfig();
    this.scan(document.body);
  }

  async loadConfig() {
    const data = await chrome.storage.local.get(["lists", "globalOptions"]);
    this.lists = data.lists || [];
    this.matchVariations = data.globalOptions
      ? data.globalOptions.matchVariations
      : false;

    const activeLists = this.lists.filter(
      (l) => l.enabled && l.entries.length > 0,
    );

    this.listProcessors = activeLists
      .map((list) => {
        const validEntries = list.entries.filter(
          (e) => e && e.trim().length > 0,
        );
        if (validEntries.length === 0) return null;

        const patterns = validEntries
          .map((entry) => this.generatePattern(entry))
          .join("|");

        return {
          id: list.id,
          color: list.color,
          // Regex with boundary checks:
          // (?<!\p{L}) : Negative Lookbehind - Ensure NO letter precedes the match
          // (${patterns}) : The match itself
          // (?!\p{L}) : Negative Lookahead - Ensure NO letter follows the match
          // 'u' flag is crucial for \p{L} (Unicode Letters) to work correctly
          regex: new RegExp(`(?<!\\p{L})(${patterns})(?!\\p{L})`, "giu"),
        };
      })
      .filter((p) => p !== null);
  }

  observe() {
    if (this.observer) return;

    this.observer = new MutationObserver((mutations) => {
      if (!this.isActive) return;

      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.scan(document.body);
      }, 500);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  disconnectObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  scan(rootNode) {
    if (this.listProcessors.length === 0) return;

    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node.parentElement) return NodeFilter.FILTER_REJECT;
        const tag = node.parentElement.tagName;
        if (node.parentElement.id === "spotter-ui-host")
          return NodeFilter.FILTER_REJECT;
        if (
          [
            "SCRIPT",
            "STYLE",
            "NOSCRIPT",
            "TEXTAREA",
            "INPUT",
            "SELECT",
          ].includes(tag)
        )
          return NodeFilter.FILTER_REJECT;
        if (node.parentElement.isContentEditable)
          return NodeFilter.FILTER_REJECT;
        if (node.parentElement.classList.contains(HIGHLIGHT_CLASS))
          return NodeFilter.FILTER_REJECT;
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const nodesToProcess = [];
    while (walker.nextNode()) {
      nodesToProcess.push(walker.currentNode);
    }

    nodesToProcess.forEach((node) => this.processNode(node));
  }

  removeHighlightsDOM() {
    const highlights = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
    highlights.forEach((span) => {
      const parent = span.parentNode;
      if (parent) {
        const text = document.createTextNode(span.textContent);
        parent.replaceChild(text, span);
        parent.normalize();
      }
    });
  }

  processNode(textNode) {
    const text = textNode.nodeValue;
    if (!text) return;

    let allMatches = [];

    this.listProcessors.forEach((proc) => {
      let match;
      proc.regex.lastIndex = 0;
      while ((match = proc.regex.exec(text)) !== null) {
        if (match[0].length === 0) {
          proc.regex.lastIndex++;
          continue;
        }
        allMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          length: match[0].length,
          color: proc.color,
        });
      }
    });

    if (allMatches.length === 0) return;

    allMatches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.length - a.length;
    });

    const uniqueMatches = [];
    let lastEnd = 0;

    for (const m of allMatches) {
      if (m.start >= lastEnd) {
        uniqueMatches.push(m);
        lastEnd = m.end;
      }
    }

    for (let i = uniqueMatches.length - 1; i >= 0; i--) {
      const match = uniqueMatches[i];
      try {
        const midNode = textNode.splitText(match.start);
        midNode.splitText(match.length);

        const span = document.createElement("span");
        span.className = HIGHLIGHT_CLASS;
        span.style.backgroundColor = match.color;
        span.textContent = midNode.nodeValue;

        midNode.parentNode.replaceChild(span, midNode);
      } catch (e) {}
    }
  }

  generatePattern(entry) {
    let safeEntry = entry.replace(/[.*+?^${}()|[\\]/g, "\\$&");
    let accentInsensitivePattern = "";

    for (let char of safeEntry) {
      const lower = char.toLowerCase();
      if (ACCENT_MAP[lower] && /[a-z]/i.test(char)) {
        accentInsensitivePattern += ACCENT_MAP[lower];
      } else {
        accentInsensitivePattern += char;
      }
    }

    if (this.matchVariations) {
      return `${accentInsensitivePattern}(?:es|s)?`;
    }
    return accentInsensitivePattern;
  }
}

new SpotterHighlighter();
