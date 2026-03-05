/**
 * DataStore — Centralized inventory data singleton.
 * Contains simulated inventory items with categories, SKUs, stock levels,
 * sales velocity, cost, price, and supplier info.
 */
class DataStore {
  constructor() {
    this.items = this._seedData();
    this.skuQueue = []; // pending SKU imports from Yosi
    this.exceptions = [];
    this.thresholds = {
      lowStock: 20,
      overstock: 500,
      slowMoverDays: 60, // days of inventory on hand
    };
  }

  _seedData() {
    return [
      // ── Electronics ──
      { sku: 'ELEC-1001', name: 'Wireless Mouse',        category: 'Electronics', subcategory: 'Peripherals',  qty: 342, unitCost: 8.50,  unitPrice: 24.99,  salesLast30: 189, supplier: 'TechSource',   lastRestocked: '2026-02-20' },
      { sku: 'ELEC-1002', name: 'USB-C Hub 7-Port',      category: 'Electronics', subcategory: 'Peripherals',  qty: 58,  unitCost: 15.00, unitPrice: 39.99,  salesLast30: 112, supplier: 'TechSource',   lastRestocked: '2026-02-15' },
      { sku: 'ELEC-1003', name: 'Noise-Cancel Headphones',category: 'Electronics', subcategory: 'Audio',        qty: 15,  unitCost: 45.00, unitPrice: 129.99, salesLast30: 97,  supplier: 'AudioMax',     lastRestocked: '2026-01-28' },
      { sku: 'ELEC-1004', name: 'Bluetooth Speaker',      category: 'Electronics', subcategory: 'Audio',        qty: 220, unitCost: 22.00, unitPrice: 59.99,  salesLast30: 64,  supplier: 'AudioMax',     lastRestocked: '2026-02-10' },
      { sku: 'ELEC-1005', name: '27" 4K Monitor',         category: 'Electronics', subcategory: 'Displays',     qty: 33,  unitCost: 180.00,unitPrice: 349.99, salesLast30: 41,  supplier: 'DisplayPro',   lastRestocked: '2026-02-01' },
      { sku: 'ELEC-1006', name: 'Mechanical Keyboard',    category: 'Electronics', subcategory: 'Peripherals',  qty: 610, unitCost: 35.00, unitPrice: 89.99,  salesLast30: 23,  supplier: 'TechSource',   lastRestocked: '2026-02-22' },
      { sku: 'ELEC-1007', name: 'Webcam 1080p',           category: 'Electronics', subcategory: 'Peripherals',  qty: 8,   unitCost: 12.00, unitPrice: 44.99,  salesLast30: 78,  supplier: 'TechSource',   lastRestocked: '2026-01-15' },

      // ── Furniture ──
      { sku: 'FURN-2001', name: 'Ergonomic Office Chair', category: 'Furniture', subcategory: 'Seating',     qty: 45,  unitCost: 120.00, unitPrice: 299.99, salesLast30: 38, supplier: 'OfficePlus',  lastRestocked: '2026-02-18' },
      { sku: 'FURN-2002', name: 'Standing Desk 60"',      category: 'Furniture', subcategory: 'Desks',       qty: 12,  unitCost: 200.00, unitPrice: 499.99, salesLast30: 22, supplier: 'OfficePlus',  lastRestocked: '2026-02-05' },
      { sku: 'FURN-2003', name: 'Bookshelf 5-Tier',       category: 'Furniture', subcategory: 'Storage',     qty: 560, unitCost: 40.00,  unitPrice: 89.99,  salesLast30: 5,  supplier: 'WoodCraft',   lastRestocked: '2026-01-10' },
      { sku: 'FURN-2004', name: 'Filing Cabinet 3-Drawer', category: 'Furniture', subcategory: 'Storage',    qty: 180, unitCost: 55.00,  unitPrice: 129.99, salesLast30: 14, supplier: 'WoodCraft',   lastRestocked: '2026-02-12' },
      { sku: 'FURN-2005', name: 'Conference Table 8ft',   category: 'Furniture', subcategory: 'Tables',      qty: 7,   unitCost: 350.00, unitPrice: 799.99, salesLast30: 3,  supplier: 'OfficePlus',  lastRestocked: '2026-01-20' },
      { sku: 'FURN-2006', name: 'Monitor Arm Dual',       category: 'Furniture', subcategory: 'Accessories', qty: 95,  unitCost: 28.00,  unitPrice: 69.99,  salesLast30: 52, supplier: 'OfficePlus',  lastRestocked: '2026-02-25' },

      // ── Supplies ──
      { sku: 'SUPP-3001', name: 'Copy Paper A4 (Ream)',   category: 'Supplies', subcategory: 'Paper',       qty: 2400, unitCost: 3.50,  unitPrice: 8.99,   salesLast30: 620, supplier: 'PaperWorld', lastRestocked: '2026-02-28' },
      { sku: 'SUPP-3002', name: 'Ballpoint Pens (Box 12)',category: 'Supplies', subcategory: 'Writing',     qty: 850,  unitCost: 2.00,  unitPrice: 5.99,   salesLast30: 310, supplier: 'PaperWorld', lastRestocked: '2026-02-20' },
      { sku: 'SUPP-3003', name: 'Sticky Notes 3x3 (Pack)',category: 'Supplies', subcategory: 'Paper',       qty: 14,   unitCost: 1.50,  unitPrice: 3.99,   salesLast30: 205, supplier: 'PaperWorld', lastRestocked: '2026-01-25' },
      { sku: 'SUPP-3004', name: 'Whiteboard Markers (Set)',category: 'Supplies', subcategory: 'Writing',    qty: 320,  unitCost: 4.00,  unitPrice: 11.99,  salesLast30: 88,  supplier: 'PaperWorld', lastRestocked: '2026-02-14' },
      { sku: 'SUPP-3005', name: 'Binder Clips Assorted',  category: 'Supplies', subcategory: 'Fasteners',   qty: 700,  unitCost: 1.00,  unitPrice: 3.49,   salesLast30: 42,  supplier: 'ClipCo',    lastRestocked: '2026-02-10' },
      { sku: 'SUPP-3006', name: 'Toner Cartridge Black',  category: 'Supplies', subcategory: 'Print',       qty: 18,   unitCost: 25.00, unitPrice: 64.99,  salesLast30: 35,  supplier: 'PrintParts', lastRestocked: '2026-02-08' },

      // ── Warehouse ──
      { sku: 'WHSE-4001', name: 'Packing Tape (Roll)',    category: 'Warehouse', subcategory: 'Packing',     qty: 1200, unitCost: 1.20,  unitPrice: 3.49,   salesLast30: 480, supplier: 'PackRight', lastRestocked: '2026-02-27' },
      { sku: 'WHSE-4002', name: 'Bubble Wrap 100ft',      category: 'Warehouse', subcategory: 'Packing',     qty: 65,   unitCost: 8.00,  unitPrice: 19.99,  salesLast30: 55,  supplier: 'PackRight', lastRestocked: '2026-02-18' },
      { sku: 'WHSE-4003', name: 'Shipping Labels (Roll)', category: 'Warehouse', subcategory: 'Labels',      qty: 3,    unitCost: 12.00, unitPrice: 29.99,  salesLast30: 90,  supplier: 'LabelTech', lastRestocked: '2026-01-05' },
      { sku: 'WHSE-4004', name: 'Pallet Jack Manual',     category: 'Warehouse', subcategory: 'Equipment',   qty: 4,    unitCost: 250.00,unitPrice: 549.99, salesLast30: 1,   supplier: 'HeavyGear', lastRestocked: '2025-12-15' },
      { sku: 'WHSE-4005', name: 'Stretch Wrap 18"',       category: 'Warehouse', subcategory: 'Packing',     qty: 540,  unitCost: 5.00,  unitPrice: 14.99,  salesLast30: 12,  supplier: 'PackRight', lastRestocked: '2026-02-20' },
      { sku: 'WHSE-4006', name: 'Corrugated Boxes Med',   category: 'Warehouse', subcategory: 'Packing',     qty: 2800, unitCost: 0.80,  unitPrice: 2.49,   salesLast30: 950, supplier: 'PackRight', lastRestocked: '2026-03-01' },

      // ── Safety ──
      { sku: 'SAFE-5001', name: 'Safety Goggles',         category: 'Safety', subcategory: 'PPE',          qty: 150, unitCost: 5.00,  unitPrice: 12.99,  salesLast30: 72,  supplier: 'SafeFirst', lastRestocked: '2026-02-22' },
      { sku: 'SAFE-5002', name: 'Hard Hat (White)',        category: 'Safety', subcategory: 'PPE',          qty: 9,   unitCost: 8.00,  unitPrice: 19.99,  salesLast30: 30,  supplier: 'SafeFirst', lastRestocked: '2026-02-01' },
      { sku: 'SAFE-5003', name: 'First Aid Kit',          category: 'Safety', subcategory: 'Emergency',    qty: 42,  unitCost: 18.00, unitPrice: 44.99,  salesLast30: 15,  supplier: 'MedSupply', lastRestocked: '2026-02-15' },
      { sku: 'SAFE-5004', name: 'Fire Extinguisher 5lb',  category: 'Safety', subcategory: 'Emergency',    qty: 600, unitCost: 30.00, unitPrice: 69.99,  salesLast30: 2,   supplier: 'SafeFirst', lastRestocked: '2026-01-08' },
      { sku: 'SAFE-5005', name: 'Hi-Vis Vest',            category: 'Safety', subcategory: 'PPE',          qty: 310, unitCost: 3.50,  unitPrice: 9.99,   salesLast30: 85,  supplier: 'SafeFirst', lastRestocked: '2026-02-28' },
    ];
  }

