/**
 * State Manager for Cake Web Builder
 * Handles JSON state structure, selections, breakpoints, event emission, and undo/redo history.
 */

const DEFAULT_DOCUMENT = {
  version: "1.0",
  globals: {
    colors: [
      { id: "color-primary", name: "Primary Color", value: "#635bff" },
      { id: "color-secondary", name: "Secondary Color", value: "#3898ec" },
      { id: "color-dark", name: "Dark Text", value: "#111111" }
    ],
    fonts: [
      { id: "font-primary", name: "Primary Font", value: "system-ui, -apple-system, sans-serif" },
      { id: "font-secondary", name: "Secondary Font", value: "Georgia, serif" }
    ]
  },
  dynamicData: {},
  classes: {
    "w-container": {
      desktop: {
        "max-width": "1200px",
        "margin-left": "auto",
        "margin-right": "auto",
        "padding-left": "15px",
        "padding-right": "15px"
      },
      tablet: {
        "max-width": "720px"
      },
      mobile: {
        "max-width": "100%",
        "padding-left": "10px",
        "padding-right": "10px"
      }
    },
    "w-button": {
      desktop: {
        "display": "inline-block",
        "padding": "9px 15px",
        "background-color": "#3898EC",
        "color": "white",
        "border-style": "none",
        "text-decoration": "none",
        "border-radius": "4px",
        "cursor": "pointer"
      }
    }
  },
  tree: {
    id: "root",
    tag: "div",
    classes: ["body-root"],
    styles: {
      desktop: {
        "min-height": "100vh",
        "font-family": "system-ui, -apple-system, sans-serif",
        "background-color": "#ffffff",
        "color": "#333333",
        "margin": "0px",
        "padding": "20px"
      }
    },
    children: [
      {
        id: "hero-sec",
        tag: "section",
        classes: [],
        styles: {
          desktop: {
            "display": "flex",
            "flex-direction": "column",
            "align-items": "center",
            "justify-content": "center",
            "padding": "80px 20px",
            "background-color": "#f8f9fa",
            "border-radius": "12px",
            "margin-bottom": "30px"
          }
        },
        children: [
          {
            id: "hero-h1",
            tag: "h1",
            textContent: "Welcome to Cake Page Builder",
            classes: [],
            styles: {
              desktop: {
                "font-family": "var(--font-primary)",
                "font-size": "44px",
                "color": "#111111",
                "margin-bottom": "15px",
                "text-align": "center",
                "font-weight": "700"
              },
              mobile: {
                "font-size": "32px"
              }
            },
            children: []
          },
          {
            id: "hero-p",
            tag: "p",
            textContent: "Core JavaScript web page designer. Fully JSON driven, highly scalable, and custom styled. Double click this text to edit inline!",
            classes: [],
            styles: {
              desktop: {
                "font-family": "var(--font-secondary)",
                "font-size": "18px",
                "color": "#666666",
                "max-width": "600px",
                "text-align": "center",
                "line-height": "1.6",
                "margin-bottom": "25px"
              }
            },
            children: []
          },
          {
            id: "hero-btn",
            tag: "button",
            textContent: "Get Started Now",
            classes: ["w-button"],
            styles: {
              desktop: {
                "padding": "12px 28px",
                "font-size": "16px",
                "background-color": "#635bff"
              }
            },
            children: []
          }
        ]
      }
    ]
  }
};

