(function (root) {
  class SceneTransition {
    constructor(camera, eventBus) {
      this.camera = camera; this.eventBus = eventBus; this.active = null;
      this.singleLayer = { stage: null, alpha: 1 };
      this.transitionLayers = [{ stage: null, alpha: 0 }, { stage: null, alpha: 0 }];
    }
    get isActive() { return Boolean(this.active); }
    start(fromStage, toStage, duration = 1.2) {
      const route = toStage.cameraPath?.length ? toStage.cameraPath : [{ ...toStage.camera, duration }];
      const routeDuration = route.reduce((total, point) => total + (point.duration || duration), 0);
      this.active = { fromStage, toStage, elapsed: 0, duration: routeDuration, route, routeIndex: 0, phaseElapsed: 0 };
      this.camera.transitionTo(route[0], route[0].duration || duration);
      this.eventBus.emit('transition:start', { from: fromStage, to: toStage });
    }
    update(dt) {
      if (!this.active) return;
      this.active.elapsed = Math.min(this.active.duration, this.active.elapsed + dt);
      let remaining = dt;
      while (this.active.routeIndex < this.active.route.length - 1) {
        const currentPoint = this.active.route[this.active.routeIndex];
        const duration = currentPoint.duration || this.active.duration;
        const phaseRemaining = Math.max(0, duration - this.active.phaseElapsed);
        if (remaining < phaseRemaining) { this.active.phaseElapsed += remaining; remaining = 0; break; }
        remaining -= phaseRemaining; this.active.phaseElapsed = 0; this.active.routeIndex += 1;
        const nextPoint = this.active.route[this.active.routeIndex];
        this.camera.transitionTo(nextPoint, nextPoint.duration || this.active.duration);
      }
      if (this.active.elapsed >= this.active.duration) {
        const completed = this.active;
        this.active = null;
        this.eventBus.emit('transition:complete', { from: completed.fromStage, to: completed.toStage });
      }
    }
    layers(currentStage) {
      if (!this.active) {
        this.singleLayer.stage = currentStage;
        return [this.singleLayer];
      }
      const t = Math.max(0, Math.min(1, this.active.elapsed / this.active.duration));
      const smooth = t * t * (3 - 2 * t);
      this.transitionLayers[0].stage = this.active.fromStage;
      this.transitionLayers[0].alpha = 1 - smooth;
      this.transitionLayers[1].stage = this.active.toStage;
      this.transitionLayers[1].alpha = smooth;
      return this.transitionLayers;
    }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.SceneTransition = SceneTransition;
})(window);
