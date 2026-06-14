import { state } from '../state.js';

export class AnimationsPanelController {
  constructor() {
    this.listContainer = document.getElementById('active-animations-list');
    this.btnAdd = document.getElementById('btn-add-animation');
    this.detailsSection = document.getElementById('anim-details-section');

    this.triggerSelect = document.getElementById('anim-trigger-select');
    this.typeSelect = document.getElementById('anim-type-select');

    this.durationSlider = document.getElementById('anim-duration-slider');
    this.durationNumber = document.getElementById('anim-duration-number');

    this.delaySlider = document.getElementById('anim-delay-slider');
    this.delayNumber = document.getElementById('anim-delay-number');

    this.iterationSelect = document.getElementById('anim-iteration-select');
    this.directionSelect = document.getElementById('anim-direction-select');
    this.easingSelect = document.getElementById('anim-easing-select');

    this.bezierWrapper = document.getElementById('bezier-graph-wrapper');
    this.bezierSvg = document.getElementById('bezier-graph-svg');
    this.bezierHandle1 = document.getElementById('bezier-handle1');
    this.bezierHandle2 = document.getElementById('bezier-handle2');
    this.bezierGuide1 = document.getElementById('bezier-guide1');
    this.bezierGuide2 = document.getElementById('bezier-guide2');
    this.bezierCurve = document.getElementById('bezier-curve-path');
    this.bezierValuesText = document.getElementById('bezier-values-text');

    this.timelineDelayBar = document.getElementById('timeline-delay-bar');
    this.timelineDurationBar = document.getElementById('timeline-duration-bar');
    this.timelineSummaryText = document.getElementById('timeline-summary-text');
    this.btnPreview = document.getElementById('btn-preview-animation');

    this.selectedAnimIndex = null;

    this.init();
  }

  init() {
    // Add animation button click handler
    this.btnAdd.addEventListener('click', () => {
      const node = state.getSelectedNode();
      if (!node) return;

      const animations = node.animations ? [...node.animations] : [];
      const newAnim = {
        trigger: 'load',
        type: 'fade-in',
        duration: 1.0,
        delay: 0.0,
        ease: 'ease',
        cubicPoints: [0.25, 0.25, 0.75, 0.75],
        iteration: '1',
        direction: 'normal'
      };
      animations.push(newAnim);
      state.updateNodeAnimations(node.id, animations);
      this.selectedAnimIndex = animations.length - 1;
      this.render();
    });

    // Setup input fields change event handlers
    const updateField = (field, value) => {
      const node = state.getSelectedNode();
      if (!node || this.selectedAnimIndex === null || this.selectedAnimIndex < 0) return;
      if (!node.animations || !node.animations[this.selectedAnimIndex]) return;

      node.animations[this.selectedAnimIndex][field] = value;
      state.updateNodeAnimations(node.id, node.animations);
      this.renderListOnly(); // Update metadata visual readings without resetting focus
      this.updateTimeline();
    };

    this.triggerSelect.addEventListener('change', () => {
      updateField('trigger', this.triggerSelect.value);
    });

    this.typeSelect.addEventListener('change', () => {
      updateField('type', this.typeSelect.value);
    });

    // Duration range & number sync
    this.durationSlider.addEventListener('input', () => {
      this.durationNumber.value = this.durationSlider.value;
      updateField('duration', parseFloat(this.durationSlider.value));
    });
    this.durationNumber.addEventListener('change', () => {
      let val = parseFloat(this.durationNumber.value);
      if (isNaN(val) || val < 0.1) val = 0.1;
      this.durationSlider.value = val;
      updateField('duration', val);
    });

    // Delay range & number sync
    this.delaySlider.addEventListener('input', () => {
      this.delayNumber.value = this.delaySlider.value;
      updateField('delay', parseFloat(this.delaySlider.value));
    });
    this.delayNumber.addEventListener('change', () => {
      let val = parseFloat(this.delayNumber.value);
      if (isNaN(val) || val < 0) val = 0;
      this.delaySlider.value = val;
      updateField('delay', val);
    });

    this.iterationSelect.addEventListener('change', () => {
      updateField('iteration', this.iterationSelect.value);
    });

    this.directionSelect.addEventListener('change', () => {
      updateField('direction', this.directionSelect.value);
    });

    this.easingSelect.addEventListener('change', () => {
      const ease = this.easingSelect.value;
      updateField('ease', ease);
      if (ease === 'custom') {
        this.bezierWrapper.classList.remove('hidden');
        // Initial setup for handles if not already initialized
        const node = state.getSelectedNode();
        if (node && node.animations && node.animations[this.selectedAnimIndex]) {
          const anim = node.animations[this.selectedAnimIndex];
          anim.cubicPoints = anim.cubicPoints || [0.25, 0.25, 0.75, 0.75];
          this.syncBezierHandles(anim.cubicPoints);
        }
      } else {
        this.bezierWrapper.classList.add('hidden');
      }
    });

    // Drag-and-drop handles for Cubic Bezier Graph
    this.setupBezierDragging();

    // Play preview
    this.btnPreview.addEventListener('click', () => {
      this.playPreview();
    });

    // Listeners for selection change and state changes
    state.on('selectionChange', () => {
      const node = state.getSelectedNode();
      if (node && node.animations && node.animations.length > 0) {
        // Keep active selection index if valid, else default to first
        if (this.selectedAnimIndex === null || this.selectedAnimIndex >= node.animations.length) {
          this.selectedAnimIndex = 0;
        }
      } else {
        this.selectedAnimIndex = null;
      }
      this.render();
    });

    state.on('change', () => {
      // Re-render list items only to avoid resetting visual controls state while dragging
      this.renderListOnly();
    });

    // Initial render
    this.render();
  }

