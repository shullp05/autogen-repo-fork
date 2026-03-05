/**
 * App — Bootstrap and wire together the multi-agent system.
 */
(function () {
  'use strict';

  const bus = window.EventBus;
  const store = window.DataStore;

  // ── Instantiate agents ──
  const orchestrator = new OrchestratorAgent(bus, store);
  const topItems = new TopItemsAgent(bus, store);
  const dashboard = new DashboardAgent(bus, store);
  const exceptionReporter = new ExceptionReporterAgent(bus, store);
  const skuIntegration = new SKUIntegrationAgent(bus, store);

  // ── Chat input ──
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');

  function sendQuery() {
    const text = chatInput.value.trim();
    if (!text) return;
    bus.emit('user:query', { text }, 'user');
    chatInput.value = '';
    chatInput.focus();
  }

  chatSend.addEventListener('click', sendQuery);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  });

  // ── Quick action buttons ──
  document.querySelectorAll('[data-query]').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.query;
      bus.emit('user:query', { text }, 'user');
    });
  });

  // ── Tab navigation ──
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
    });
  });

  // ── SKU form ──
  const skuForm = document.getElementById('sku-form');
  if (skuForm) {
    skuForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(skuForm);
      const item = {
        sku: formData.get('sku'),
        name: formData.get('name'),
        category: formData.get('category'),
        subcategory: formData.get('subcategory') || 'General',
        qty: formData.get('qty'),
        unitCost: formData.get('unitCost'),
        unitPrice: formData.get('unitPrice'),
        salesLast30: formData.get('salesLast30') || 0,
        supplier: formData.get('supplier') || 'Yosi',
      };
      bus.emit('request:sku-add', item, 'user');
      skuForm.reset();
    });
  }

  // ── Yosi import simulator ──
  const yosiBtn = document.getElementById('btn-yosi-import');
  if (yosiBtn) {
    yosiBtn.addEventListener('click', () => {
      const sampleItems = [
        { sku: 'YOSI-6001', name: 'Smart Label Printer', category: 'Electronics', subcategory: 'Printers', qty: 75, unitCost: 85.00, unitPrice: 199.99, salesLast30: 0, supplier: 'Yosi' },
        { sku: 'YOSI-6002', name: 'Barcode Scanner Wireless', category: 'Warehouse', subcategory: 'Equipment', qty: 120, unitCost: 42.00, unitPrice: 99.99, salesLast30: 0, supplier: 'Yosi' },
        { sku: 'YOSI-6003', name: 'Anti-Fatigue Floor Mat', category: 'Safety', subcategory: 'Ergonomics', qty: 200, unitCost: 15.00, unitPrice: 39.99, salesLast30: 0, supplier: 'Yosi' },
      ];
      bus.emit('request:sku-import', { items: sampleItems }, 'user');
    });
  }

  // ── Initial load: render dashboard + exception scan ──
  window.addEventListener('load', () => {
    bus.emit('request:dashboard', {}, 'system');
    bus.emit('request:exceptions', {}, 'system');

    // Welcome message
    const container = document.getElementById('chat-messages');
    if (container) {
      container.innerHTML = `
        <div class="chat-msg chat-assistant">
          <span class="agent-badge system-badge">Orchestrator</span>
          <div class="chat-bubble">
            <h4>Welcome to Domo AI Inventory Agent</h4>
            <p>I coordinate a team of specialized agents to help you manage inventory:</p>
            <ul>
              <li><strong>Top Items Agent</strong> — Identifies best-performing products</li>
              <li><strong>Dashboard Agent</strong> — Renders visual KPIs and charts</li>
              <li><strong>Exception Reporter</strong> — Flags stock issues and risks</li>
              <li><strong>SKU Integration Agent</strong> — Handles new product imports from Yosi</li>
            </ul>
            <p>Try asking: <em>"Show top 5 items"</em>, <em>"Show exceptions"</em>, or <em>"Inventory overview"</em></p>
          </div>
        </div>
      `;
    }
  });
})();
