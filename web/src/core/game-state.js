(function (root) {
  const STORAGE_KEY = 'light-reaction-electron-train:phase-3:v1';
  const validProducts = ['o2', 'nadph', 'atp'];
  class GameState {
    constructor(eventBus, stageCount) {
      this.eventBus = eventBus;
      this.stageCount = stageCount;
      this.saveBatchDepth = 0;
      this.data = this.load();
    }
    load() {
      try {
        const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
        if (saved && Number.isInteger(saved.currentIndex) && Number.isInteger(saved.furthestIndex)) {
          const furthest = Math.max(0, Math.min(this.stageCount - 1, saved.furthestIndex));
          return {
            currentIndex: Math.max(0, Math.min(furthest, saved.currentIndex)), furthestIndex: furthest,
            products: Array.isArray(saved.products) ? saved.products.filter(item => validProducts.includes(item)) : [],
            objectives: Array.isArray(saved.objectives) ? [...new Set(saved.objectives.filter(item => typeof item === 'string'))] : [],
            lumenProtons: Math.max(0, Math.min(32, Number(saved.lumenProtons) || 0)), electronSupply: Math.max(0, Math.min(8, Number(saved.electronSupply) || 0)),
            // Proton flow is an in-progress animation, not checkpointed progress.
            // A page reload must resume from the last saved checkpoint with the
            // original lumen resources and a stopped synthase.
            protonFlowActive: false,
            checkpointId: typeof saved.checkpointId === 'string' ? saved.checkpointId : null,
            checkpointX: Number.isFinite(saved.checkpointX) ? Math.max(0, saved.checkpointX) : 80
          };
        }
      } catch (_) { /* Storage can be unavailable in private or restricted contexts. */ }
      return { currentIndex: 0, furthestIndex: 0, products: [], objectives: [], lumenProtons: 0, electronSupply: 0, protonFlowActive: false, checkpointId: null, checkpointX: 80 };
    }
    get currentIndex() { return this.data.currentIndex; }
    get furthestIndex() { return this.data.furthestIndex; }
    get lumenProtons() { return this.data.lumenProtons; }
    get electronSupply() { return this.data.electronSupply; }
    get protonFlowActive() { return this.data.protonFlowActive; }
    get checkpointId() { return this.data.checkpointId; }
    get checkpointX() { return this.data.checkpointX; }
    hasProduct(product) { return this.data.products.includes(product); }
    hasObjective(id) { return this.data.objectives.includes(id); }
    setCurrentIndex(index) {
      const next = Math.max(0, Math.min(this.stageCount - 1, index));
      if (next > this.data.furthestIndex) this.data.furthestIndex = next;
      this.data.currentIndex = next;
      this.save();
      this.eventBus.emit('state:changed', this.snapshot());
    }
    saveCheckpoint(id, x, stageIndex) {
      if (!id || !Number.isFinite(x) || !Number.isInteger(stageIndex)) return false;
      this.data.checkpointId = id; this.data.checkpointX = Math.max(0, x);
      this.data.currentIndex = Math.max(0, Math.min(this.stageCount - 1, stageIndex));
      this.data.furthestIndex = Math.max(this.data.furthestIndex, this.data.currentIndex);
      this.save(); this.eventBus.emit('checkpoint:saved', { id, x: this.data.checkpointX, stageIndex: this.data.currentIndex });
      this.eventBus.emit('state:changed', this.snapshot()); return true;
    }
    earnProduct(product) {
      if (!validProducts.includes(product)) return false;
      if (this.data.products.includes(product)) return;
      this.data.products.push(product);
      this.save();
      this.eventBus.emit('product:earned', product);
      this.eventBus.emit('state:changed', this.snapshot());
      return true;
    }
    completeObjective(id) {
      if (!id || this.data.objectives.includes(id)) return false;
      this.data.objectives.push(id); this.save();
      this.eventBus.emit('objective:completed', id); this.eventBus.emit('state:changed', this.snapshot());
      return true;
    }
    addLumenProtons(amount, source) {
      if (!Number.isFinite(amount) || amount <= 0) return 0;
      const before = this.data.lumenProtons; this.data.lumenProtons = Math.min(32, before + Math.floor(amount));
      const added = this.data.lumenProtons - before;
      if (added) { this.save(); this.eventBus.emit('biology:protons-added', { amount: added, total: this.data.lumenProtons, source }); this.eventBus.emit('state:changed', this.snapshot()); }
      return added;
    }
    consumeLumenProton(source = 'atp-synthase', persist = true) {
      if (this.data.lumenProtons <= 0) return false;
      this.data.lumenProtons -= 1; if (persist) this.save();
      this.eventBus.emit('biology:proton-consumed', { total: this.data.lumenProtons, source }); this.eventBus.emit('state:changed', this.snapshot());
      return true;
    }
    addElectronSupply(amount) {
      this.data.electronSupply = Math.min(8, this.data.electronSupply + Math.max(0, Math.floor(amount)));
      this.save(); this.eventBus.emit('biology:electrons-supplied', { total: this.data.electronSupply }); this.eventBus.emit('state:changed', this.snapshot());
    }
    consumeElectrons(amount) {
      if (!Number.isFinite(amount) || amount <= 0 || this.data.electronSupply < amount) return false;
      this.data.electronSupply -= Math.floor(amount); this.save();
      this.eventBus.emit('biology:electrons-consumed', { amount: Math.floor(amount), total: this.data.electronSupply });
      this.eventBus.emit('state:changed', this.snapshot()); return true;
    }
    setProtonFlowActive(active) {
      // This flag only drives animation. Checkpoints persist it as false so an
      // interrupted flow cannot be restored without its controller progress.
      this.data.protonFlowActive = Boolean(active); this.eventBus.emit('biology:proton-flow-state', this.data.protonFlowActive);
    }
    beginSaveBatch() { this.saveBatchDepth += 1; }
    commitSaveBatch() {
      if (this.saveBatchDepth <= 0) return false;
      this.saveBatchDepth -= 1;
      if (this.saveBatchDepth === 0) this.save();
      return true;
    }
    reset() {
      this.data = { currentIndex: 0, furthestIndex: 0, products: [], objectives: [], lumenProtons: 0, electronSupply: 0, protonFlowActive: false, checkpointId: null, checkpointX: 80 };
      this.saveBatchDepth = 0;
      this.save(); this.eventBus.emit('state:changed', this.snapshot()); this.eventBus.emit('game:reset');
    }
    snapshot() {
      return { currentIndex: this.data.currentIndex, furthestIndex: this.data.furthestIndex, products: [...this.data.products], objectives: [...this.data.objectives], lumenProtons: this.data.lumenProtons, electronSupply: this.data.electronSupply, protonFlowActive: this.data.protonFlowActive, checkpointId: this.data.checkpointId, checkpointX: this.data.checkpointX };
    }
    save() {
      if (this.saveBatchDepth > 0) return;
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); }
      catch (_) { /* The game remains playable without persistent storage. */ }
    }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.GameState = GameState;
})(window);
