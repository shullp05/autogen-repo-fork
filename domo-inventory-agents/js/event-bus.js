/**
 * EventBus — Pub/Sub message system for inter-agent communication.
 * All agents publish and subscribe to typed events through this singleton.
 */
class EventBus {
  constructor() {
    this._listeners = {};
    this._log = [];
  }

  /**
   * Subscribe to an event topic.
   * @param {string} topic
   * @param {Function} handler - receives { topic, payload, source, timestamp }
   * @returns {Function} unsubscribe function
   */
  on(topic, handler) {
    if (!this._listeners[topic]) this._listeners[topic] = [];
    this._listeners[topic].push(handler);
    return () => {
      this._listeners[topic] = this._listeners[topic].filter(h => h !== handler);
    };
  }

  /**
   * Publish an event to all subscribers of a topic.
   * @param {string} topic
   * @param {*} payload
   * @param {string} source - name of the emitting agent
   */
  emit(topic, payload, source = 'system') {
    const event = {
      topic,
      payload,
      source,
      timestamp: new Date().toISOString(),
    };
    this._log.push(event);
    // Keep last 200 events
    if (this._log.length > 200) this._log.shift();

    const handlers = this._listeners[topic] || [];
    handlers.forEach(h => {
      try {
        h(event);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${topic}":`, err);
      }
    });

    // Also emit to wildcard listeners
    const wildcardHandlers = this._listeners['*'] || [];
    wildcardHandlers.forEach(h => {
      try {
        h(event);
      } catch (err) {
        console.error(`[EventBus] Error in wildcard handler:`, err);
      }
    });
  }

  /** Get the full event log. */
  getLog() {
    return [...this._log];
  }

  /** Clear all listeners (useful for testing). */
  reset() {
    this._listeners = {};
    this._log = [];
  }
}

// Singleton
window.EventBus = new EventBus();
