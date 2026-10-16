(function (root) {
  class MinigameHost {
    constructor(eventBus) { this.eventBus = eventBus; this.adapters = new Map(); this.active = null; }
    register(id, adapter) {
      if (!id || !adapter || this.adapters.has(id)) throw new Error(`Mini-game adapter '${id}' is invalid or already registered.`);
      this.adapters.set(id, adapter);
    }
    has(id) { return this.adapters.has(id); }
    open(id, context = {}) {
      if (this.active) this.close('replaced');
      const adapter = this.adapters.get(id);
      if (!adapter) { this.eventBus.emit('minigame:missing', { id }); return false; }
      this.active = { id, adapter, context };
      adapter.prepare?.(context);
      this.eventBus.emit('minigame:opened', { id, context });
      return true;
    }
    start() { if (!this.active) return false; this.active.adapter.start?.(this.active.context); this.eventBus.emit('minigame:started', { id: this.active.id }); return true; }
    complete(result = {}) { if (!this.active) return false; const { id, adapter, context } = this.active; adapter.complete?.(result, context); this.active = null; this.eventBus.emit('minigame:completed', { id, result }); return true; }
    close(reason = 'closed') { if (!this.active) return false; const { id, adapter, context } = this.active; adapter.close?.(reason, context); this.active = null; this.eventBus.emit('minigame:closed', { id, reason }); return true; }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.MinigameHost = MinigameHost;
})(window);
