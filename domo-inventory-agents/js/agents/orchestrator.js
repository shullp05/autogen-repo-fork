/**
 * OrchestratorAgent — Central coordinator for the multi-agent system.
 *
 * Responsibilities:
 * 1. Parse natural-language user queries to determine intent
 * 2. Delegate to the appropriate sub-agent(s)
 * 3. Aggregate and present results in the chat panel
 * 4. Log all inter-agent communication in the activity feed
 *
 * Listens for:
 *   'user:query'            → natural language input
 *   'response:*'            → collects sub-agent responses
 *   'agent:status'          → logs agent activity
 *
 * Emits:
 *   'request:top-items'     → delegates to TopItemsAgent
 *   'request:dashboard'     → delegates to DashboardAgent
 *   'request:exceptions'    → delegates to ExceptionReporterAgent
 *   'request:sku-add'       → delegates to SKUIntegrationAgent
 *   'request:sku-import'    → delegates to SKUIntegrationAgent
 */
class OrchestratorAgent {
  constructor(bus, store) {
    this.name = 'OrchestratorAgent';
    this.bus = bus;
    this.store = store;
    this._pendingResponses = {};
    this._listen();
  }

  _listen() {
    this.bus.on('user:query', (evt) => this._handleQuery(evt.payload));

    // Collect sub-agent responses
    this.bus.on('response:top-items', (evt) => this._onResponse('top-items', evt));
    this.bus.on('response:dashboard', (evt) => this._onResponse('dashboard', evt));
    this.bus.on('response:exceptions', (evt) => this._onResponse('exceptions', evt));
    this.bus.on('response:sku-add', (evt) => this._onResponse('sku-add', evt));
    this.bus.on('response:sku-import', (evt) => this._onResponse('sku-import', evt));

    // Log all agent status events
    this.bus.on('agent:status', (evt) => this._logActivity(evt));
  }

  // ── Intent recognition ──

  _handleQuery(payload) {
    const query = (payload.text || '').toLowerCase().trim();
    if (!query) return;

    this._addChatMessage('user', payload.text);
    this.bus.emit('agent:status', { agent: this.name, status: 'processing', detail: `Parsing query: "${payload.text}"` }, this.name);

    const intent = this._classifyIntent(query);
    this._addChatMessage('system', `Intent detected: <strong>${intent.type}</strong> → routing to ${intent.agents.join(', ')}`);

    // Execute intent
    switch (intent.type) {
      case 'top-items':
        this._routeTopItems(query, intent);
        break;
      case 'dashboard':
        this._routeDashboard(query, intent);
        break;
      case 'exceptions':
        this._routeExceptions(query, intent);
        break;
      case 'sku-add':
        this._routeSkuAdd(query, intent);
        break;
      case 'overview':
        this._routeOverview(query, intent);
        break;
      case 'help':
        this._showHelp();
        break;
      default:
        this._showHelp();
    }
  }

  _classifyIntent(query) {
    // Top items patterns
    if (/top\s*\d*\s*(item|product|seller|perform|sku)/i.test(query) || /best\s*(sell|perform)/i.test(query) || /rank/i.test(query)) {
      return { type: 'top-items', agents: ['TopItemsAgent'] };
    }
    // Dashboard patterns
    if (/dashboard|chart|graph|visual|kpi|metric/i.test(query)) {
      return { type: 'dashboard', agents: ['DashboardAgent'] };
    }
    // Exception / alert patterns
    if (/exception|alert|warning|low\s*stock|overstock|critical|slow\s*mover|stockout|issue|problem|risk/i.test(query)) {
      return { type: 'exceptions', agents: ['ExceptionReporterAgent'] };
    }
    // SKU add patterns
    if (/add\s*sku|new\s*sku|import\s*sku|yosi|integrate|add\s*product|new\s*product/i.test(query)) {
      return { type: 'sku-add', agents: ['SKUIntegrationAgent'] };
    }
    // Overview / summary
    if (/overview|summary|status|report|inventory/i.test(query)) {
      return { type: 'overview', agents: ['TopItemsAgent', 'ExceptionReporterAgent', 'DashboardAgent'] };
    }
    // Help
    if (/help|what can you|how do i|command/i.test(query)) {
      return { type: 'help', agents: [] };
    }
    return { type: 'unknown', agents: [] };
  }

  // ── Routing methods ──

