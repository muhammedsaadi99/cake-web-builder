import { state } from '../state.js';

export class AttributesPanelController {
  constructor() {
    this.specificContainer = document.getElementById('element-specific-attributes');
    this.customList = document.getElementById('custom-attr-list');
    this.btnAddCustom = document.getElementById('btn-add-custom-attr');
    this.activeImgTab = 'url'; // Track active image tab
    this.expandedSlideIndex = -1; // Track which slide item is expanded
    this.slideBgTabs = {}; // Track background image tab per slide ID

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

    if (node.classes && node.classes.includes('cwb-slider')) {
      this.renderSliderSettings(node);
      return;
    }

    if (node.classes && node.classes.includes('cwb-slide')) {
      this.renderSlideSettings(node);
      return;
    }

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

  renderSliderSettings(node) {
    const attrs = node.attributes || {};
    const slides = node.children.filter(c => c.classes && c.classes.includes('cwb-slide'));
    const activeIdx = parseInt(attrs['data-active-index'] || '0', 10);

    // Header Title
    const title = document.createElement('h4');
    title.innerText = "Slider Settings";
    title.style.fontSize = "13px";
    title.style.marginBottom = "12px";
    title.style.fontWeight = "600";
    title.style.color = "var(--text-main)";
    this.specificContainer.appendChild(title);

    // --- Active Slide Dropdown ---
    const activeSlideField = document.createElement('div');
    activeSlideField.className = 'property-field';
    activeSlideField.style.marginBottom = '12px';
    activeSlideField.innerHTML = `<label>Active Slide in Workspace</label>`;
    
    const activeSelect = document.createElement('select');
    activeSelect.style.width = '100%';
    slides.forEach((slide, i) => {
      const titleNode = slide.children.find(c => c.classes && c.classes.includes('cwb-slide-title'));
      const labelText = titleNode ? titleNode.textContent : `Slide ${i + 1}`;
      const opt = document.createElement('option');
      opt.value = i;
      opt.innerText = `${i + 1}: ${labelText.substring(0, 20)}`;
      if (i === activeIdx) opt.selected = true;
      activeSelect.appendChild(opt);
    });
    
    activeSelect.addEventListener('change', () => {
      state.updateAttribute('data-active-index', activeSelect.value);
    });
    activeSlideField.appendChild(activeSelect);
    this.specificContainer.appendChild(activeSlideField);

    // Divider
    const divider = document.createElement('div');
    divider.className = 'topbar-divider';
    divider.style.margin = '16px 0 12px 0';
    this.specificContainer.appendChild(divider);

    // Slides List Section Title
    const slidesTitle = document.createElement('div');
    slidesTitle.style.display = 'flex';
    slidesTitle.style.justifyContent = 'space-between';
    slidesTitle.style.alignItems = 'center';
    slidesTitle.style.marginBottom = '8px';
    slidesTitle.innerHTML = `<label style="font-weight:600; margin:0;">Slide Items Manager</label>`;
    
    const btnAddSlide = document.createElement('button');
    btnAddSlide.className = 'btn-secondary-sm';
    btnAddSlide.innerHTML = '＋ Add Slide';
    btnAddSlide.addEventListener('click', () => {
      const newSlide = {
        id: state.generateId(),
        tag: 'div',
        classes: ['cwb-slide'],
        attributes: {},
        styles: {
          desktop: {
            'background-color': '#a3a0fb',
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
            id: state.generateId(),
            tag: 'h2',
            classes: ['cwb-slide-title'],
            textContent: `New Slide Heading`,
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
            id: state.generateId(),
            tag: 'p',
            classes: ['cwb-slide-desc'],
            textContent: `This is a new slide. Adjust its contents in Settings.`,
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
            id: state.generateId(),
            tag: 'a',
            classes: ['cwb-slide-button', 'w-button'],
            textContent: 'Explore Now',
            attributes: { href: '#' },
            styles: {
              desktop: {
                'background-color': '#ffffff',
                'color': '#a3a0fb',
                'padding': '10px 24px',
                'border-radius': '4px',
                'font-weight': '600'
              }
            },
            children: []
          }
        ]
      };
      node.children.push(newSlide);
      const newIndex = node.children.filter(c => c.classes && c.classes.includes('cwb-slide')).length - 1;
      state.updateAttribute('data-active-index', newIndex.toString());
      state.saveHistory();
      // Select the new slide node automatically to edit it
      state.selectNode(newSlide.id);
    });
    
    slidesTitle.appendChild(btnAddSlide);
    this.specificContainer.appendChild(slidesTitle);

    // --- Slide Items List ---
    const slidesList = document.createElement('div');
    slidesList.className = 'slider-items-list';
    slidesList.style.display = 'flex';
    slidesList.style.flexDirection = 'column';
    slidesList.style.gap = '8px';
    slidesList.style.marginBottom = '16px';

    slides.forEach((slide, i) => {
      const titleNode = slide.children.find(c => c.classes && c.classes.includes('cwb-slide-title'));

      const itemCard = document.createElement('div');
      itemCard.className = `slider-item-card`;
      itemCard.style.border = '1px solid var(--border-color)';
      itemCard.style.borderRadius = '6px';
      itemCard.style.backgroundColor = 'var(--bg-secondary)';
      itemCard.style.overflow = 'hidden';

      // Header Row
      const header = document.createElement('div');
      header.className = 'slider-item-header';
      header.style.padding = '8px 12px';
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.cursor = 'pointer';
      header.style.backgroundColor = 'var(--bg-tertiary)';

      // Title & Arrow
      const titleWrap = document.createElement('div');
      titleWrap.style.display = 'flex';
      titleWrap.style.alignItems = 'center';
      titleWrap.style.gap = '8px';
      
      const arrow = document.createElement('span');
      arrow.innerHTML = '▶';
      arrow.style.fontSize = '9px';
      arrow.style.color = 'var(--text-muted)';
      
      const titleSpan = document.createElement('span');
      titleSpan.innerText = titleNode ? titleNode.textContent : `Slide ${i + 1}`;
      titleSpan.style.fontSize = '12px';
      titleSpan.style.fontWeight = '600';
      titleSpan.style.color = 'var(--text-main)';

      titleWrap.appendChild(arrow);
      titleWrap.appendChild(titleSpan);
      header.appendChild(titleWrap);

      // Actions wrapper
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '4px';

      // Up button
      const btnUp = document.createElement('button');
      btnUp.className = 'btn-attr-delete';
      btnUp.innerHTML = '↑';
      btnUp.title = 'Move Slide Up';
      btnUp.disabled = i === 0;
      btnUp.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = node.children.indexOf(slide);
        let prevIdx = -1;
        for (let k = idx - 1; k >= 0; k--) {
          if (node.children[k].classes && node.children[k].classes.includes('cwb-slide')) {
            prevIdx = k;
            break;
          }
        }
        if (prevIdx !== -1) {
          const temp = node.children[idx];
          node.children[idx] = node.children[prevIdx];
          node.children[prevIdx] = temp;
          state.updateAttribute('data-active-index', (i - 1).toString());
          state.saveHistory();
          this.render();
        }
      });

      // Down button
      const btnDown = document.createElement('button');
      btnDown.className = 'btn-attr-delete';
      btnDown.innerHTML = '↓';
      btnDown.title = 'Move Slide Down';
      btnDown.disabled = i === slides.length - 1;
      btnDown.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = node.children.indexOf(slide);
        let nextIdx = -1;
        for (let k = idx + 1; k < node.children.length; k++) {
          if (node.children[k].classes && node.children[k].classes.includes('cwb-slide')) {
            nextIdx = k;
            break;
          }
        }
        if (nextIdx !== -1) {
          const temp = node.children[idx];
          node.children[idx] = node.children[nextIdx];
          node.children[nextIdx] = temp;
          state.updateAttribute('data-active-index', (i + 1).toString());
          state.saveHistory();
          this.render();
        }
      });

