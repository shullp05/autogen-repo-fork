/**
 * DashboardAgent — Renders interactive charts and KPI cards.
 *
 * Listens for:
 *   'request:dashboard'     → { view? }
 *   'data:changed'          → triggers re-render
 *
 * Emits:
 *   'response:dashboard'    → { formatted }
 *   'dashboard:rendered'    → after DOM update
 */
class DashboardAgent {
  constructor(bus, store) {
    this.name = 'DashboardAgent';
    this.bus = bus;
    this.store = store;
    this.charts = {};
    this._listen();
  }

  _listen() {
    this.bus.on('request:dashboard', (evt) => this._handleRequest(evt.payload));
    this.bus.on('data:changed', () => this._refresh());
  }

  _handleRequest(payload = {}) {
    this.bus.emit('agent:status', { agent: this.name, status: 'processing', detail: 'Building dashboard' }, this.name);
    this._renderDashboard();
    this.bus.emit('agent:status', { agent: this.name, status: 'done', detail: 'Dashboard rendered' }, this.name);
  }

  _refresh() {
    this._renderDashboard();
  }

  _renderDashboard() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    // ── KPI Cards ──
    const totalValue = this.store.getTotalInventoryValue();
    const revenue = this.store.getRevenueLast30();
    const margin = this.store.getMarginLast30();
    const totalUnits = this.store.getTotalSalesLast30();
    const lowStock = this.store.getLowStockItems().length;
    const critical = this.store.getCriticalStock().length;
    const marginPct = revenue > 0 ? ((margin / revenue) * 100).toFixed(1) : 0;

    const kpiHTML = `
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Inventory Value</div>
          <div class="kpi-value">$${this._fmt(totalValue)}</div>
          <div class="kpi-sub">${this.store.items.length} SKUs</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Revenue (30d)</div>
          <div class="kpi-value">$${this._fmt(revenue)}</div>
          <div class="kpi-sub">${totalUnits.toLocaleString()} units sold</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Gross Margin (30d)</div>
          <div class="kpi-value">$${this._fmt(margin)}</div>
          <div class="kpi-sub">${marginPct}% margin rate</div>
        </div>
        <div class="kpi-card kpi-card--warn">
          <div class="kpi-label">Low Stock Alerts</div>
          <div class="kpi-value">${lowStock}</div>
          <div class="kpi-sub">${critical} critical (&le;7 days)</div>
        </div>
      </div>
    `;

    // ── Charts ──
    const chartsHTML = `
      <div class="chart-grid">
        <div class="chart-box">
          <h4>Revenue by Category (30d)</h4>
          <canvas id="chart-revenue-cat"></canvas>
        </div>
        <div class="chart-box">
          <h4>Inventory Quantity Distribution</h4>
          <canvas id="chart-qty-dist"></canvas>
        </div>
        <div class="chart-box">
          <h4>Margin by Category (30d)</h4>
          <canvas id="chart-margin-cat"></canvas>
        </div>
        <div class="chart-box">
          <h4>Stock Health Overview</h4>
          <canvas id="chart-stock-health"></canvas>
        </div>
      </div>
    `;

    container.innerHTML = kpiHTML + chartsHTML;

    // Destroy old charts
    Object.values(this.charts).forEach(c => c.destroy());
    this.charts = {};

    // Wait for DOM to paint
    requestAnimationFrame(() => this._drawCharts());
    this.bus.emit('dashboard:rendered', {}, this.name);
    this.bus.emit('response:dashboard', { formatted: '<p>Dashboard has been rendered in the dashboard panel.</p>' }, this.name);
  }

  _drawCharts() {
    const breakdown = this.store.getCategoryBreakdown();
    const cats = Object.keys(breakdown);
    const palette = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948'];

    // Revenue bar chart
    const revCtx = document.getElementById('chart-revenue-cat');
    if (revCtx) {
      this.charts.revenue = new Chart(revCtx, {
        type: 'bar',
        data: {
          labels: cats,
          datasets: [{
            label: 'Revenue ($)',
            data: cats.map(c => breakdown[c].totalRevenue.toFixed(2)),
            backgroundColor: palette,
            borderRadius: 4,
          }]
        },
        options: this._barOpts('$'),
      });
    }

    // Quantity doughnut
    const qtyCtx = document.getElementById('chart-qty-dist');
    if (qtyCtx) {
      this.charts.qty = new Chart(qtyCtx, {
        type: 'doughnut',
        data: {
          labels: cats,
          datasets: [{
            data: cats.map(c => breakdown[c].totalQty),
            backgroundColor: palette,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#c8ccd0', font: { size: 11 } } },
          }
        },
      });
    }

    // Margin bar chart
    const marginCtx = document.getElementById('chart-margin-cat');
    if (marginCtx) {
      this.charts.margin = new Chart(marginCtx, {
        type: 'bar',
        data: {
          labels: cats,
          datasets: [{
            label: 'Gross Margin ($)',
            data: cats.map(c => breakdown[c].totalMargin.toFixed(2)),
            backgroundColor: palette.map(c => c + 'cc'),
            borderRadius: 4,
          }]
        },
        options: this._barOpts('$'),
      });
    }

    // Stock health pie
    const healthCtx = document.getElementById('chart-stock-health');
    if (healthCtx) {
      const low = this.store.getLowStockItems().length;
      const over = this.store.getOverstockItems().length;
      const slow = this.store.getSlowMovers().length;
      const healthy = this.store.items.length - low - over;
      this.charts.health = new Chart(healthCtx, {
        type: 'pie',
        data: {
          labels: ['Healthy', 'Low Stock', 'Overstock', 'Slow Movers'],
          datasets: [{
            data: [Math.max(healthy, 0), low, over, slow],
            backgroundColor: ['#59a14f', '#e15759', '#f28e2b', '#bab0ac'],
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#c8ccd0', font: { size: 11 } } },
          }
        },
      });
    }
  }

  _barOpts(prefix = '') {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#c8ccd0' }, grid: { color: '#2a2d31' } },
        y: {
          ticks: {
            color: '#c8ccd0',
            callback: (v) => prefix + Number(v).toLocaleString(),
          },
          grid: { color: '#2a2d31' },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => prefix + Number(ctx.parsed.y).toLocaleString(),
          }
        }
      },
    };
  }

  _fmt(n) {
    return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

window.DashboardAgent = DashboardAgent;
