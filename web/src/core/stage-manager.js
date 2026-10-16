(function (root) {
  class StageManager {
    constructor(stages, state, transition, eventBus, vfx, audio) {
      this.stages = stages; this.state = state; this.transition = transition; this.eventBus = eventBus; this.vfx = vfx; this.audio = audio; this.gates = new Map();
      this.eventBus.on('transition:complete', ({ to }) => this.eventBus.emit('stage:arrived', to));
    }
    get current() { return this.stages[this.state.currentIndex]; }
    get furthestIndex() { return this.state.furthestIndex; }
    get isTransitioning() { return this.transition.isActive; }
    getStage(id) { return this.stages.find(stage => stage.id === id); }
    isUnlocked(index) { return index <= this.state.furthestIndex; }
    registerGate(stageId, objectiveId) { this.gates.set(stageId, objectiveId); }
    isGateComplete(stageId = this.current.id) { const objective = this.gates.get(stageId); return !objective || this.state.hasObjective(objective); }
    canAdvance() { return !this.isTransitioning && this.state.currentIndex < this.stages.length - 1 && this.isGateComplete(); }
    advance() {
      if (this.isTransitioning || this.state.currentIndex >= this.stages.length - 1) return false;
      if (!this.isGateComplete()) { this.eventBus.emit('progression:blocked', { stage: this.current, objective: this.gates.get(this.current.id) }); return false; }
      return this.goTo(this.state.currentIndex + 1);
    }
    goTo(index) {
      if (this.isTransitioning || !Number.isInteger(index) || index < 0 || index >= this.stages.length || index > this.state.furthestIndex + 1 || index === this.state.currentIndex) return false;
      if (index > this.state.currentIndex) {
        for (let cursor = this.state.currentIndex; cursor < index; cursor++) {
          if (!this.isGateComplete(this.stages[cursor].id)) {
            this.eventBus.emit('progression:blocked', { stage: this.stages[cursor], objective: this.gates.get(this.stages[cursor].id) });
            return false;
          }
        }
      }
      const from = this.current; const to = this.stages[index];
      this.eventBus.emit('stage:leaving', from);
      this.state.setCurrentIndex(index);
      this.transition.start(from, to, from.scene === to.scene ? 1.0 : 1.45);
      this.eventBus.emit('stage:entered', to);
      this.audio.cue('stage-transition');
      this.vfx.emit('stage-arrival', { x: to.camera.x, y: to.camera.y, intensity: .8 });
      return true;
    }
    refocus() { if (!this.isTransitioning) this.transition.camera.focus(this.current.camera, .65); }
    beginIntro() {
      const from = this.current; const to = this.stages[0];
      this.eventBus.emit('stage:leaving', from); this.state.setCurrentIndex(0);
      this.transition.start(from, to, 1.1); this.eventBus.emit('stage:entered', to); this.audio.cue('stage-transition');
    }
    restart() {
      const from = this.current; const to = this.stages[0];
      this.state.reset(); this.transition.start(from, to, 1.15);
      this.eventBus.emit('stage:leaving', from); this.eventBus.emit('stage:entered', to);
      this.audio.cue('stage-transition');
    }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.StageManager = StageManager;
})(window);
