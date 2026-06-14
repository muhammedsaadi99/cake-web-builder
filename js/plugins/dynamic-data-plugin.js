export class DynamicDataPlugin {
  constructor() {
    this.id = 'dynamic-data';
    this.name = 'Dynamic Data Template Engine';
    this.version = '1.3.0';
    this.builder = null;
  }

  install(builder) {
    this.builder = builder;
    
    // Inject Tab & Panel into Leftbar
    this.injectLeftbarElements();

    // Inject Repeater / Loop settings into Rightbar Settings Panel
    this.injectRightbarRepeaterSettings();

    // Hook to State Manager events
    this.setupListeners();

    // Initial annotation
    setTimeout(() => this.annotateAllInputs(), 200);
  }

  setupListeners() {
    this.builder.on('change', () => {
      this.updateLeftbarUI();
      const node = this.builder.getSelectedNode();
      if (node) this.updateRepeaterSelectOptions(node);
      this.annotateAllInputs();
    });

    this.builder.on('selectionChange', (nodeId) => {
      const node = this.builder.getSelectedNode();
      if (node) {
        this.updateRepeaterSelectOptions(node);
        this.annotateAllInputs();
      }
    });

    this.builder.on('attributesRendered', ({ controller, node }) => {
      this.annotateAllInputs();
      this.updateRepeaterSelectOptions(node);
    });

    // Delegate rightbar hover/click listeners to make sure new dynamic fields get annotated immediately
    const rightbar = document.querySelector('.cwb-rightbar');
    if (rightbar) {
      rightbar.addEventListener('mouseenter', () => this.annotateAllInputs());
      rightbar.addEventListener('click', () => {
        setTimeout(() => this.annotateAllInputs(), 50);
      });
    }
  }

  injectLeftbarElements() {
    const tabsContainer = document.querySelector('.cwb-leftbar .panel-tabs');
    const contentContainer = document.querySelector('.cwb-leftbar .leftbar-content');

    if (!tabsContainer || !contentContainer) {
      console.warn("Leftbar elements not found. Delaying injection.");
      return;
    }

    // Tab button
    const tabBtn = document.createElement('button');
    tabBtn.id = 'tab-data';
    tabBtn.className = 'tab-btn';
    tabBtn.setAttribute('data-panel', 'panel-data');
    tabBtn.setAttribute('title', 'Connect Data (Manage Lists & Info)');
    tabBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>
      </svg>
    `;
    tabsContainer.appendChild(tabBtn);

    // Panel Section
    const section = document.createElement('section');
    section.id = 'panel-data';
    section.className = 'panel-section';
    section.innerHTML = `
      <h3 class="panel-title">Connect Data</h3>
      <p class="panel-desc">Upload a spreadsheet or list file to connect values to your page elements.</p>
      
      <div class="data-upload-zone" id="data-upload-zone">
        <span class="upload-icon">📁</span>
        <span class="upload-text">Upload Data File</span>
        <input type="file" id="data-file-input" accept="application/json" style="display:none;">
      </div>
      
      <div class="data-file-details hidden" id="data-file-details">
        <div class="data-file-info">
          <span class="data-file-icon">📄</span>
          <span class="data-file-name" id="data-file-name">data.json</span>
          <button class="btn-data-remove" id="btn-data-remove" title="Remove Data File">×</button>
        </div>
      </div>

      <div class="data-explorer-wrapper hidden" id="data-explorer-wrapper">
        <h4 class="explorer-title">Available Data Fields (Click to copy)</h4>
        <div class="data-tree-container" id="data-tree-container"></div>
      </div>
    `;
    contentContainer.appendChild(section);

    // Bind DOM events
    const uploadZone = section.querySelector('#data-upload-zone');
    const fileInput = section.querySelector('#data-file-input');
    const btnRemove = section.querySelector('#btn-data-remove');

    uploadZone.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target.result);
            this.builder.setDynamicData(parsed);
            
            // Set file name in details
            const nameEl = section.querySelector('#data-file-name');
            if (nameEl) nameEl.innerText = file.name;
          } catch (err) {
            alert("Invalid data file format: " + err.message);
          }
          // Reset file input value to allow re-uploading same file
          fileInput.value = '';
        };
        reader.readAsText(file);
      }
    });

    btnRemove.addEventListener('click', () => {
      this.builder.setDynamicData(null);
    });

    // Initial render if data already exists in the document
    this.updateLeftbarUI();
  }

  injectRightbarRepeaterSettings() {
    const settingsPanel = document.getElementById('panel-settings');
    if (!settingsPanel) return;

    const repeaterSection = document.createElement('section');
    repeaterSection.className = 'properties-section repeater-section';
    repeaterSection.innerHTML = `
      <div class="section-accordion-header active" id="repeater-accordion-header" style="margin-top: 16px; border-top: 1px solid var(--border-color); padding-top: 12px;">
        <span>Multiplier / List Settings</span>
        <svg class="accordion-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="section-accordion-content active" id="repeater-accordion-content">
        <div class="property-row">
          <div class="property-field">
            <label>Multiplied List Source</label>
            <select id="repeater-source-select">
              <option value="">None (Static Single Element)</option>
            </select>
          </div>
        </div>
        <div class="repeater-status hidden" id="repeater-status" style="margin-top: 8px;">
          <span class="loop-badge" style="background-color: rgba(99, 91, 255, 0.15); color: var(--accent-hover); font-size: 11px; padding: 4px 8px; border-radius: 4px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">🔄 Multiplied Layout Active</span>
        </div>
      </div>
    `;
    settingsPanel.appendChild(repeaterSection);

    // Accordion Toggle
    const header = repeaterSection.querySelector('#repeater-accordion-header');
    const content = repeaterSection.querySelector('#repeater-accordion-content');
    header.addEventListener('click', () => {
      const active = header.classList.toggle('active');
      content.classList.toggle('active', active);
    });

    // Handle Select
    const select = repeaterSection.querySelector('#repeater-source-select');
    select.addEventListener('change', () => {
      const node = this.builder.getSelectedNode();
      if (!node) return;
      
      const val = select.value;
      if (val) {
        this.builder.setNodeLoopSource(node.id, val);
      } else {
        this.builder.removeNodeLoopSource(node.id);
      }
    });
  }

  updateRepeaterSelectOptions(node) {
    const select = document.getElementById('repeater-source-select');
    const statusDiv = document.getElementById('repeater-status');
    const section = document.querySelector('.repeater-section');
    if (!select || !section) return;

    if (!node || node.id === 'root') {
      section.style.display = 'none';
      return;
    }

    section.style.display = '';

    // Reset options
    select.innerHTML = '<option value="">None (Static Single Element)</option>';

    const data = this.builder.doc.dynamicData;
    if (data && Object.keys(data).length > 0) {
      const arrayPaths = this.extractArrayPaths(data);
      arrayPaths.forEach(path => {
        const opt = document.createElement('option');
        opt.value = path;
        opt.innerText = path;
        select.appendChild(opt);
      });
      
      // Set active selection
      select.value = node.loopSource || '';
      
      if (node.loopSource) {
        statusDiv.classList.remove('hidden');
      } else {
        statusDiv.classList.add('hidden');
      }
    } else {
      statusDiv.classList.add('hidden');
    }
  }

  updateLeftbarUI() {
    const data = this.builder.doc.dynamicData;
    const uploadZone = document.getElementById('data-upload-zone');
    const fileDetails = document.getElementById('data-file-details');
    const explorerWrapper = document.getElementById('data-explorer-wrapper');
    const treeContainer = document.getElementById('data-tree-container');

    if (!uploadZone) return;

    if (data && Object.keys(data).length > 0) {
      uploadZone.classList.add('hidden');
      fileDetails.classList.remove('hidden');
      explorerWrapper.classList.remove('hidden');
      
      // Render tree
      treeContainer.innerHTML = '';
      const treeHtml = this.renderJsonNode('root', data, '');
      treeContainer.appendChild(treeHtml);
    } else {
      uploadZone.classList.remove('hidden');
      fileDetails.classList.add('hidden');
      explorerWrapper.classList.add('hidden');
      treeContainer.innerHTML = '';
    }
  }

  renderJsonNode(key, value, path = '') {
    const isArray = Array.isArray(value);
    const isObj = typeof value === 'object' && value !== null;
    const itemEl = document.createElement('div');
    
    // Construct full path for this level
    let currentPath = '';
    if (path) {
      if (isArray) {
        currentPath = `${path}[${key}]`;
      } else if (!isNaN(key)) {
        currentPath = `${path}[${key}]`;
      } else {
        currentPath = `${path}.${key}`;
      }
    } else {
      if (key !== 'root') currentPath = key;
    }

    if (isObj || isArray) {
      itemEl.className = 'tree-branch collapsed';
      if (currentPath) itemEl.setAttribute('data-path', currentPath);
      
      const header = document.createElement('div');
      header.className = 'tree-branch-header';
      
      const toggle = document.createElement('span');
      toggle.className = 'tree-toggle';
      toggle.innerText = '▸';
      
      const keySpan = document.createElement('span');
      keySpan.className = 'tree-key';
      keySpan.innerText = isNaN(key) ? key : `[${key}]`;
      
      const typeSpan = document.createElement('span');
      typeSpan.className = 'tree-type-preview';
      typeSpan.innerText = isArray ? ` List (${value.length} items)` : ' Group';
      
      header.appendChild(toggle);
      header.appendChild(keySpan);
      header.appendChild(typeSpan);
      itemEl.appendChild(header);
      
      const childrenWrapper = document.createElement('div');
      childrenWrapper.className = 'tree-children hidden';
      
      // Render children recursively (limit to first 30 elements of huge arrays to keep performance blazing fast!)
      const entries = Object.entries(value);
      const limit = isArray ? 30 : entries.length;
      
      for (let i = 0; i < Math.min(entries.length, limit); i++) {
        const [childKey, childVal] = entries[i];
        childrenWrapper.appendChild(this.renderJsonNode(childKey, childVal, currentPath));
      }
      
      if (isArray && entries.length > limit) {
        const moreDiv = document.createElement('div');
        moreDiv.className = 'tree-more-indicator';
        moreDiv.innerText = `... and ${entries.length - limit} more items`;
        childrenWrapper.appendChild(moreDiv);
      }

      itemEl.appendChild(childrenWrapper);
      
      // Bind toggle click
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const collapsed = itemEl.classList.toggle('collapsed');
        childrenWrapper.classList.toggle('hidden', collapsed);
        toggle.innerText = collapsed ? '▸' : '▾';
      });

      // Bind header click (excluding toggle) to copy path
      header.addEventListener('click', (e) => {
        if (e.target === toggle) return;
        if (currentPath) this.copyPathToClipboard(header, currentPath);
      });
      
    } else {
      itemEl.className = 'tree-leaf';
      if (currentPath) itemEl.setAttribute('data-path', currentPath);
      itemEl.innerHTML = `
        <span class="tree-key">${isNaN(key) ? key : `[${key}]`}</span>: 
        <span class="tree-value value-${value === null ? 'null' : typeof value}">${JSON.stringify(value)}</span>
      `;
      
      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentPath) this.copyPathToClipboard(itemEl, currentPath);
      });
    }
    
    return itemEl;
  }

  copyPathToClipboard(element, path) {
    const fallbackCopy = (text) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      let success = false;
      try {
        success = document.execCommand('copy');
      } catch (err) {
        console.error(err);
      }
      document.body.removeChild(textarea);
      return success ? Promise.resolve() : Promise.reject(new Error("execCommand failed"));
    };

    const copyPromise = (navigator.clipboard && navigator.clipboard.writeText)
      ? navigator.clipboard.writeText(path)
      : fallbackCopy(path);

    copyPromise.then(() => {
      // Temporary tooltip visual feedback
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = 'rgba(99, 91, 255, 0.2)';
      
      const feedback = document.createElement('span');
      feedback.className = 'copy-feedback-pill';
      feedback.style.cssText = 'font-size: 9px; background: #4caf50; color: white; padding: 2px 6px; border-radius: 4px; margin-left: 8px; font-weight: bold; pointer-events: none; display: inline-block; vertical-align: middle; animation: cwb-fade-in 0.15s;';
      feedback.innerText = 'Copied!';
      
      element.appendChild(feedback);
      
      setTimeout(() => {
        feedback.remove();
        element.style.backgroundColor = originalBg;
      }, 800);
    }).catch(err => {
      console.error("Could not copy path to clipboard:", err);
    });
  }

  extractPaths(obj, currentPrefix = '', result = []) {
    if (obj === null || obj === undefined) return result;
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const path = `${currentPrefix}[${index}]`;
        if (typeof item === 'object' && item !== null) {
          this.extractPaths(item, path, result);
        } else {
          result.push({ path, val: String(item) });
        }
      });
    } else if (typeof obj === 'object') {
      Object.entries(obj).forEach(([key, val]) => {
        const path = currentPrefix ? `${currentPrefix}.${key}` : key;
        if (typeof val === 'object' && val !== null) {
          this.extractPaths(val, path, result);
        } else {
          result.push({ path, val: String(val) });
        }
      });
    } else {
      result.push({ path: currentPrefix, val: String(obj) });
    }
    return result;
  }

  extractArrayPaths(obj, currentPrefix = '', result = []) {
    if (obj === null || obj === undefined) return result;
    if (Array.isArray(obj)) {
      result.push(currentPrefix);
      if (obj.length > 0 && typeof obj[0] === 'object') {
        this.extractArrayPaths(obj[0], `${currentPrefix}[0]`, result);
      }
    } else if (typeof obj === 'object') {
      Object.entries(obj).forEach(([key, val]) => {
        const path = currentPrefix ? `${currentPrefix}.${key}` : key;
        if (Array.isArray(val)) {
          result.push(path);
          if (val.length > 0 && typeof val[0] === 'object') {
            this.extractArrayPaths(val[0], `${path}[0]`, result);
          }
        } else if (typeof val === 'object' && val !== null) {
          this.extractArrayPaths(val, path, result);
        }
      });
    }
    return result;
  }

  annotateAllInputs() {
    const data = this.builder.doc.dynamicData;
    // If no dynamic data is loaded, remove all tag buttons and return
    if (!data || Object.keys(data).length === 0) {
      document.querySelectorAll('.btn-dynamic-tag').forEach(el => el.remove());
      return;
    }

    // Select all text-oriented inputs/textareas inside rightbar panels
    const inputs = document.querySelectorAll(
      '.cwb-rightbar input[type="text"], ' +
      '.cwb-rightbar input[type="number"], ' +
      '.cwb-rightbar input:not([type]), ' +
      '.cwb-rightbar textarea'
    );

    inputs.forEach(input => {
      // Skip suggestions inputs, color pickers, or inputs that shouldn't be bound
      if (input.id === 'class-input' || input.id === 'component-name-input' || input.disabled || input.readOnly) {
        return;
      }

      const parent = input.parentElement;
      if (!parent) return;

      // Wrap inputs that are inside .property-field or have a label sibling in a cwb-input-wrapper
      // to ensure perfect vertical centering relative to the input itself
      const hasLabel = parent.querySelector('label') || parent.classList.contains('property-field');
      let targetContainer = parent;
      
      if (hasLabel) {
        let wrapper = parent.querySelector('.cwb-input-wrapper');
        // Make sure the wrapper actually contains our input
        if (wrapper && wrapper.contains(input)) {
          targetContainer = wrapper;
        } else {
          wrapper = document.createElement('div');
          wrapper.className = 'cwb-input-wrapper';
          wrapper.style.cssText = 'position: relative; display: block; width: 100%;';
          
          // Preserve focus and selection during DOM move
          const isFocused = (document.activeElement === input);
          const selStart = input.selectionStart;
          const selEnd = input.selectionEnd;
          
          // Insert wrapper before input, then move input inside it
          input.parentNode.insertBefore(wrapper, input);
          wrapper.appendChild(input);
          
          if (isFocused) {
            input.focus();
            if (selStart !== null && selEnd !== null) {
              input.setSelectionRange(selStart, selEnd);
            }
          }
          
          targetContainer = wrapper;
        }
      } else {
        parent.style.position = 'relative';
      }

      // Check if button already exists in targetContainer
      let tagBtn = targetContainer.querySelector('.btn-dynamic-tag');
      if (!tagBtn) {
        tagBtn = document.createElement('button');
        tagBtn.type = 'button';
        tagBtn.className = 'btn-dynamic-tag';
        tagBtn.title = 'Insert dynamic data tag';
        tagBtn.innerHTML = `
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path>
          </svg>
        `;
        
        // Offset if inside input-group (size units selector is on the right)
        let rightPosition = '6px';
        if (input.closest('.input-group')) {
          rightPosition = '50px';
        }
        
        // Custom vertical alignment for textarea vs inputs
        const isTextarea = (input.tagName.toLowerCase() === 'textarea');
        if (isTextarea) {
          tagBtn.style.cssText = `position: absolute; right: ${rightPosition}; top: 6px; transform: none; background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 0; transition: color 0.15s; display: flex; align-items: center; justify-content: center; height: 16px; width: 16px; z-index: 5;`;
        } else {
          tagBtn.style.cssText = `position: absolute; right: ${rightPosition}; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 0; transition: color 0.15s; display: flex; align-items: center; justify-content: center; height: 16px; width: 16px; z-index: 5;`;
        }

        tagBtn.addEventListener('mouseenter', () => tagBtn.style.color = 'var(--accent-hover)');
        tagBtn.addEventListener('mouseleave', () => tagBtn.style.color = 'var(--text-muted)');

        // Give input right padding so text doesn't overlap the icon
        input.style.paddingRight = (rightPosition === '50px') ? '68px' : '24px';

        // Position icon
        targetContainer.appendChild(tagBtn);

        // Bind click event
        tagBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openSelectorDropdown(tagBtn, input);
        });
      }
    });
  }

  openSelectorDropdown(button, input) {
    // Close existing dropdowns first
    this.closeAllDropdowns();

    const data = this.builder.doc.dynamicData;
    if (!data) return;

    const paths = this.extractPaths(data);
    if (paths.length === 0) return;

    // Detect if the selected node is inside a loop repeater
    const nodeId = this.builder.selectedNodeId;
    let loopSource = null;
    let tempNodeId = nodeId;
    while (tempNodeId) {
      const tempNode = this.builder.findNode(tempNodeId);
      if (tempNode && tempNode.loopSource) {
        loopSource = tempNode.loopSource;
        break;
      }
      tempNodeId = this.builder.findParent(tempNodeId)?.id;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'cwb-data-dropdown';
    
    // Add header/title
    const header = document.createElement('div');
    header.className = 'dropdown-header';
    header.innerText = 'Insert Dynamic Tag';
    dropdown.appendChild(header);

    // Search / Paste Input
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'dropdown-search-wrapper';
    searchWrapper.style.padding = '6px 8px';
    searchWrapper.style.borderBottom = '1px solid var(--border-color)';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search or paste path...';
    searchInput.style.cssText = 'width: 100%; height: 26px; font-size: 11px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 4px; padding: 0 8px; color: var(--text-main); outline: none; font-family: var(--font-mono);';
    searchWrapper.appendChild(searchInput);
    dropdown.appendChild(searchWrapper);

    // List of keys
    const list = document.createElement('ul');
    list.className = 'dropdown-list';
    dropdown.appendChild(list);

    const insertTag = (path) => {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const val = input.value || '';
      const tag = `{{${path}}}`;
      
      input.value = val.substring(0, start) + tag + val.substring(end);
      
      // Position cursor after tag
      const newPos = start + tag.length;
      input.setSelectionRange(newPos, newPos);
      
      // Dispatch events to let the builder controllers save changes
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      input.focus();
    };

    const renderList = (filterText = '') => {
      list.innerHTML = '';
      const filtered = paths.filter(({ path }) => path.toLowerCase().includes(filterText.toLowerCase()));
      
      if (filtered.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'dropdown-item empty';
        empty.style.cssText = 'font-size: 11px; color: var(--text-muted); text-align: center; padding: 12px;';
        empty.innerText = 'No matching keys';
        list.appendChild(empty);
        return;
      }

      // Segment keys if we are editing an element inside an active loop
      if (loopSource) {
        // Under loop data, we show index 0 of the loop source (which represents the keys available from the loop)
        const loopPaths = filtered.filter(({ path }) => path.startsWith(loopSource + '[0]'));
        
        // Under other data, we show all other paths, excluding all indices of the loop source (since they are redundant loop items)
        const otherPaths = filtered.filter(({ path }) => {
          if (path.startsWith(loopSource + '[')) {
            return false;
          }
          return path !== loopSource;
        });

        // Group 1: Multiplied List Field Data
        const titleLoop = document.createElement('li');
        titleLoop.className = 'dropdown-category-title';
        titleLoop.innerText = `Data from Multiplied List Field (${loopSource})`;
        list.appendChild(titleLoop);

        if (loopPaths.length > 0) {
          loopPaths.forEach(({ path, val }) => {
            // Translate features[0].name to features.name for cleaner look and dot-notation resolution
            const cleanPath = path.replace(new RegExp(`^${loopSource.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\[0\\]`), loopSource);
            
            const item = document.createElement('li');
            item.className = 'dropdown-item';
            item.innerHTML = `
              <div class="item-left">
                <span class="loop-indicator" title="List Field">🔄</span>
                <span class="item-path">${cleanPath}</span>
              </div>
              <span class="item-preview">${val}</span>
            `;
            item.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              insertTag(cleanPath);
              dropdown.remove();
            });
            list.appendChild(item);
          });
        } else {
          const emptyLoop = document.createElement('li');
          emptyLoop.className = 'dropdown-item empty-category';
          emptyLoop.innerText = 'No matching list items';
          list.appendChild(emptyLoop);
        }

        // Group 2: Other Page Data
        const titleOther = document.createElement('li');
        titleOther.className = 'dropdown-category-title';
        titleOther.innerText = 'Other Page Data';
        list.appendChild(titleOther);

        if (otherPaths.length > 0) {
          otherPaths.forEach(({ path, val }) => {
            const item = document.createElement('li');
            item.className = 'dropdown-item';
            item.innerHTML = `
              <div class="item-left">
                <span class="item-path">${path}</span>
              </div>
              <span class="item-preview">${val}</span>
            `;
            item.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              insertTag(path);
              dropdown.remove();
            });
            list.appendChild(item);
          });
        } else {
          const emptyOther = document.createElement('li');
          emptyOther.className = 'dropdown-item empty-category';
          emptyOther.innerText = 'No matching other items';
          list.appendChild(emptyOther);
        }

      } else {
        // Standard full list
        filtered.forEach(({ path, val }) => {
          const item = document.createElement('li');
          item.className = 'dropdown-item';
          item.innerHTML = `
            <div class="item-left">
              <span class="item-path">${path}</span>
            </div>
            <span class="item-preview">${val}</span>
          `;
          item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            insertTag(path);
            dropdown.remove();
          });
          list.appendChild(item);
        });
      }
    };

    renderList('');

    // Handle input
    searchInput.addEventListener('input', () => {
      renderList(searchInput.value.trim());
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = searchInput.value.trim();
        if (val) {
          insertTag(val);
          dropdown.remove();
        }
      }
    });

    document.body.appendChild(dropdown);

    // Position dropdown relative to the clicked button (aligning right edges to prevent off-screen leak)
    const rect = button.getBoundingClientRect();
    const dropdownWidth = 260;
    const dropdownHeight = 220; // max-height in CSS is 220px
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Align right edge of dropdown with right edge of button
    let left = rect.right + window.scrollX - dropdownWidth;
    if (left < window.scrollX + 10) {
      left = window.scrollX + 10;
    }
    const maxLeft = viewportWidth + window.scrollX - dropdownWidth - 16;
    if (left > maxLeft) {
      left = maxLeft;
    }

    let top = rect.bottom + window.scrollY + 4;
    // If it overflows bottom of viewport, show it above the button
    if (rect.bottom + dropdownHeight + 10 > viewportHeight) {
      top = rect.top + window.scrollY - dropdownHeight - 4;
    }

    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;

    const outsideClickListener = (e) => {
      if (!dropdown.contains(e.target) && e.target !== button) {
        dropdown.remove();
        document.removeEventListener('click', outsideClickListener);
      }
    };
    
    // Focus search field automatically
    setTimeout(() => {
      searchInput.focus();
      document.addEventListener('click', outsideClickListener);
    }, 50);
  }

  closeAllDropdowns() {
    document.querySelectorAll('.cwb-data-dropdown').forEach(dropdown => dropdown.remove());
  }
}