class StateManager {
  constructor() {
    this.doc = JSON.parse(JSON.stringify(DEFAULT_DOCUMENT));
    this.selectedNodeId = null;
    this.activeClass = null; // If null, style targets elements directly (inline styling)
    this.breakpoint = "desktop"; // "desktop" | "tablet" | "mobile"
    this.activeState = "normal"; // "normal" | "hover" | "active" | "focus"
    this.previewMode = false;
    
    // Undo/Redo stacks
    this.undoStack = [];
    this.redoStack = [];
    this.historyLimit = 50;

    // Listeners
    this.listeners = {
      change: [],          // Triggered on any modifications (tree, style, class)
      selectionChange: [], // Selection changed
      breakpointChange: [],// Breakpoint view toggled
      previewToggle: []    // Preview mode toggled
    };

    // Plugin registries
    this.plugins = new Map();
    this.uiExtensions = {
      'topbar-left': [],
      'topbar-right': [],
      'leftbar-tabs': [],
      'leftbar-panels': [],
      'rightbar-tabs': [],
      'rightbar-panels': [],
      'canvas-overlays': []
    };

    this.activeInsertTarget = null;

    // Save initial state to history
    this.saveHistory();
  }

  // Subscribe to changes
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Emit event
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  registerPlugin(plugin) {
    if (this.plugins.has(plugin.id)) return;
    this.plugins.set(plugin.id, plugin);
    plugin.install(this);
    this.emit('pluginInstalled', plugin);
  }

  registerUiExtension(slot, extension) {
    if (this.uiExtensions[slot]) {
      this.uiExtensions[slot].push(extension);
      this.emit('uiExtensionAdded', { slot, extension });
    }
  }

  setInsertTarget(id, position) {
    this.activeInsertTarget = { id, position };
    this.emit('insertTargetChange', this.activeInsertTarget);
  }

  clearInsertTarget() {
    this.activeInsertTarget = null;
    this.emit('insertTargetChange', null);
  }

  // History management
  saveHistory() {
    // Keep a clone of the doc tree, classes, globals, and dynamicData state
    const stateSnapshot = JSON.stringify({
      classes: this.doc.classes,
      tree: this.doc.tree,
      globals: this.doc.globals,
      dynamicData: this.doc.dynamicData
    });

    // Avoid duplicating the current head state
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === stateSnapshot) {
      return;
    }

    this.undoStack.push(stateSnapshot);
    if (this.undoStack.length > this.historyLimit) {
      this.undoStack.shift();
    }
    
    // Clear redo on new action
    this.redoStack = [];
    
