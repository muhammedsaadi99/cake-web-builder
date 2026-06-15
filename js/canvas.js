import { state } from './state.js';

export function resolvePath(obj, path) {
  if (!path || !obj) return undefined;
  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');
  const keys = normalizedPath.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

export function rewritePath(path, loopSource, index) {
  if (!path || !loopSource) return path;
  const escapedSource = loopSource.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  // Match index based source features[0].name or features[any_digit].name
  const indexRegex = new RegExp(`^${escapedSource}\\[\\d+\\]`);
  if (indexRegex.test(path)) {
    return path.replace(indexRegex, `${loopSource}[${index}]`);
  }
  // Match dot based source features.name and resolve to features[index].name
  const dotRegex = new RegExp(`^${escapedSource}\\.`);
  if (dotRegex.test(path)) {
    return path.replace(dotRegex, `${loopSource}[${index}].`);
  }
  // Match primitive loop items e.g. path === loopSource
  if (path === loopSource) {
    return `${loopSource}[${index}]`;
  }
  return path;
}

export function rewriteTextTemplate(text, loopSource, index) {
  if (typeof text !== 'string') return text;
  const bracesRegex = /\{\{([^}]+)\}\}/g;
  return text.replace(bracesRegex, (match, path) => {
    return `{{${rewritePath(path.trim(), loopSource, index)}}}`;
  });
}

export function rewriteBindings(n, loopSource, index) {
  if (!n) return;

  // Rewrite inline double curly braces text templates
  if (n.textContent) {
    n.textContent = rewriteTextTemplate(n.textContent, loopSource, index);
  }

  // Rewrite dynamic values mapping inside bindings object
  if (n.bindings) {
    Object.keys(n.bindings).forEach(field => {
      n.bindings[field] = rewritePath(n.bindings[field], loopSource, index);
    });
  }

  // Rewrite dynamic double curly braces in style rules (e.g. background-color)
  if (n.styles) {
    Object.keys(n.styles).forEach(breakpoint => {
      const bpStyles = n.styles[breakpoint];
      if (bpStyles) {
        Object.keys(bpStyles).forEach(prop => {
          if (typeof bpStyles[prop] === 'string') {
            bpStyles[prop] = rewriteTextTemplate(bpStyles[prop], loopSource, index);
          }
        });
      }
    });
  }

  // Rewrite dynamic double curly braces in element standard attributes (e.g. src, href)
  if (n.attributes) {
    Object.keys(n.attributes).forEach(attrName => {
      if (typeof n.attributes[attrName] === 'string') {
        n.attributes[attrName] = rewriteTextTemplate(n.attributes[attrName], loopSource, index);
      }
    });
  }

  // Recurse down children
  if (n.children) {
    n.children.forEach(child => rewriteBindings(child, loopSource, index));
  }
}

