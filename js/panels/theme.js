import { state } from '../state.js';

export class ThemePanelController {
  constructor() {
    this.colorsList = document.getElementById('global-colors-list');
    this.fontsList = document.getElementById('global-fonts-list');
    this.btnAddColor = document.getElementById('btn-add-global-color');
    this.btnAddFont = document.getElementById('btn-add-global-font');

    this.googleFonts = [
      { name: 'System Sans-serif', value: 'system-ui, -apple-system, sans-serif' },
      { name: 'System Serif (Georgia)', value: 'Georgia, serif' },
      { name: 'Inter', value: "'Inter', sans-serif" },
      { name: 'Roboto', value: "'Roboto', sans-serif" },
      { name: 'Open Sans', value: "'Open Sans', sans-serif" },
      { name: 'Poppins', value: "'Poppins', sans-serif" },
      { name: 'Montserrat', value: "'Montserrat', sans-serif" },
      { name: 'Lato', value: "'Lato', sans-serif" },
      { name: 'Outfit', value: "'Outfit', sans-serif" },
      { name: 'Raleway', value: "'Raleway', sans-serif" },
      { name: 'Nunito', value: "'Nunito', sans-serif" },
      { name: 'Ubuntu', value: "'Ubuntu', sans-serif" },
      { name: 'Playfair Display', value: "'Playfair Display', serif" },
      { name: 'Merriweather', value: "'Merriweather', serif" },
      { name: 'Lora', value: "'Lora', serif" },
      { name: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
      { name: 'Fira Code', value: "'Fira Code', monospace" },
      { name: 'Roboto Mono', value: "'Roboto Mono', monospace" },
      { name: 'Pacifico', value: "'Pacifico', cursive" },
      { name: 'Dancing Script', value: "'Dancing Script', cursive" }
    ];

    this.init();
  }

  init() {
    // CRUD add listeners
    if (this.btnAddColor) {
      this.btnAddColor.addEventListener('click', () => {
        state.addGlobalColor('New Color', '#3898ec');
      });
    }

    if (this.btnAddFont) {
      this.btnAddFont.addEventListener('click', () => {
        state.addGlobalFont('New Font', 'system-ui, -apple-system, sans-serif');
      });
    }

    // React to state changes
    state.on('change', () => {
      const active = document.activeElement;
      const isEditingInput = active && (active.tagName === 'INPUT' || active.tagName === 'SELECT');
      if (isEditingInput && (this.colorsList.contains(active) || this.fontsList.contains(active))) {
        return;
      }
      this.render();
    });

    // Initial render
    this.render();
  }

  render() {
    this.renderColors();
    this.renderFonts();
  }

  renderColors() {
    if (!this.colorsList) return;
    this.colorsList.innerHTML = '';

    const colors = (state.doc.globals && state.doc.globals.colors) ? state.doc.globals.colors : [];

    if (colors.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.fontSize = '11px';
      emptyMsg.style.fontStyle = 'italic';
      emptyMsg.style.color = 'var(--text-muted)';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.style.padding = '8px';
      emptyMsg.innerText = 'No global colors defined.';
      this.colorsList.appendChild(emptyMsg);
      return;
    }

    colors.forEach(c => {
      const row = document.createElement('div');
      row.className = 'theme-variable-item';

      // 1. Swatch with color picker input inside
      const swatch = document.createElement('div');
      swatch.className = 'theme-variable-color-swatch';
      swatch.style.backgroundColor = c.value;

      const picker = document.createElement('input');
      picker.type = 'color';
      picker.value = c.value.startsWith('#') ? c.value : '#000000';
      picker.addEventListener('input', () => {
        swatch.style.backgroundColor = picker.value;
        valInput.value = picker.value;
        state.updateGlobalColor(c.id, undefined, picker.value);
      });
      swatch.appendChild(picker);

      // 2. Name input
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'var-name-input';
      nameInput.value = c.name;
      nameInput.title = 'Edit color name';
      nameInput.addEventListener('change', () => {
        state.updateGlobalColor(c.id, nameInput.value, undefined);
      });

      // 3. Hex code input
      const valInput = document.createElement('input');
      valInput.type = 'text';
      valInput.className = 'var-value-input';
      valInput.value = c.value;
      valInput.title = 'Edit color hex value';
      valInput.addEventListener('change', () => {
        state.updateGlobalColor(c.id, undefined, valInput.value);
      });

      // 4. Delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-variable-delete';
      delBtn.innerHTML = '×';
      delBtn.title = 'Delete global color';
      delBtn.addEventListener('click', () => {
        state.deleteGlobalColor(c.id);
      });

      row.appendChild(swatch);
      row.appendChild(nameInput);
      row.appendChild(valInput);
      row.appendChild(delBtn);

      this.colorsList.appendChild(row);
    });
  }

  renderFonts() {
    if (!this.fontsList) return;
    this.fontsList.innerHTML = '';

    const fonts = (state.doc.globals && state.doc.globals.fonts) ? state.doc.globals.fonts : [];

    if (fonts.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.fontSize = '11px';
      emptyMsg.style.fontStyle = 'italic';
      emptyMsg.style.color = 'var(--text-muted)';
      emptyMsg.style.textAlign = 'center';
      emptyMsg.style.padding = '8px';
      emptyMsg.innerText = 'No global fonts defined.';
      this.fontsList.appendChild(emptyMsg);
      return;
    }

    fonts.forEach(f => {
      const row = document.createElement('div');
      row.className = 'theme-variable-item';

      // 1. Name input
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'var-name-input';
      nameInput.value = f.name;
      nameInput.title = 'Edit font name';
      nameInput.addEventListener('change', () => {
        state.updateGlobalFont(f.id, nameInput.value, undefined);
      });

      // 2. Select font dropdown
      const select = document.createElement('select');
      select.className = 'var-font-select';
      
      this.googleFonts.forEach(gFont => {
        const opt = document.createElement('option');
        opt.value = gFont.value;
        opt.innerText = gFont.name;
        opt.style.fontFamily = gFont.value;
        if (f.value === gFont.value) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });

      select.addEventListener('change', () => {
        state.updateGlobalFont(f.id, undefined, select.value);
      });

      // 3. Delete button
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-variable-delete';
      delBtn.innerHTML = '×';
      delBtn.title = 'Delete global font';
      delBtn.addEventListener('click', () => {
        state.deleteGlobalFont(f.id);
      });

      row.appendChild(nameInput);
      row.appendChild(select);
      row.appendChild(delBtn);

      this.fontsList.appendChild(row);
    });
  }
}
