import { state } from '../state.js';
import { Exporter } from '../exporter.js';

// Pre-built layout elements node structures
const PREBUILT_COMPONENTS = [
  {
    id: 'pre-navbar',
    name: 'Header & Navigation Bar',
    classes: {},
    tree: {
      tag: 'header',
      classes: [],
      styles: {
        desktop: {
          'display': 'flex',
          'justify-content': 'space-between',
          'align-items': 'center',
          'padding': '15px 30px',
          'background-color': '#ffffff',
          'border-bottom': '1px solid #e5e7eb',
          'width': '100%'
        }
      },
      children: [
        {
          tag: 'div',
          textContent: '🍰 CakeBrand',
          classes: [],
          styles: {
            desktop: {
              'font-size': '18px',
              'font-weight': '700',
              'color': '#635bff'
            }
          },
          children: []
        },
        {
          tag: 'div',
          classes: [],
          styles: {
            desktop: {
              'display': 'flex',
              'gap': '20px',
              'align-items': 'center'
            }
          },
          children: [
            {
              tag: 'a',
              textContent: 'Features',
              classes: [],
              styles: {
                desktop: {
                  'color': '#4b5563',
                  'text-decoration': 'none',
                  'font-size': '14px',
                  'font-weight': '500'
                }
              },
              children: []
            },
            {
              tag: 'a',
              textContent: 'Pricing',
              classes: [],
              styles: {
                desktop: {
                  'color': '#4b5563',
                  'text-decoration': 'none',
                  'font-size': '14px',
                  'font-weight': '500'
                }
              },
              children: []
            },
            {
              tag: 'a',
              textContent: 'Contact',
              classes: [],
              styles: {
                desktop: {
                  'color': '#4b5563',
                  'text-decoration': 'none',
                  'font-size': '14px',
                  'font-weight': '500'
                }
              },
              children: []
            }
          ]
        },
        {
          tag: 'button',
          textContent: 'Sign Up',
          classes: ['w-button'],
          styles: {
            desktop: {
              'padding': '8px 18px',
              'font-size': '14px',
              'background-color': '#635bff',
              'border': 'none',
              'color': '#ffffff',
              'border-radius': '6px',
              'cursor': 'pointer'
            }
          },
          children: []
        }
      ]
    }
  },
  {
    id: 'pre-hero',
    name: 'Modern Hero Header',
    classes: {},
    tree: {
      tag: 'section',
      classes: [],
      styles: {
        desktop: {
          'display': 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'justify-content': 'center',
          'padding': '80px 20px',
          'background-color': '#f9fafb',
          'text-align': 'center',
          'border-radius': '12px',
          'margin-bottom': '30px',
          'width': '100%'
        }
      },
      children: [
        {
          tag: 'h1',
          textContent: 'Build Beautiful Web Pages Instantly',
          classes: [],
          styles: {
            desktop: {
              'font-size': '40px',
              'color': '#111827',
              'margin-bottom': '15px',
              'font-weight': '800',
              'line-height': '1.2',
              'max-width': '700px'
            }
          },
          children: []
        },
        {
          tag: 'p',
          textContent: 'A visual, component-driven design tool running completely in your browser. Design, customize, and export production-ready HTML code in seconds.',
          classes: [],
          styles: {
            desktop: {
              'font-size': '16px',
              'color': '#4b5563',
              'max-width': '600px',
              'line-height': '1.6',
              'margin-bottom': '25px'
            }
          },
          children: []
        },
        {
          tag: 'div',
          classes: [],
          styles: {
            desktop: {
              'display': 'flex',
              'gap': '15px',
              'justify-content': 'center'
            }
          },
          children: [
            {
              tag: 'button',
              textContent: 'Get Started',
              classes: ['w-button'],
              styles: {
                desktop: {
                  'padding': '12px 24px',
                  'font-size': '15px',
                  'background-color': '#635bff',
                  'border-radius': '6px',
                  'border': 'none',
                  'color': '#ffffff',
                  'cursor': 'pointer'
                }
              },
              children: []
            },
            {
              tag: 'button',
              textContent: 'Learn More',
              classes: ['w-button'],
              styles: {
                desktop: {
                  'padding': '12px 24px',
                  'font-size': '15px',
                  'background-color': 'transparent',
                  'border': '1px solid #d1d5db',
                  'color': '#4b5563',
                  'border-radius': '6px',
                  'cursor': 'pointer'
                }
              },
              children: []
            }
          ]
        }
      ]
    }
  },
  {
    id: 'pre-grid',
    name: 'Three Columns Feature Grid',
    classes: {},
    tree: {
      tag: 'section',
      classes: [],
      styles: {
        desktop: {
          'padding': '60px 20px',
          'background-color': '#ffffff',
          'width': '100%'
        }
      },
      children: [
        {
          tag: 'div',
          classes: [],
          styles: {
            desktop: {
              'text-align': 'center',
              'margin-bottom': '40px'
            }
          },
          children: [
            {
              tag: 'h2',
              textContent: 'Our Core Features',
              classes: [],
              styles: {
                desktop: {
                  'font-size': '28px',
                  'color': '#111827',
                  'margin-bottom': '10px',
                  'font-weight': '700'
                }
              },
              children: []
            },
            {
              tag: 'p',
              textContent: 'Everything you need to deliver high-quality web applications.',
              classes: [],
              styles: {
                desktop: {
                  'font-size': '14px',
                  'color': '#6b7280'
                }
              },
              children: []
            }
          ]
        },
        {
          tag: 'div',
          classes: [],
          styles: {
            desktop: {
              'display': 'grid',
              'grid-template-columns': 'repeat(3, 1fr)',
              'gap': '20px'
            }
          },
          children: [
            {
              tag: 'div',
              classes: [],
              styles: {
                desktop: {
                  'padding': '24px',
                  'border': '1px solid #e5e7eb',
                  'border-radius': '8px',
                  'background-color': '#f9fafb'
                }
              },
              children: [
                {
                  tag: 'div',
                  textContent: '⚡',
                  classes: [],
                  styles: {
                    desktop: {
                      'font-size': '24px',
                      'margin-bottom': '12px'
                    }
                  },
                  children: []
                },
                {
                  tag: 'h3',
                  textContent: 'Ultra Fast',
                  classes: [],
                  styles: {
                    desktop: {
                      'font-size': '18px',
                      'color': '#111827',
                      'margin-bottom': '8px',
                      'font-weight': '600'
                    }
                  },
                  children: []
                },
                {
                  tag: 'p',
                  textContent: 'Optimized performance out of the box with static compilation and on-demand assets load.',
                  classes: [],
                  styles: {
                    desktop: {
                      'font-size': '13px',
                      'color': '#4b5563',
                      'line-height': '1.5'
                    }
                  },
                  children: []
                }
              ]
            },
            {
              tag: 'div',
              classes: [],
              styles: {
                desktop: {
                  'padding': '24px',
                  'border': '1px solid #e5e7eb',
                  'border-radius': '8px',
                  'background-color': '#f9fafb'
                }
              },
              children: [
                {
                  tag: 'div',
                  textContent: '🎨',
                  classes: [],
                  styles: {
                    desktop: {
                      'font-size': '24px',
                      'margin-bottom': '12px'
                    }
                  },
                  children: []
                },
                {
                  tag: 'h3',
                  textContent: 'Style Freedom',
                  classes: [],
                  styles: {
                    desktop: {
                      'font-size': '18px',
                      'color': '#111827',
                      'margin-bottom': '8px',
                      'font-weight': '600'
                    }
                  },
                  children: []
                },
                {
                  tag: 'p',
                  textContent: 'Complete control over margins, spacing, borders, radius, gradients, and custom responsive media.',
                  classes: [],
                  styles: {
                    desktop: {
                      'font-size': '13px',
                      'color': '#4b5563',
                      'line-height': '1.5'
                    }
                  },
                  children: []
                }
              ]
            },
            {
              tag: 'div',
              classes: [],
              styles: {
                desktop: {
                  'padding': '24px',
                  'border': '1px solid #e5e7eb',
                  'border-radius': '8px',
                  'background-color': '#f9fafb'
                }
              },
              children: [
                {
                  tag: 'div',
                  textContent: '🧩',
                  classes: [],
                  styles: {
                    desktop: {
                      'font-size': '24px',
                      'margin-bottom': '12px'
                    }
                  },
                  children: []
                },
                {
                  tag: 'h3',
                  textContent: 'Custom Presets',
                  classes: [],
                  styles: {
                    desktop: {
                      'font-size': '18px',
                      'color': '#111827',
                      'margin-bottom': '8px',
                      'font-weight': '600'
                    }
                  },
                  children: []
                },
                {
                  tag: 'p',
                  textContent: 'Easily package any section as a custom reusable component and instantiate them anywhere.',
                  classes: [],
                  styles: {
                    desktop: {
                      'font-size': '13px',
                      'color': '#4b5563',
                      'line-height': '1.5'
                    }
                  },
                  children: []
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: 'pre-testimonial',
    name: 'Customer Testimonial Block',
    classes: {},
    tree: {
      tag: 'section',
      classes: [],
      styles: {
        desktop: {
          'padding': '60px 20px',
          'background-color': '#f3f4f6',
          'border-radius': '12px',
          'display': 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          'text-align': 'center',
          'margin-bottom': '30px',
          'width': '100%'
        }
      },
      children: [
        {
          tag: 'div',
          textContent: '“',
          classes: [],
          styles: {
            desktop: {
              'font-size': '48px',
              'color': '#635bff',
              'font-family': 'Georgia, serif',
              'line-height': '1',
              'height': '24px',
              'margin-bottom': '10px'
            }
          },
          children: []
        },
        {
          tag: 'p',
          textContent: 'This is by far the most intuitive page builder I have ever worked with. The code generated is extremely clean, and the layout styling is absolute perfection.',
          classes: [],
          styles: {
            desktop: {
              'font-size': '16px',
              'color': '#1f2937',
              'font-style': 'italic',
              'max-width': '600px',
              'line-height': '1.6',
              'margin-bottom': '20px'
            }
          },
          children: []
        },
        {
          tag: 'div',
          textContent: '👤',
          classes: [],
          styles: {
            desktop: {
              'width': '48px',
              'height': '48px',
              'border-radius': '50%',
              'background-color': '#e5e7eb',
              'display': 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              'font-size': '20px',
              'margin-bottom': '10px'
            }
          },
          children: []
        },
        {
          tag: 'h4',
          textContent: 'Sarah Jenkins',
          classes: [],
          styles: {
            desktop: {
              'font-size': '14px',
              'color': '#111827',
              'font-weight': '700',
              'margin-bottom': '2px'
            }
          },
          children: []
        },
        {
          tag: 'p',
          textContent: 'Lead Product Designer, StackWeb',
          classes: [],
          styles: {
            desktop: {
              'font-size': '12px',
              'color': '#6b7280'
            }
          },
          children: []
        }
      ]
    }
  },
  {
    id: 'pre-contact',
    name: 'Clean Contact Section Form',
    classes: {},
    tree: {
      tag: 'section',
      classes: [],
      styles: {
        desktop: {
          'padding': '50px 30px',
          'background-color': '#ffffff',
          'border': '1px solid #e5e7eb',
          'border-radius': '8px',
          'margin-bottom': '30px',
          'width': '100%'
        }
      },
      children: [
        {
          tag: 'h2',
          textContent: 'Get in Touch',
          classes: [],
          styles: {
            desktop: {
              'font-size': '24px',
              'color': '#111827',
              'margin-bottom': '8px',
              'font-weight': '700',
              'text-align': 'center'
            }
          },
          children: []
        },
        {
          tag: 'p',
          textContent: 'Have any questions? Drop us a line below.',
          classes: [],
          styles: {
            desktop: {
              'font-size': '13px',
              'color': '#6b7280',
              'text-align': 'center',
              'margin-bottom': '30px'
            }
          },
          children: []
        },
        {
          tag: 'form',
          classes: [],
          styles: {
            desktop: {
              'display': 'flex',
              'flex-direction': 'column',
              'gap': '15px',
              'max-width': '450px',
              'margin-left': 'auto',
              'margin-right': 'auto'
            }
          },
          children: [
            {
              tag: 'div',
              classes: [],
              styles: {
                desktop: {
                  'display': 'flex',
                  'gap': '15px'
                }
              },
              children: [
                {
                  tag: 'input',
                  classes: [],
                  attributes: {
                    'placeholder': 'Full Name'
                  },
                  styles: {
                    desktop: {
                      'flex': '1',
                      'padding': '10px',
                      'border': '1px solid #d1d5db',
                      'border-radius': '6px',
                      'font-size': '13px',
                      'outline': 'none'
                    }
                  },
                  children: []
                },
                {
                  tag: 'input',
                  classes: [],
                  attributes: {
                    'placeholder': 'Email Address'
                  },
                  styles: {
                    desktop: {
                      'flex': '1',
                      'padding': '10px',
                      'border': '1px solid #d1d5db',
                      'border-radius': '6px',
                      'font-size': '13px',
                      'outline': 'none'
                    }
                  },
                  children: []
                }
              ]
            },
            {
              tag: 'input',
              classes: [],
              attributes: {
                'placeholder': 'Your Message'
              },
              styles: {
                desktop: {
                  'padding': '10px',
                  'border': '1px solid #d1d5db',
                  'border-radius': '6px',
                  'font-size': '13px',
                  'min-height': '80px',
                  'outline': 'none'
                }
              },
              children: []
            },
            {
              tag: 'button',
              textContent: 'Send Message',
              classes: ['w-button'],
              styles: {
                desktop: {
                  'padding': '12px',
                  'background-color': '#635bff',
                  'color': 'white',
                  'font-weight': '600',
                  'cursor': 'pointer',
                  'border': 'none',
                  'border-radius': '6px'
                }
              },
              children: []
            }
          ]
        }
      ]
    }
  }
];

export class ComponentBuilderPlugin {
  constructor() {
    this.id = 'component-builder';
    this.name = 'Component Builder';
    this.version = '1.0.0';
  }

  install(builder) {
    this.builder = builder;

    // Load active previews & widgets
    this.renderPrebuiltComponents();
    this.renderUserComponents();
    this.setupSaveModal();

    // Hook to enable/disable component saving button
    builder.on('selectionChange', (selectedId) => {
      const btn = document.getElementById('btn-create-component');
      if (btn) {
        btn.disabled = !selectedId || selectedId === 'root';
      }
    });

    // Run initial check
    const btn = document.getElementById('btn-create-component');
    if (btn) {
      const selectedId = builder.selectedNodeId;
      btn.disabled = !selectedId || selectedId === 'root';
    }
  }

  // Draw prebuilt layouts grid
  async renderPrebuiltComponents() {
    const container = document.getElementById('prebuilt-components-grid');
    if (!container) return;
    container.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); padding: 10px;">Generating previews...</div>';

    const items = [];
    for (const comp of PREBUILT_COMPONENTS) {
      let preview = comp.preview;
      if (!preview) {
        try {
          const clonedTree = this.cloneComponentNode(comp.tree);
          preview = await ComponentBuilderPlugin.generateComponentPreview(clonedTree, state.doc.classes);
          comp.preview = preview; // Cache preview data url in memory
        } catch (e) {
          console.error("Error generating preview for " + comp.name, e);
          preview = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af">Preview Error</text></svg>';
        }
      }
      items.push({ comp, preview });
    }

    container.innerHTML = '';
    items.forEach(({ comp, preview }) => {
      const card = document.createElement('div');
      card.className = 'component-card';
      card.innerHTML = `
        <div class="component-card-preview">
          <img src="${preview}" alt="${comp.name}">
        </div>
        <div class="component-card-info">
          <span class="component-card-name" title="${comp.name}">${comp.name}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        this.insertComponent(comp.tree, comp.classes);
      });
      container.appendChild(card);
    });
  }

  // Draw user custom components grid from localStorage
  renderUserComponents() {
    const container = document.getElementById('user-components-grid');
    if (!container) return;

    const raw = localStorage.getItem('cwb_user_components');
    const userComps = raw ? JSON.parse(raw) : [];

    if (userComps.length === 0) {
      container.innerHTML = `
        <div style="grid-column: span 1; padding: 20px 10px; text-align: center; border: 1px dashed var(--border-color); border-radius: 8px; color: var(--text-muted); font-size: 11px; line-height: 1.4;">
          No custom components saved yet. Select an element on the canvas and click "Save Selection as Component" above to build one.
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    userComps.forEach(comp => {
      const card = document.createElement('div');
      card.className = 'component-card';
      card.innerHTML = `
        <div class="component-card-preview">
          <img src="${comp.preview}" alt="${comp.name}">
        </div>
        <div class="component-card-info">
          <span class="component-card-name" title="${comp.name}">${comp.name}</span>
          <button class="component-delete-btn" title="Delete Component">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      `;

      // Click card to insert
      card.addEventListener('click', (e) => {
        if (e.target.closest('.component-delete-btn')) return;
        this.insertComponent(comp.tree, comp.classes);
      });

      // Click delete button
      const deleteBtn = card.querySelector('.component-delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete the component "${comp.name}"?`)) {
          this.deleteUserComponent(comp.id);
        }
      });

      container.appendChild(card);
    });
  }

  deleteUserComponent(id) {
    const raw = localStorage.getItem('cwb_user_components');
    let userComps = raw ? JSON.parse(raw) : [];
    userComps = userComps.filter(c => c.id !== id);
    localStorage.setItem('cwb_user_components', JSON.stringify(userComps));
    this.renderUserComponents();
  }

  setupSaveModal() {
    const btnSave = document.getElementById('btn-create-component');
    const modal = document.getElementById('modal-component');
    const btnClose = document.getElementById('btn-modal-comp-close');
    const btnCancel = document.getElementById('btn-modal-comp-cancel');
    const btnSubmit = document.getElementById('btn-modal-comp-submit');
    const nameInput = document.getElementById('component-name-input');

    if (!btnSave || !modal || !btnClose || !btnCancel || !btnSubmit || !nameInput) return;

    btnSave.addEventListener('click', () => {
      const selectedId = state.selectedNodeId;
      if (!selectedId || selectedId === 'root') return;

      const node = state.findNode(selectedId);
      if (!node) return;

      // Suggest a default name based on class list or tag name
      const defaultName = node.classes.length > 0 
        ? node.classes[0].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : node.tag.toUpperCase() + ' Component';
      
      nameInput.value = defaultName;
      modal.classList.remove('hidden');
      nameInput.focus();
      nameInput.select();
    });

    const closeModal = () => {
      modal.classList.add('hidden');
    };

    btnClose.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    btnSubmit.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) {
        alert("Please enter a component name.");
        return;
      }

      const selectedId = state.selectedNodeId;
      if (!selectedId || selectedId === 'root') {
        closeModal();
        return;
      }

      const node = state.findNode(selectedId);
      if (!node) {
        closeModal();
        return;
      }

      // Disable button & show saving state
      btnSubmit.disabled = true;
      btnSubmit.innerText = "Generating Preview...";

      try {
        // Generate PNG preview image
        const previewUrl = await ComponentBuilderPlugin.generateComponentPreview(node, state.doc.classes);

        // Capture component structure
        const component = {
          id: 'user-comp-' + Math.random().toString(36).substr(2, 9),
          name: name,
          tree: JSON.parse(JSON.stringify(node)),
          classes: this.getComponentClasses(node, state.doc.classes),
          preview: previewUrl
        };

        // Save to localStorage
        const raw = localStorage.getItem('cwb_user_components');
        const userComps = raw ? JSON.parse(raw) : [];
        userComps.push(component);
        localStorage.setItem('cwb_user_components', JSON.stringify(userComps));

        closeModal();
        this.renderUserComponents();
      } catch (e) {
        console.error("Error creating component", e);
        alert("Error creating component preview: " + e.message);
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Save Component";
      }
    });
  }

  // Scan component nodes subtree to extract used stylesheet class styles
  getComponentClasses(node, docClasses) {
    const componentClasses = {};
    const scan = (n) => {
      if (n.classes) {
        n.classes.forEach(cls => {
          if (docClasses[cls] && !componentClasses[cls]) {
            componentClasses[cls] = JSON.parse(JSON.stringify(docClasses[cls]));
          }
        });
      }
      if (n.children) {
        n.children.forEach(scan);
      }
    };
    scan(node);
    return componentClasses;
  }

  // Clone component node tree, generating new, unique IDs recursively
  cloneComponentNode(node) {
    const clone = JSON.parse(JSON.stringify(node));
    clone.id = state.generateId();
    
    // Set default fonts if not explicitly defined
    const tagLower = (clone.tag || '').toLowerCase();
    if (!clone.styles) clone.styles = {};
    if (!clone.styles.desktop) clone.styles.desktop = {};
    
    if (tagLower === 'h1' || tagLower === 'h2' || tagLower === 'h3' || tagLower === 'h4' || tagLower === 'h5' || tagLower === 'h6') {
      if (!clone.styles.desktop['font-family']) {
        clone.styles.desktop['font-family'] = 'var(--font-primary)';
      }
    } else if (tagLower === 'p') {
      if (!clone.styles.desktop['font-family']) {
        clone.styles.desktop['font-family'] = 'var(--font-secondary)';
      }
    }

    if (clone.children) {
      clone.children = clone.children.map(child => this.cloneComponentNode(child));
    }
    return clone;
  }

  // Insert component node tree into page document relative to selected node / active insert targets
  insertComponent(componentTree, classes) {
    // 1. Merge component classes if missing in document classes registry
    if (classes) {
      Object.entries(classes).forEach(([className, rules]) => {
        if (!state.doc.classes[className]) {
          state.doc.classes[className] = JSON.parse(JSON.stringify(rules));
        }
      });
    }

    // 2. Clone the subtree with fresh unique IDs
    const newSubtree = this.cloneComponentNode(componentTree);

    // 3. Determine insert parent and position index
    let parentId = state.selectedNodeId || 'root';
    let parent = state.findNode(parentId);
    if (!parent) return;

    const containerTags = ['div', 'section', 'container', 'header', 'footer', 'main', 'form'];
    let insertIndex = -1;

    // Check active insert target guides first
    if (state.activeInsertTarget) {
      const { id, position } = state.activeInsertTarget;
      if (position === 'inside') {
        const targetNode = state.findNode(id);
        if (targetNode) {
          targetNode.children.push(newSubtree);
        }
      } else {
        const actualParent = state.findParent(id);
        if (actualParent) {
          const index = actualParent.children.findIndex(c => c.id === id);
          const idx = position === 'before' ? index : index + 1;
          actualParent.children.splice(idx, 0, newSubtree);
        }
      }
      state.clearInsertTarget();
    } else {
      // Sibling insertion fallback
      if (parentId !== 'root' && !containerTags.includes(parent.tag.toLowerCase())) {
        const actualParent = state.findParent(parentId);
        if (actualParent) {
          insertIndex = actualParent.children.findIndex(c => c.id === parentId) + 1;
          parent = actualParent;
        }
      }

      if (insertIndex !== -1) {
        parent.children.splice(insertIndex, 0, newSubtree);
      } else {
        parent.children.push(newSubtree);
      }
    }

    state.saveHistory();
    state.selectNode(newSubtree.id);
  }

  // Dynamic Component preview image generation: compiles element node structure,
  // renders it in a temporary sandboxed iframe, measures size, builds SVG ForeignObject,
  // and draws onto a 2:1 ratio canvas preserving aspect ratio (letterboxing)
  static async generateComponentPreview(node, classes) {
    const htmlContent = Exporter.compileNodeToHtml(node, classes);
    const cssContent = Exporter.compileStylesToCss(classes, node);

    // Create a temporary hidden iframe to calculate render boundaries
    const tempIframe = document.createElement('iframe');
    tempIframe.style.position = 'fixed';
    tempIframe.style.top = '-9999px';
    tempIframe.style.left = '-9999px';
    tempIframe.style.width = '800px';
    tempIframe.style.height = '600px';
    document.body.appendChild(tempIframe);

    const doc = tempIframe.contentDocument;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          body { 
            margin: 0; 
            padding: 0; 
            background: transparent; 
            overflow: hidden; 
            font-family: system-ui, -apple-system, sans-serif;
          }
          ${cssContent}
        </style>
      </head>
      <body>
        <div id="cwb-render-wrap" style="display: inline-block; width: 100%; padding: 20px;">
          ${htmlContent}
        </div>
      </body>
      </html>
    `);
    doc.close();

    // Wait for styling layout and images/fonts parsing
    await new Promise(resolve => setTimeout(resolve, 200));

    const renderWrap = doc.getElementById('cwb-render-wrap');
    const w = Math.max(renderWrap.offsetWidth, 100) || 800;
    const h = Math.max(renderWrap.offsetHeight, 100) || 400;

    // Clean up temporary measurement iframe
    tempIframe.remove();

    // Clean void tags to be XML self-closing for SVG foreignObject XML parser compatibility
    const voidTagsRegex = /<(img|input|br|hr|meta|link|area|base|col|embed|param|source|track|wbr)([^>]*)(?<!\/)>/gi;
    let xhtml = htmlContent
      .replace(voidTagsRegex, '<$1$2 />')
      .replace(/&(?![a-zA-Z0-9#]+;)/g, '&amp;');

    // Calculate aspect ratio scaling and translation parameters for a 2:1 ratio (400x200) image
    const padding = 15;
    const maxW = 400 - padding * 2;
    const maxH = 200 - padding * 2;
    
    let s = Math.min(maxW / w, maxH / h);
    if (s > 1) s = 1; // Do not scale up, only down to avoid pixelation/distortion

    const scaledW = w * s;
    const scaledH = h * s;
    const x = padding + (maxW - scaledW) / 2;
    const y = padding + (maxH - scaledH) / 2;

    // Build the centered, scaled SVG directly
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <g transform="translate(${x}, ${y}) scale(${s})">
        <foreignObject width="${w}" height="${h}">
          <body xmlns="http://www.w3.org/1999/xhtml" style="margin: 0; padding: 0; background: transparent; font-family: system-ui, -apple-system, sans-serif;">
            <style>
              * { box-sizing: border-box; }
              ${cssContent}
            </style>
            <div style="padding: 20px;">
              ${xhtml}
            </div>
          </body>
        </foreignObject>
      </g>
    </svg>`;

    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString.trim());
  }
}
