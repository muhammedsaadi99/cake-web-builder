import { Exporter } from '../exporter.js';

export class ExporterPlugin {
  constructor() {
    this.id = 'exporter';
    this.name = 'Code Exporter';
    this.version = '1.0.0';
  }

  install(builder) {
    this.builder = builder;
    
    // Inject export button into the slot
    const slot = document.getElementById('cwb-topbar-right-slot');
    if (slot) {
      const btn = document.createElement('button');
      btn.id = 'btn-export-html';
      btn.className = 'btn-primary';
      btn.title = 'Export Website Files';
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        <span>Export Website</span>
      `;
      btn.addEventListener('click', () => {
        // Emit hook before exporting
        const hookData = { doc: this.builder.doc, cancel: false };
        this.builder.emit('beforeExport', hookData);
        if (hookData.cancel) return;
        
        Exporter.exportCode(this.builder.doc);
        
        this.builder.emit('afterExport', { doc: this.builder.doc });
      });
      slot.appendChild(btn);
    }
  }
}
