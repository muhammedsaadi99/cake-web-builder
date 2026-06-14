import { getFriendlyTagName } from '../canvas.js';

const PLUS_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" width="7" height="7"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

const PLUS_SVG_COMPONENT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="9" height="9"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

const ARROW_UP_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="9" height="9"><polyline points="18 15 12 9 6 15"/></svg>`;

const ARROW_DOWN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="9" height="9"><polyline points="6 9 12 15 18 9"/></svg>`;

const TRASH_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="9" height="9"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;

const STYLES = `
  #cwb-editor-overlays {
    position: absolute;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 100000;
  }
  .cwb-add-btn {
    position: absolute;
    width: 14px;
    height: 14px;
    background: rgba(26, 26, 30, 0.85);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    color: rgba(255, 255, 255, 0.65);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    pointer-events: auto;
    border: 1px solid rgba(255, 255, 255, 0.12);
    transform: translate(-50%, -50%);
    transition: background-color 0.15s, color 0.15s, opacity 0.15s;
    user-select: none;
    z-index: 100000;
    opacity: 0.45;
  }
  .cwb-add-btn svg {
    display: block;
    stroke: currentColor;
    fill: none;
  }
  .cwb-add-btn:hover {
    background: #635bff;
    color: #ffffff;
    opacity: 1.0;
  }
  .cwb-add-btn.cwb-active {
    background: #635bff !important;
    color: #ffffff !important;
    opacity: 1.0 !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
    box-shadow: none !important;
  }
  .cwb-add-btn.hidden {
    display: none !important;
  }
  
  .cwb-selected-badge {
    position: absolute;
    background: #635bff;
    color: #ffffff;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 10px;
    font-weight: 600;
    border-radius: 3px 3px 0 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 6px;
    pointer-events: auto;
    z-index: 100000;
    transform: translateY(-100%);
    white-space: nowrap;
    box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.15);
  }
  .cwb-selected-badge.hidden {
    display: none !important;
  }
  .cwb-badge-title {
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-block;
    cursor: help;
  }
  .cwb-badge-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    border-left: 1px solid rgba(255, 255, 255, 0.25);
    padding-left: 6px;
    margin-left: 2px;
  }
  .cwb-action-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.75);
    cursor: pointer;
    padding: 2px;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s, color 0.15s;
  }
  .cwb-action-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }
  .cwb-action-btn svg {
    display: block;
    stroke: currentColor;
    fill: none;
  }
  
  .cwb-insert-placeholder {
    height: 36px;
    margin: 8px 0;
    border: 1.5px dashed #635bff !important;
    border-radius: 4px;
    background: rgba(99, 91, 255, 0.08) !important;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: #635bff !important;
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: 600;
    pointer-events: none;
    box-shadow: 0 2px 6px rgba(99, 91, 255, 0.1);
  }
  .cwb-insert-placeholder::after {
    content: 'New element will be placed here';
  }
`;

export class HoverOverlaysPlugin {
  constructor() {
    this.id = 'hover-overlays';
    this.name = 'Canvas Hover Overlays';
    this.version = '1.0.0';

    this.topAddBtn = null;
    this.bottomAddBtn = null;
    this.selectedBadge = null;
    this.badgeTitle = null;

    this.hoveredNodeId = null;
    this.hideTimeout = null;
    this.iframeDocument = null;
  }

