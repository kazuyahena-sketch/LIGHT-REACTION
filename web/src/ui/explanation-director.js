(function (root) {
  class ExplanationDirector {
    constructor(eventBus) { this.eventBus = eventBus; this.current = null; }
    present(stage) { this.current = { objective: stage.objective, explanation: stage.explanation, context: stage.context }; this.eventBus.emit('explanation:presented', this.current); return this.current; }
    clear() { this.current = null; this.eventBus.emit('explanation:cleared'); }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.ExplanationDirector = ExplanationDirector;
})(window);
