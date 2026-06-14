import { state } from '../state.js';

export class ElementsPanelController {
  constructor() {
    this.addButtons = document.querySelectorAll('.add-element-btn');
    this.navigatorContainer = document.getElementById('navigator-tree');
    this.tabs = document.querySelectorAll('.cwb-leftbar .tab-btn');
    this.panelSections = document.querySelectorAll('.cwb-leftbar .panel-section');

    this.expandedNodes = new Set(['root', 'hero-sec']); // Track expanded node IDs in navigator

    this.init();
  }

  getFriendlyTagName(tag, classes = []) {
    const t = (tag || '').toLowerCase();
    const clsList = classes || [];
    if (t === 'section') return 'Section';
    if (t === 'div') {
      if (clsList.includes('w-container')) return 'Container';
      if (clsList.includes('flex') || clsList.includes('w-flex-row') || clsList.includes('w-flex-col') || clsList.some(c => c.includes('flex'))) return 'Flexbox';
      return 'Box Container';
    }
    if (t === 'h1' || t === 'h2' || t === 'h3' || t === 'h4' || t === 'h5' || t === 'h6') return 'Heading';
    if (t === 'p') return 'Paragraph';
    if (t === 'span') return 'Text Block';
    if (t === 'form') return 'Form Block';
    if (t === 'input') return 'Input Field';
    if (t === 'textarea') return 'Text Area';
    if (t === 'select') return 'Select';
    if (t === 'label') return 'Form Label';
    if (t === 'button') return 'Button';
    if (t === 'a') return 'Link Block';
    if (t === 'img') return 'Image';
    if (t === 'root') return 'Page Root';
    return tag.toUpperCase();
  }