      // Duplicate button
      const btnDuplicate = document.createElement('button');
      btnDuplicate.className = 'btn-attr-delete';
      btnDuplicate.innerHTML = '⧉';
      btnDuplicate.title = 'Duplicate Slide';
      btnDuplicate.addEventListener('click', (e) => {
        e.stopPropagation();
        const cloned = JSON.parse(JSON.stringify(slide));
        cloned.id = state.generateId();
        cloned.children.forEach(c => {
          c.id = state.generateId();
        });
        const idx = node.children.indexOf(slide);
        node.children.splice(idx + 1, 0, cloned);
        state.updateAttribute('data-active-index', (i + 1).toString());
        state.saveHistory();
        this.render();
      });

      // Delete button
      const btnDel = document.createElement('button');
      btnDel.className = 'btn-attr-delete';
      btnDel.innerHTML = '×';
      btnDel.title = 'Delete Slide';
      btnDel.addEventListener('click', (e) => {
        e.stopPropagation();
        if (slides.length <= 1) {
          alert("A slider must have at least one slide!");
          return;
        }
        const idx = node.children.indexOf(slide);
        node.children.splice(idx, 1);
        
        let newActive = activeIdx;
        if (newActive >= slides.length - 1) {
          newActive = Math.max(0, slides.length - 2);
        }
        state.updateAttribute('data-active-index', newActive.toString());
        state.saveHistory();
        this.render();
      });

