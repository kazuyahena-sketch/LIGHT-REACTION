(function (root) {
  class InputController {
    constructor(canvas, camera, stageManager, renderer, getViewport, showToast, isInputLocked = () => false, runner = null, journey = null) {
      this.canvas = canvas; this.camera = camera; this.stageManager = stageManager; this.renderer = renderer;
      this.getViewport = getViewport; this.showToast = showToast; this.isInputLocked = isInputLocked;
      this.runner = runner; this.journey = journey; this.pointer = null; this.dragged = false; this.lastPointer = null;
      canvas.addEventListener('pointerdown', event => this.onPointerDown(event));
      canvas.addEventListener('pointermove', event => this.onPointerMove(event));
      canvas.addEventListener('pointerup', event => this.onPointerUp(event));
      canvas.addEventListener('pointercancel', () => { this.pointer = null; this.lastPointer = null; });
      canvas.addEventListener('wheel', event => this.onWheel(event), { passive: false });
      window.addEventListener('keydown', event => this.onKeyDown(event));
      window.addEventListener('keyup', event => this.runner?.keyUp(event.code));
      window.addEventListener('blur', () => this.runner?.held.clear());
    }
    onPointerDown(event) {
      if (this.journey?.worldStarted && this.runner?.running) {
        this.pointer = event.pointerId; this.dragged = false; this.lastPointer = { x: event.clientX, y: event.clientY };
        this.canvas.setPointerCapture(event.pointerId); this.runner.flap(); return;
      }
      this.pointer = event.pointerId; this.dragged = false; this.lastPointer = { x: event.clientX, y: event.clientY };
      this.canvas.setPointerCapture(event.pointerId);
    }
    onPointerMove(event) {
      if (this.pointer !== event.pointerId || !this.lastPointer) return;
      const dx = event.clientX - this.lastPointer.x; const dy = event.clientY - this.lastPointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) this.dragged = true;
      if (this.dragged && !this.isInputLocked() && (!this.journey?.worldStarted || !this.runner?.running)) {
        if (this.journey?.worldStarted) this.camera.setFollow(null);
        const viewport = this.getViewport(); this.camera.panBy(dx, dy, viewport.scale); this.canvas.style.cursor = 'grabbing';
      }
      this.lastPointer = { x: event.clientX, y: event.clientY };
    }
    onPointerUp(event) {
      if (this.pointer !== event.pointerId) return;
      if (this.journey?.worldStarted) {
        this.pointer = null; this.lastPointer = null; this.canvas.style.cursor = 'default'; return;
      }
      if (this.isInputLocked()) { this.pointer = null; this.lastPointer = null; return; }
      if (!this.dragged && !this.stageManager.isTransitioning) {
        const rect = this.canvas.getBoundingClientRect(); const viewport = this.getViewport();
        const pick = this.renderer.pick(event.clientX - rect.left, event.clientY - rect.top, viewport, this.camera, this.stageManager);
        if (pick) this.stageManager.goTo(pick.index);
      }
      this.pointer = null; this.lastPointer = null; this.canvas.style.cursor = 'grab';
    }
    onWheel(event) {
      event.preventDefault();
      if (this.isInputLocked() || this.journey?.worldStarted) return;
      const rect = this.canvas.getBoundingClientRect(); const viewport = this.getViewport();
      this.camera.zoomAt(Math.exp(-event.deltaY * .001), event.clientX - rect.left, event.clientY - rect.top, viewport.width, viewport.height, viewport.scale);
    }
    onKeyDown(event) {
      if (event.defaultPrevented || this.isInputLocked()) return;
      if (event.target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName) || event.target.closest('#minigame-panel'))) return;
      if (this.journey?.worldStarted) {
        if (event.key === '+' || event.key === '=' || event.key === '-' || event.key === '0') { event.preventDefault(); return; }
        if (this.runner?.running && this.runner.keyDown(event.code, event.repeat)) event.preventDefault();
        return;
      }
      const distance = 44; const viewport = this.getViewport();
      if (event.code === 'Space' || event.code === 'Enter') { event.preventDefault(); this.stageManager.advance(); }
      else if (event.key === '+' || event.key === '=') this.camera.zoomBy(1.16);
      else if (event.key === '-') this.camera.zoomBy(1 / 1.16);
      else if (event.key === '0') this.stageManager.refocus();
      else if (event.key === 'ArrowLeft') this.camera.panBy(distance, 0, viewport.scale);
      else if (event.key === 'ArrowRight') this.camera.panBy(-distance, 0, viewport.scale);
      else if (event.key === 'ArrowUp') this.camera.panBy(0, distance, viewport.scale);
      else if (event.key === 'ArrowDown') this.camera.panBy(0, -distance, viewport.scale);
    }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.InputController = InputController;
})(window);