    this.emit("change", this.doc);
  }

  undo() {
    if (this.undoStack.length <= 1) return; // Need at least initial state

    const current = this.undoStack.pop();
    this.redoStack.push(current);

    const prevSnapshot = this.undoStack[this.undoStack.length - 1];
    const parsed = JSON.parse(prevSnapshot);
    
    this.doc.tree = parsed.tree;
    this.doc.classes = parsed.classes;
    this.doc.globals = parsed.globals || { colors: [], fonts: [] };
    this.doc.dynamicData = parsed.dynamicData || {};
    
    // Check if selectedNode still exists
    if (this.selectedNodeId && !this.findNode(this.selectedNodeId)) {
      this.selectedNodeId = null;
      this.emit("selectionChange", null);
    }
    
    this.emit("change", this.doc);
  }

  redo() {
    if (this.redoStack.length === 0) return;

    const nextSnapshot = this.redoStack.pop();
    this.undoStack.push(nextSnapshot);

    const parsed = JSON.parse(nextSnapshot);
    this.doc.tree = parsed.tree;
    this.doc.classes = parsed.classes;
    this.doc.globals = parsed.globals || { colors: [], fonts: [] };
    this.doc.dynamicData = parsed.dynamicData || {};

    // Check if selectedNode still exists
    if (this.selectedNodeId && !this.findNode(this.selectedNodeId)) {
      this.selectedNodeId = null;
      this.emit("selectionChange", null);
    }

    this.emit("change", this.doc);
  }

  get canUndo() {
    return this.undoStack.length > 1;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  // Load / Export state
  loadJsonState(jsonString) {
    try {
      const stateObj = JSON.parse(jsonString);
      if (!stateObj.tree || typeof stateObj.tree !== 'object') {
        throw new Error("Invalid structure: Tree element missing.");
      }
      this.doc.tree = stateObj.tree;
      this.doc.classes = stateObj.classes || {};
      this.doc.globals = stateObj.globals || JSON.parse(JSON.stringify(DEFAULT_DOCUMENT.globals));
      this.doc.dynamicData = stateObj.dynamicData || {};
      
      this.selectedNodeId = null;
      this.activeClass = null;
      
      this.saveHistory();
      this.emit("selectionChange", null);
    } catch (e) {
      console.error(e);
      alert("Error parsing JSON schema: " + e.message);
    }
  }

  exportJsonState() {
    return JSON.stringify(this.doc, null, 2);
  }

  // Global colors CRUD
  addGlobalColor(name, value) {
    if (!this.doc.globals) this.doc.globals = { colors: [], fonts: [] };
    if (!this.doc.globals.colors) this.doc.globals.colors = [];
    const id = 'color-' + Math.random().toString(36).substr(2, 9);
    this.doc.globals.colors.push({ id, name, value });
    this.saveHistory();
    return id;
  }

  updateGlobalColor(id, name, value) {
    if (!this.doc.globals || !this.doc.globals.colors) return;
    const color = this.doc.globals.colors.find(c => c.id === id);
    if (color) {
      if (name !== undefined) color.name = name;
      if (value !== undefined) color.value = value;
      this.saveHistory();
    }
  }

  deleteGlobalColor(id) {
    if (!this.doc.globals || !this.doc.globals.colors) return;
    const index = this.doc.globals.colors.findIndex(c => c.id === id);
    if (index !== -1) {
      this.doc.globals.colors.splice(index, 1);
      this.saveHistory();
    }
  }

  // Global fonts CRUD
  addGlobalFont(name, value) {
    if (!this.doc.globals) this.doc.globals = { colors: [], fonts: [] };
    if (!this.doc.globals.fonts) this.doc.globals.fonts = [];
    const id = 'font-' + Math.random().toString(36).substr(2, 9);
    this.doc.globals.fonts.push({ id, name, value });
    this.saveHistory();
    return id;
  }

  updateGlobalFont(id, name, value) {
    if (!this.doc.globals || !this.doc.globals.fonts) return;
    const font = this.doc.globals.fonts.find(f => f.id === id);
    if (font) {
      if (name !== undefined) font.name = name;
      if (value !== undefined) font.value = value;
      this.saveHistory();
    }
  }

  deleteGlobalFont(id) {
    if (!this.doc.globals || !this.doc.globals.fonts) return;
    const index = this.doc.globals.fonts.findIndex(f => f.id === id);
    if (index !== -1) {
      this.doc.globals.fonts.splice(index, 1);
      this.saveHistory();
    }
  }

  // Dynamic Data operations
  setDynamicData(data) {
    this.doc.dynamicData = data || {};
    this.saveHistory();
  }

  setNodeBinding(nodeId, field, path) {
    const node = this.findNode(nodeId);
    if (node) {
      if (!node.bindings) node.bindings = {};
      node.bindings[field] = path;
      this.saveHistory();
    }
  }

  removeNodeBinding(nodeId, field) {
    const node = this.findNode(nodeId);
    if (node && node.bindings) {
      delete node.bindings[field];
      if (Object.keys(node.bindings).length === 0) {
        delete node.bindings;
      }
      this.saveHistory();
    }
  }

  setNodeLoopSource(nodeId, loopSource) {
    const node = this.findNode(nodeId);
    if (node) {
      node.loopSource = loopSource;
      this.saveHistory();
    }
  }

  removeNodeLoopSource(nodeId) {
    const node = this.findNode(nodeId);
    if (node) {
      delete node.loopSource;
      this.saveHistory();
    }
  }

  // Breakpoint switcher
  setBreakpoint(bp) {
    if (["desktop", "tablet", "mobile"].includes(bp)) {
      this.breakpoint = bp;
      this.emit("breakpointChange", bp);
    }
  }

  // Node Selection
  selectNode(id) {
    this.selectedNodeId = id;
    // Keep active class if the new element has it, otherwise clear active class
    if (id) {
      const node = this.findNode(id);
      if (node && this.activeClass && !node.classes.includes(this.activeClass)) {
        this.activeClass = null;
      }
    } else {
      this.activeClass = null;
    }
    this.emit("selectionChange", id);
  }

  getSelectedNode() {
    return this.selectedNodeId ? this.findNode(this.selectedNodeId) : null;
  }

  setActiveClass(className) {
    this.activeClass = className;
    this.emit("selectionChange", this.selectedNodeId); // Re-emit to trigger panel refresh
  }

  // Node Traversal & Operations
  findNode(id, node = this.doc.tree) {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNode(id, child);
        if (found) return found;
      }
    }
    return null;
  }

  findParent(id, node = this.doc.tree) {
    if (!node.children) return null;
    for (const child of node.children) {
      if (child.id === id) return node;
      const found = this.findParent(id, child);
      if (found) return found;
    }
    return null;
  }

  generateId() {
    return 'el-' + Math.random().toString(36).substr(2, 9);
  }

  // Add Element
  addNode(tag, properties = {}, targetParentId = null) {
    let parentId = targetParentId || this.selectedNodeId || "root";
    let parent = this.findNode(parentId);
    if (!parent) return null;

    // Sibling insert fallback: If parent element is not a container and isn't root,
    // insert as sibling after it instead of nesting child inside it.
    const containerTags = ['div', 'section', 'form'];
    let insertIndex = -1;
    if (parentId !== 'root' && !containerTags.includes(parent.tag.toLowerCase())) {
      const actualParent = this.findParent(parentId);
      if (actualParent) {
        insertIndex = actualParent.children.findIndex(c => c.id === parentId) + 1;
        parent = actualParent;
        parentId = actualParent.id;
      }
    }

    const newNode = {
      id: this.generateId(),
      tag: tag,
      textContent: properties.text || "",
      classes: properties.classes ? [...properties.classes] : [],
      attributes: properties.attributes || {},
      styles: {
        desktop: properties.styles ? {...properties.styles} : {}
      },
      children: []
    };

    // Default typography setup
    const tagLower = tag.toLowerCase();
    if (tagLower === 'h1' || tagLower === 'h2' || tagLower === 'h3' || tagLower === 'h4' || tagLower === 'h5' || tagLower === 'h6') {
      if (!newNode.styles.desktop['font-family']) {
        newNode.styles.desktop['font-family'] = 'var(--font-primary)';
      }
    } else if (tagLower === 'p') {
      if (!newNode.styles.desktop['font-family']) {
        newNode.styles.desktop['font-family'] = 'var(--font-secondary)';
      }
    }

    // Special setup for specific elements
    if (tag === 'img' && properties.src) {
      newNode.attributes.src = properties.src;
    }
    if (tag === 'a' && properties.href) {
      newNode.attributes.href = properties.href;
    }
    if (properties.placeholder) {
      newNode.attributes.placeholder = properties.placeholder;
    }

    if (newNode.classes.includes('cwb-slider')) {
      newNode.attributes['data-autoplay'] = 'true';
      newNode.attributes['data-autoplay-speed'] = '3000';
      newNode.attributes['data-loop'] = 'true';
      newNode.attributes['data-navigation'] = 'both';
      newNode.attributes['data-transition'] = 'slide';
      newNode.attributes['data-height'] = '400px';
      newNode.attributes['data-active-index'] = '0';
      
      newNode.styles.desktop['height'] = '400px';

      for (let i = 1; i <= 2; i++) {
        const slideId = this.generateId();
        const slideNode = {
          id: slideId,
          tag: 'div',
          classes: ['cwb-slide'],
          attributes: {},
          styles: {
            desktop: {
              'background-color': i === 1 ? '#5f5cfd' : '#3898ec',
              'padding': '60px 40px',
              'display': 'flex',
              'flex-direction': 'column',
              'justify-content': 'center',
              'align-items': 'center',
              'min-height': '400px',
              'color': '#ffffff',
              'text-align': 'center',
              'background-size': 'cover',
              'background-position': 'center',
              'background-repeat': 'no-repeat'
            }
          },
          children: [
            {
              id: this.generateId(),
              tag: 'h2',
              classes: ['cwb-slide-title'],
              textContent: `Slide ${i} Heading`,
              styles: {
                desktop: {
                  'color': '#ffffff',
                  'font-size': '36px',
                  'margin-bottom': '15px',
                  'font-family': 'var(--font-primary)'
                }
              },
              children: []
            },
            {
              id: this.generateId(),
              tag: 'p',
              classes: ['cwb-slide-desc'],
              textContent: `This is slide ${i} description. Customize it in the settings panel.`,
              styles: {
                desktop: {
                  'color': '#e0e0e0',
                  'font-size': '16px',
                  'margin-bottom': '25px',
                  'font-family': 'var(--font-secondary)',
                  'max-width': '600px'
                }
              },
              children: []
            },
            {
              id: this.generateId(),
              tag: 'a',
              classes: ['cwb-slide-button', 'w-button'],
              textContent: i === 1 ? 'Learn More' : 'Get Started',
              attributes: {
                href: '#'
              },
              styles: {
                desktop: {
                  'background-color': '#ffffff',
                  'color': i === 1 ? '#5f5cfd' : '#3898ec',
                  'padding': '10px 24px',
                  'border-radius': '4px',
                  'font-weight': '600'
                }
              },
              children: []
            }
          ]
        };
        newNode.children.push(slideNode);
      }
    }

    // Default container styling for Flex
    if (properties.display === 'flex') {
      newNode.styles.desktop.display = 'flex';
      if (newNode.classes.includes('w-flex-col')) {
        newNode.styles.desktop['flex-direction'] = 'column';
      } else {
        newNode.styles.desktop['flex-direction'] = 'row';
      }
      newNode.styles.desktop['align-items'] = 'stretch';
      newNode.styles.desktop['justify-content'] = 'flex-start';
      newNode.styles.desktop['min-height'] = '80px';
      newNode.styles.desktop['padding'] = '10px';
    }

    if (insertIndex !== -1) {
      parent.children.splice(insertIndex, 0, newNode);
    } else {
      parent.children.push(newNode);
    }

    this.saveHistory();
    this.selectNode(newNode.id);
    return newNode;
  }

  updateNodeAnimations(nodeId, animations) {
    const node = this.findNode(nodeId);
    if (node) {
      node.animations = JSON.parse(JSON.stringify(animations));
      this.saveHistory();
    }
  }

  clearStateStyles(stateName) {
    const node = this.getSelectedNode();
    if (!node && !this.activeClass) return;
    
    const prefix = `${stateName}:`;
    
    const clearFromObj = (breakpointStyles) => {
      if (!breakpointStyles) return;
      Object.keys(breakpointStyles).forEach(key => {
        if (key.startsWith(prefix)) {
          delete breakpointStyles[key];
        }
      });
    };
    
    if (this.activeClass) {
      const classStyles = this.doc.classes[this.activeClass];
      if (classStyles) {
        Object.values(classStyles).forEach(clearFromObj);
      }
    } else if (node && node.styles) {
      Object.values(node.styles).forEach(clearFromObj);
    }
    
    this.saveHistory();
  }

  // Delete Element
  deleteNode(id) {
    if (id === "root") return; // Cannot delete root
    
    const parent = this.findParent(id);
    if (!parent) return;

    const index = parent.children.findIndex(child => child.id === id);
    if (index === -1) return;

    parent.children.splice(index, 1);
    
    if (this.selectedNodeId === id) {
      this.selectNode(parent.id);
    }
    this.saveHistory();
  }

  // Move Node (Drag and drop)
  moveNode(nodeId, targetParentId, index) {
    if (nodeId === "root") return;
    
    const node = this.findNode(nodeId);
    const oldParent = this.findParent(nodeId);
    const newParent = this.findNode(targetParentId);
    
    if (!node || !oldParent || !newParent) return;
    
    // Prevent dragging an element into itself or its children
    let temp = newParent;
    while (temp) {
      if (temp.id === nodeId) {
        console.warn("Cannot drag parent element inside its children.");
        return;
      }
      temp = this.findParent(temp.id);
    }

    // Remove from old parent
    const oldIndex = oldParent.children.findIndex(child => child.id === nodeId);
    oldParent.children.splice(oldIndex, 1);

    // Add to new parent
    if (index === -1 || index >= newParent.children.length) {
      newParent.children.push(node);
    } else {
      newParent.children.splice(index, 0, node);
    }

    this.saveHistory();
  }

  // Duplicate Element
  duplicateNode(id) {
    if (id === "root") return;
    const parent = this.findParent(id);
    const node = this.findNode(id);
    if (!parent || !node) return;

    const cloneNode = (n) => {
      const cloned = JSON.parse(JSON.stringify(n));
      cloned.id = this.generateId();
      if (cloned.children) {
        cloned.children = cloned.children.map(child => cloneNode(child));
      }
      return cloned;
    };

    const cloned = cloneNode(node);
    const index = parent.children.findIndex(child => child.id === id);
    parent.children.splice(index + 1, 0, cloned);
    
    this.saveHistory();
    this.selectNode(cloned.id);
  }

  // Edit Styles
  updateStyle(property, value) {
    const node = this.getSelectedNode();
    if (!node && !this.activeClass) return;

    const activeState = this.activeState || "normal";
    const key = activeState === "normal" ? property : `${activeState}:${property}`;

    if (this.activeClass) {
      // Style Class globally
      if (!this.doc.classes[this.activeClass]) {
        this.doc.classes[this.activeClass] = {};
      }
      const classStyles = this.doc.classes[this.activeClass];
      if (!classStyles[this.breakpoint]) {
        classStyles[this.breakpoint] = {};
      }
      
      if (value === null || value === "") {
        delete classStyles[this.breakpoint][key];
      } else {
        classStyles[this.breakpoint][key] = value;
      }
      
      // Clean up empty objects
      if (Object.keys(classStyles[this.breakpoint]).length === 0) {
        delete classStyles[this.breakpoint];
      }
    } else if (node) {
      // Style Element directly (inline)
      if (!node.styles) {
        node.styles = {};
      }
      if (!node.styles[this.breakpoint]) {
        node.styles[this.breakpoint] = {};
      }
      
      if (value === null || value === "") {
        delete node.styles[this.breakpoint][key];
      } else {
        node.styles[this.breakpoint][key] = value;
      }
      
      // Clean up empty objects
      if (Object.keys(node.styles[this.breakpoint]).length === 0) {
        delete node.styles[this.breakpoint];
      }
    }

    this.saveHistory();
  }

  getStyle(property) {
    const node = this.getSelectedNode();
    if (!node) return "";

    const activeState = this.activeState || "normal";
    const states = activeState === "normal" ? ["normal"] : [activeState, "normal"];

    // A helper to lookup a specific statePrefix (e.g., "hover", "normal")
    const lookupKey = (stateName, prop) => {
      const key = stateName === "normal" ? prop : `${stateName}:${prop}`;

      if (this.activeClass) {
        // Class lookup
        const classStyles = this.doc.classes[this.activeClass];
        if (classStyles) {
          if (classStyles[this.breakpoint] && classStyles[this.breakpoint][key] !== undefined) {
            return { val: classStyles[this.breakpoint][key] };
          }
          if (this.breakpoint !== "desktop" && classStyles["desktop"] && classStyles["desktop"][key] !== undefined) {
            return { val: classStyles["desktop"][key] };
          }
        }
      } else if (node) {
        // Direct inline lookup
        if (node.styles) {
          if (node.styles[this.breakpoint] && node.styles[this.breakpoint][key] !== undefined) {
            return { val: node.styles[this.breakpoint][key] };
          }
          if (this.breakpoint !== "desktop" && node.styles["desktop"] && node.styles["desktop"][key] !== undefined) {
            return { val: node.styles["desktop"][key] };
          }
        }

        // Classes fallback for the node
        for (const cls of node.classes) {
          const classStyles = this.doc.classes[cls];
          if (classStyles) {
            if (classStyles[this.breakpoint] && classStyles[this.breakpoint][key] !== undefined) {
              return { val: classStyles[this.breakpoint][key] };
            }
            if (this.breakpoint !== "desktop" && classStyles["desktop"] && classStyles["desktop"][key] !== undefined) {
              return { val: classStyles["desktop"][key] };
            }
          }
        }
      }
      return null;
    };

    // Try states in priority order: e.g. "hover", then "normal"
    for (const stateName of states) {
      const res = lookupKey(stateName, property);
      if (res !== null) {
        return res.val;
      }
    }

    return "";
  }

  isStyleOverride(property) {
    const node = this.getSelectedNode();
    if (!node) return false;

    const activeState = this.activeState || "normal";
    const key = activeState === "normal" ? property : `${activeState}:${property}`;

    if (this.activeClass) {
      const classStyles = this.doc.classes[this.activeClass];
      return !!(classStyles && classStyles[this.breakpoint] && classStyles[this.breakpoint][key] !== undefined);
    }

    return !!(node.styles && node.styles[this.breakpoint] && node.styles[this.breakpoint][key] !== undefined);
  }

  // Class List operations
  addNodeClass(nodeId, className) {
    const node = this.findNode(nodeId);
    if (!node) return;
    
    className = className.trim().replace(/\s+/g, '-').toLowerCase();
    if (!className) return;

    if (!node.classes.includes(className)) {
      node.classes.push(className);
      
      // Create empty class stylesheet entry if missing
      if (!this.doc.classes[className]) {
        this.doc.classes[className] = {
          desktop: {}
        };
      }
      
      this.setActiveClass(className);
      this.saveHistory();
    }
  }

  removeNodeClass(nodeId, className) {
    const node = this.findNode(nodeId);
    if (!node) return;

    const idx = node.classes.indexOf(className);
    if (idx !== -1) {
      node.classes.splice(idx, 1);
      if (this.activeClass === className) {
        this.activeClass = null;
      }
      this.saveHistory();
      this.selectNode(nodeId); // Refresh UI
    }
  }

  // HTML content & textContent
  updateTextContent(nodeId, text) {
    const node = this.findNode(nodeId);
    if (node) {
      node.textContent = text;
      this.saveHistory();
    }
  }

  // Attributes editing
  updateAttribute(key, value) {
    const node = this.getSelectedNode();
    if (!node) return;
    
    if (!node.attributes) {
      node.attributes = {};
    }
    
    if (value === null) {
      delete node.attributes[key];
    } else {
      node.attributes[key] = value;
    }
    this.saveHistory();
  }

  updateNodeAttribute(nodeId, key, value) {
    const node = this.findNode(nodeId);
    if (!node) return;
    
    if (!node.attributes) {
      node.attributes = {};
    }
    
    if (value === null) {
      delete node.attributes[key];
    } else {
      node.attributes[key] = value;
    }
    this.saveHistory();
  }

  updateNodeStyle(nodeId, property, value, breakpoint = "desktop") {
    const node = this.findNode(nodeId);
    if (!node) return;
    
    if (!node.styles) {
      node.styles = {};
    }
    if (!node.styles[breakpoint]) {
      node.styles[breakpoint] = {};
    }
    
    if (value === null || value === "") {
      delete node.styles[breakpoint][property];
    } else {
      node.styles[breakpoint][property] = value;
    }
    
    if (Object.keys(node.styles[breakpoint]).length === 0) {
      delete node.styles[breakpoint];
    }
    
    this.saveHistory();
  }

  togglePreviewMode() {
    this.previewMode = !this.previewMode;
    this.emit("previewToggle", this.previewMode);
  }
}

// Singleton state
export const state = new StateManager();
window.cwbState = state; // expose for debug