  _routeTopItems(query, intent) {
    // Extract category if mentioned
    const categories = this.store.getCategories();
    let category = 'All';
    for (const cat of categories) {
      if (query.includes(cat.toLowerCase())) {
        category = cat;
        break;
      }
    }
    // Extract metric
    let metric = 'revenue';
    if (/unit|volume|quantity/i.test(query)) metric = 'units';
    if (/margin|profit/i.test(query)) metric = 'margin';

    // Extract N
    const nMatch = query.match(/top\s*(\d+)/i);
    const n = nMatch ? parseInt(nMatch[1]) : 5;

    this.bus.emit('request:top-items', { category, n, metric }, this.name);
  }

  _routeDashboard() {
    this.bus.emit('request:dashboard', {}, this.name);
    // Also switch to dashboard tab
    this._switchTab('dashboard');
  }

  _routeExceptions(query) {
    let type = null;
    if (/low\s*stock/i.test(query)) type = 'low-stock';
    if (/overstock/i.test(query)) type = 'overstock';
    if (/critical/i.test(query)) type = 'critical';
    if (/slow/i.test(query)) type = 'slow-movers';

    this.bus.emit('request:exceptions', { type }, this.name);
  }

  _routeSkuAdd() {
    this._addChatMessage('assistant', `
      <div class="chat-sku-guide">
        <p>To add a new SKU, use the <strong>SKU Input Form</strong> in the right panel, or you can simulate a Yosi import with the <strong>"Simulate Yosi Import"</strong> button.</p>
        <p>Required fields: SKU code, Name, Category, Quantity, Unit Cost, Unit Price.</p>
        <p>SKU format: <code>PREFIX-NUMBERS</code> (e.g., <code>ELEC-2001</code>)</p>
      </div>
    `);
    this._switchTab('sku');
  }

  _routeOverview() {
    this._addChatMessage('assistant', '<p>Running full inventory analysis...</p>');
    this.bus.emit('request:dashboard', {}, this.name);
    this.bus.emit('request:exceptions', {}, this.name);
    this.bus.emit('request:top-items', { category: 'All', n: 5, metric: 'revenue' }, this.name);
    this._switchTab('dashboard');
  }

  _showHelp() {
    this._addChatMessage('assistant', `
      <div class="help-content">
        <h4>Available Commands</h4>
        <ul>
          <li><strong>"Show top 5 items"</strong> — Top performing items by revenue across all categories</li>
          <li><strong>"Top items in Electronics by margin"</strong> — Category and metric-specific ranking</li>
          <li><strong>"Show dashboard"</strong> — Render the inventory dashboard with KPIs and charts</li>
          <li><strong>"Show exceptions"</strong> — Run exception report (low stock, overstock, slow movers)</li>
          <li><strong>"Show critical alerts"</strong> — Filter for critical stock levels only</li>
          <li><strong>"Add new SKU"</strong> — Opens the SKU integration panel</li>
          <li><strong>"Inventory overview"</strong> — Full analysis: dashboard + exceptions + top items</li>
        </ul>
        <p class="muted">The orchestrator parses your natural language input and routes to the appropriate agent(s).</p>
      </div>
    `);
  }

  // ── Response handling ──

  _onResponse(type, evt) {
    const formatted = evt.payload.formatted;
    if (formatted) {
      this._addChatMessage('assistant', formatted, evt.source);
    }
  }

  // ── UI helpers ──

  _addChatMessage(role, html, agentName) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const msg = document.createElement('div');
    msg.className = `chat-msg chat-${role}`;

    let badge = '';
    if (role === 'assistant' && agentName) {
      badge = `<span class="agent-badge">${agentName}</span>`;
    } else if (role === 'system') {
      badge = `<span class="agent-badge system-badge">Orchestrator</span>`;
    }

    msg.innerHTML = `${badge}<div class="chat-bubble">${html}</div>`;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  _logActivity(evt) {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    const { agent, status, detail } = evt.payload;
    const time = new Date(evt.timestamp).toLocaleTimeString();

    const entry = document.createElement('div');
    entry.className = `activity-entry status-${status}`;
    entry.innerHTML = `
      <span class="activity-time">${time}</span>
      <span class="activity-agent">${agent}</span>
      <span class="activity-detail">${detail}</span>
    `;
    feed.prepend(entry);

    // Keep feed manageable
    while (feed.children.length > 50) {
      feed.removeChild(feed.lastChild);
    }
  }

  _switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
  }
}

window.OrchestratorAgent = OrchestratorAgent;