  // ── Query helpers ──

  getCategories() {
    return [...new Set(this.items.map(i => i.category))];
  }

  getItemsByCategory(category) {
    return this.items.filter(i => i.category === category);
  }

  getTopItemsByCategory(category, n = 5, metric = 'revenue') {
    const catItems = this.getItemsByCategory(category);
    const scored = catItems.map(i => {
      let score;
      switch (metric) {
        case 'revenue':
          score = i.salesLast30 * i.unitPrice;
          break;
        case 'units':
          score = i.salesLast30;
          break;
        case 'margin':
          score = i.salesLast30 * (i.unitPrice - i.unitCost);
          break;
        default:
          score = i.salesLast30 * i.unitPrice;
      }
      return { ...i, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, n);
  }

  getAllTopItems(n = 5, metric = 'revenue') {
    const result = {};
    this.getCategories().forEach(cat => {
      result[cat] = this.getTopItemsByCategory(cat, n, metric);
    });
    return result;
  }

  // ── Inventory health ──

  getLowStockItems() {
    return this.items.filter(i => i.qty <= this.thresholds.lowStock);
  }

  getOverstockItems() {
    return this.items.filter(i => i.qty >= this.thresholds.overstock);
  }

  getSlowMovers() {
    return this.items.filter(i => {
      if (i.salesLast30 === 0) return true;
      const daysOfInventory = (i.qty / i.salesLast30) * 30;
      return daysOfInventory >= this.thresholds.slowMoverDays;
    });
  }

  getStockouts() {
    return this.items.filter(i => i.qty === 0);
  }

  getCriticalStock() {
    return this.items.filter(i => {
      if (i.salesLast30 === 0) return false;
      const daysLeft = (i.qty / i.salesLast30) * 30;
      return daysLeft <= 7 && i.qty > 0;
    });
  }

  // ── Aggregates ──

  getTotalInventoryValue() {
    return this.items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);
  }

  getTotalRetailValue() {
    return this.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  }

  getTotalSalesLast30() {
    return this.items.reduce((sum, i) => sum + i.salesLast30, 0);
  }

  getRevenueLast30() {
    return this.items.reduce((sum, i) => sum + i.salesLast30 * i.unitPrice, 0);
  }

  getMarginLast30() {
    return this.items.reduce((sum, i) => sum + i.salesLast30 * (i.unitPrice - i.unitCost), 0);
  }

  getCategoryBreakdown() {
    const breakdown = {};
    this.items.forEach(i => {
      if (!breakdown[i.category]) {
        breakdown[i.category] = { totalQty: 0, totalRevenue: 0, totalMargin: 0, itemCount: 0 };
      }
      breakdown[i.category].totalQty += i.qty;
      breakdown[i.category].totalRevenue += i.salesLast30 * i.unitPrice;
      breakdown[i.category].totalMargin += i.salesLast30 * (i.unitPrice - i.unitCost);
      breakdown[i.category].itemCount++;
    });
    return breakdown;
  }

  // ── SKU management ──

  addItem(item) {
    // Validate required fields
    const required = ['sku', 'name', 'category', 'qty', 'unitCost', 'unitPrice'];
    const missing = required.filter(f => item[f] === undefined || item[f] === '');
    if (missing.length > 0) {
      return { success: false, error: `Missing required fields: ${missing.join(', ')}` };
    }
    // Check duplicate SKU
    if (this.items.find(i => i.sku === item.sku)) {
      return { success: false, error: `SKU ${item.sku} already exists` };
    }
    const newItem = {
      sku: item.sku,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory || 'General',
      qty: Number(item.qty),
      unitCost: Number(item.unitCost),
      unitPrice: Number(item.unitPrice),
      salesLast30: Number(item.salesLast30 || 0),
      supplier: item.supplier || 'Yosi',
      lastRestocked: item.lastRestocked || new Date().toISOString().split('T')[0],
    };
    this.items.push(newItem);
    return { success: true, item: newItem };
  }

  addToSkuQueue(skuData) {
    this.skuQueue.push({ ...skuData, queuedAt: new Date().toISOString(), status: 'pending' });
  }

  processSkuQueue() {
    const results = [];
    while (this.skuQueue.length > 0) {
      const entry = this.skuQueue.shift();
      const result = this.addItem(entry);
      results.push({ ...entry, result });
    }
    return results;
  }
}

// Singleton
window.DataStore = new DataStore();
