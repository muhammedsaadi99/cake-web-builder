import { state } from './state.js';
import { CanvasController } from './canvas.js';
import { ElementsPanelController } from './panels/elements.js';
import { StylesPanelController } from './panels/styles.js';
import { AttributesPanelController } from './panels/attributes.js';
import { ThemePanelController } from './panels/theme.js';
import { ExporterPlugin } from './plugins/exporter-plugin.js';
import { AnimationPlugin } from './plugins/animation-plugin.js';
import { HoverOverlaysPlugin } from './plugins/hover-overlays-plugin.js';
import { ComponentBuilderPlugin } from './plugins/component-builder-plugin.js';
import { DynamicDataPlugin } from './plugins/dynamic-data-plugin.js';

class App {
  constructor() {
    this.initControllers();
    this.bindTopbarEvents();
    this.bindKeyboardShortcuts();
    this.bindModalEvents();
    this.bindRightbarTabs();
    this.syncHistoryButtons();

    // Subscribe app events
    state.on('change', () => this.syncHistoryButtons());
  }

  initControllers() {
    // Register plugins on state core first to catch initialization events
    state.registerPlugin(new ExporterPlugin());
    state.registerPlugin(new AnimationPlugin());
    state.registerPlugin(new HoverOverlaysPlugin());
    state.registerPlugin(new ComponentBuilderPlugin());
    state.registerPlugin(new DynamicDataPlugin());

    this.canvas = new CanvasController();
    this.elementsPanel = new ElementsPanelController();
    this.stylesPanel = new StylesPanelController();
    this.attrsPanel = new AttributesPanelController();
    this.themePanel = new ThemePanelController();
  }

  bindTopbarEvents() {
    // Breakpoint switcher
    const desktopBtn = document.getElementById('bp-desktop');
    const tabletBtn = document.getElementById('bp-tablet');
    const mobileBtn = document.getElementById('bp-mobile');

    const updateActiveButton = (activeBtn) => {
      [desktopBtn, tabletBtn, mobileBtn].forEach(btn => btn.classList.remove('active'));
      activeBtn.classList.add('active');
    };

    desktopBtn.addEventListener('click', () => {
      state.setBreakpoint('desktop');
      updateActiveButton(desktopBtn);
    });

    tabletBtn.addEventListener('click', () => {
      state.setBreakpoint('tablet');
      updateActiveButton(tabletBtn);
    });

    mobileBtn.addEventListener('click', () => {
      state.setBreakpoint('mobile');
      updateActiveButton(mobileBtn);
    });

    // Undo / Redo
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');

    undoBtn.addEventListener('click', () => state.undo());
    redoBtn.addEventListener('click', () => state.redo());

    // Preview
    const previewBtn = document.getElementById('btn-preview');
    previewBtn.addEventListener('click', () => {
      state.togglePreviewMode();
      
      const isPreview = state.previewMode;
      previewBtn.classList.toggle('active', isPreview);
      
      // Update UI panels visibility
      const leftbar = document.querySelector('.cwb-leftbar');
      const rightbar = document.querySelector('.cwb-rightbar');
      const resizeHandles = document.querySelectorAll('.canvas-resize-handle');
      
      leftbar.style.display = isPreview ? 'none' : 'flex';
      rightbar.style.display = isPreview ? 'none' : 'flex';
      resizeHandles.forEach(h => h.style.display = isPreview ? 'none' : 'block');
    });

  }

  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore shortcuts if user is typing in forms/inputs or interacting with panels
      const target = e.target;
      if (target && (
          target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.contentEditable === 'true' ||
          target.closest('.cwb-rightbar') || 
          target.closest('.cwb-leftbar')
      )) {
        return;
      }

      // Check key combos
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        state.undo();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        state.redo();
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selected = state.selectedNodeId;
        if (selected && selected !== 'root') {
          e.preventDefault();
          state.deleteNode(selected);
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        state.selectNode(null);
      }
    });

    // Handle shortcuts inside the canvas iframe document too!
    const iframe = document.getElementById('canvas-iframe');
    iframe.addEventListener('load', () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      doc.addEventListener('keydown', (e) => {
        const target = e.target;
        if (target && (
            target.tagName === 'INPUT' || 
            target.tagName === 'TEXTAREA' || 
            target.contentEditable === 'true' || 
            target.classList.contains('cwb-editing-text')
        )) {
          return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          state.undo();
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          e.preventDefault();
          state.redo();
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
          const selected = state.selectedNodeId;
          if (selected && selected !== 'root') {
            e.preventDefault();
            state.deleteNode(selected);
          }
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          state.selectNode(null);
        }
      });
    });
  }

  bindModalEvents() {
    const importBtn = document.getElementById('btn-import-json');
    const saveBtn = document.getElementById('btn-export-json');
    const modal = document.getElementById('modal-json');
    const closeBtn = document.getElementById('btn-modal-close');
    const cancelBtn = document.getElementById('btn-modal-cancel');
    const submitBtn = document.getElementById('btn-modal-submit');
    const textarea = document.getElementById('json-textarea');
    const title = document.getElementById('modal-json-title');
    const desc = document.getElementById('modal-json-desc');

    let modalMode = 'import'; // 'import' | 'save'

    const openModal = (mode) => {
      modalMode = mode;
      modal.classList.remove('hidden');
      
      if (mode === 'import') {
        title.innerText = 'Import Project Data';
        desc.innerText = 'Paste the project text code data of your document below to load your saved design:';
        textarea.value = '';
        textarea.readOnly = false;
        submitBtn.innerText = 'Apply Data';
      } else {
        title.innerText = 'Save Project Data';
        desc.innerText = 'Copy the project text code data below, or download it to your computer:';
        textarea.value = state.exportJsonState();
        textarea.readOnly = true;
        submitBtn.innerText = 'Download Project File';
      }
    };

    const closeModal = () => {
      modal.classList.add('hidden');
    };

    importBtn.addEventListener('click', () => openModal('import'));
    saveBtn.addEventListener('click', () => openModal('save'));
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    submitBtn.addEventListener('click', () => {
      if (modalMode === 'import') {
        const rawJson = textarea.value.trim();
        if (rawJson) {
          state.loadJsonState(rawJson);
          closeModal();
        }
      } else {
        // Download JSON
        const rawJson = state.exportJsonState();
        const blob = new Blob([rawJson], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'cake-builder-project.json');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        closeModal();
      }
    });
  }

  bindRightbarTabs() {
    const switcher = document.querySelector('.rightbar-tabs');
    if (!switcher) return;
    
    const handleTabClick = (activeBtn) => {
      const tabTargetId = activeBtn.getAttribute('data-tab-target') || activeBtn.id.replace('tab-', 'panel-');
      
      // Toggle panel visibility
      const panels = document.querySelectorAll('.rightbar-tab-panel');
      panels.forEach(panel => {
        if (panel.id === tabTargetId) {
          panel.classList.remove('hidden');
        } else {
          panel.classList.add('hidden');
        }
      });
      
      // Update active tab buttons styling
      const buttons = switcher.querySelectorAll('.tab-btn');
      buttons.forEach(btn => {
        if (btn === activeBtn) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    };
    
    switcher.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (btn) {
        handleTabClick(btn);
      }
    });
  }

  syncHistoryButtons() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');

    undoBtn.disabled = !state.canUndo;
    redoBtn.disabled = !state.canRedo;
  }
}

// Bootstrap application on load
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