      actions.appendChild(btnUp);
      actions.appendChild(btnDown);
      actions.appendChild(btnDuplicate);
      actions.appendChild(btnDel);
      header.appendChild(actions);

      header.addEventListener('click', () => {
        state.selectNode(slide.id);
      });

      itemCard.appendChild(header);
      slidesList.appendChild(itemCard);
    });

    this.specificContainer.appendChild(slidesList);

    // Divider
    const dividerSettings = document.createElement('div');
    dividerSettings.className = 'topbar-divider';
    dividerSettings.style.margin = '16px 0 12px 0';
    this.specificContainer.appendChild(dividerSettings);

    // Slider Configuration Settings label
    const settingsLabel = document.createElement('label');
    settingsLabel.innerText = "Carousel Options";
    settingsLabel.style.fontWeight = "600";
    settingsLabel.style.marginBottom = "8px";
    settingsLabel.style.display = "block";
    this.specificContainer.appendChild(settingsLabel);

    // Slider Height
    const heightField = document.createElement('div');
    heightField.className = 'property-field';
    heightField.style.marginBottom = '12px';
    heightField.innerHTML = `<label>Slider Height</label>`;
    const heightInp = document.createElement('input');
    heightInp.type = 'text';
    heightInp.value = attrs['data-height'] || '400px';
    heightInp.placeholder = 'e.g. 400px or 50vh';
    heightInp.addEventListener('change', () => {
      const val = heightInp.value.trim() || '400px';
      state.updateAttribute('data-height', val);
      state.updateStyle('height', val);
      slides.forEach(slideNode => {
        state.updateNodeStyle(slideNode.id, 'min-height', val);
      });
    });
    heightField.appendChild(heightInp);
    this.specificContainer.appendChild(heightField);

    // Helper to create select field
    const createSelectField = (labelName, attrName, options, currentVal) => {
      const field = document.createElement('div');
      field.className = 'property-field';
      field.style.marginBottom = '12px';
      field.innerHTML = `<label>${labelName}</label>`;
      const select = document.createElement('select');
      select.style.width = '100%';
      options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.innerText = opt.label;
        if (opt.value === currentVal) o.selected = true;
        select.appendChild(o);
      });
      select.addEventListener('change', () => {
        state.updateAttribute(attrName, select.value);
      });
      field.appendChild(select);
      this.specificContainer.appendChild(field);
    };

    // Autoplay
    createSelectField("Autoplay Slides", "data-autoplay", [
      { value: 'true', label: 'On' },
      { value: 'false', label: 'Off' }
    ], attrs['data-autoplay'] || 'true');

    // Autoplay Speed
    const speedField = document.createElement('div');
    speedField.className = 'property-field';
    speedField.style.marginBottom = '12px';
    speedField.innerHTML = `<label>Autoplay Speed (ms)</label>`;
    const speedInp = document.createElement('input');
    speedInp.type = 'number';
    speedInp.value = attrs['data-autoplay-speed'] || '3000';
    speedInp.addEventListener('change', () => {
      state.updateAttribute('data-autoplay-speed', speedInp.value);
    });
    speedField.appendChild(speedInp);
    this.specificContainer.appendChild(speedField);

    // Infinite Loop
    createSelectField("Infinite Loop", "data-loop", [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' }
    ], attrs['data-loop'] || 'true');

    // Transition Effect
    createSelectField("Transition Effect", "data-transition", [
      { value: 'slide', label: 'Slide' },
      { value: 'fade', label: 'Fade' }
    ], attrs['data-transition'] || 'slide');

    // Navigation Controls
    createSelectField("Navigation Elements", "data-navigation", [
      { value: 'both', label: 'Arrows & Dots' },
      { value: 'arrows', label: 'Arrows Only' },
      { value: 'dots', label: 'Dots Only' },
      { value: 'none', label: 'None' }
    ], attrs['data-navigation'] || 'both');

    // Add unique ID name setting field
    const idField = document.createElement('div');
    idField.className = 'property-field';
    idField.style.marginBottom = '12px';
    idField.innerHTML = `<label>Unique Element Name (ID)</label>`;
    const idInp = document.createElement('input');
    idInp.type = 'text';
    idInp.value = attrs['id'] || '';
    idInp.placeholder = 'Unique reference name...';
    idInp.addEventListener('change', () => {
      state.updateAttribute('id', idInp.value.trim());
    });
    idField.appendChild(idInp);
    this.specificContainer.appendChild(idField);
  }

  renderSlideSettings(node) {
    const parentSlider = state.findParent(node.id);
    const titleNode = node.children.find(c => c.classes && c.classes.includes('cwb-slide-title'));
    const descNode = node.children.find(c => c.classes && c.classes.includes('cwb-slide-desc'));
    const buttonNode = node.children.find(c => c.classes && c.classes.includes('cwb-slide-button'));

    // Back button
    const backBtn = document.createElement('button');
    backBtn.className = 'btn-secondary-sm';
    backBtn.style.marginBottom = '16px';
    backBtn.style.width = '100%';
    backBtn.innerHTML = '← Back to Slider Settings';
    backBtn.addEventListener('click', () => {
      if (parentSlider) {
        state.selectNode(parentSlider.id);
      }
    });
    this.specificContainer.appendChild(backBtn);

    // Header Title
    const title = document.createElement('h4');
    title.innerText = "Slide Content Settings";
    title.style.fontSize = "13px";
    title.style.marginBottom = "12px";
    title.style.fontWeight = "600";
    title.style.color = "var(--text-main)";
    this.specificContainer.appendChild(title);

    // 1. Heading Content
    if (titleNode) {
      const field = document.createElement('div');
      field.className = 'property-field';
      field.style.marginBottom = '12px';
      field.innerHTML = `<label>Heading Text</label>`;
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = titleNode.textContent || '';
      inp.addEventListener('change', () => {
        state.updateTextContent(titleNode.id, inp.value.trim());
      });
      field.appendChild(inp);
      this.specificContainer.appendChild(field);
    }

    // 2. Description Content
    if (descNode) {
      const field = document.createElement('div');
      field.className = 'property-field';
      field.style.marginBottom = '12px';
      field.innerHTML = `<label>Description Text</label>`;
      const ta = document.createElement('textarea');
      ta.style.height = '60px';
      ta.value = descNode.textContent || '';
      ta.addEventListener('change', () => {
        state.updateTextContent(descNode.id, ta.value.trim());
      });
      field.appendChild(ta);
      this.specificContainer.appendChild(field);
    }

    // 3. Button Label & Link
    if (buttonNode) {
      const field = document.createElement('div');
      field.className = 'property-field';
      field.style.marginBottom = '12px';
      field.innerHTML = `<label>Button Text</label>`;
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = buttonNode.textContent || '';
      inp.addEventListener('change', () => {
        state.updateTextContent(buttonNode.id, inp.value.trim());
      });
      field.appendChild(inp);
      this.specificContainer.appendChild(field);

      const linkField = document.createElement('div');
      linkField.className = 'property-field';
      linkField.style.marginBottom = '12px';
      linkField.innerHTML = `<label>Button Link URL</label>`;
      const urlInp = document.createElement('input');
      urlInp.type = 'text';
      urlInp.value = buttonNode.attributes.href || '';
      urlInp.addEventListener('change', () => {
        state.updateNodeAttribute(buttonNode.id, 'href', urlInp.value.trim());
      });
      linkField.appendChild(urlInp);
      this.specificContainer.appendChild(linkField);
    }

    // Divider
    const divider = document.createElement('div');
    divider.className = 'topbar-divider';
    divider.style.margin = '16px 0 12px 0';
    this.specificContainer.appendChild(divider);

    // Style Title
    const styleLabel = document.createElement('label');
    styleLabel.innerText = "Background Options";
    styleLabel.style.fontWeight = "600";
    styleLabel.style.marginBottom = "8px";
    styleLabel.style.display = "block";
    this.specificContainer.appendChild(styleLabel);

    // 4. Slide Background Color
    const bgColorField = document.createElement('div');
    bgColorField.className = 'property-field';
    bgColorField.style.marginBottom = '12px';
    bgColorField.innerHTML = `<label>Background Color</label>`;
    const bgInp = document.createElement('input');
    bgInp.type = 'text';
    bgInp.placeholder = 'e.g. #3898ec or red';
    bgInp.value = node.styles.desktop['background-color'] || '';
    bgInp.addEventListener('change', () => {
      state.updateNodeStyle(node.id, 'background-color', bgInp.value.trim());
    });
    bgColorField.appendChild(bgInp);
    this.specificContainer.appendChild(bgColorField);

    // 5. Slide Background Image
    const bgImgField = document.createElement('div');
    bgImgField.className = 'property-field';
    bgImgField.innerHTML = `<label>Background Image</label>`;

    const bgVal = node.styles.desktop['background-image'] || '';
    let bgUrlVal = '';
    if (bgVal.startsWith('url(')) {
      bgUrlVal = bgVal.replace(/url\(['"]?([^'"]+)['"]?\)/gi, '$1');
    }

    const selectorWrapper = document.createElement('div');
    selectorWrapper.className = 'image-selector-widget';
    
    const activeTab = this.slideBgTabs[node.id] || 'url';
    const isUrlActive = (activeTab === 'url');

    selectorWrapper.innerHTML = `
      <div class="image-selector-tabs">
        <button type="button" class="img-tab-btn ${isUrlActive ? 'active' : ''}" data-tab="url">URL</button>
        <button type="button" class="img-tab-btn ${!isUrlActive ? 'active' : ''}" data-tab="file">Upload</button>
      </div>
      <div class="img-tab-content ${isUrlActive ? '' : 'hidden'}" id="bg-url-content">
        <input type="text" id="bg-src-url" placeholder="https://example.com/bg.png" autocomplete="off" style="width:100%; margin-top:6px;">
      </div>
      <div class="img-tab-content ${!isUrlActive ? '' : 'hidden'}" id="bg-file-content">
        <label class="file-upload-zone" id="bg-file-zone" for="bg-file-input-${node.id}" style="margin-top:6px; display:flex;">
          <span class="upload-icon">📁</span>
          <span class="upload-text">Choose image...</span>
        </label>
        <input type="file" id="bg-file-input-${node.id}" accept="image/*" style="display:none;">
        <div class="uploaded-image-preview ${bgVal.includes('data:image/') ? '' : 'hidden'}" id="bg-file-preview" style="margin-top:6px;">
          <span class="uploaded-filename">Local Image Uploaded</span>
          <button type="button" class="btn-remove-uploaded" id="bg-file-remove">×</button>
        </div>
      </div>
    `;

    bgImgField.appendChild(selectorWrapper);
    this.specificContainer.appendChild(bgImgField);

    const tabs = selectorWrapper.querySelectorAll('.img-tab-btn');
    const urlInput = selectorWrapper.querySelector('#bg-src-url');
    urlInput.value = bgVal.includes('data:image/') ? '' : bgUrlVal;

    const fileInput = selectorWrapper.querySelector(`[type="file"]`);
    const fileZone = selectorWrapper.querySelector('#bg-file-zone');
    const filePreview = selectorWrapper.querySelector('#bg-file-preview');
    const removeBtn = selectorWrapper.querySelector('#bg-file-remove');

    tabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.slideBgTabs[node.id] = btn.getAttribute('data-tab');
        this.render();
      });
    });

    urlInput.addEventListener('change', () => {
      const val = urlInput.value.trim();
      if (val) {
        state.updateNodeStyle(node.id, 'background-image', `url("${val}")`);
      } else {
        state.updateNodeStyle(node.id, 'background-image', null);
      }
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          state.updateNodeStyle(node.id, 'background-image', `url("${ev.target.result}")`);
          this.render();
        };
        reader.readAsDataURL(file);
      }
    });

    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      state.updateNodeStyle(node.id, 'background-image', null);
      this.render();
    });

    // Add unique ID name setting field
    const idField = document.createElement('div');
    idField.className = 'property-field';
    idField.style.marginTop = '16px';
    idField.style.marginBottom = '12px';
    idField.innerHTML = `<label>Unique Element Name (ID)</label>`;
    const idInp = document.createElement('input');
    idInp.type = 'text';
    idInp.value = node.attributes['id'] || '';
    idInp.placeholder = 'Unique reference name...';
    idInp.addEventListener('change', () => {
      state.updateAttribute('id', idInp.value.trim());
    });
    idField.appendChild(idInp);
    this.specificContainer.appendChild(idField);
  }
}

