(function (root) {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  class CameraController {
    constructor() {
      this.x = 720; this.y = 450; this.zoom = .38;
      this.transition = null; this.followTarget = null;
      this.shakeTime = 0; this.shakeDuration = 0; this.shakeAmount = 0; this.shakeOffset = { x: 0, y: 0 };
      this.blur = 0; this.blurTween = null;
    }
    transitionTo(target, duration = 1.2) {
      this.followTarget = null;
      this.transition = { from: { x: this.x, y: this.y, zoom: this.zoom }, to: { x: target.x, y: target.y, zoom: target.zoom }, elapsed: 0, duration: Math.max(.01, duration), startBlur: this.blur };
    }
    setFollow(target) { this.followTarget = target; }
    focus(target, duration = .6) { this.transitionTo(target, duration); }
    zoomBy(factor) { this.zoom = clamp(this.zoom * factor, .24, 7); this.transition = null; }
    zoomAt(factor, screenX, screenY, width, height, viewScale) {
      const beforeX = this.x + (screenX - width / 2) / (viewScale * this.zoom);
      const beforeY = this.y + (screenY - height / 2) / (viewScale * this.zoom);
      this.zoomBy(factor);
      const afterX = this.x + (screenX - width / 2) / (viewScale * this.zoom);
      const afterY = this.y + (screenY - height / 2) / (viewScale * this.zoom);
      this.x += beforeX - afterX; this.y += beforeY - afterY;
    }
    panBy(screenDeltaX, screenDeltaY, viewScale) {
      this.transition = null;
      this.x -= screenDeltaX / (viewScale * this.zoom);
      this.y -= screenDeltaY / (viewScale * this.zoom);
    }
    shake(amount = 5, duration = .4) { this.shakeAmount = amount; this.shakeDuration = duration; this.shakeTime = duration; }
    blurTo(amount = 0, duration = .35) { this.blurTween = { from: this.blur, to: amount, elapsed: 0, duration: Math.max(.01, duration) }; }
    update(dt) {
      if (this.transition) {
        const tween = this.transition;
        tween.elapsed = Math.min(tween.duration, tween.elapsed + dt);
        const t = ease(tween.elapsed / tween.duration);
        this.x = tween.from.x + (tween.to.x - tween.from.x) * t;
        this.y = tween.from.y + (tween.to.y - tween.from.y) * t;
        this.zoom = Math.exp(Math.log(tween.from.zoom) + (Math.log(tween.to.zoom) - Math.log(tween.from.zoom)) * t);
        this.blur = tween.startBlur + Math.sin(t * Math.PI) * .75;
        if (tween.elapsed >= tween.duration) { this.x = tween.to.x; this.y = tween.to.y; this.zoom = tween.to.zoom; this.blur = 0; this.transition = null; }
      } else if (this.followTarget) {
        const target = typeof this.followTarget === 'function' ? this.followTarget() : this.followTarget;
        if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
          this.x += (target.x - this.x) * Math.min(1, dt * 5);
          this.y += (target.y - this.y) * Math.min(1, dt * 5);
        }
      }
      if (this.blurTween) {
        const tween = this.blurTween; tween.elapsed = Math.min(tween.duration, tween.elapsed + dt);
        const t = ease(tween.elapsed / tween.duration); this.blur = tween.from + (tween.to - tween.from) * t;
        if (tween.elapsed >= tween.duration) this.blurTween = null;
      }
      if (this.shakeTime > 0) {
        this.shakeTime = Math.max(0, this.shakeTime - dt);
        const strength = this.shakeAmount * (this.shakeTime / Math.max(.001, this.shakeDuration));
        const phase = (this.shakeDuration - this.shakeTime) * 48;
        this.shakeOffset.x = Math.sin(phase) * strength;
        this.shakeOffset.y = Math.sin(phase * 1.37 + .8) * strength;
      } else { this.shakeOffset.x = 0; this.shakeOffset.y = 0; }
    }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.CameraController = CameraController;
})(window);