  install(builder) {
    this.builder = builder;

    // Listen to iframe document initialization
    this.builder.on('canvasSetup', (doc) => {
      this.initOverlays(doc);
    });

    // Clear insert target on preview mode toggles
    this.builder.on('previewToggle', (isPreview) => {
      this.builder.clearInsertTarget();
      this.hideAddButtons();
      this.updateSelectedBadge(null);
    });

    // Update active visual elements when insertion target updates
    this.builder.on('insertTargetChange', (target) => {
      this.updateActiveButtonStyles(target);
      this.updatePlaceholderGuide(target, this.iframeDocument);
    });

    // Synchronize selection changes
    this.builder.on('selectionChange', (selectedId) => {
      this.builder.clearInsertTarget();
      this.updateSelectedBadge(selectedId);
    });

    // Keep badge positions synced on tree and styling shifts
    this.builder.on('canvasRendered', () => {
      this.updateSelectedBadge(this.builder.selectedNodeId);
    });

    // Close insert menu when clicking inside parent window
    document.addEventListener('click', (e) => {
      // Clear target only if clicking outside the sidebar add panel and elements buttons
      if (!e.target.closest('#panel-add-elements') && 
          !e.target.closest('.add-element-btn') && 
          !e.target.closest('.tab-btn')) {
        this.builder.clearInsertTarget();
      }
    });

    // Escape listener in parent window
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.builder.clearInsertTarget();
      }
    });

    // Keep badge position synced on parent window resizes
    window.addEventListener('resize', () => {
      this.updateSelectedBadge(this.builder.selectedNodeId);
    });

    // Fallback check: if iframe is already loaded and ready, set up now
    const iframe = document.getElementById('canvas-iframe');
    if (iframe && iframe.contentDocument && iframe.contentDocument.getElementById('cwb-canvas-root')) {
      this.initOverlays(iframe.contentDocument);
    }
  }

  initOverlays(doc) {
    this.iframeDocument = doc;

    // 1. Add style tag
    let styleTag = doc.getElementById('cwb-hover-overlay-styles');
    if (!styleTag) {
      styleTag = doc.createElement('style');
      styleTag.id = 'cwb-hover-overlay-styles';
      doc.head.appendChild(styleTag);
    }
    styleTag.textContent = STYLES;

    // 2. Add overlays scaffolding
    let overlaysContainer = doc.getElementById('cwb-editor-overlays');
    if (!overlaysContainer) {
      overlaysContainer = doc.createElement('div');
      overlaysContainer.id = 'cwb-editor-overlays';
      overlaysContainer.innerHTML = `
        <div id="cwb-add-top-btn" class="cwb-add-btn hidden">${PLUS_SVG}</div>
        <div id="cwb-add-bottom-btn" class="cwb-add-btn hidden">${PLUS_SVG}</div>
        <div id="cwb-selected-badge" class="cwb-selected-badge hidden">
          <span class="cwb-badge-title"></span>
          <div class="cwb-badge-actions">
            <button class="cwb-action-btn btn-save-component" title="Save Selection as Component">${PLUS_SVG_COMPONENT}</button>
            <button class="cwb-action-btn btn-move-up" title="Move Up">${ARROW_UP_SVG}</button>
            <button class="cwb-action-btn btn-move-down" title="Move Down">${ARROW_DOWN_SVG}</button>
            <button class="cwb-action-btn btn-delete" title="Delete Element">${TRASH_SVG}</button>
          </div>
        </div>
      `;
      doc.body.appendChild(overlaysContainer);
    }

    this.topAddBtn = doc.getElementById('cwb-add-top-btn');
    this.bottomAddBtn = doc.getElementById('cwb-add-bottom-btn');
    this.selectedBadge = doc.getElementById('cwb-selected-badge');
    this.badgeTitle = this.selectedBadge.querySelector('.cwb-badge-title');

    // 3. Click event handlers on overlays
    const triggerSidebarTab = () => {
      const tabAdd = document.getElementById('tab-add');
      if (tabAdd) tabAdd.click();
    };

    this.topAddBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.builder.setInsertTarget(this.hoveredNodeId, 'before');
      triggerSidebarTab();
    });

    this.bottomAddBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.builder.setInsertTarget(this.hoveredNodeId, 'after');
      triggerSidebarTab();
    });

    // Selected badge action listeners
    this.selectedBadge.querySelector('.btn-save-component').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const btnCreate = window.parent.document.getElementById('btn-create-component');
      if (btnCreate) {
        btnCreate.click();
      }
    });

    this.selectedBadge.querySelector('.btn-move-up').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.moveSelectedElement('up');
    });

    this.selectedBadge.querySelector('.btn-move-down').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.moveSelectedElement('down');
    });

    this.selectedBadge.querySelector('.btn-delete').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const selectedId = this.builder.selectedNodeId;
      if (selectedId && selectedId !== 'root') {
        this.builder.deleteNode(selectedId);
      }
    });

    // 4. Setup mouse event delegation inside the iframe
    doc.addEventListener('mouseover', (e) => {
      if (this.builder.previewMode) return;

      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }

      const nodeEl = e.target.closest('[data-cwb-id]');
      const insideOverlays = e.target.closest('#cwb-editor-overlays');

      if (insideOverlays) {
        return;
      }

      if (nodeEl && nodeEl.getAttribute('data-cwb-id') !== 'root') {
        this.showAddButtons(nodeEl, doc);
      } else {
        this.hideAddButtons();
      }
    });

    doc.addEventListener('mouseout', (e) => {
      if (this.builder.previewMode) return;

      this.hideTimeout = setTimeout(() => {
        this.hideAddButtons();
      }, 150);
    });

    // Clear target when clicking outside in the iframe
    doc.addEventListener('click', (e) => {
      if (!e.target.closest('.cwb-add-btn') && !e.target.closest('#cwb-selected-badge')) {
        this.builder.clearInsertTarget();
      }
    });

    // Escape listener inside iframe
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.builder.clearInsertTarget();
      }
    });

    // Listen to iframe scrolls to align selection badge dynamically
    doc.addEventListener('scroll', () => {
      this.updateSelectedBadge(this.builder.selectedNodeId);
    });

    // Trigger initial badge render if node already selected
    this.updateSelectedBadge(this.builder.selectedNodeId);
  }

  showAddButtons(nodeEl, doc) {
    // If the insert target is active for a different node, do not switch hover highlights
    if (this.builder.activeInsertTarget && this.builder.activeInsertTarget.id !== nodeEl.getAttribute('data-cwb-id')) {
      return;
    }

    // Only show '+' add buttons on layout container nodes (div, section, header, footer, main)
    const layoutTags = ['div', 'section', 'header', 'footer', 'main'];
    const tag = nodeEl.getAttribute('data-cwb-tag') || '';
    const isLayout = layoutTags.includes(tag.toLowerCase());

    if (!isLayout) {
      this.hideAddButtons();
      return;
    }

    const nodeId = nodeEl.getAttribute('data-cwb-id');
    this.hoveredNodeId = nodeId;

    const rect = nodeEl.getBoundingClientRect();
    const scrollTop = doc.documentElement.scrollTop || doc.body.scrollTop;
    const scrollLeft = doc.documentElement.scrollLeft || doc.body.scrollLeft;

    const buttonLeft = rect.left + rect.width / 2 + scrollLeft;
    const topButtonTop = rect.top + scrollTop;
    const bottomButtonTop = rect.bottom + scrollTop;

    if (this.topAddBtn) {
      this.topAddBtn.style.left = `${buttonLeft}px`;
      this.topAddBtn.style.top = `${topButtonTop}px`;
      this.topAddBtn.classList.remove('hidden');
    }

    if (this.bottomAddBtn) {
      this.bottomAddBtn.style.left = `${buttonLeft}px`;
      this.bottomAddBtn.style.top = `${bottomButtonTop}px`;
      this.bottomAddBtn.classList.remove('hidden');
    }

    // Refresh active button highlights
    this.updateActiveButtonStyles(this.builder.activeInsertTarget);
  }

  hideAddButtons() {
    // Keep overlays visible if they correspond to the active insert target
    if (this.builder.activeInsertTarget && this.builder.activeInsertTarget.id === this.hoveredNodeId) {
      return;
    }

    if (this.topAddBtn) this.topAddBtn.classList.add('hidden');
    if (this.bottomAddBtn) this.bottomAddBtn.classList.add('hidden');
  }

  updateActiveButtonStyles(target) {
    if (this.topAddBtn) this.topAddBtn.classList.remove('cwb-active');
    if (this.bottomAddBtn) this.bottomAddBtn.classList.remove('cwb-active');

    if (!target) return;

    if (target.id === this.hoveredNodeId) {
      if (target.position === 'before' && this.topAddBtn) {
        this.topAddBtn.classList.add('cwb-active');
      } else if (target.position === 'after' && this.bottomAddBtn) {
        this.bottomAddBtn.classList.add('cwb-active');
      }
    }
  }

  updatePlaceholderGuide(target, doc) {
    if (!doc) return;

    // Clear old visual placeholder
    const existing = doc.querySelector('.cwb-insert-placeholder');
    if (existing) {
      existing.remove();
    }

    if (!target) return;

    const targetEl = doc.querySelector(`[data-cwb-id="${target.id}"]`);
    if (!targetEl) return;

    const ph = doc.createElement('div');
    ph.className = 'cwb-insert-placeholder';

    if (target.position === 'before') {
      targetEl.parentNode.insertBefore(ph, targetEl);
    } else if (target.position === 'after') {
      targetEl.parentNode.insertBefore(ph, targetEl.nextSibling);
    } else if (target.position === 'inside') {
      targetEl.appendChild(ph);
    }
  }

  updateSelectedBadge(selectedId) {
    if (!this.selectedBadge) return;

    if (!selectedId || selectedId === 'root' || this.builder.previewMode) {
      this.selectedBadge.classList.add('hidden');
      return;
    }

    const doc = this.iframeDocument;
    if (!doc) return;

    const targetEl = doc.querySelector(`[data-cwb-id="${selectedId}"]`);
    if (!targetEl) {
      this.selectedBadge.classList.add('hidden');
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const scrollTop = doc.documentElement.scrollTop || doc.body.scrollTop;
    const scrollLeft = doc.documentElement.scrollLeft || doc.body.scrollLeft;

    const badgeLeft = rect.left + scrollLeft;
    const badgeTop = rect.top + scrollTop;

    this.selectedBadge.style.left = `${badgeLeft}px`;
    this.selectedBadge.style.top = `${badgeTop}px`;

    // Position label inside top of viewport to prevent top clipping
    if (rect.top < 18) {
      this.selectedBadge.style.transform = 'none';
      this.selectedBadge.style.borderRadius = '0 0 3px 3px';
    } else {
      this.selectedBadge.style.transform = 'translateY(-100%)';
      this.selectedBadge.style.borderRadius = '3px 3px 0 0';
    }

    const node = this.builder.findNode(selectedId);
    if (node) {
      const labelText = getFriendlyTagName(node.tag, node.classes || []) + (node.classes && node.classes.length > 0 ? ' • ' + node.classes[0] : '');
      this.badgeTitle.innerText = labelText;
      this.badgeTitle.setAttribute('title', labelText);
    }

    this.selectedBadge.classList.remove('hidden');
  }

  moveSelectedElement(direction) {
    const selectedId = this.builder.selectedNodeId;
    if (!selectedId || selectedId === 'root') return;

    const parent = this.builder.findParent(selectedId);
    if (!parent) return;

    const index = parent.children.findIndex(c => c.id === selectedId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      this.builder.moveNode(selectedId, parent.id, index - 1);
    } else if (direction === 'down' && index < parent.children.length - 1) {
      this.builder.moveNode(selectedId, parent.id, index + 1);
    }
  }
}
