/**
 * SKUIntegrationAgent — Manages new SKU input from external sources (Yosi).
 *
 * Listens for:
 *   'request:sku-add'        → { sku, name, category, ... }
 *   'request:sku-import'     → { items[] }  (bulk import from Yosi)
 *   'request:sku-queue'      → show pending queue
 *
 * Emits:
 *   'response:sku-add'       → { success, item?, error? }
 *   'response:sku-import'    → { results[] }
 *   'data:changed'           → after successful add/import
 */
class SKUIntegrationAgent {
  constructor(bus, store) {
    this.name = 'SKUIntegrationAgent';
    this.bus = bus;
    this.store = store;
    this._listen();
  }

  _listen() {
    this.bus.on('request:sku-add', (evt) => this._handleAdd(evt.payload));
    this.bus.on('request:sku-import', (evt) => this._handleImport(evt.payload));
    this.bus.on('request:sku-queue', (evt) => this._handleQueue(evt.payload));
  }

  _handleAdd(payload) {
    this.bus.emit('agent:status', { agent: this.name, status: 'processing', detail: `Validating SKU ${payload.sku}` }, this.name);

    const validation = this._validate(payload);
    if (!validation.valid) {
      const formatted = this._formatError(validation.errors);
      this.bus.emit('response:sku-add', { success: false, errors: validation.errors, formatted }, this.name);
      this.bus.emit('agent:status', { agent: this.name, status: 'done', detail: `Validation failed for ${payload.sku}` }, this.name);
      return;
    }

    const result = this.store.addItem(payload);
    if (result.success) {
      this.bus.emit('data:changed', { action: 'sku-added', item: result.item }, this.name);
      const formatted = this._formatSuccess(result.item);
      this.bus.emit('response:sku-add', { success: true, item: result.item, formatted }, this.name);
      this._updateSkuPanel();
    } else {
      const formatted = this._formatError([result.error]);
      this.bus.emit('response:sku-add', { success: false, errors: [result.error], formatted }, this.name);
    }
    this.bus.emit('agent:status', { agent: this.name, status: 'done', detail: result.success ? `Added ${payload.sku}` : `Failed: ${result.error}` }, this.name);
  }

  _handleImport(payload) {
    const items = payload.items || [];
    this.bus.emit('agent:status', { agent: this.name, status: 'processing', detail: `Importing ${items.length} SKUs from Yosi` }, this.name);

    const results = [];
    let successCount = 0;

    items.forEach(item => {
      const validation = this._validate(item);
      if (!validation.valid) {
        results.push({ sku: item.sku, success: false, errors: validation.errors });
        return;
      }
      const addResult = this.store.addItem(item);
      results.push({ sku: item.sku, ...addResult });
      if (addResult.success) successCount++;
    });

    if (successCount > 0) {
      this.bus.emit('data:changed', { action: 'bulk-import', count: successCount }, this.name);
    }

    const formatted = this._formatImportResults(results);
    this.bus.emit('response:sku-import', { results, formatted, successCount, totalCount: items.length }, this.name);
    this.bus.emit('agent:status', { agent: this.name, status: 'done', detail: `Imported ${successCount}/${items.length} SKUs` }, this.name);
    this._updateSkuPanel();
  }

  _handleQueue() {
    const queue = this.store.skuQueue;
    const formatted = this._formatQueue(queue);
    this.bus.emit('response:sku-queue', { queue, formatted }, this.name);
  }

  _validate(item) {
    const errors = [];
    if (!item.sku || typeof item.sku !== 'string' || item.sku.trim().length === 0) {
      errors.push('SKU is required and must be a non-empty string');
    } else if (!/^[A-Z]{2,6}-\d{3,6}$/.test(item.sku)) {
      errors.push(`SKU format invalid: "${item.sku}". Expected format: PREFIX-NUMBERS (e.g., ELEC-1001)`);
    }
    if (!item.name || item.name.trim().length === 0) errors.push('Product name is required');
    if (!item.category || item.category.trim().length === 0) errors.push('Category is required');
    if (item.qty === undefined || isNaN(Number(item.qty)) || Number(item.qty) < 0) errors.push('Quantity must be a non-negative number');
    if (item.unitCost === undefined || isNaN(Number(item.unitCost)) || Number(item.unitCost) <= 0) errors.push('Unit cost must be a positive number');
    if (item.unitPrice === undefined || isNaN(Number(item.unitPrice)) || Number(item.unitPrice) <= 0) errors.push('Unit price must be a positive number');
    if (item.unitPrice && item.unitCost && Number(item.unitPrice) < Number(item.unitCost)) {
      errors.push('Warning: Unit price is less than unit cost (negative margin)');
    }
    return { valid: errors.length === 0, errors };
  }

  _formatSuccess(item) {
    return `
      <div class="sku-result sku-success">
        <h4>SKU Added Successfully</h4>
        <div class="sku-detail-grid">
          <span class="sku-label">SKU:</span> <code>${item.sku}</code>
          <span class="sku-label">Name:</span> ${item.name}
          <span class="sku-label">Category:</span> ${item.category}
          <span class="sku-label">Quantity:</span> ${item.qty}
          <span class="sku-label">Cost/Price:</span> $${item.unitCost.toFixed(2)} / $${item.unitPrice.toFixed(2)}
          <span class="sku-label">Supplier:</span> ${item.supplier}
        </div>
        <p class="sku-note">Dashboard and exception reports will update automatically.</p>
      </div>`;
  }

  _formatError(errors) {
    return `
      <div class="sku-result sku-error">
        <h4>SKU Validation Failed</h4>
        <ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul>
      </div>`;
  }

  _formatImportResults(results) {
    const success = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    let html = `<div class="sku-import-report">`;
    html += `<h3>Yosi Import Results</h3>`;
    html += `<p>${success.length} succeeded, ${failed.length} failed out of ${results.length} total.</p>`;

    if (success.length > 0) {
      html += `<h4>Added:</h4><ul>`;
      success.forEach(r => { html += `<li><code>${r.sku}</code> — ${r.item.name}</li>`; });
      html += `</ul>`;
    }

    if (failed.length > 0) {
      html += `<h4>Failed:</h4><ul>`;
      failed.forEach(r => {
        const errMsg = r.errors ? r.errors.join('; ') : r.error;
        html += `<li><code>${r.sku || 'N/A'}</code> — ${errMsg}</li>`;
      });
      html += `</ul>`;
    }

    html += `</div>`;
    return html;
  }

  _formatQueue(queue) {
    if (queue.length === 0) return '<p>No items in the import queue.</p>';
    let html = `<h4>Pending SKU Queue (${queue.length})</h4><ul>`;
    queue.forEach(q => { html += `<li><code>${q.sku}</code> — ${q.name} (queued ${q.queuedAt})</li>`; });
    html += `</ul>`;
    return html;
  }

  _updateSkuPanel() {
    const panel = document.getElementById('sku-recent');
    if (!panel) return;
    const recent = this.store.items.slice(-5).reverse();
    let html = '<h4>Recently Added SKUs</h4>';
    if (recent.length === 0) {
      html += '<p class="muted">No recent additions.</p>';
    } else {
      html += '<ul class="recent-sku-list">';
      recent.forEach(item => {
        html += `<li><code>${item.sku}</code> ${item.name} <span class="muted">${item.category}</span></li>`;
      });
      html += '</ul>';
    }
    panel.innerHTML = html;
  }
}

window.SKUIntegrationAgent = SKUIntegrationAgent;
