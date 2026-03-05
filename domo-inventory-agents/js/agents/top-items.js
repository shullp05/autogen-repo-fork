/**
 * TopItemsAgent — Identifies top-performing items by category.
 *
 * Listens for:
 *   'request:top-items'  → { category?, n?, metric? }
 *
 * Emits:
 *   'response:top-items' → { category, items[], metric }
 */
class TopItemsAgent {
  constructor(bus, store) {
    this.name = 'TopItemsAgent';
    this.bus = bus;
    this.store = store;
    this._listen();
  }

  _listen() {
    this.bus.on('request:top-items', (evt) => this._handleRequest(evt.payload));
  }

  _handleRequest(payload = {}) {
    const { category, n = 5, metric = 'revenue' } = payload;
    this.bus.emit('agent:status', { agent: this.name, status: 'processing', detail: `Analyzing top ${n} items by ${metric}` }, this.name);

    let result;
    if (category && category !== 'All') {
      const items = this.store.getTopItemsByCategory(category, n, metric);
      result = { [category]: items };
    } else {
      result = this.store.getAllTopItems(n, metric);
    }

    // Build formatted response
    const formatted = this._format(result, n, metric);
    this.bus.emit('response:top-items', { data: result, formatted, metric, n }, this.name);
    this.bus.emit('agent:status', { agent: this.name, status: 'done', detail: `Top items analysis complete` }, this.name);
  }

  _format(data, n, metric) {
    const metricLabel = { revenue: 'Revenue', units: 'Units Sold', margin: 'Gross Margin' }[metric] || metric;
    let html = `<div class="top-items-report">`;
    html += `<h3>Top ${n} Items by ${metricLabel}</h3>`;

    for (const [cat, items] of Object.entries(data)) {
      html += `<div class="category-section">`;
      html += `<h4>${cat}</h4>`;
      html += `<table class="agent-table"><thead><tr>
        <th>#</th><th>SKU</th><th>Name</th><th>Qty</th><th>Sales (30d)</th><th>${metricLabel}</th>
      </tr></thead><tbody>`;

      items.forEach((item, idx) => {
        const displayScore = metric === 'units' ? item.score.toLocaleString() : '$' + item.score.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        html += `<tr>
          <td>${idx + 1}</td>
          <td><code>${item.sku}</code></td>
          <td>${item.name}</td>
          <td>${item.qty.toLocaleString()}</td>
          <td>${item.salesLast30.toLocaleString()}</td>
          <td class="metric-value">${displayScore}</td>
        </tr>`;
      });

      html += `</tbody></table></div>`;
    }

    html += `</div>`;
    return html;
  }
}

window.TopItemsAgent = TopItemsAgent;
