import { state } from '../state.js';

export class StylesPanelController {
  constructor() {
    this.classInput = document.getElementById('class-input');
    this.classChipsList = document.getElementById('class-chips-list');
    this.stateChipsList = document.getElementById('state-chips-list');
    this.classModeBadge = document.getElementById('class-mode-badge');
    this.classSuggestions = document.getElementById('class-dropdown-suggestions');
    
    // Layout sub containers
    this.flexOptions = document.getElementById('flex-options-container');
    this.gridOptions = document.getElementById('grid-options-container');

    this.init();
  }

  init() {
    // Setup general inputs mapping: inputs with [data-prop] (excluding those inside an input group)
    const styleInputs = Array.from(document.querySelectorAll('input[data-prop], select[data-prop]'))
      .filter(input => !input.closest('.input-group'));
    
    styleInputs.forEach(input => {
      const prop = input.getAttribute('data-prop');

      // Bind input events
      const handleChange = () => {
        state.updateStyle(prop, input.value);
      };

      input.addEventListener('change', handleChange);
      input.addEventListener('input', () => {
        // Live updates for fields like text align or color sliders
        if (input.type === 'color' || input.type === 'text') {
          handleChange();
        }
      });
    });

    // Setup input groups (inputs with unit selectors)
    const inputGroups = document.querySelectorAll('.input-group');
    inputGroups.forEach(group => {
      const input = group.querySelector('input[data-prop]');
      const select = group.querySelector('select.unit-select');
      if (!input || !select) return;

      const prop = input.getAttribute('data-prop');

      const handleGroupChange = () => {
        const val = input.value.trim();
        const unit = select.value;

        if (unit === 'auto') {
          input.value = ''; // clear visual input
          state.updateStyle(prop, 'auto');
        } else if (unit === 'fit-content') {
          input.value = ''; // clear visual input
          state.updateStyle(prop, 'fit-content');
        } else {
          if (val === '') {
            state.updateStyle(prop, null); // clear style override
          } else {
            // Append unit
            state.updateStyle(prop, val + unit);
          }
        }
      };

      input.addEventListener('change', handleGroupChange);
      input.addEventListener('input', handleGroupChange);
      select.addEventListener('change', () => {
        if (select.value === 'auto' || select.value === 'fit-content') {
          input.value = '';
        }
        handleGroupChange();
      });
    });

    // Special binding for color pickers + hex inputs sync
    this.setupColorSync('text-color-picker', 'color');
    this.setupColorSync('bg-color-picker', 'background-color');
    this.setupColorSync('border-color-picker', 'border-color');

    // Bind link buttons for global variables popover
    this.setupThemeLinkButtons();

    // Bind choice buttons (like Display toggles or Text Align toggles)
    const choiceButtons = document.querySelectorAll('.btn-choice[data-prop]');
    choiceButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const prop = btn.getAttribute('data-prop');
        const val = btn.getAttribute('data-val');
        
        // Toggle active visual states
        const siblings = btn.parentElement.querySelectorAll('.btn-choice');
        siblings.forEach(s => s.classList.remove('active'));
        
        // If clicking already active display choice, clear it, otherwise apply
        const currentVal = state.getStyle(prop);
        if (currentVal === val) {
          state.updateStyle(prop, null);
        } else {
          btn.classList.add('active');
          state.updateStyle(prop, val);
        }
      });
    });

    // Spacing inputs box setup (margin & padding)
    this.setupSpacingWidget();

    // Setup selector class management inputs
    this.setupClassManager();

    // Setup opacity and box shadow widgets
    this.setupOpacitySync();
    this.setupBoxShadowWidget();
    this.setupBackgroundImageWidget();
    this.setupTransformWidget();

    // Setup side-specific border and radius widgets
    this.setupBorderWidget();
    this.setupRadiusWidget();

    // Accordions collapsible header setup
    const accordionHeaders = document.querySelectorAll('.section-accordion-header');
    accordionHeaders.forEach(header => {
      header.addEventListener('click', () => {
        header.classList.toggle('active');
        const content = header.nextElementSibling;
        if (content) {
          content.classList.toggle('active');
        }
      });
    });

    // Setup state selector dropdown
    this.stateSelect = document.getElementById('style-state-select');
    if (this.stateSelect) {
      this.stateSelect.addEventListener('change', () => {
        state.activeState = this.stateSelect.value;
        this.syncAllProperties();
      });
    }

    // Subscribe to state changes to reload values
    state.on('selectionChange', () => {
      if (this.stateSelect) {
        this.stateSelect.value = 'normal';
        state.activeState = 'normal';
      }
      this.syncAllProperties(true);
    });
    state.on('change', () => this.syncAllProperties(false));
    state.on('breakpointChange', () => this.syncAllProperties(false));

    this.syncAllProperties(true);
  }

  // Setup visual color input picker link
  setupColorSync(pickerId, styleProp) {
    const picker = document.getElementById(pickerId);
    const textVal = document.querySelector(`input[data-prop="${styleProp}"]`);
    if (!picker || !textVal) return;

    picker.addEventListener('input', () => {
      textVal.value = picker.value;
      state.updateStyle(styleProp, picker.value);
    });

    textVal.addEventListener('change', () => {
      if (textVal.value.startsWith('#')) {
        picker.value = textVal.value;
      }
      state.updateStyle(styleProp, textVal.value);
    });
  }

  // Visual spacing inputs setup with click-and-drag slider adjustment
  setupSpacingWidget() {
    const spacingInputs = document.querySelectorAll('.spacing-input[data-spacing-prop]');
    
    spacingInputs.forEach(input => {
      const prop = input.getAttribute('data-spacing-prop');
      
      // Update state on normal type change
      input.addEventListener('change', () => {
        let val = input.value.trim();
        if (val !== "" && !isNaN(val) && !val.endsWith('px') && !val.endsWith('%') && !val.endsWith('em') && !val.endsWith('rem') && val !== 'auto') {
          val += 'px'; // Auto append px units
        }
        state.updateStyle(prop, val);
      });

      // Click & Drag Slider
      let isDragging = false;
      let startX = 0;
      let startValue = 0;

      input.addEventListener('mousedown', (e) => {
        // Only trigger drag if it is click + drag (not typing focus)
        if (document.activeElement === input) return;
        
        isDragging = true;
        startX = e.clientX;
        
        // Parse current value
        const currentStr = state.getStyle(prop) || '0px';
        startValue = parseInt(currentStr, 10) || 0;
        
        document.body.style.cursor = 'ew-resize';
        
        const onMouseMove = (moveEv) => {
          if (!isDragging) return;
          const deltaX = moveEv.clientX - startX;
          // Scale drag sensitivity
          const deltaValue = Math.round(deltaX / 3);
          const newValue = Math.max(0, startValue + deltaValue);
          
          input.value = newValue;
          state.updateStyle(prop, newValue + 'px');
        };

        const onMouseUp = () => {
          isDragging = false;
          document.body.style.cursor = 'default';
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
  }

  // Selector class mapping controllers
  setupClassManager() {
    this.classInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = this.classInput.value.trim();
        if (val) {
          const node = state.getSelectedNode();
          if (node) {
            state.addNodeClass(node.id, val);
            this.classInput.value = '';
          }
        }
      }
    });

    this.classModeBadge.addEventListener('click', () => {
      // Toggle back to inline direct element editing
      state.setActiveClass(null);
    });
  }

  updateFieldLabelState(prop, inputEl) {
    const parentField = inputEl.closest('.property-field') || inputEl.closest('.property-row');
    if (!parentField) return;

    const label = parentField.querySelector('label');
    if (label) {
      // Reset styling
      label.style.color = '';
      label.style.fontWeight = '';
    }

    const isOverride = state.isStyleOverride(prop);
    const hasValue = state.getStyle(prop) !== "";

    // Target the input group, color picker input, btn group or input itself
    const targetEl = parentField.querySelector('.input-group') || 
                     parentField.querySelector('.color-picker-input') || 
                     parentField.querySelector('.btn-group') || 
                     inputEl;

    if (targetEl) {
      targetEl.classList.remove('cwb-override', 'cwb-inherited');
      if (isOverride) {
        targetEl.classList.add('cwb-override');
      } else if (hasValue) {
        targetEl.classList.add('cwb-inherited');
      }
    }
  }

  setupOpacitySync() {
    const slider = document.getElementById('opacity-slider');
    const number = document.getElementById('opacity-number');
    if (!slider || !number) return;

    slider.addEventListener('input', () => {
      number.value = slider.value;
      state.updateStyle('opacity', slider.value);
    });

    number.addEventListener('change', () => {
      let val = parseFloat(number.value);
      if (isNaN(val) || val < 0) val = 0;
      if (val > 1) val = 1;
      slider.value = val;
      number.value = val;
      state.updateStyle('opacity', val.toString());
    });
  }

  setupBoxShadowWidget() {
    const xInput = document.getElementById('shadow-x');
    const yInput = document.getElementById('shadow-y');
    const blurInput = document.getElementById('shadow-blur');
    const spreadInput = document.getElementById('shadow-spread');
    const colorPicker = document.getElementById('shadow-color-picker');
    const colorVal = document.getElementById('shadow-color-val');

    if (!xInput || !yInput || !blurInput || !spreadInput || !colorPicker || !colorVal) return;

    const handleShadowChange = () => {
      const x = xInput.value.trim() === '' ? '0' : xInput.value.trim();
      const y = yInput.value.trim() === '' ? '0' : yInput.value.trim();
      const blur = blurInput.value.trim() === '' ? '0' : blurInput.value.trim();
      const spread = spreadInput.value.trim() === '' ? '0' : spreadInput.value.trim();
      const color = colorVal.value.trim() === '' ? 'rgba(0,0,0,0.2)' : colorVal.value.trim();

      const shadowStr = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
      
      if (x === '0' && y === '0' && blur === '0' && spread === '0' && color === 'rgba(0,0,0,0.2)') {
        state.updateStyle('box-shadow', null);
      } else {
        state.updateStyle('box-shadow', shadowStr);
      }
    };

    [xInput, yInput, blurInput, spreadInput].forEach(input => {
      input.addEventListener('change', handleShadowChange);
      input.addEventListener('input', handleShadowChange);
    });

    colorPicker.addEventListener('input', () => {
      colorVal.value = colorPicker.value;
      handleShadowChange();
    });

    colorVal.addEventListener('change', () => {
      if (colorVal.value.startsWith('#')) {
        colorPicker.value = colorVal.value;
      }
      handleShadowChange();
    });
  }

  setupBackgroundImageWidget() {
    const widget = document.querySelector('.image-selector-widget[data-image-target="background"]');
    if (!widget) return;

    const tabs = widget.querySelectorAll('.img-tab-btn');
    const urlContent = widget.querySelector('#bg-image-url-content');
    const fileContent = widget.querySelector('#bg-image-file-content');
    const bgImageInput = widget.querySelector('#bg-image-input');
    const fileInput = widget.querySelector('#bg-file-input');
    const fileZone = widget.querySelector('#bg-file-zone');
    const filePreview = widget.querySelector('#bg-file-preview');
    const fileNameSpan = widget.querySelector('#bg-file-name');
    const removeBtn = widget.querySelector('#bg-file-remove');

    // Tab selection change
    tabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        tabs.forEach(t => t.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.getAttribute('data-tab');
        widget.dataset.activeTab = tab; // Track active tab
        if (tab === 'url') {
          urlContent.classList.remove('hidden');
          fileContent.classList.add('hidden');
        } else {
          urlContent.classList.add('hidden');
          fileContent.classList.remove('hidden');
        }
      });
    });

    // URL input change
    bgImageInput.addEventListener('change', () => {
      let val = bgImageInput.value.trim();
      if (val === '') {
        state.updateStyle('background-image', null);
      } else {
        if (!val.startsWith('url(') && val !== 'none') {
          val = `url("${val}")`;
        }
        state.updateStyle('background-image', val);
      }
      // Clear file upload input and preview on URL change
      fileInput.value = '';
      filePreview.classList.add('hidden');
      fileZone.classList.remove('hidden');
    });

    // File loading reader
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          state.updateStyle('background-image', `url("${dataUrl}")`);
          
          fileNameSpan.innerText = file.name;
          fileNameSpan.setAttribute('title', file.name);
          filePreview.classList.remove('hidden');
          fileZone.classList.add('hidden');
          
          // Clear URL input value on file upload
          bgImageInput.value = '';
        };
        reader.readAsDataURL(file);
      }
    });

    // Remove uploaded file
    removeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileInput.value = '';
      filePreview.classList.add('hidden');
      fileZone.classList.remove('hidden');
      state.updateStyle('background-image', null);
      bgImageInput.value = '';
    });
  }

  setupTransformWidget() {
    const rotateSlider = document.getElementById('transform-rotate');
    const rotateNumber = document.getElementById('transform-rotate-number');
    const scaleX = document.getElementById('transform-scale-x');
    const scaleY = document.getElementById('transform-scale-y');
    const translateX = document.getElementById('transform-translate-x');
    const translateXUnit = document.getElementById('transform-translate-x-unit');
    const translateY = document.getElementById('transform-translate-y');
    const translateYUnit = document.getElementById('transform-translate-y-unit');

    if (!rotateSlider || !rotateNumber || !scaleX || !scaleY || !translateX || !translateXUnit || !translateY || !translateYUnit) return;

    const handleTransformChange = () => {
      const rotate = rotateSlider.value || '0';
      const sx = scaleX.value || '1';
      const sy = scaleY.value || '1';
      const txVal = translateX.value.trim() || '0';
      const txUnit = translateXUnit.value;
      const tyVal = translateY.value.trim() || '0';
      const tyUnit = translateYUnit.value;

      const parts = [];
      if (rotate !== '0') parts.push(`rotate(${rotate}deg)`);
      if (sx !== '1' || sy !== '1') {
        if (sx === sy) {
          parts.push(`scale(${sx})`);
        } else {
          parts.push(`scale(${sx}, ${sy})`);
        }
      }
      if (txVal !== '0' || tyVal !== '0') {
        const tx = txVal === '0' ? '0' : txVal + txUnit;
        const ty = tyVal === '0' ? '0' : tyVal + tyUnit;
        parts.push(`translate(${tx}, ${ty})`);
      }

      if (parts.length === 0) {
        state.updateStyle('transform', null);
      } else {
        state.updateStyle('transform', parts.join(' '));
      }
    };

    rotateSlider.addEventListener('input', () => {
      rotateNumber.value = rotateSlider.value;
      handleTransformChange();
    });
    rotateNumber.addEventListener('change', () => {
      let val = parseInt(rotateNumber.value, 10);
      if (isNaN(val)) val = 0;
      if (val < -180) val = -180;
      if (val > 180) val = 180;
      rotateSlider.value = val;
      rotateNumber.value = val;
      handleTransformChange();
    });

    [scaleX, scaleY].forEach(input => {
      input.addEventListener('change', handleTransformChange);
      input.addEventListener('input', handleTransformChange);
    });

    [translateX, translateXUnit, translateY, translateYUnit].forEach(input => {
      input.addEventListener('change', handleTransformChange);
      if (input.tagName === 'INPUT') {
        input.addEventListener('input', handleTransformChange);
      }
    });
  }

  parseBoxShadow(val) {
    if (!val || val === 'none') {
      return { x: '0', y: '0', blur: '0', spread: '0', color: '#000000' };
    }
    
    const colorMatch = val.match(/(rgba?\([^)]+\)|#[a-fA-F0-9]{3,8}|[a-zA-Z]+)/);
    const color = colorMatch ? colorMatch[0] : '#000000';
    
    const remainder = val.replace(color, '').trim();
    const parts = remainder.split(/\s+/).map(p => p.trim());
    
    return {
      x: parts[0] ? parseInt(parts[0], 10).toString() : '0',
      y: parts[1] ? parseInt(parts[1], 10).toString() : '0',
      blur: parts[2] ? parseInt(parts[2], 10).toString() : '0',
      spread: parts[3] ? parseInt(parts[3], 10).toString() : '0',
      color: color
    };
  }

  parseValueAndUnit(val) {
    if (!val) return { value: '', unit: 'px' };
    if (val === 'auto') return { value: '', unit: 'auto' };
    if (val === 'fit-content') return { value: '', unit: 'fit-content' };
    
    // Parse numeric value and unit
    const match = val.match(/^([\d.-]+)(px|%|rem|em|vw|vh|auto|fit-content)?$/);
    if (match) {
      return {
        value: match[1],
        unit: match[2] || 'px'
      };
    }
    
    return { value: val, unit: 'px' };
  }

  parseTransform(val) {
    const result = { rotate: '0', scaleX: '1', scaleY: '1', translateX: '0', translateY: '0' };
    if (!val || val === 'none') return result;

    const rotateMatch = val.match(/rotate\(([^)]+)\)/);
    const scaleXMatch = val.match(/scaleX\(([^)]+)\)/) || val.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
    const scaleYMatch = val.match(/scaleY\(([^)]+)\)/);
    const translateXMatch = val.match(/translateX\(([^)]+)\)/) || val.match(/translate\(([^,)]+)(?:,\s*([^)]+))?\)/);
    const translateYMatch = val.match(/translateY\(([^)]+)\)/);

    if (rotateMatch) result.rotate = rotateMatch[1].replace('deg', '');
    if (scaleXMatch) {
      if (val.includes('scale(')) {
        const parts = val.match(/scale\(([^)]+)\)/)[1].split(',');
        result.scaleX = parts[0].trim();
        result.scaleY = parts[1] ? parts[1].trim() : parts[0].trim();
      } else {
        result.scaleX = scaleXMatch[1];
      }
    }
    if (scaleYMatch) result.scaleY = scaleYMatch[1];
    if (translateXMatch) {
      if (val.includes('translate(')) {
        const parts = val.match(/translate\(([^)]+)\)/)[1].split(',');
        result.translateX = parts[0].trim();
        result.translateY = parts[1] ? parts[1].trim() : '0';
      } else {
        result.translateX = translateXMatch[1];
      }
    }
    if (translateYMatch) result.translateY = translateYMatch[1];

    return result;
  }

  // Synchronize values from JSON state back to fields
  syncAllProperties(isSelectionChange = false) {
    const node = state.getSelectedNode();
    
    // Disable rightbar if no node selected (or root select block)
    const rightbar = document.querySelector('.cwb-rightbar');
    if (!node) {
      rightbar.style.pointerEvents = 'none';
      rightbar.style.opacity = '0.4';
      return;
    } else {
      rightbar.style.pointerEvents = 'auto';
      rightbar.style.opacity = '1';
    }

    // Dynamic fonts dropdown populate
    this.updateFontFamilyDropdown();

    // --- Sync Selector Class UI ---
    this.syncClassSelectorPanel(node);

    // --- Sync display state and visible options containers ---
    const displayVal = state.getStyle('display') || 'block';
    
    // Toggle flex / grid settings options accordion section
    this.flexOptions.classList.toggle('hidden', displayVal !== 'flex');
    this.gridOptions.classList.toggle('hidden', displayVal !== 'grid');

    // --- Sync inputs & selects (excluding input groups) ---
    const styleInputs = Array.from(document.querySelectorAll('input[data-prop], select[data-prop]'))
      .filter(input => !input.closest('.input-group'));
    
    styleInputs.forEach(input => {
      const prop = input.getAttribute('data-prop');
      const val = state.getStyle(prop);
      
      const colorContainer = input.closest('.color-picker-input');
      if (colorContainer && (prop === 'color' || prop === 'background-color' || prop === 'border-color')) {
        this.syncColorLinkPill(colorContainer, prop, val);
      }
      
      if (input.type === 'color') {
        // Enforce hex representation
        if (val && val.startsWith('#')) {
          input.value = val;
        } else {
          input.value = '#000000';
        }
      } else {
        if (document.activeElement !== input) {
          input.value = val || '';
        }
        
        // Sync color picker swatches in the reverse direction
        if (prop === 'color') {
          const textPicker = document.getElementById('text-color-picker');
          if (textPicker) textPicker.value = (val && val.startsWith('#')) ? val : '#000000';
        } else if (prop === 'background-color') {
          const bgPicker = document.getElementById('bg-color-picker');
          if (bgPicker) bgPicker.value = (val && val.startsWith('#')) ? val : '#000000';
        } else if (prop === 'border-color') {
          const borderPicker = document.getElementById('border-color-picker');
          if (borderPicker) borderPicker.value = (val && val.startsWith('#')) ? val : '#000000';
        }
      }

      this.updateFieldLabelState(prop, input);
    });

    // --- Sync input groups (with units) ---
    const inputGroups = document.querySelectorAll('.input-group');
    inputGroups.forEach(group => {
      const input = group.querySelector('input[data-prop]');
      const select = group.querySelector('select.unit-select');
      if (!input || !select) return;

      const prop = input.getAttribute('data-prop');
      const val = state.getStyle(prop);

      if (document.activeElement !== input) {
        if (val) {
          const parsed = this.parseValueAndUnit(val);
          input.value = parsed.value;
          if (Array.from(select.options).some(opt => opt.value === parsed.unit)) {
            select.value = parsed.unit;
          } else {
            select.value = select.options[0].value;
          }
        } else {
          input.value = '';
          if (Array.from(select.options).some(opt => opt.value === 'px')) {
            select.value = 'px';
          } else {
            select.value = select.options[0].value;
          }
        }
      }

      this.updateFieldLabelState(prop, input);
    });

    // --- Sync Spacing inputs widget ---
    const spacingInputs = document.querySelectorAll('.spacing-input[data-spacing-prop]');
    spacingInputs.forEach(input => {
      const prop = input.getAttribute('data-spacing-prop');
      const val = state.getStyle(prop);
      // Strip units like px for cleaner view
      if (document.activeElement !== input) {
        if (val) {
          input.value = val.replace('px', '');
        } else {
          input.value = '';
        }
      }

      // Color coding spacing numbers: blue if override, orange if inherited
      const isOverride = state.isStyleOverride(prop);
      const hasValue = val !== "";
      if (isOverride) {
        input.style.color = '#3898EC';
        input.style.fontWeight = '700';
      } else if (hasValue) {
        input.style.color = '#ffaa33';
        input.style.fontWeight = '700';
      } else {
        input.style.color = '';
        input.style.fontWeight = '';
      }
    });

    // --- Sync choice buttons toggles active state ---
    const choiceButtons = document.querySelectorAll('.btn-choice[data-prop]');
    choiceButtons.forEach(btn => {
      const prop = btn.getAttribute('data-prop');
      const val = btn.getAttribute('data-val');
      const currentVal = state.getStyle(prop);
      
      btn.classList.toggle('active', currentVal === val);
      this.updateFieldLabelState(prop, btn);
    });

    // --- Sync Opacity ---
    const opacityVal = state.getStyle('opacity');
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityNumber = document.getElementById('opacity-number');
    if (opacitySlider && opacityNumber) {
      const v = opacityVal !== "" ? parseFloat(opacityVal) : 1;
      opacitySlider.value = v;
      opacityNumber.value = opacityVal || '';
      this.updateFieldLabelState('opacity', opacityNumber);
    }

    // --- Sync Box Shadow ---
    const shadowVal = state.getStyle('box-shadow');
    const xInput = document.getElementById('shadow-x');
    const yInput = document.getElementById('shadow-y');
    const blurInput = document.getElementById('shadow-blur');
    const spreadInput = document.getElementById('shadow-spread');
    const colorPicker = document.getElementById('shadow-color-picker');
    const colorVal = document.getElementById('shadow-color-val');

    if (xInput && yInput && blurInput && spreadInput && colorPicker && colorVal) {
      const parsed = this.parseBoxShadow(shadowVal);
      xInput.value = parsed.x;
      yInput.value = parsed.y;
      blurInput.value = parsed.blur;
      spreadInput.value = parsed.spread;
      colorVal.value = shadowVal ? parsed.color : '';
      if (parsed.color.startsWith('#')) {
        colorPicker.value = parsed.color;
      } else {
        colorPicker.value = '#000000';
      }
      this.updateFieldLabelState('box-shadow', xInput);
    }

    // --- Sync Background Image ---
    const widget = document.querySelector('.image-selector-widget[data-image-target="background"]');
    if (widget) {
      const tabs = widget.querySelectorAll('.img-tab-btn');
      const urlContent = widget.querySelector('#bg-image-url-content');
      const fileContent = widget.querySelector('#bg-image-file-content');
      const bgImageInput = widget.querySelector('#bg-image-input');
      const fileZone = widget.querySelector('#bg-file-zone');
      const filePreview = widget.querySelector('#bg-file-preview');
      const fileNameSpan = widget.querySelector('#bg-file-name');

      const bgImageVal = state.getStyle('background-image') || '';
      
      // Auto-detect tab only on element selection change
      if (isSelectionChange) {
        if (bgImageVal.includes('data:image/')) {
          widget.dataset.activeTab = 'file';
        } else {
          widget.dataset.activeTab = 'url';
        }
      }

      // Default active tab to url
      if (!widget.dataset.activeTab) {
        widget.dataset.activeTab = 'url';
      }

      const activeTab = widget.dataset.activeTab;

      // Sync active tab buttons classes and content containers visibility
      tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === activeTab));
      if (activeTab === 'url') {
        urlContent.classList.remove('hidden');
        fileContent.classList.add('hidden');
      } else {
        urlContent.classList.add('hidden');
        fileContent.classList.remove('hidden');
      }

      // Sync field values and previews
      if (bgImageVal.includes('data:image/')) {
        filePreview.classList.remove('hidden');
        fileZone.classList.add('hidden');
        fileNameSpan.innerText = "Local Image Uploaded";
        if (activeTab === 'url') {
          bgImageInput.value = '';
        }
      } else {
        filePreview.classList.add('hidden');
        fileZone.classList.remove('hidden');

        const match = bgImageVal.match(/^url\(['"]?([^'"]+)['"]?\)$/i);
        bgImageInput.value = match ? match[1] : bgImageVal;
      }
      this.updateFieldLabelState('background-image', bgImageInput);
    }

    // --- Sync Transforms ---
    const rotateSlider = document.getElementById('transform-rotate');
    const rotateNumber = document.getElementById('transform-rotate-number');
    const scaleX = document.getElementById('transform-scale-x');
    const scaleY = document.getElementById('transform-scale-y');
    const translateX = document.getElementById('transform-translate-x');
    const translateXUnit = document.getElementById('transform-translate-x-unit');
    const translateY = document.getElementById('transform-translate-y');
    const translateYUnit = document.getElementById('transform-translate-y-unit');

    if (rotateSlider && rotateNumber && scaleX && scaleY && translateX && translateXUnit && translateY && translateYUnit) {
      const transformVal = state.getStyle('transform');
      const parsed = this.parseTransform(transformVal);
      
      rotateSlider.value = parsed.rotate;
      rotateNumber.value = parsed.rotate === '0' ? '' : parsed.rotate;
      scaleX.value = parsed.scaleX;
      scaleY.value = parsed.scaleY;

      if (parsed.translateX && parsed.translateX !== '0') {
        const txParsed = this.parseValueAndUnit(parsed.translateX);
        translateX.value = txParsed.value;
        translateXUnit.value = txParsed.unit || 'px';
      } else {
        translateX.value = '';
        translateXUnit.value = 'px';
      }

      if (parsed.translateY && parsed.translateY !== '0') {
        const tyParsed = this.parseValueAndUnit(parsed.translateY);
        translateY.value = tyParsed.value;
        translateYUnit.value = tyParsed.unit || 'px';
      } else {
        translateY.value = '';
        translateYUnit.value = 'px';
      }

      this.updateFieldLabelState('transform', rotateNumber);
    }

    // Sync border side widget
    if (this.syncBorderWidget) {
      this.syncBorderWidget();
    }
    // Sync radius widget
    if (this.syncRadiusWidget) {
      this.syncRadiusWidget();
    }

    // --- Toggle Transition settings visibility ---
    const transitionContainer = document.getElementById('transition-options-container');
    if (transitionContainer) {
      const hasPseudoStyles = () => {
        if (!node) return false;
        const checkObj = (obj) => {
          if (!obj) return false;
          return Object.keys(obj).some(k => k.startsWith('hover:') || k.startsWith('active:') || k.startsWith('focus:'));
        };
        // Check element inline styles
        if (node.styles) {
          if (node.styles.desktop && checkObj(node.styles.desktop)) return true;
          if (node.styles.tablet && checkObj(node.styles.tablet)) return true;
          if (node.styles.mobile && checkObj(node.styles.mobile)) return true;
        }
        // Check element classes styles
        if (node.classes) {
          for (const cls of node.classes) {
            const classRules = state.doc.classes[cls];
            if (classRules) {
              if (classRules.desktop && checkObj(classRules.desktop)) return true;
              if (classRules.tablet && checkObj(classRules.tablet)) return true;
              if (classRules.mobile && checkObj(classRules.mobile)) return true;
            }
          }
        }
        return false;
      };

      // Visible if actively editing hover/focus state or if element already has hover/focus styles defined
      const visible = (state.activeState !== 'normal') || hasPseudoStyles();
      transitionContainer.classList.toggle('hidden', !visible);
    }
  }

  syncClassSelectorPanel(node) {
    this.classChipsList.innerHTML = '';
    if (this.stateChipsList) this.stateChipsList.innerHTML = '';

    // Render chips
    if (node.classes) {
      node.classes.forEach(cls => {
        const chip = document.createElement('span');
        chip.className = 'class-chip';
        if (state.activeClass === cls) {
          chip.classList.add('active');
        }
        chip.innerText = cls;

        // Click chip to switch stylesheet target
        chip.addEventListener('click', () => {
          if (state.activeClass === cls) {
            state.setActiveClass(null);
          } else {
            state.setActiveClass(cls);
          }
        });

        // Close icon to detach class
        const removeBtn = document.createElement('span');
        removeBtn.className = 'class-chip-remove';
        removeBtn.innerText = '×';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          state.removeNodeClass(node.id, cls);
        });

        chip.appendChild(removeBtn);
        this.classChipsList.appendChild(chip);
      });
    }

    // Scan for and render applied pseudo-states
    if (this.stateChipsList) {
      const appliedStates = new Set();
      const checkStylesForStates = (stylesObj) => {
        if (!stylesObj) return;
        Object.values(stylesObj).forEach(breakpointStyles => {
          if (!breakpointStyles) return;
          Object.keys(breakpointStyles).forEach(key => {
            if (key.startsWith('hover:')) appliedStates.add('hover');
            if (key.startsWith('active:')) appliedStates.add('active');
            if (key.startsWith('focus:')) appliedStates.add('focus');
          });
        });
      };

      if (state.activeClass) {
        const classStyles = state.doc.classes[state.activeClass];
        checkStylesForStates(classStyles);
      } else if (node && node.styles) {
        checkStylesForStates(node.styles);
      }

      appliedStates.forEach(s => {
        const chip = document.createElement('span');
        chip.className = 'state-chip';
        if (state.activeState === s) {
          chip.classList.add('active');
        }

        const label = document.createElement('span');
        label.innerText = `:${s}`;
        chip.appendChild(label);

        // Close icon to clear state styles
        const removeBtn = document.createElement('span');
        removeBtn.className = 'class-chip-remove';
        removeBtn.innerText = '×';
        removeBtn.title = `Clear all styles for :${s}`;
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          state.clearStateStyles(s);
          if (state.activeState === s) {
            state.activeState = 'normal';
            if (this.stateSelect) this.stateSelect.value = 'normal';
          }
          this.syncAllProperties();
        });

        chip.appendChild(removeBtn);

        chip.addEventListener('click', (e) => {
          if (e.target.closest('.class-chip-remove')) return;
          if (state.activeState === s) {
            state.activeState = 'normal';
            if (this.stateSelect) this.stateSelect.value = 'normal';
          } else {
            state.activeState = s;
            if (this.stateSelect) this.stateSelect.value = s;
          }
          this.syncAllProperties();
        });

        this.stateChipsList.appendChild(chip);
      });
    }

    // Update style targeting state mode badge label
    if (state.activeClass) {
      this.classModeBadge.innerText = `Class: ${state.activeClass}`;
      this.classModeBadge.className = 'mode-badge class-mode';
      this.classModeBadge.title = `Styling class globally. All elements with .${state.activeClass} will receive these updates. Click to switch to inline styles.`;
    } else {
      this.classModeBadge.innerText = 'Element override';
      this.classModeBadge.className = 'mode-badge inline-mode';
    }
  }

  setupBorderWidget() {
    this.borderSidesConfigured = false;
    this.selectedBorderSides = new Set(['top', 'right', 'bottom', 'left']); // All sides selected by default

    const toggleBtn = document.getElementById('btn-toggle-border-sides');
    const globalContainer = document.getElementById('global-border-container');
    const visualContainer = document.getElementById('visual-border-container');

    const sideButtons = document.querySelectorAll('.border-side-btn');
    const sideTextLabel = document.getElementById('active-border-side-text');

    const styleSelect = document.getElementById('border-style-select');
    const widthInput = document.getElementById('border-width-input');
    const widthUnit = document.getElementById('border-width-unit');
    const colorPicker = document.getElementById('border-color-picker-widget');
    const colorInput = document.getElementById('border-color-input-widget');

    if (!toggleBtn || !globalContainer || !visualContainer || !sideTextLabel || !styleSelect || !widthInput || !widthUnit || !colorPicker || !colorInput) return;

    // Helper to get common style value across selected sides
    const getCommonValue = (propSuffix) => {
      if (this.selectedBorderSides.size === 0) return '';
      let commonVal = undefined;
      let isFirst = true;
      for (const side of this.selectedBorderSides) {
        const propName = `border-${side}-${propSuffix}`;
        const val = state.getStyle(propName);
        if (isFirst) {
          commonVal = val;
          isFirst = false;
        } else if (commonVal !== val) {
          return ''; // Mixed
        }
      }
      return commonVal || '';
    };

    const updateButtonsUI = () => {
      sideButtons.forEach(btn => {
        const side = btn.getAttribute('data-side');
        if (side === 'all') {
          // All button is active if all 4 sides are selected
          const allSelected = ['top', 'right', 'bottom', 'left'].every(s => this.selectedBorderSides.has(s));
          btn.classList.toggle('active', allSelected);
        } else {
          btn.classList.toggle('active', this.selectedBorderSides.has(side));
        }
      });

      // Update side text label
      if (['top', 'right', 'bottom', 'left'].every(s => this.selectedBorderSides.has(s))) {
        sideTextLabel.innerText = 'All Borders';
      } else if (this.selectedBorderSides.size === 0) {
        sideTextLabel.innerText = 'Select sides to configure';
      } else {
        const sortedSides = ['top', 'right', 'bottom', 'left']
          .filter(s => this.selectedBorderSides.has(s))
          .map(s => s.charAt(0).toUpperCase() + s.slice(1));
        sideTextLabel.innerText = sortedSides.join(', ');
      }
    };

    const syncWidgetValues = () => {
      // Auto-detect if side-specific borders are set
      const sideProps = [
        'border-top-style', 'border-top-width', 'border-top-color',
        'border-right-style', 'border-right-width', 'border-right-color',
        'border-bottom-style', 'border-bottom-width', 'border-bottom-color',
        'border-left-style', 'border-left-width', 'border-left-color'
      ];
      
      const hasSideOverrides = sideProps.some(prop => state.isStyleOverride(prop) || state.getStyle(prop) !== "");
      
      if (hasSideOverrides && !this.borderSidesConfigured) {
        this.borderSidesConfigured = true;
      }

      if (this.borderSidesConfigured) {
        toggleBtn.innerText = 'Use global border';
        globalContainer.classList.add('hidden');
        visualContainer.classList.remove('hidden');
      } else {
        toggleBtn.innerText = 'Configure sides';
        globalContainer.classList.remove('hidden');
        visualContainer.classList.add('hidden');
      }

      if (this.borderSidesConfigured) {
        // Sync side-specific inputs based on selected sides
        const styleVal = getCommonValue('style');
        const widthVal = getCommonValue('width');
        const colorVal = getCommonValue('color');

        styleSelect.value = styleVal;

        if (widthVal) {
          const parsed = this.parseValueAndUnit(widthVal);
          widthInput.value = parsed.value;
          widthUnit.value = parsed.unit || 'px';
        } else {
          widthInput.value = '';
          widthUnit.value = 'px';
        }

        colorInput.value = colorVal;
        if (colorVal && colorVal.startsWith('#')) {
          colorPicker.value = colorVal;
        } else {
          colorPicker.value = '#000000';
        }

        updateButtonsUI();

        // Update labels for overrides
        this.selectedBorderSides.forEach(side => {
          this.updateFieldLabelState(`border-${side}-style`, styleSelect);
          this.updateFieldLabelState(`border-${side}-width`, widthInput);
          this.updateFieldLabelState(`border-${side}-color`, colorInput);
        });
      }
    };

    // Toggle button handler
    toggleBtn.addEventListener('click', () => {
      this.borderSidesConfigured = !this.borderSidesConfigured;

      const origSaveHistory = state.saveHistory;
      let changed = false;
      state.saveHistory = () => { changed = true; };

      if (this.borderSidesConfigured) {
        // Switching to configure sides: migrate global to side-specific
        const globalStyle = state.getStyle('border-style');
        const globalWidth = state.getStyle('border-width');
        const globalColor = state.getStyle('border-color');

        ['top', 'right', 'bottom', 'left'].forEach(side => {
          if (globalStyle) state.updateStyle(`border-${side}-style`, globalStyle);
          if (globalWidth) state.updateStyle(`border-${side}-width`, globalWidth);
          if (globalColor) state.updateStyle(`border-${side}-color`, globalColor);
        });

        state.updateStyle('border-style', null);
        state.updateStyle('border-width', null);
        state.updateStyle('border-color', null);

        this.selectedBorderSides = new Set(['top', 'right', 'bottom', 'left']);
      } else {
        // Switching to global: migrate side-specific back to global
        let styleVal = null, widthVal = null, colorVal = null;
        for (const side of ['top', 'right', 'bottom', 'left']) {
          styleVal = styleVal || state.getStyle(`border-${side}-style`);
          widthVal = widthVal || state.getStyle(`border-${side}-width`);
          colorVal = colorVal || state.getStyle(`border-${side}-color`);
        }

        ['top', 'right', 'bottom', 'left'].forEach(side => {
          state.updateStyle(`border-${side}-style`, null);
          state.updateStyle(`border-${side}-width`, null);
          state.updateStyle(`border-${side}-color`, null);
        });

        if (styleVal) state.updateStyle('border-style', styleVal);
        if (widthVal) state.updateStyle('border-width', widthVal);
        if (colorVal) state.updateStyle('border-color', colorVal);
      }

      state.saveHistory = origSaveHistory;
      if (changed) {
        state.saveHistory();
      }

      syncWidgetValues();
    });

    // Side selection buttons click handler
    sideButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const side = btn.getAttribute('data-side');
        if (side === 'all') {
          // Click all: select/deselect all
          const allSelected = ['top', 'right', 'bottom', 'left'].every(s => this.selectedBorderSides.has(s));
          if (allSelected) {
            this.selectedBorderSides.clear();
          } else {
            this.selectedBorderSides = new Set(['top', 'right', 'bottom', 'left']);
          }
        } else {
          // Toggle individual side with modifiers, or select single side
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            if (this.selectedBorderSides.has(side)) {
              this.selectedBorderSides.delete(side);
            } else {
              this.selectedBorderSides.add(side);
            }
          } else {
            this.selectedBorderSides = new Set([side]);
          }
        }
        updateButtonsUI();
        
        // Temporarily block saveHistory when syncing input values for the new selection
        const styleVal = getCommonValue('style');
        const widthVal = getCommonValue('width');
        const colorVal = getCommonValue('color');

        styleSelect.value = styleVal;

        if (widthVal) {
          const parsed = this.parseValueAndUnit(widthVal);
          widthInput.value = parsed.value;
          widthUnit.value = parsed.unit || 'px';
        } else {
          widthInput.value = '';
          widthUnit.value = 'px';
        }

        colorInput.value = colorVal;
        if (colorVal && colorVal.startsWith('#')) {
          colorPicker.value = colorVal;
        } else {
          colorPicker.value = '#000000';
        }
      });
    });

    // Inputs change / updates
    const applyBatchedStyles = (callback) => {
      if (this.selectedBorderSides.size === 0) return;
      const origSaveHistory = state.saveHistory;
      let changed = false;
      state.saveHistory = () => { changed = true; };

      callback();

      state.saveHistory = origSaveHistory;
      if (changed) {
        state.saveHistory();
      }
    };

    styleSelect.addEventListener('change', () => {
      applyBatchedStyles(() => {
        this.selectedBorderSides.forEach(side => {
          state.updateStyle(`border-${side}-style`, styleSelect.value || null);
        });
      });
    });

    const handleWidthChange = () => {
      applyBatchedStyles(() => {
        const val = widthInput.value.trim();
        const unit = widthUnit.value;
        this.selectedBorderSides.forEach(side => {
          if (val === '') {
            state.updateStyle(`border-${side}-width`, null);
          } else {
            state.updateStyle(`border-${side}-width`, val + unit);
          }
        });
      });
    };
    widthInput.addEventListener('change', handleWidthChange);
    widthInput.addEventListener('input', handleWidthChange);
    widthUnit.addEventListener('change', handleWidthChange);

    const handleColorChange = (newColorVal) => {
      applyBatchedStyles(() => {
        this.selectedBorderSides.forEach(side => {
          if (newColorVal === '') {
            state.updateStyle(`border-${side}-color`, null);
          } else {
            state.updateStyle(`border-${side}-color`, newColorVal);
          }
        });
      });
    };

    colorPicker.addEventListener('input', () => {
      colorInput.value = colorPicker.value;
      handleColorChange(colorPicker.value);
    });

    colorInput.addEventListener('change', () => {
      if (colorInput.value.startsWith('#')) {
        colorPicker.value = colorInput.value;
      }
      handleColorChange(colorInput.value.trim());
    });

    this.syncBorderWidget = syncWidgetValues;
  }

  setupRadiusWidget() {
    this.individualCorners = false;
    this.selectedRadiusCorners = new Set(['top-left', 'top-right', 'bottom-right', 'bottom-left']); // All corners selected by default

    const toggleBtn = document.getElementById('btn-toggle-corners');
    const globalContainer = document.getElementById('global-radius-container');
    const visualContainer = document.getElementById('visual-radius-container');
    const globalInput = globalContainer.querySelector('input[data-prop="border-radius"]');
    const globalUnit = globalContainer.querySelector('select[data-unit-for="border-radius"]');

    const cornerButtons = document.querySelectorAll('.radius-corner-btn');
    const cornerTextLabel = document.getElementById('active-radius-corner-text');

    const valueInput = document.getElementById('radius-value-input');
    const unitSelect = document.getElementById('radius-unit-select');

    if (!toggleBtn || !globalContainer || !visualContainer || !globalInput || !globalUnit || !cornerTextLabel || !valueInput || !unitSelect) return;

    // Helper to get common style value across selected corners
    const getCommonValue = () => {
      if (this.selectedRadiusCorners.size === 0) return '';
      let commonVal = undefined;
      let isFirst = true;
      for (const corner of this.selectedRadiusCorners) {
        const propName = `border-${corner}-radius`;
        const val = state.getStyle(propName);
        if (isFirst) {
          commonVal = val;
          isFirst = false;
        } else if (commonVal !== val) {
          return ''; // Mixed
        }
      }
      return commonVal || '';
    };

    const updateButtonsUI = () => {
      cornerButtons.forEach(btn => {
        const corner = btn.getAttribute('data-corner');
        if (corner === 'all') {
          const allSelected = ['top-left', 'top-right', 'bottom-right', 'bottom-left'].every(c => this.selectedRadiusCorners.has(c));
          btn.classList.toggle('active', allSelected);
        } else {
          btn.classList.toggle('active', this.selectedRadiusCorners.has(corner));
        }
      });

      // Update corner text label
      if (['top-left', 'top-right', 'bottom-right', 'bottom-left'].every(c => this.selectedRadiusCorners.has(c))) {
        cornerTextLabel.innerText = 'All Corners';
      } else if (this.selectedRadiusCorners.size === 0) {
        cornerTextLabel.innerText = 'Select corners to configure';
      } else {
        const sortedCorners = ['top-left', 'top-right', 'bottom-right', 'bottom-left']
          .filter(c => this.selectedRadiusCorners.has(c))
          .map(c => c.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
        cornerTextLabel.innerText = sortedCorners.join(', ');
      }
    };

    const syncRadiusValues = () => {
      // Sync global values first
      const globalVal = state.getStyle('border-radius');
      if (globalVal) {
        const parsed = this.parseValueAndUnit(globalVal);
        globalInput.value = parsed.value;
        globalUnit.value = parsed.unit || 'px';
      } else {
        globalInput.value = '';
        globalUnit.value = 'px';
      }
      this.updateFieldLabelState('border-radius', globalInput);

      const corners = [
        'border-top-left-radius',
        'border-top-right-radius',
        'border-bottom-right-radius',
        'border-bottom-left-radius'
      ];

      let hasIndividualOverrides = corners.some(prop => state.isStyleOverride(prop) || state.getStyle(prop) !== "");
      
      if (hasIndividualOverrides && !this.individualCorners) {
        this.individualCorners = true;
      }

      if (this.individualCorners) {
        toggleBtn.innerText = 'Use global radius';
        globalContainer.classList.add('hidden');
        visualContainer.classList.remove('hidden');
      } else {
        toggleBtn.innerText = 'Configure corners';
        globalContainer.classList.remove('hidden');
        visualContainer.classList.add('hidden');
      }

      if (this.individualCorners) {
        // Sync side-specific input based on selected corners
        const commonVal = getCommonValue();
        if (commonVal) {
          const parsed = this.parseValueAndUnit(commonVal);
          valueInput.value = parsed.value;
          unitSelect.value = parsed.unit || 'px';
        } else {
          valueInput.value = '';
          unitSelect.value = 'px';
        }

        updateButtonsUI();

        // Update labels for overrides
        this.selectedRadiusCorners.forEach(corner => {
          this.updateFieldLabelState(`border-${corner}-radius`, valueInput);
        });
      }
    };

    // Toggle button handler
    toggleBtn.addEventListener('click', () => {
      this.individualCorners = !this.individualCorners;

      const origSaveHistory = state.saveHistory;
      let changed = false;
      state.saveHistory = () => { changed = true; };

      if (this.individualCorners) {
        // Switching to configure corners: migrate global to corner-specific
        const globalRadius = state.getStyle('border-radius');

        if (globalRadius) {
          state.updateStyle('border-top-left-radius', globalRadius);
          state.updateStyle('border-top-right-radius', globalRadius);
          state.updateStyle('border-bottom-right-radius', globalRadius);
          state.updateStyle('border-bottom-left-radius', globalRadius);
        }

        state.updateStyle('border-radius', null);
        this.selectedRadiusCorners = new Set(['top-left', 'top-right', 'bottom-right', 'bottom-left']);
      } else {
        // Switching to global: migrate corner-specific back to global
        let radiusVal = null;
        for (const corner of ['top-left', 'top-right', 'bottom-right', 'bottom-left']) {
          radiusVal = radiusVal || state.getStyle(`border-${corner}-radius`);
        }

        ['top-left', 'top-right', 'bottom-right', 'bottom-left'].forEach(corner => {
          state.updateStyle(`border-${corner}-radius`, null);
        });

        if (radiusVal) {
          state.updateStyle('border-radius', radiusVal);
        }
      }

      state.saveHistory = origSaveHistory;
      if (changed) {
        state.saveHistory();
      }

      syncRadiusValues();
    });

    // Corner selection buttons click handler
    cornerButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const corner = btn.getAttribute('data-corner');
        if (corner === 'all') {
          const allSelected = ['top-left', 'top-right', 'bottom-right', 'bottom-left'].every(c => this.selectedRadiusCorners.has(c));
          if (allSelected) {
            this.selectedRadiusCorners.clear();
          } else {
            this.selectedRadiusCorners = new Set(['top-left', 'top-right', 'bottom-right', 'bottom-left']);
          }
        } else {
          // Toggle individual corner with modifiers, or select single corner
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            if (this.selectedRadiusCorners.has(corner)) {
              this.selectedRadiusCorners.delete(corner);
            } else {
              this.selectedRadiusCorners.add(corner);
            }
          } else {
            this.selectedRadiusCorners = new Set([corner]);
          }
        }
        updateButtonsUI();

        // Temporarily block saveHistory when syncing input value for the new selection
        const commonVal = getCommonValue();
        if (commonVal) {
          const parsed = this.parseValueAndUnit(commonVal);
          valueInput.value = parsed.value;
          unitSelect.value = parsed.unit || 'px';
        } else {
          valueInput.value = '';
          unitSelect.value = 'px';
        }
      });
    });

    // Inputs change / updates
    const applyBatchedRadius = (callback) => {
      if (this.selectedRadiusCorners.size === 0) return;
      const origSaveHistory = state.saveHistory;
      let changed = false;
      state.saveHistory = () => { changed = true; };

      callback();

      state.saveHistory = origSaveHistory;
      if (changed) {
        state.saveHistory();
      }
    };

    const handleCornerRadiusChange = () => {
      applyBatchedRadius(() => {
        const val = valueInput.value.trim();
        const unit = unitSelect.value;
        this.selectedRadiusCorners.forEach(corner => {
          if (val === '') {
            state.updateStyle(`border-${corner}-radius`, null);
          } else {
            state.updateStyle(`border-${corner}-radius`, val + unit);
          }
        });
      });
    };
    valueInput.addEventListener('change', handleCornerRadiusChange);
    valueInput.addEventListener('input', handleCornerRadiusChange);
    unitSelect.addEventListener('change', handleCornerRadiusChange);

    // Also bind global inputs change handler
    const handleGlobalChange = () => {
      const val = globalInput.value.trim();
      const unit = globalUnit.value;
      if (val === '') {
        state.updateStyle('border-radius', null);
      } else {
        state.updateStyle('border-radius', val + unit);
      }
    };
    globalInput.addEventListener('change', handleGlobalChange);
    globalInput.addEventListener('input', handleGlobalChange);
    globalUnit.addEventListener('change', handleGlobalChange);

    this.syncRadiusWidget = syncRadiusValues;
  }

  // --- Theme variables linking helpers ---
  setupThemeLinkButtons() {
    const linkButtons = document.querySelectorAll('.btn-theme-link');
    linkButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const prop = btn.getAttribute('data-link-prop');
        this.openThemeLinkDropdown(btn, prop);
      });
    });
  }

  closeAllThemeDropdowns() {
    document.querySelectorAll('.theme-variables-dropdown').forEach(el => el.remove());
  }

  openThemeLinkDropdown(btn, prop) {
    this.closeAllThemeDropdowns();

    const dropdown = document.createElement('div');
    dropdown.className = 'theme-variables-dropdown';

    const title = document.createElement('div');
    title.className = 'theme-dropdown-title';
    title.innerText = 'Link Global Color';
    dropdown.appendChild(title);

    const colors = (state.doc.globals && state.doc.globals.colors) ? state.doc.globals.colors : [];
    const currentValue = state.getStyle(prop);
    const isLinked = currentValue && currentValue.startsWith('var(--color-');

    if (isLinked) {
      const unlinkItem = document.createElement('button');
      unlinkItem.type = 'button';
      unlinkItem.className = 'theme-dropdown-item theme-dropdown-item-unlink';
      unlinkItem.innerText = 'Reset to Custom Color';
      unlinkItem.addEventListener('click', () => {
        let staticValue = '';
        const match = currentValue.match(/^var\(--([\w-]+)\)$/);
        if (match) {
          const colorId = match[1];
          const globalColor = colors.find(c => c.id === colorId);
          if (globalColor) staticValue = globalColor.value;
        }
        state.updateStyle(prop, staticValue || null);
        this.closeAllThemeDropdowns();
      });
      dropdown.appendChild(unlinkItem);
    }

    colors.forEach(c => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'theme-dropdown-item';
      if (currentValue === `var(--${c.id})`) {
        item.classList.add('active');
      }

      const swatch = document.createElement('div');
      swatch.className = 'theme-dropdown-color-swatch';
      swatch.style.backgroundColor = c.value;
      
      const nameSpan = document.createElement('span');
      nameSpan.innerText = c.name;

      item.appendChild(swatch);
      item.appendChild(nameSpan);

      item.addEventListener('click', () => {
        state.updateStyle(prop, `var(--${c.id})`);
        this.closeAllThemeDropdowns();
      });

      dropdown.appendChild(item);
    });

    document.body.appendChild(dropdown);
    const rect = btn.getBoundingClientRect();
    
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.right - dropdown.offsetWidth + window.scrollX}px`;

    const onOutsideClick = (event) => {
      if (!dropdown.contains(event.target) && event.target !== btn && !btn.contains(event.target)) {
        this.closeAllThemeDropdowns();
        document.removeEventListener('click', onOutsideClick);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', onOutsideClick);
    }, 0);
  }

  updateFontFamilyDropdown() {
    const select = document.querySelector('select[data-prop="font-family"]');
    if (!select) return;

    let globalOptgroup = select.querySelector('optgroup[label="Global Theme Fonts"]');
    if (!globalOptgroup) {
      globalOptgroup = document.createElement('optgroup');
      globalOptgroup.label = "Global Theme Fonts";
      select.insertBefore(globalOptgroup, select.firstChild);
    }

    globalOptgroup.innerHTML = '';

    const fonts = (state.doc.globals && state.doc.globals.fonts) ? state.doc.globals.fonts : [];
    fonts.forEach(f => {
      const opt = document.createElement('option');
      opt.value = `var(--${f.id})`;
      opt.innerText = f.name;
      opt.style.fontFamily = f.value;
      globalOptgroup.appendChild(opt);
    });
  }

  syncColorLinkPill(container, prop, val) {
    const isLinked = val && val.startsWith('var(--color-');
    let pill = container.querySelector('.global-color-pill');

    if (isLinked) {
      const match = val.match(/^var\(--([\w-]+)\)$/);
      const colorId = match ? match[1] : null;
      const colors = (state.doc.globals && state.doc.globals.colors) ? state.doc.globals.colors : [];
      const globalColor = colors.find(c => c.id === colorId);
      const colorName = globalColor ? globalColor.name : 'Theme Color';

      if (!pill) {
        pill = document.createElement('div');
        pill.className = 'global-color-pill';
        container.insertBefore(pill, container.firstChild);
      }

      pill.innerHTML = `
        <div class="global-color-pill-swatch" style="background-color: var(--${colorId})"></div>
        <span class="global-color-pill-name">🔗 ${colorName}</span>
        <button type="button" class="global-color-pill-unlink" title="Unlink variable">×</button>
      `;

      container.querySelectorAll('input').forEach(inp => inp.style.display = 'none');

      pill.querySelector('.global-color-pill-unlink').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        let staticValue = '';
        if (globalColor) staticValue = globalColor.value;
        state.updateStyle(prop, staticValue || null);
      });
    } else {
      if (pill) pill.remove();
      container.querySelectorAll('input').forEach(inp => inp.style.display = '');
    }
  }
}
