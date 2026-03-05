# Domo AI/BI — Agentic Inventory Management

A multi-agent architecture for inventory management built with vanilla JavaScript, CSS, and HTML using CDN-only imports. Designed for the Domo AI/BI platform.

## Architecture

The system uses a **coordinator pattern** where an Orchestrator Agent delegates tasks to four specialized sub-agents, communicating through an in-memory EventBus (pub/sub).

```
                    ┌─────────────────────┐
                    │  OrchestratorAgent   │
                    │  (Intent → Routing)  │
                    └────────┬────────────┘
                             │ EventBus
            ┌────────────────┼────────────────┐
            │                │                │                │
   ┌────────▼──────┐ ┌──────▼───────┐ ┌──────▼────────┐ ┌────▼──────────┐
   │ TopItemsAgent │ │DashboardAgent│ │ExceptionReport│ │SKUIntegration │
   │               │ │              │ │    Agent      │ │    Agent      │
   │ Ranks items   │ │ Chart.js KPIs│ │ Threshold     │ │ Yosi import   │
   │ by category   │ │ & charts     │ │ monitoring    │ │ & validation  │
   └───────────────┘ └──────────────┘ └───────────────┘ └───────────────┘
```

### Agents

| Agent | Role | Events |
|-------|------|--------|
| **OrchestratorAgent** | Parses NL queries, routes to sub-agents, aggregates results | `user:query` → `request:*` |
| **TopItemsAgent** | Ranks top N items per category by revenue/units/margin | `request:top-items` → `response:top-items` |
| **DashboardAgent** | Renders KPI cards and Chart.js visualizations | `request:dashboard` → `response:dashboard` |
| **ExceptionReporterAgent** | Monitors stock levels, flags low/over/slow/critical | `request:exceptions` → `response:exceptions` |
| **SKUIntegrationAgent** | Validates and imports new SKUs from Yosi | `request:sku-add` → `response:sku-add` |

### Communication

- **EventBus** — Singleton pub/sub message bus (`js/event-bus.js`)
- All agents subscribe to typed event topics
- The Orchestrator listens to all `response:*` events and logs all `agent:status` events
- `data:changed` events trigger automatic dashboard and alert refresh

## Features

1. **Top 5 Items per Category** — Ranks by revenue, units, or margin
2. **Inventory Dashboard** — 4 KPI cards + 4 Chart.js visualizations (bar, doughnut, pie)
3. **Exception Reporting** — Critical stock, low stock, overstock, slow movers with severity levels and recommendations
4. **SKU Integration** — Form-based add + bulk Yosi import simulator with validation
5. **Chat Interface** — Natural language query parsing with intent classification
6. **Agent Activity Feed** — Real-time log of all inter-agent communication

## Getting Started

No build step required. Open `index.html` in any modern browser.

```bash
# Option 1: Direct file
open domo-inventory-agents/index.html

# Option 2: Local server
cd domo-inventory-agents
python3 -m http.server 8080
# Then visit http://localhost:8080
```

## CDN Dependencies

- [Chart.js 4.4.7](https://www.chartjs.org/) — Charts and visualizations
- [Google Fonts (Inter)](https://fonts.google.com/specimen/Inter) — Typography

## File Structure

```
domo-inventory-agents/
├── index.html                    # Entry point, layout, CDN imports
├── css/
│   └── styles.css                # Dark theme, Domo-inspired design
├── js/
│   ├── event-bus.js              # Pub/sub messaging system
│   ├── data-store.js             # Simulated inventory data + queries
│   ├── app.js                    # Bootstrap, wire agents, UI handlers
│   └── agents/
│       ├── orchestrator.js       # Central coordinator agent
│       ├── top-items.js          # Top items ranking agent
│       ├── dashboard.js          # Dashboard rendering agent
│       ├── exception-reporter.js # Exception monitoring agent
│       └── sku-integration.js    # SKU import/validation agent
└── README.md
```

## Sample Queries

- "Show top 5 items" — All categories, ranked by revenue
- "Top items in Electronics by margin" — Category + metric specific
- "Show dashboard" — Render full dashboard
- "Show exceptions" — Full exception report
- "Show critical alerts" — Critical stock only
- "Add new SKU" — Opens SKU integration panel
- "Inventory overview" — Dashboard + exceptions + top items combined
