import { state } from '../state.js';

export class AttributesPanelController {
  constructor() {
    this.specificContainer = document.getElementById('element-specific-attributes');
    this.customList = document.getElementById('custom-attr-list');
    this.btnAddCustom = document.getElementById('btn-add-custom-attr');
    this.activeImgTab = 'url'; // Track active image tab

    this.init();
  }

  init() {
    this.btnAddCustom.addEventListener('click', () => {
      const node = state.getSelectedNode();
      if (!node) return;
      
      // Prompt user or generate blank
      const key = prompt("Enter setting option name (e.g., title, type):");
      if (key) {
        const cleanedKey = key.trim().toLowerCase();
        if (cleanedKey) {
          state.updateAttribute(cleanedKey, "");
          this.render();
        }
      }
    });

    state.on('selectionChange', () => {
      const node = state.getSelectedNode();
      const currentSrc = (node && node.attributes && node.attributes.src) || '';
      if (currentSrc.startsWith('data:image/')) {
        this.activeImgTab = 'file';
      } else {
        this.activeImgTab = 'url';
      }
      this.render();
    });
    state.on('change', () => {
      const active = document.activeElement;
      if (active && (this.specificContainer.contains(active) || this.customList.contains(active))) {
        return;
      }
      this.render();
    });
    
    this.render();
  }

  render() {
    const node = state.getSelectedNode();
    this.specificContainer.innerHTML = '';
    this.customList.innerHTML = '';

    if (!node) return;

    // --- 1. Element Contextual Specific Fields ---
    this.renderSpecificFields(node);

    // --- 2. Custom Attributes List ---
    this.renderCustomFields(node);

    // Emit event at the end of the rendering loop to let dynamic bindings plugin inject controls
    state.emit('attributesRendered', { controller: this, node });
  }

  renderSpecificFields(node) {
    const tag = node.tag;
    const attrs = node.attributes || {};

    const createField = (labelName, keyName, placeholderText = "") => {
      const field = document.createElement('div');
      field.className = 'property-field';
      field.style.marginBottom = '12px';

      const label = document.createElement('label');
      label.innerText = labelName;
      field.appendChild(label);

      const input = document.createElement('input');
      input.type = 'text';
      input.value = attrs[keyName] || '';
      input.placeholder = placeholderText;
      input.setAttribute('data-attr-key', keyName);
      
      input.addEventListener('change', () => {
        state.updateAttribute(keyName, input.value.trim());
      });

      field.appendChild(input);
      this.specificContainer.appendChild(field);
    };

    // Render text content editor if applicable
    const textTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'button', 'a', 'span'];
    if (textTags.includes(tag.toLowerCase())) {
      const field = document.createElement('div');
      field.className = 'property-field';
      field.style.marginBottom = '12px';

      const label = document.createElement('label');
      label.innerText = "Text Content";
      field.appendChild(label);

      const textarea = document.createElement('textarea');
      textarea.style.height = '50px';
      textarea.style.resize = 'vertical';
      textarea.style.fontSize = '12px';
      textarea.style.fontFamily = 'var(--font-sans)';
      textarea.style.backgroundColor = 'var(--bg-tertiary)';
      textarea.style.border = '1px solid var(--border-color)';
      textarea.style.borderRadius = '4px';
      textarea.style.color = 'var(--text-main)';
      textarea.style.padding = '6px';
      textarea.style.width = '100%';
      textarea.style.outline = 'none';
      textarea.value = node.textContent || '';
      textarea.setAttribute('data-field-key', 'textContent');
      
      textarea.addEventListener('input', () => {
        state.updateTextContent(node.id, textarea.value);
      });

      field.appendChild(textarea);
      this.specificContainer.appendChild(field);
    }