  setupBezierDragging() {
    const bindHandleDrag = (handle, index) => {
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);

        const onPointerMove = (moveEv) => {
          const rect = this.bezierSvg.getBoundingClientRect();
          let cx = ((moveEv.clientX - rect.left) / rect.width) * 100;
          let cy = ((moveEv.clientY - rect.top) / rect.height) * 100;

          // Clamp x-coordinates to [0, 100]
          cx = Math.max(0, Math.min(100, cx));
          // Clamp y-coordinates to [-50, 150] (allow overflow boundaries)
          cy = Math.max(-50, Math.min(150, cy));

          handle.setAttribute('cx', cx.toString());
          handle.setAttribute('cy', cy.toString());

          const guide = index === 1 ? this.bezierGuide1 : this.bezierGuide2;
          guide.setAttribute('x2', cx.toString());
          guide.setAttribute('y2', cy.toString());

          this.updateBezierCurveFromHandles();
        };

        const onPointerUp = (upEv) => {
          handle.releasePointerCapture(upEv.pointerId);
          handle.removeEventListener('pointermove', onPointerMove);
          handle.removeEventListener('pointerup', onPointerUp);
        };

        handle.addEventListener('pointermove', onPointerMove);
        handle.addEventListener('pointerup', onPointerUp);
      });
    };

    bindHandleDrag(this.bezierHandle1, 1);
    bindHandleDrag(this.bezierHandle2, 2);
  }

  updateBezierCurveFromHandles() {
    const cx1 = parseFloat(this.bezierHandle1.getAttribute('cx'));
    const cy1 = parseFloat(this.bezierHandle1.getAttribute('cy'));
    const cx2 = parseFloat(this.bezierHandle2.getAttribute('cx'));
    const cy2 = parseFloat(this.bezierHandle2.getAttribute('cy'));

    this.bezierCurve.setAttribute('d', `M 0 100 C ${cx1} ${cy1}, ${cx2} ${cy2}, 100 0`);

    const x1 = (cx1 / 100).toFixed(2);
    const y1 = ((100 - cy1) / 100).toFixed(2);
    const x2 = (cx2 / 100).toFixed(2);
    const y2 = ((100 - cy2) / 100).toFixed(2);

    this.bezierValuesText.innerText = `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;

    // Update state
    const node = state.getSelectedNode();
    if (node && node.animations && node.animations[this.selectedAnimIndex]) {
      node.animations[this.selectedAnimIndex].cubicPoints = [
        parseFloat(x1),
        parseFloat(y1),
        parseFloat(x2),
        parseFloat(y2)
      ];
      state.updateNodeAnimations(node.id, node.animations);
    }
  }

  syncBezierHandles(points) {
    if (!points || points.length !== 4) return;
    const cx1 = points[0] * 100;
    const cy1 = 100 - points[1] * 100;
    const cx2 = points[2] * 100;
    const cy2 = 100 - points[3] * 100;

    this.bezierHandle1.setAttribute('cx', cx1.toString());
    this.bezierHandle1.setAttribute('cy', cy1.toString());
    this.bezierGuide1.setAttribute('x2', cx1.toString());
    this.bezierGuide1.setAttribute('y2', cy1.toString());

    this.bezierHandle2.setAttribute('cx', cx2.toString());
    this.bezierHandle2.setAttribute('cy', cy2.toString());
    this.bezierGuide2.setAttribute('x2', cx2.toString());
    this.bezierGuide2.setAttribute('y2', cy2.toString());

    this.bezierCurve.setAttribute('d', `M 0 100 C ${cx1} ${cy1}, ${cx2} ${cy2}, 100 0`);
    this.bezierValuesText.innerText = `cubic-bezier(${points.join(', ')})`;
  }

  render() {
    const node = state.getSelectedNode();

    if (!node) {
      this.listContainer.innerHTML = '';
      this.detailsSection.classList.add('hidden');
      this.btnAdd.disabled = true;
      return;
    }

    this.btnAdd.disabled = false;
    this.renderListOnly();

    // Show details if an animation is selected
    if (this.selectedAnimIndex !== null && this.selectedAnimIndex >= 0 && node.animations && node.animations[this.selectedAnimIndex]) {
      this.detailsSection.classList.remove('hidden');
      this.syncDetailsFields(node.animations[this.selectedAnimIndex]);
    } else {
      this.detailsSection.classList.add('hidden');
    }
  }

  renderListOnly() {
    const node = state.getSelectedNode();
    this.listContainer.innerHTML = '';
    if (!node || !node.animations || node.animations.length === 0) return;

    node.animations.forEach((anim, idx) => {
      const row = document.createElement('div');
      row.className = `anim-item-row${idx === this.selectedAnimIndex ? ' active' : ''}`;
      row.addEventListener('click', (e) => {
        // If clicking delete button, ignore selection change
        if (e.target.closest('.btn-anim-delete')) return;
        this.selectedAnimIndex = idx;
        this.render();
      });

      const details = document.createElement('div');
      details.className = 'anim-item-details';

      const title = document.createElement('div');
      title.className = 'anim-item-title';
      title.innerText = `${anim.type.replace('-', ' ')}`;

      const meta = document.createElement('div');
      meta.className = 'anim-item-meta';
      meta.innerText = `${anim.trigger} | ${anim.duration}s | ${anim.ease}`;

      details.appendChild(title);
      details.appendChild(meta);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-anim-delete';
      deleteBtn.innerHTML = '×';
      deleteBtn.title = 'Delete Animation';
      deleteBtn.addEventListener('click', () => {
        const list = [...node.animations];
        list.splice(idx, 1);
        state.updateNodeAnimations(node.id, list);
        if (this.selectedAnimIndex === idx) {
          this.selectedAnimIndex = list.length > 0 ? 0 : null;
        } else if (this.selectedAnimIndex > idx) {
          this.selectedAnimIndex--;
        }
        this.render();
      });

      row.appendChild(details);
      row.appendChild(deleteBtn);
      this.listContainer.appendChild(row);
    });
  }

  syncDetailsFields(anim) {
    this.triggerSelect.value = anim.trigger;
    this.typeSelect.value = anim.type;

    this.durationSlider.value = anim.duration;
    this.durationNumber.value = anim.duration;

    this.delaySlider.value = anim.delay;
    this.delayNumber.value = anim.delay;

    this.iterationSelect.value = anim.iteration;
    this.directionSelect.value = anim.direction || 'normal';
    this.easingSelect.value = anim.ease;

    if (anim.ease === 'custom') {
      this.bezierWrapper.classList.remove('hidden');
      this.syncBezierHandles(anim.cubicPoints || [0.25, 0.25, 0.75, 0.75]);
    } else {
      this.bezierWrapper.classList.add('hidden');
    }

    this.updateTimeline();
  }

  updateTimeline() {
    const node = state.getSelectedNode();
    if (!node || this.selectedAnimIndex === null || !node.animations || !node.animations[this.selectedAnimIndex]) return;

    const anim = node.animations[this.selectedAnimIndex];
    const delay = anim.delay || 0;
    const duration = anim.duration || 0;

    // Timeline scale is 5 seconds
    const delayPct = Math.min(100, (delay / 5.0) * 100);
    const durationPct = Math.min(100 - delayPct, (duration / 5.0) * 100);

    this.timelineDelayBar.style.width = `${delayPct}%`;
    this.timelineDurationBar.style.width = `${durationPct}%`;
    this.timelineSummaryText.innerText = `Delay: ${delay.toFixed(1)}s | Duration: ${duration.toFixed(1)}s`;
  }

  playPreview() {
    const node = state.getSelectedNode();
    if (!node || this.selectedAnimIndex === null || !node.animations || !node.animations[this.selectedAnimIndex]) return;

    const anim = node.animations[this.selectedAnimIndex];
    
    // Find iframe element
    const iframe = document.getElementById('canvas-iframe');
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) return;

    const targetEl = iframeDoc.querySelector(`[data-cwb-id="${node.id}"]`);
    if (!targetEl) return;

    // Apply temporary inline animation styling
    let easing = anim.ease;
    if (anim.ease === 'custom' && anim.cubicPoints) {
      easing = `cubic-bezier(${anim.cubicPoints.join(', ')})`;
    }

    const animStyle = `cwb-${anim.type} ${anim.duration}s ${easing} ${anim.delay}s ${anim.iteration} ${anim.direction || 'normal'} both`;

    // Clear inline animation first to allow triggering from scratch
    targetEl.style.animation = 'none';
    
    // Force a reflow
    targetEl.offsetHeight;

    // Apply new animation
    targetEl.style.animation = animStyle;

    // Clean up when animation ends to prevent overriding base selectors and hover behaviors
    if (anim.iteration !== 'infinite') {
      const onAnimationEnd = (e) => {
        if (e.animationName === `cwb-${anim.type}`) {
          targetEl.style.animation = '';
          targetEl.removeEventListener('animationend', onAnimationEnd);
        }
      };
      targetEl.addEventListener('animationend', onAnimationEnd);
    }
  }
}