export function getFriendlyTagName(tag, classes = []) {
  const t = (tag || '').toLowerCase();
  const clsList = classes || [];
  if (t === 'section') return 'Section';
  if (t === 'div') {
    if (clsList.includes('cwb-slider')) return 'Slider';
    if (clsList.includes('cwb-slide')) return 'Slide';
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

export class CanvasController {
  constructor() {
    this.iframe = document.getElementById('canvas-iframe');
    this.viewport = document.getElementById('canvas-viewport-wrapper');
    this.widthText = document.getElementById('canvas-pixel-width');
    
    this.draggedNodeId = null;
    this.dropTargetId = null;
    this.dropPosition = null; // 'before' | 'after' | 'inside'
    
    // Resize handles drag
    this.isResizing = false;
    this.startX = 0;
    this.startWidth = 0;
    this.resizeSide = '';

    this.init();
  }

  init() {
    const handleLoad = () => {
      this.setupIframeDocument();
      this.render();
    };

    // If iframe is already complete (about:blank), set it up immediately
    if (this.iframe.contentDocument && this.iframe.contentDocument.readyState === 'complete') {
      handleLoad();
    }
    
    // Fallback load event listener
    this.iframe.addEventListener('load', handleLoad);
    
    // Set initial size
    this.updateViewportWidth();

    // Listeners for changes in state
    state.on('change', () => this.render());
    state.on('selectionChange', () => this.updateSelectionOverlay());
    state.on('breakpointChange', () => {
      this.updateViewportWidth();
      this.render(); // Re-render to update dynamic styling rules
    });
    state.on('previewToggle', () => this.render());

    // Setup viewport resize handles
    this.setupResizeHandles();
  }

  setupIframeDocument() {
    const doc = this.iframe.contentDocument;
    if (!doc) return;

    // Inject viewport meta tag into iframe head so media queries trigger on resize
    let meta = doc.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = doc.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0';
      doc.head.appendChild(meta);
    }

    // Create container element
    doc.body.innerHTML = '<div id="cwb-canvas-root"></div>';
    
    // Setup general event delegation inside iframe
    doc.addEventListener('click', (e) => {
      if (state.previewMode) return;
      
      // If clicking inside overlays, bypass selection clearing
      if (e.target.closest('#cwb-editor-overlays')) {
        return;
      }
      
      const nodeEl = e.target.closest('[data-cwb-id]');
      if (nodeEl) {
        e.preventDefault();
        e.stopPropagation();
        state.selectNode(nodeEl.getAttribute('data-cwb-id'));
      } else {
        state.selectNode(null);
      }
    });

    // Hover highlights
    doc.addEventListener('mouseover', (e) => {
      if (state.previewMode) return;
      const nodeEl = e.target.closest('[data-cwb-id]');
      
      // Remove all previous hovers
      doc.querySelectorAll('.cwb-hovered').forEach(el => el.classList.remove('cwb-hovered'));
      
      if (nodeEl && nodeEl.getAttribute('data-cwb-id') !== 'root') {
        nodeEl.classList.add('cwb-hovered');
      }
    });

    doc.addEventListener('mouseout', () => {
      if (state.previewMode) return;
      doc.querySelectorAll('.cwb-hovered').forEach(el => el.classList.remove('cwb-hovered'));
    });

    // Double click for text contenteditable
    doc.addEventListener('dblclick', (e) => {
      if (state.previewMode) return;
      const nodeEl = e.target.closest('[data-cwb-id]');
      if (nodeEl && ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'button', 'a', 'span'].includes(nodeEl.tagName.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        
        nodeEl.contentEditable = 'true';
        nodeEl.focus();
        nodeEl.classList.add('cwb-editing-text');
        
        // Move cursor to end
        const range = doc.createRange();
        const sel = this.iframe.contentWindow.getSelection();
        range.selectNodeContents(nodeEl);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        
        // Save on blur
        nodeEl.addEventListener('blur', () => {
          nodeEl.contentEditable = 'false';
          nodeEl.classList.remove('cwb-editing-text');
          state.updateTextContent(nodeEl.getAttribute('data-cwb-id'), nodeEl.innerText);
        }, { once: true });

        // Save on enter (except textareas / large p)
        nodeEl.addEventListener('keydown', (ke) => {
          if (ke.key === 'Enter' && !ke.shiftKey) {
            ke.preventDefault();
            nodeEl.blur();
          }
        });
      }
    });

    // Setup drag & drop inside iframe
    this.setupDragAndDrop(doc);

    // Emit event that canvas document setup has completed
    state.emit('canvasSetup', doc);
  }

  // Setup canvas resizing controls (left/right handles)
  setupResizeHandles() {
    const handleRight = document.getElementById('handle-resize-right');
    const handleLeft = document.getElementById('handle-resize-left');

    const onMouseDown = (e, side) => {
      this.isResizing = true;
      this.startX = e.clientX;
      this.startWidth = this.viewport.offsetWidth;
      this.resizeSide = side;
      
      document.body.style.cursor = 'ew-resize';
      this.iframe.style.pointerEvents = 'none'; // Avoid iframe absorbing pointer events
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!this.isResizing) return;
      const deltaX = e.clientX - this.startX;
      let newWidth = this.startWidth + (this.resizeSide === 'right' ? deltaX * 2 : -deltaX * 2);
      
      // Enforce bounds
      newWidth = Math.max(320, Math.min(newWidth, 1400));
      this.viewport.style.width = newWidth + 'px';
      this.widthText.innerText = newWidth + 'px';
    };

    const onMouseUp = () => {
      this.isResizing = false;
      document.body.style.cursor = 'default';
      this.iframe.style.pointerEvents = 'auto';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    handleRight.addEventListener('mousedown', (e) => onMouseDown(e, 'right'));
    handleLeft.addEventListener('mousedown', (e) => onMouseDown(e, 'left'));
  }

  updateViewportWidth() {
    const bp = state.breakpoint;
    if (bp === "desktop") {
      this.viewport.style.width = "100%";
      this.widthText.innerText = "100%";
    } else if (bp === "tablet") {
      this.viewport.style.width = "768px";
      this.widthText.innerText = "768px";
    } else if (bp === "mobile") {
      this.viewport.style.width = "375px";
      this.widthText.innerText = "375px";
    }
  }

  // Compile JSON Document to HTML + Inject CSS styles
  render() {
    const doc = this.iframe.contentDocument;
    if (!doc) return;

    const rootContainer = doc.getElementById('cwb-canvas-root');
    if (!rootContainer) return;

    // Save scroll position
    const scrollY = this.iframe.contentWindow.scrollY;
    const scrollX = this.iframe.contentWindow.scrollX;

    // Clean container
    rootContainer.innerHTML = '';

    // Generate HTML elements starting from JSON root node
    const renderNode = (node, parentNode = null) => {
      let el;
      if (node.tag === 'img') {
        el = doc.createElement('img');
      } else if (node.tag === 'input') {
        el = doc.createElement('input');
      } else if (node.tag === 'textarea') {
        el = doc.createElement('textarea');
      } else {
        el = doc.createElement(node.tag || 'div');
      }

      // Metadata identifiers for editor styling and outline matching
      el.setAttribute('data-cwb-id', node.id);
      el.setAttribute('data-cwb-tag', node.tag);
      if (!state.previewMode) {
        el.setAttribute('draggable', 'true');
      }

      // Class names
      let finalClasses = [...(node.classes || [])];
      
      // Handle slide active class injection in the editor
      if (parentNode && parentNode.classes && parentNode.classes.includes('cwb-slider') && finalClasses.includes('cwb-slide')) {
        const slides = parentNode.children.filter(c => c.classes && c.classes.includes('cwb-slide'));
        const slideIndex = slides.indexOf(node);
        const activeIdx = parseInt(parentNode.attributes['data-active-index'] || '0', 10);
        if (slideIndex === activeIdx) {
          if (!finalClasses.includes('active')) {
            finalClasses.push('active');
          }
        } else {
          finalClasses = finalClasses.filter(c => c !== 'active');
        }
      }

      if (finalClasses.length > 0) {
        el.className = finalClasses.join(' ');
        el.setAttribute('data-cwb-class', finalClasses.join(', '));
      } else {
        el.setAttribute('data-cwb-class', 'No Class');
      }
      
      const labelText = getFriendlyTagName(node.tag, node.classes || []) + (node.classes && node.classes.length > 0 ? ' • ' + node.classes[0] : '');
      el.setAttribute('data-cwb-label', labelText);

      // Standard attributes
      if (node.attributes) {
        Object.entries(node.attributes).forEach(([key, val]) => {
          el.setAttribute(key, val);
        });
      }

      // Textcontent
      if (node.textContent && node.tag !== 'input' && node.tag !== 'textarea') {
        let text = node.textContent;
        const bracesRegex = /\{\{([^}]+)\}\}/g;
        text = text.replace(bracesRegex, (match, path) => {
          const resolved = resolvePath(state.doc.dynamicData, path.trim());
          return resolved !== undefined && resolved !== null ? resolved : match;
        });
        el.textContent = text;
      }

      // Dynamic bindings overrides
      if (node.bindings) {
        Object.entries(node.bindings).forEach(([field, path]) => {
          const resolvedValue = resolvePath(state.doc.dynamicData, path);
          if (resolvedValue !== undefined && resolvedValue !== null) {
            if (field === 'textContent') {
              if (node.tag !== 'input' && node.tag !== 'textarea') {
                el.textContent = resolvedValue;
              }
            } else if (field.startsWith('attributes.')) {
              const attrName = field.substring('attributes.'.length);
              el.setAttribute(attrName, resolvedValue);
              if (attrName === 'value' && (node.tag === 'input' || node.tag === 'textarea')) {
                el.value = resolvedValue;
              }
            }
          }
        });
      }

      // Children rendering target
      let renderTarget = el;
      if (node.classes && node.classes.includes('cwb-slider')) {
        const wrapper = doc.createElement('div');
        wrapper.className = 'cwb-slides-wrapper';
        el.appendChild(wrapper);
        renderTarget = wrapper;

        // Visual controls (arrows & dots) in editor mode
        const nav = node.attributes['data-navigation'] || 'both';
        const showArrows = nav === 'both' || nav === 'arrows';
        const showDots = nav === 'both' || nav === 'dots';

        if (showArrows) {
          const prevBtn = doc.createElement('button');
          prevBtn.className = 'cwb-slider-arrow prev';
          prevBtn.innerHTML = '&#10094;';
          prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const slides = node.children.filter(c => c.classes && c.classes.includes('cwb-slide'));
            if (slides.length > 0) {
              let idx = parseInt(node.attributes['data-active-index'] || '0', 10);
              idx = (idx - 1 + slides.length) % slides.length;
              state.updateAttribute('data-active-index', idx.toString(), node.id);
            }
          });
          el.appendChild(prevBtn);

          const nextBtn = doc.createElement('button');
          nextBtn.className = 'cwb-slider-arrow next';
          nextBtn.innerHTML = '&#10095;';
          nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const slides = node.children.filter(c => c.classes && c.classes.includes('cwb-slide'));
            if (slides.length > 0) {
              let idx = parseInt(node.attributes['data-active-index'] || '0', 10);
              idx = (idx + 1) % slides.length;
              state.updateAttribute('data-active-index', idx.toString(), node.id);
            }
          });
          el.appendChild(nextBtn);
        }

        if (showDots) {
          const dotsContainer = doc.createElement('div');
          dotsContainer.className = 'cwb-slider-dots';
          const slides = node.children.filter(c => c.classes && c.classes.includes('cwb-slide'));
          const activeIdx = parseInt(node.attributes['data-active-index'] || '0', 10);
          slides.forEach((slide, i) => {
            const dot = doc.createElement('span');
            dot.className = `cwb-slider-dot${i === activeIdx ? ' active' : ''}`;
            dot.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              state.updateAttribute('data-active-index', i.toString(), node.id);
            });
            dotsContainer.appendChild(dot);
          });
          el.appendChild(dotsContainer);
        }
      }

      // Children
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          if (child.loopSource) {
            const arr = resolvePath(state.doc.dynamicData, child.loopSource);
            if (Array.isArray(arr) && arr.length > 0) {
              arr.forEach((item, index) => {
                const childClone = JSON.parse(JSON.stringify(child));
                delete childClone.loopSource;
                rewriteBindings(childClone, child.loopSource, index);
                renderTarget.appendChild(renderNode(childClone, node));
              });
              return;
            }
          }
          renderTarget.appendChild(renderNode(child, node));
        });
      }

      return el;
    };

    // Render tree under the canvas root
    if (state.doc.tree.children) {
      state.doc.tree.children.forEach(child => {
        if (child.loopSource) {
          const arr = resolvePath(state.doc.dynamicData, child.loopSource);
          if (Array.isArray(arr) && arr.length > 0) {
            arr.forEach((item, index) => {
              const childClone = JSON.parse(JSON.stringify(child));
              delete childClone.loopSource;
              rewriteBindings(childClone, child.loopSource, index);
              rootContainer.appendChild(renderNode(childClone, state.doc.tree));
            });
            return;
          }
        }
        rootContainer.appendChild(renderNode(child, state.doc.tree));
      });
    }

    // Direct root container styling (body simulation)
    const rootEl = doc.getElementById('cwb-canvas-root');
    if (rootEl) {
      rootEl.setAttribute('data-cwb-id', 'root');
      rootEl.setAttribute('data-cwb-tag', 'body');
      
      if (state.doc.tree.classes && state.doc.tree.classes.length > 0) {
        rootEl.className = state.doc.tree.classes.join(' ');
      }
      
      const rootLabel = 'body' + (state.doc.tree.classes && state.doc.tree.classes.length > 0 ? ' • ' + state.doc.tree.classes[0] : '');
      rootEl.setAttribute('data-cwb-label', rootLabel);
    }

    // Inject editor core stylesheet and JSON compiled stylesheets
    this.injectStylesheets(doc);

    // Restore scroll position
    this.iframe.contentWindow.scrollTo(scrollX, scrollY);

    // Refresh active outlines
    this.updateSelectionOverlay();

    state.emit('canvasRendered');
  }

  injectStylesheets(doc) {
    let editorStyleTag = doc.getElementById('cwb-editor-styles');
    if (!editorStyleTag) {
      editorStyleTag = doc.createElement('style');
      editorStyleTag.id = 'cwb-editor-styles';
      doc.head.appendChild(editorStyleTag);
    }

    // Base Reset Styles + Editor Layout helpers (Only inside editor mode)
    let css = `
      * { box-sizing: border-box; }
      body, #cwb-canvas-root {
        margin: 0;
        padding: 0;
        min-height: 100vh;
      }
      [data-cwb-id]:empty:not(input):not(textarea):not(img) {
        min-height: 40px;
        min-width: 120px;
        width: 100%;
        align-self: stretch;
        background: rgba(99, 91, 255, 0.05);
        border: 1px dashed rgba(99, 91, 255, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      [data-cwb-id]:empty:not(input):not(textarea):not(img)::after {
        content: attr(data-cwb-tag) ' empty block';
        font-size: 11px;
        color: rgba(99, 91, 255, 0.4);
        font-family: sans-serif;
      }
      
      /* Predefined Keyframes for Editor Viewport */
      @keyframes cwb-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes cwb-fade-out { from { opacity: 1; } to { opacity: 0; } }
      @keyframes cwb-slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes cwb-slide-down { from { transform: translateY(-30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes cwb-slide-left { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes cwb-slide-right { from { transform: translateX(-30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes cwb-zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes cwb-zoom-out { from { transform: scale(1.1); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes cwb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes cwb-bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-15px); }
        60% { transform: translateY(-7px); }
      }
      @keyframes cwb-pulse {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 91, 255, 0.4); }
        70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(99, 91, 255, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 91, 255, 0); }
      }
      
      /* Slider Component Structural Styles */
      .cwb-slider {
        position: relative;
        width: 100%;
        overflow: hidden;
      }
      .cwb-slides-wrapper {
        display: flex;
        width: 100%;
        height: 100%;
        transition: transform 0.5s ease-in-out;
      }
      .cwb-slide {
        flex: 0 0 100%;
        width: 100%;
        display: none;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
      }
      .cwb-slide.active {
        display: flex !important;
      }
      .cwb-slider-arrow {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0, 0, 0, 0.4);
        color: white;
        border: none;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        font-size: 18px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s, opacity 0.2s;
        z-index: 10;
        outline: none;
      }
      .cwb-slider-arrow:hover {
        background: rgba(0, 0, 0, 0.7);
      }
      .cwb-slider-arrow.prev {
        left: 20px;
      }
      .cwb-slider-arrow.next {
        right: 20px;
      }
      .cwb-slider-dots {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        z-index: 10;
      }
      .cwb-slider-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);
        cursor: pointer;
        transition: background-color 0.2s, transform 0.2s;
      }
      .cwb-slider-dot:hover {
        background: rgba(255, 255, 255, 0.7);
        transform: scale(1.2);
      }
      .cwb-slider-dot.active {
        background: #ffffff;
        transform: scale(1.2);
      }
    `;

    if (!state.previewMode) {
      css += `
        /* Editor outlines */
        [data-cwb-id] {
          cursor: pointer;
        }
        [data-cwb-id]:hover {
          outline: 1px dashed #3898EC !important;
          outline-offset: -1px;
        }
        .cwb-selected {
          outline: 2px solid #635bff !important;
          outline-offset: -2px !important;
          position: relative !important;
        }
        .cwb-editing-text {
          outline: 2px dashed #4caf50 !important;
          background: rgba(76, 175, 80, 0.05);
          cursor: text !important;
        }
        
        /* Drop targets */
        .cwb-drop-before {
          border-top: 3px solid #635bff !important;
        }
        .cwb-drop-after {
          border-bottom: 3px solid #635bff !important;
        }
        .cwb-drop-inside {
          outline: 2px dashed #635bff !important;
          background: rgba(99, 91, 255, 0.1) !important;
        }
      `;
    }

    editorStyleTag.textContent = css;

    // Inject document compiled CSS styles
    let documentStyleTag = doc.getElementById('cwb-document-styles');
    if (!documentStyleTag) {
      documentStyleTag = doc.createElement('style');
      documentStyleTag.id = 'cwb-document-styles';
      doc.head.appendChild(documentStyleTag);
    }
    
    const compiledCss = this.compileStylesToCss();
    const cssBracesRegex = /\{\{([^}]+)\}\}/g;
    documentStyleTag.textContent = compiledCss.replace(cssBracesRegex, (match, path) => {
      const resolved = resolvePath(state.doc.dynamicData, path.trim());
      return resolved !== undefined && resolved !== null ? resolved : match;
    });

    // Inject Google Fonts dynamic links based on fonts used in the document
    const usedFonts = this.getUsedFonts();
    let fontLink = doc.getElementById('cwb-google-fonts');
    if (usedFonts.size > 0) {
      if (!fontLink) {
        // Create preconnects
        let p1 = doc.getElementById('cwb-font-preconnect-1');
        if (!p1) {
          p1 = doc.createElement('link');
          p1.id = 'cwb-font-preconnect-1';
          p1.rel = 'preconnect';
          p1.href = 'https://fonts.googleapis.com';
          doc.head.appendChild(p1);
        }
        let p2 = doc.getElementById('cwb-font-preconnect-2');
        if (!p2) {
          p2 = doc.createElement('link');
          p2.id = 'cwb-font-preconnect-2';
          p2.rel = 'preconnect';
          p2.href = 'https://fonts.gstatic.com';
          p2.setAttribute('crossorigin', 'anonymous');
          doc.head.appendChild(p2);
        }

        fontLink = doc.createElement('link');
        fontLink.id = 'cwb-google-fonts';
        fontLink.rel = 'stylesheet';
        doc.head.appendChild(fontLink);
      }
      const fontQuery = Array.from(usedFonts).map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;900`).join('&');
      fontLink.href = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;
    } else {
      if (fontLink) fontLink.remove();
    }
  }

  // Detect which custom Google Fonts are referenced in elements or classes stylesheet
  getUsedFonts() {
    const fonts = new Set();
    const googleFontsList = [
      'Inter', 'Roboto', 'Open Sans', 'Poppins', 'Montserrat', 'Lato', 'Outfit',
      'Raleway', 'Nunito', 'Ubuntu', 'Quicksand', 'Fira Sans', 'Work Sans', 'Cabin',
      'Playfair Display', 'Merriweather', 'Lora', 'PT Serif', 'Georgia', 'Cinzel',
      'Libre Baskerville', 'Cardo', 'JetBrains Mono', 'Fira Code', 'Inconsolata',
      'Roboto Mono', 'Source Code Pro', 'Oswald', 'Anton', 'Lobster', 'Pacifico',
      'Dancing Script', 'Caveat', 'Permanent Marker', 'Righteous', 'Abril Fatface',
      'Comfortaa', 'Orbitron'
    ];

    const scanStyles = (stylesObj) => {
      if (!stylesObj) return;
      Object.values(stylesObj).forEach(bpStyles => {
        if (!bpStyles) return;
        Object.entries(bpStyles).forEach(([key, val]) => {
          const prop = key.split(':').pop();
          if (prop === 'font-family' && val) {
            const match = val.match(/'([^']+)'/) || val.match(/"([^"]+)"/);
            const fontName = match ? match[1] : val.split(',')[0].trim();
            if (googleFontsList.includes(fontName)) {
              fonts.add(fontName);
            }
          }
        });
      });
    };

    const scanNode = (node) => {
      scanStyles(node.styles);
      if (node.children) {
        node.children.forEach(scanNode);
      }
    };

    scanNode(state.doc.tree);
    Object.values(state.doc.classes).forEach(scanStyles);
    return fonts;
  }

  // Compile full CWB-JSON Styles to native CSS blocks
  compileStylesToCss() {
    const { classes, tree, globals } = state.doc;
    
    let desktopStyles = '';
    let tabletStyles = '';
    let mobileStyles = '';

    // Prepend global variables inside :root selector
    let rootVariables = ':root {\n';
    if (globals) {
      if (globals.colors) {
        globals.colors.forEach(c => {
          rootVariables += `  --${c.id}: ${c.value};\n`;
        });
      }
      if (globals.fonts) {
        globals.fonts.forEach(f => {
          rootVariables += `  --${f.id}: ${f.value};\n`;
        });
      }
    }
    rootVariables += '}\n\n';
    desktopStyles += rootVariables;

    const formatRule = (selector, styles) => {
      const groups = {
        normal: {},
        hover: {},
        active: {},
        focus: {}
      };

      Object.entries(styles).forEach(([key, val]) => {
        if (key.startsWith('hover:')) {
          groups.hover[key.substring(6)] = val;
        } else if (key.startsWith('active:')) {
          groups.active[key.substring(7)] = val;
        } else if (key.startsWith('focus:')) {
          groups.focus[key.substring(6)] = val;
        } else {
          groups.normal[key] = val;
        }
      });

      let ruleStr = '';
      
      const formatSubGroup = (sel, groupStyles) => {
        if (Object.keys(groupStyles).length === 0) return '';
        let r = `${sel} { `;
        Object.entries(groupStyles).forEach(([prop, val]) => {
          r += `${prop}: ${val}; `;
        });
        r += '}\n';
        return r;
      };

      ruleStr += formatSubGroup(selector, groups.normal);
      ruleStr += formatSubGroup(`${selector}:hover`, groups.hover);
      ruleStr += formatSubGroup(`${selector}:active`, groups.active);
      ruleStr += formatSubGroup(`${selector}:focus`, groups.focus);

      return ruleStr;
    };

    // Helper to process class rules
    Object.entries(classes).forEach(([className, breakpoints]) => {
      const selector = `.${className}`;
      if (breakpoints.desktop) {
        desktopStyles += formatRule(selector, breakpoints.desktop);
      }
      if (breakpoints.tablet) {
        tabletStyles += formatRule(selector, breakpoints.tablet);
      }
      if (breakpoints.mobile) {
        mobileStyles += formatRule(selector, breakpoints.mobile);
      }
    });

    // Helper to process elements override styles (recursive tree walkthrough)
    const processElementStyles = (node) => {
      // Direct element identifier maps to selector `#cwb-canvas-root [data-cwb-id="${node.id}"]`
      const selector = `#cwb-canvas-root [data-cwb-id="${node.id}"]`;
      
      if (node.styles) {
        if (node.styles.desktop) {
          desktopStyles += formatRule(selector, node.styles.desktop);
        }
        if (node.styles.tablet) {
          tabletStyles += formatRule(selector, node.styles.tablet);
        }
        if (node.styles.mobile) {
          mobileStyles += formatRule(selector, node.styles.mobile);
        }
      }

      // Compile element animations
      if (node.animations && node.animations.length > 0) {
        node.animations.forEach(anim => {
          let suffix = '';
          if (anim.trigger === 'hover') suffix = ':hover';
          else if (anim.trigger === 'active') suffix = ':active';
          
          const sel = `${selector}${suffix}`;
          
          let easing = anim.ease;
          if (anim.ease === 'custom' && anim.cubicPoints) {
            easing = `cubic-bezier(${anim.cubicPoints.join(', ')})`;
          }
          
          const rule = `animation: cwb-${anim.type} ${anim.duration}s ${easing} ${anim.delay}s ${anim.iteration} ${anim.direction || 'normal'} both;`;
          desktopStyles += `${sel} { ${rule} }\n`;
        });
      }

      if (node.children) {
        node.children.forEach(processElementStyles);
      }
    };

    processElementStyles(tree);

    // Join with responsive breakpoints media query envelopes
    let fullCss = desktopStyles + '\n';
    if (tabletStyles) {
      fullCss += `@media (max-width: 991px) {\n${tabletStyles}}\n`;
    }
    if (mobileStyles) {
      fullCss += `@media (max-width: 767px) {\n${mobileStyles}}\n`;
    }

    // Append predefined animations keyframes block so they run inside editor viewport and sandbox
    fullCss += `
      @keyframes cwb-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes cwb-fade-out { from { opacity: 1; } to { opacity: 0; } }
      @keyframes cwb-slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes cwb-slide-down { from { transform: translateY(-30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes cwb-slide-left { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes cwb-slide-right { from { transform: translateX(-30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes cwb-zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes cwb-zoom-out { from { transform: scale(1.1); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      @keyframes cwb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes cwb-bounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-15px); }
        60% { transform: translateY(-7px); }
      }
      @keyframes cwb-pulse {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 91, 255, 0.4); }
        70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(99, 91, 255, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 91, 255, 0); }
      }
    `;

    return fullCss;
  }

  updateSelectionOverlay() {
    const doc = this.iframe.contentDocument;
    if (!doc) return;

    // Clear previous selections
    doc.querySelectorAll('.cwb-selected').forEach(el => el.classList.remove('cwb-selected'));
    
    const indicator = document.getElementById('active-tag-indicator');
    
    if (state.selectedNodeId && !state.previewMode) {
      const el = doc.querySelector(`[data-cwb-id="${state.selectedNodeId}"]`);
      if (el) {
        el.classList.add('cwb-selected');
        
        // Update top-bar badge info
        const node = state.getSelectedNode() || state.findNode('root');
        indicator.innerText = `${getFriendlyTagName(node.tag, node.classes || [])} (${node.classes.length > 0 ? node.classes.join(', ') : 'No class'})`;
        return;
      }
    }
    indicator.innerText = 'None selected';
  }

  // Setup HTML5 Drag and Drop events inside the iframe document
  setupDragAndDrop(doc) {
    // Add drag start listener
    doc.addEventListener('dragstart', (e) => {
      if (state.previewMode) return;
      const targetNode = e.target.closest('[data-cwb-id]');
      if (!targetNode || targetNode.getAttribute('data-cwb-id') === 'root') {
        e.preventDefault();
        return;
      }
      
      this.draggedNodeId = targetNode.getAttribute('data-cwb-id');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', this.draggedNodeId);
      
      // Delay opacity style to allow original to render
      setTimeout(() => {
        if (targetNode) targetNode.style.opacity = '0.4';
      }, 0);
    });

    doc.addEventListener('dragend', (e) => {
      const targetNode = e.target.closest('[data-cwb-id]');
      if (targetNode) {
        targetNode.style.opacity = '1';
      }
      this.clearDragClasses(doc);
    });

    doc.addEventListener('dragover', (e) => {
      if (state.previewMode) return;
      e.preventDefault(); // Required to allow dropping
      
      const targetNode = e.target.closest('[data-cwb-id]');
      if (!targetNode) return;

      const targetId = targetNode.getAttribute('data-cwb-id');
      if (this.draggedNodeId && targetId === this.draggedNodeId) return;

      this.clearDragClasses(doc);

      const rect = targetNode.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      
      // Calculate layout relation
      // If target is container/section and dragged is hovered in middle, drop 'inside'
      const tag = targetNode.getAttribute('data-cwb-tag');
      const isContainer = ['div', 'section', 'header', 'footer', 'main'].includes(tag) || targetId === 'root';
      
      if (isContainer && relativeY > rect.height * 0.25 && relativeY < rect.height * 0.75) {
        targetNode.classList.add('cwb-drop-inside');
        this.dropTargetId = targetId;
        this.dropPosition = 'inside';
      } else if (relativeY < rect.height * 0.5 && targetId !== 'root') {
        targetNode.classList.add('cwb-drop-before');
        this.dropTargetId = targetId;
        this.dropPosition = 'before';
      } else if (targetId !== 'root') {
        targetNode.classList.add('cwb-drop-after');
        this.dropTargetId = targetId;
        this.dropPosition = 'after';
      } else {
        // Fallback for root
        targetNode.classList.add('cwb-drop-inside');
        this.dropTargetId = 'root';
        this.dropPosition = 'inside';
      }
    });

    doc.addEventListener('drop', (e) => {
      if (state.previewMode || !this.dropTargetId) return;
      e.preventDefault();
      
      const dragData = e.dataTransfer.getData('text/plain');
      const targetId = this.dropTargetId;
      const pos = this.dropPosition;

      this.clearDragClasses(doc);

      if (dragData.startsWith('new-tag:')) {
        const parts = dragData.split(':');
        const tag = parts[1];
        const props = JSON.parse(parts.slice(2).join(':'));
        
        if (pos === 'inside') {
          state.addNode(tag, props, targetId);
        } else {
          const parent = state.findParent(targetId);
          if (parent) {
            const index = parent.children.findIndex(c => c.id === targetId);
            const insertIndex = pos === 'before' ? index : index + 1;
            
            // Add element node to parent first
            const newNode = state.addNode(tag, props, parent.id);
            if (newNode) {
              state.moveNode(newNode.id, parent.id, insertIndex);
            }
          }
        }
      } else {
        const draggedId = this.draggedNodeId || dragData;
        if (!draggedId || draggedId === targetId) return;

        if (pos === 'inside') {
          state.moveNode(draggedId, targetId, -1);
        } else {
          const parent = state.findParent(targetId);
          if (parent) {
            const index = parent.children.findIndex(c => c.id === targetId);
            const insertIndex = pos === 'before' ? index : index + 1;
            state.moveNode(draggedId, parent.id, insertIndex);
          }
        }
      }

      this.draggedNodeId = null;
      this.dropTargetId = null;
      this.dropPosition = null;
    });
  }

  clearDragClasses(doc) {
    doc.querySelectorAll('.cwb-drop-before, .cwb-drop-after, .cwb-drop-inside').forEach(el => {
      el.classList.remove('cwb-drop-before', 'cwb-drop-after', 'cwb-drop-inside');
    });
  }
}