  init() {
    // Setup tab switching
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.tabs.forEach(t => t.classList.remove('active'));
        this.panelSections.forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        const panelId = tab.getAttribute('data-panel');
        document.getElementById(panelId).classList.add('active');
      });
    });

    // Setup visual element creation click listeners
    this.addButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-tag');
        const props = {
          text: btn.getAttribute('data-text') || "",
          classes: btn.getAttribute('data-classes') ? btn.getAttribute('data-classes').split(' ') : [],
          styles: {}
        };
        
        if (btn.getAttribute('data-display')) {
          props.display = btn.getAttribute('data-display');
        }
        
        // If an element is selected, add it inside that parent. If not, add to body
        if (state.selectedNodeId) {
          const parent = state.getSelectedNode();
          const targetTags = ['section', 'div', 'header', 'footer', 'main', 'root'];
          if (parent && targetTags.includes(parent.tag.toLowerCase())) {
            state.addNode(tag, props, parent.id);
            this.renderNavigator();
            return;
          }
          
          // Add next to selected element (sibling placement)
          const targetParent = state.findParent(state.selectedNodeId);
          if (targetParent) {
            const insertIndex = targetParent.children.findIndex(c => c.id === state.selectedNodeId) + 1;
            const newNode = state.addNode(tag, props, targetParent.id);
            if (newNode) {
              state.moveNode(newNode.id, targetParent.id, insertIndex);
            }
            this.renderNavigator();
            return;
          }
        }
        
        state.addNode(tag, props);
        this.renderNavigator();
      });

      // Draggable elements setup
      btn.setAttribute('draggable', 'true');
      btn.addEventListener('dragstart', (e) => {
        const tag = btn.getAttribute('data-tag');
        const props = {
          text: btn.getAttribute('data-text') || "",
          classes: btn.getAttribute('data-classes') ? btn.getAttribute('data-classes').split(' ') : [],
          styles: {}
        };
        e.dataTransfer.setData('text/plain', `new-tag:${tag}:${JSON.stringify(props)}`);
      });
    });

    // Sync elements list representation with workspace tree modifications
    state.on('selectionChange', () => this.highlightActiveNavigatorNode());
    state.on('treeModified', () => this.renderNavigator());
    
    this.renderNavigator();
  }

  // Render Navigator elements list
  renderNavigator() {
    this.navigatorContainer.innerHTML = '';
    
    // Draw starting from root
    const renderTreeNode = (node, depth = 0) => {
      const nodeRow = document.createElement('div');
      nodeRow.className = 'tree-node';
      nodeRow.setAttribute('data-tree-id', node.id);

      const itemRow = document.createElement('div');
      itemRow.className = 'tree-node-row';
      if (state.selectedNodeId === node.id) {
        itemRow.classList.add('active');
      }

      // Level indent spacer
      const spacer = document.createElement('div');
      spacer.className = 'tree-node-indent';
      spacer.style.width = `${depth * 14}px`;
      itemRow.appendChild(spacer);

      // Expand/Collapse arrow
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = this.expandedNodes.has(node.id);

      const arrow = document.createElement('span');
      if (hasChildren) {
        arrow.className = 'tree-node-arrow';
        arrow.innerHTML = isExpanded ? '▼' : '▶';
        arrow.addEventListener('click', (e) => {
          e.stopPropagation();
          if (isExpanded) {
            this.expandedNodes.delete(node.id);
          } else {
            this.expandedNodes.add(node.id);
          }
          this.renderNavigator();
        });
      } else {
        arrow.className = 'tree-node-arrow-spacer';
        arrow.innerHTML = '';
      }

      // Icon placeholder based on tag
      const icon = document.createElement('span');
      icon.className = 'tree-node-tag';
      icon.innerText = this.getFriendlyTagName(node.tag, node.classes || []);

      // Node text details
      const text = document.createElement('span');
      text.className = 'tree-node-text';
      if (node.textContent) {
        text.innerText = ` "${node.textContent.substring(0, 15)}${node.textContent.length > 15 ? '...' : ''}"`;
        text.classList.add('node-text-content');
      } else if (node.classes && node.classes.length > 0) {
        text.innerText = ` .${node.classes[0]}`;
        text.classList.add('node-class-name');
      } else {
        text.innerText = '';
      }

      // Wrap title items
      const titleWrapper = document.createElement('div');
      titleWrapper.className = 'tree-node-title';
      titleWrapper.appendChild(arrow);
      titleWrapper.appendChild(icon);
      titleWrapper.appendChild(text);

      const friendlyName = this.getFriendlyTagName(node.tag, node.classes || []);
      let tooltipText = friendlyName;
      if (node.classes && node.classes.length > 0) {
        tooltipText += ` (${node.classes.join(', ')})`;
      }
      if (node.textContent) {
        tooltipText += ` "${node.textContent}"`;
      }
      titleWrapper.setAttribute('title', tooltipText);
      itemRow.appendChild(titleWrapper);

      // Append action buttons (Move Up, Move Down, Delete) for non-root nodes
      if (node.id !== 'root') {
        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'tree-node-actions';

        const moveUpBtn = document.createElement('button');
        moveUpBtn.className = 'tree-node-action-btn btn-move-up';
        moveUpBtn.title = 'Move Up';
        moveUpBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><polyline points="18 15 12 9 6 15"/></svg>`;
        moveUpBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const parent = state.findParent(node.id);
          if (parent) {
            const index = parent.children.findIndex(c => c.id === node.id);
            if (index > 0) {
              state.moveNode(node.id, parent.id, index - 1);
            }
          }
        });

        const moveDownBtn = document.createElement('button');
        moveDownBtn.className = 'tree-node-action-btn btn-move-down';
        moveDownBtn.title = 'Move Down';
        moveDownBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><polyline points="6 9 12 15 18 9"/></svg>`;
        moveDownBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const parent = state.findParent(node.id);
          if (parent) {
            const index = parent.children.findIndex(c => c.id === node.id);
            if (index < parent.children.length - 1) {
              state.moveNode(node.id, parent.id, index + 1);
            }
          }
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'tree-node-action-btn btn-delete';
        deleteBtn.title = 'Delete Element';
        deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          state.deleteNode(node.id);
        });

        actionsWrapper.appendChild(moveUpBtn);
        actionsWrapper.appendChild(moveDownBtn);
        actionsWrapper.appendChild(deleteBtn);
        itemRow.appendChild(actionsWrapper);
      }

      // Row Selection handler
      itemRow.addEventListener('click', () => {
        state.selectNode(node.id);
      });

      // Drag and drop settings within Navigator
      if (node.id !== 'root') {
        itemRow.setAttribute('draggable', 'true');
        this.setupNavigatorDragEvents(itemRow, node.id);
      }

      nodeRow.appendChild(itemRow);

      // Recursive children render
      if (hasChildren && isExpanded) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
        node.children.forEach(child => {
          childrenContainer.appendChild(renderTreeNode(child, depth + 1));
        });
        nodeRow.appendChild(childrenContainer);
      }

      return nodeRow;
    };

    const treeHtml = renderTreeNode(state.doc.tree);
    this.navigatorContainer.appendChild(treeHtml);
  }

  highlightActiveNavigatorNode() {
    // Sync selections
    const rows = this.navigatorContainer.querySelectorAll('.tree-node-row');
    rows.forEach(row => {
      const parentNode = row.closest('.tree-node');
      const nodeId = parentNode.getAttribute('data-tree-id');
      if (state.selectedNodeId === nodeId) {
        row.classList.add('selected');
        
        // Auto expand ancestors to reveal selection
        let currentId = nodeId;
        let parentNodeObj = state.findParent(currentId);
        let expandedAny = false;
        while (parentNodeObj) {
          if (!this.expandedNodes.has(parentNodeObj.id)) {
            this.expandedNodes.add(parentNodeObj.id);
            expandedAny = true;
          }
          currentId = parentNodeObj.id;
          parentNodeObj = state.findParent(currentId);
        }
        if (expandedAny) {
          this.renderNavigator();
        }
      } else {
        row.classList.remove('selected');
      }
    });
  }

  setupNavigatorDragEvents(element, nodeId) {
    element.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      e.dataTransfer.setData('text/plain', `move-id:${nodeId}`);
      e.dataTransfer.effectAllowed = 'move';
      element.style.opacity = '0.5';
    });

    element.addEventListener('dragend', () => {
      element.style.opacity = '1';
      this.clearDragHighlights();
    });

    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.clearDragHighlights();
      element.classList.add('drag-over');
    });

    element.addEventListener('dragleave', () => {
      element.classList.remove('drag-over');
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.clearDragHighlights();

      const dragData = e.dataTransfer.getData('text/plain');
      if (dragData.startsWith('move-id:')) {
        const draggedId = dragData.split(':')[1];
        if (draggedId === nodeId) return;

        // MoveDragged node to be a child under dropping target, or adjacent
        const parent = state.findParent(nodeId);
        if (parent) {
          const index = parent.children.findIndex(c => c.id === nodeId);
          state.moveNode(draggedId, parent.id, index);
        }
      }
    });
  }

  clearDragHighlights() {
    this.navigatorContainer.querySelectorAll('.tree-node-row').forEach(row => {
      row.classList.remove('drag-over');
    });
  }
}
