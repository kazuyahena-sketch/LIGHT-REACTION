(function (root) {
  class InputController {
    constructor(canvas, camera, stageManager, renderer, getViewport, showToast, isInputLocked = () => false, runner = null, journey = null) {
      this.canvas = canvas; this.camera = camera; this.stageManager = stageManager; this.renderer = renderer;
      this.getViewport = getViewport; this.showToast = showToast; this.isInputLocked = isInputLocked;
      this.runner = runner; this.journey = journey; this.pointer = null; this.dragged = false; this.lastPointer = null;
      document.getElementById('runner-controls')?.addEventListener('click', event => {
        const button = event.target.closest('[data-flight-action]');
        if (!button || button.disabled || !this.journey?.worldStarted) return;
        if (button.dataset.flightAction === 'help') this.journey.openTutorialForCurrentProgress();
        else if (button.dataset.flightAction === 'pass') this.journey.passFlightGate();
        else this.journey.adjustFlightLane(button.dataset.flightAction === 'up' ? -1 : 1);
      });
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
      const macroPanel = document.getElementById('macro-panel');
      if (macroPanel && !macroPanel.hidden) return;
      if (this.journey?.worldStarted) {
        if (this.journey.mode === 'flight-tutorial' || this.runner?.running) return;
        if (this.journey.mode === 'flight-gate') {
          if (event.button === 0 && event.isPrimary !== false) { event.preventDefault(); this.journey.passFlightGate(); }
          return;
        }
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
      const macroPanel = document.getElementById('macro-panel');
      if (this.isInputLocked() || this.journey?.worldStarted || (macroPanel && !macroPanel.hidden)) return;
      const rect = this.canvas.getBoundingClientRect(); const viewport = this.getViewport();
      this.camera.zoomAt(Math.exp(-event.deltaY * .001), event.clientX - rect.left, event.clientY - rect.top, viewport.width, viewport.height, viewport.scale);
    }
    onKeyDown(event) {
      if (event.defaultPrevented || this.isInputLocked()) return;
      const macroPanel = document.getElementById('macro-panel');
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (macroPanel && !macroPanel.hidden) {
        if (target?.closest('#macro-panel')) return;
        if (['Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
        return;
      }
      const inFlightControls = Boolean(target?.closest('#runner-controls'));
      if (target && !inFlightControls && (['INPUT', 'TEXTAREA', 'BUTTON'].includes(target.tagName) || target.closest('#minigame-panel'))) return;
      if (this.journey?.worldStarted) {
        if (event.key === '+' || event.key === '=' || event.key === '-' || event.key === '0') { event.preventDefault(); return; }
        if (this.journey.mode === 'flight-tutorial') {
          if (['Space', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
          return;
        }
        if (['running', 'flight-gate'].includes(this.journey.mode)) {
          if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
            event.preventDefault();
            if (!event.repeat) this.journey.adjustFlightLane(event.code === 'ArrowUp' ? -1 : 1);
          } else if (event.code === 'Space') {
            if (inFlightControls) return;
            event.preventDefault();
            if (!event.repeat && this.journey.mode === 'flight-gate') this.journey.passFlightGate();
          }
        }
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
