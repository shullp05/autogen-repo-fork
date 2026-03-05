/**
 * ExceptionReporterAgent — Monitors inventory for exceptions and anomalies.
 *
 * Listens for:
 *   'request:exceptions'  → { type? }
 *   'data:changed'        → re-evaluate exceptions
 *
 * Emits:
 *   'response:exceptions' → { exceptions[], formatted }
 *   'alert:exception'     → individual high-severity alerts
 */
class ExceptionReporterAgent {
  constructor(bus, store) {
    this.name = 'ExceptionReporterAgent';
    this.bus = bus;
    this.store = store;
    this._listen();
  }

  _listen() {
    this.bus.on('request:exceptions', (evt) => this._handleRequest(evt.payload));
    this.bus.on('data:changed', () => this._runScan());
  }

  _handleRequest(payload = {}) {
    this.bus.emit('agent:status', { agent: this.name, status: 'processing', detail: 'Scanning for exceptions' }, this.name);
    const exceptions = this._evaluate(payload.type);
    const formatted = this._format(exceptions);
    this._renderAlerts(exceptions);
    this.bus.emit('response:exceptions', { exceptions, formatted }, this.name);
    this.bus.emit('agent:status', { agent: this.name, status: 'done', detail: `Found ${exceptions.length} exceptions` }, this.name);
  }

  _runScan() {
    const exceptions = this._evaluate();
    this._renderAlerts(exceptions);
  }

  _evaluate(typeFilter) {
    const exceptions = [];

    // ── Critical stock (≤7 days supply) ──
    if (!typeFilter || typeFilter === 'critical') {
      this.store.getCriticalStock().forEach(item => {
        const daysLeft = ((item.qty / item.salesLast30) * 30).toFixed(1);
        exceptions.push({
          severity: 'critical',
          type: 'Critical Stock',
          sku: item.sku,
          name: item.name,
          category: item.category,
          detail: `Only ${daysLeft} days of supply remaining (${item.qty} units, ${item.salesLast30} sold/30d)`,
          recommendation: `Urgent reorder from ${item.supplier}. Suggest order qty: ${Math.ceil(item.salesLast30 * 2) - item.qty} units.`,
        });
      });
    }

    // ── Low stock ──
    if (!typeFilter || typeFilter === 'low-stock') {
      this.store.getLowStockItems().forEach(item => {
        // Skip items already flagged as critical
        if (item.salesLast30 > 0 && ((item.qty / item.salesLast30) * 30) <= 7) return;
        exceptions.push({
          severity: 'high',
          type: 'Low Stock',
          sku: item.sku,
          name: item.name,
          category: item.category,
          detail: `Stock at ${item.qty} units (threshold: ${this.store.thresholds.lowStock})`,
          recommendation: `Schedule reorder from ${item.supplier}. Last restocked: ${item.lastRestocked}`,
        });
      });
    }

    // ── Overstock ──
    if (!typeFilter || typeFilter === 'overstock') {
      this.store.getOverstockItems().forEach(item => {
        const daysOfSupply = item.salesLast30 > 0 ? ((item.qty / item.salesLast30) * 30).toFixed(0) : '∞';
        const excessCost = item.salesLast30 > 0
          ? ((item.qty - item.salesLast30 * 2) * item.unitCost).toFixed(2)
          : (item.qty * item.unitCost).toFixed(2);
        exceptions.push({
          severity: 'medium',
          type: 'Overstock',
          sku: item.sku,
          name: item.name,
          category: item.category,
          detail: `${item.qty} units on hand — ${daysOfSupply} days of supply. Excess capital: $${Number(excessCost).toLocaleString()}`,
          recommendation: `Consider promotional pricing or redistribution. Holding cost impact is significant.`,
        });
      });
    }

    // ── Slow movers ──
    if (!typeFilter || typeFilter === 'slow-movers') {
      this.store.getSlowMovers().forEach(item => {
        // Skip items already flagged as overstock
        if (item.qty >= this.store.thresholds.overstock) return;
        const turnover = item.salesLast30 > 0 ? (item.salesLast30 / item.qty).toFixed(2) : '0';
        exceptions.push({
          severity: 'low',
          type: 'Slow Mover',
          sku: item.sku,
          name: item.name,
          category: item.category,
          detail: `Turnover ratio: ${turnover} — ${item.salesLast30} units sold vs ${item.qty} on hand`,
          recommendation: `Review demand forecast. Consider markdown or bundle strategy.`,
        });
      });
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    exceptions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return exceptions;
  }

  _format(exceptions) {
    if (exceptions.length === 0) {
      return '<div class="exception-report"><p class="no-exceptions">No exceptions detected. All inventory levels are within normal thresholds.</p></div>';
    }

    let html = `<div class="exception-report">`;
    html += `<h3>Exception Report — ${exceptions.length} Issues Found</h3>`;

    const grouped = {};
    exceptions.forEach(e => {
      if (!grouped[e.type]) grouped[e.type] = [];
      grouped[e.type].push(e);
    });

    for (const [type, items] of Object.entries(grouped)) {
      html += `<div class="exception-group">`;
      html += `<h4>${type} (${items.length})</h4>`;
      items.forEach(e => {
        html += `
          <div class="exception-item severity-${e.severity}">
            <div class="exception-header">
              <span class="severity-badge badge-${e.severity}">${e.severity.toUpperCase()}</span>
              <code>${e.sku}</code> — ${e.name} <span class="exception-cat">[${e.category}]</span>
            </div>
            <div class="exception-detail">${e.detail}</div>
            <div class="exception-rec"><strong>Recommendation:</strong> ${e.recommendation}</div>
          </div>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  _renderAlerts(exceptions) {
    const panel = document.getElementById('alerts-content');
    if (!panel) return;

    const critical = exceptions.filter(e => e.severity === 'critical' || e.severity === 'high');

    if (critical.length === 0) {
      panel.innerHTML = '<div class="alert-empty">No critical alerts</div>';
      return;
    }

    let html = '';
    critical.forEach(e => {
      html += `
        <div class="alert-item alert-${e.severity}">
          <div class="alert-icon">${e.severity === 'critical' ? '🔴' : '🟠'}</div>
          <div class="alert-body">
            <div class="alert-title">${e.type}: ${e.name}</div>
            <div class="alert-detail"><code>${e.sku}</code> — ${e.detail}</div>
          </div>
        </div>`;
    });

    panel.innerHTML = html;

    // Fire individual alerts for critical items
    critical.filter(e => e.severity === 'critical').forEach(e => {
      this.bus.emit('alert:exception', e, this.name);
    });
  }
}

window.ExceptionReporterAgent = ExceptionReporterAgent;