    // Render depending on element tag types
    if (tag === 'img') {
      const widgetField = document.createElement('div');
      widgetField.className = 'property-field';
      widgetField.style.marginBottom = '12px';
      
      const widgetLabel = document.createElement('label');
      widgetLabel.innerText = "Image Source";
      widgetField.appendChild(widgetLabel);

      const selectorWrapper = document.createElement('div');
      selectorWrapper.className = 'image-selector-widget';
      
      const isUrlActive = (this.activeImgTab === 'url');

      selectorWrapper.innerHTML = `
        <div class="image-selector-tabs">
          <button type="button" class="img-tab-btn ${isUrlActive ? 'active' : ''}" data-tab="url">URL</button>
          <button type="button" class="img-tab-btn ${!isUrlActive ? 'active' : ''}" data-tab="file">Upload</button>
        </div>
        <div class="img-tab-content ${isUrlActive ? '' : 'hidden'}" id="img-url-content">
          <input type="text" id="img-src-url" placeholder="https://example.com/image.png" autocomplete="off" style="width:100%; margin-top:6px;">
        </div>
        <div class="img-tab-content ${!isUrlActive ? '' : 'hidden'}" id="img-file-content">
          <label class="file-upload-zone" id="img-file-zone" for="img-file-input" style="margin-top:6px; display:flex;">
            <span class="upload-icon">📁</span>
            <span class="upload-text">Choose image...</span>
          </label>
          <input type="file" id="img-file-input" accept="image/*" style="display:none;">
          <div class="uploaded-image-preview hidden" id="img-file-preview" style="margin-top:6px;">
            <span class="uploaded-filename" id="img-file-name">image.png</span>
            <button type="button" class="btn-remove-uploaded" id="img-file-remove">×</button>
          </div>
        </div>
      `;

      widgetField.appendChild(selectorWrapper);
      this.specificContainer.appendChild(widgetField);

      // Event listeners setup
      const tabs = selectorWrapper.querySelectorAll('.img-tab-btn');
      const urlContent = selectorWrapper.querySelector('#img-url-content');
      const fileContent = selectorWrapper.querySelector('#img-file-content');
      const urlInput = selectorWrapper.querySelector('#img-src-url');
      urlInput.setAttribute('data-attr-key', 'src');
      const fileInput = selectorWrapper.querySelector('#img-file-input');
      const fileZone = selectorWrapper.querySelector('#img-file-zone');
      const filePreview = selectorWrapper.querySelector('#img-file-preview');
      const fileNameSpan = selectorWrapper.querySelector('#img-file-name');
      const removeBtn = selectorWrapper.querySelector('#img-file-remove');

      // Init value
      const currentSrc = attrs['src'] || '';
      
      if (currentSrc.startsWith('data:image/')) {
        filePreview.classList.remove('hidden');
        fileZone.classList.add('hidden');
        fileNameSpan.innerText = "Local Image Uploaded";
        urlInput.value = '';
      } else {
        filePreview.classList.add('hidden');
        fileZone.classList.remove('hidden');
        urlInput.value = currentSrc;
      }

      // Tab switcher
      tabs.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const tab = btn.getAttribute('data-tab');
          this.activeImgTab = tab;
          this.render(); // Re-render to refresh layout
        });
      });

      // URL input change
      urlInput.addEventListener('change', () => {
        state.updateAttribute('src', urlInput.value.trim());
        // Clear file input on URL change
        fileInput.value = '';
      });

      // File loading reader
      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            state.updateAttribute('src', ev.target.result);
            // Clear URL input value on file upload
            urlInput.value = '';
          };
          reader.readAsDataURL(file);
        }
      });

      // File remove
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput.value = '';
        state.updateAttribute('src', '');
        urlInput.value = '';
      });

      createField("Alt Text (Description)", "alt", "Describe the image...");
    } else if (tag === 'a') {
      createField("Link URL (HREF)", "href", "#");
      
      // Target window select dropdown
      const field = document.createElement('div');
      field.className = 'property-field';
      field.style.marginBottom = '12px';
      
      const label = document.createElement('label');
      label.innerText = "Open Link In";
      field.appendChild(label);

      const select = document.createElement('select');
      select.innerHTML = `
        <option value="_self">Same Window (_self)</option>
        <option value="_blank">New Window (_blank)</option>
      `;
      select.value = attrs['target'] || '_self';
      
      select.addEventListener('change', () => {
        state.updateAttribute('target', select.value);
      });
      
      field.appendChild(select);
      this.specificContainer.appendChild(field);
    } else if (tag === 'input' || tag === 'textarea') {
      createField("Placeholder Text", "placeholder", "Enter values...");
      createField("Default Value", "value", "");
    }
    
    // Add custom identifier setting field for element tag type IDs
    createField("Unique Element Name (ID)", "id", "Unique reference name...");
  }

  renderCustomFields(node) {
    const attrs = node.attributes || {};
    
    // Define keys we treat as "specific" to ignore in custom attributes rows list
    const specificKeys = ['src', 'alt', 'href', 'target', 'placeholder', 'type', 'id'];

    Object.entries(attrs).forEach(([key, value]) => {
      if (specificKeys.includes(key)) return; // Skip standard fields

      const row = document.createElement('div');
      row.className = 'custom-attr-row';

      const keyInput = document.createElement('input');
      keyInput.type = 'text';
      keyInput.value = key;
      keyInput.title = 'Option Name';
      keyInput.disabled = true; // Key cannot be edited inline easily, must delete and recreate

      const valInput = document.createElement('input');
      valInput.type = 'text';
      valInput.value = value;
      valInput.placeholder = 'Value...';
      valInput.title = 'Option Value';
      valInput.setAttribute('data-attr-key', key);
      
      valInput.addEventListener('change', () => {
        state.updateAttribute(key, valInput.value.trim());
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-attr-delete';
      deleteBtn.innerHTML = '×';
      deleteBtn.title = 'Delete Option';
      deleteBtn.addEventListener('click', () => {
        state.updateAttribute(key, null);
        this.render();
      });

      row.appendChild(keyInput);
      row.appendChild(valInput);
      row.appendChild(deleteBtn);
      
      this.customList.appendChild(row);
    });
  }
}
