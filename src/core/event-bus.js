(function (root) {
  class EventBus {
    constructor() { this.listeners = new Map(); }
    on(name, listener) {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(listener);
      return () => this.listeners.get(name)?.delete(listener);
    }
    emit(name, payload) {
      for (const listener of this.listeners.get(name) || []) listener(payload);
    }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.EventBus = EventBus;
})(window);
