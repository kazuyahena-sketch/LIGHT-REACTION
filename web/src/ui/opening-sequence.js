(function (root) {
  class OpeningSequence {
    constructor(element, stageManager, events, state, renderer, loadingElement) {
      this.element = element; this.shell = element.closest('.game-shell'); this.stageManager = stageManager; this.events = events; this.state = state;
      this.renderer = renderer; this.loadingElement = loadingElement; this.loadingMessage = loadingElement.querySelector('[data-loading-message]');
      this.startButton = element.querySelector('[data-start-game]'); this.startError = element.querySelector('[data-start-error]');
      this.active = true; this.loading = false; this.pendingStart = false; this.tourRunning = false; this.nextTourTimer = null;
      this.startButton.addEventListener('click', () => this.start());
      events.on('stage:arrived', stage => this.onArrival(stage));
      events.on('macro:journey-complete', ({ nextIndex }) => {
        if (this.tourRunning) this.scheduleTourAdvance(nextIndex);
      });
      events.on('game:restart-request', () => this.show());
      events.on('game:reset', () => { this.clearTimer(); this.refreshStartLabel(); });
      this.refreshStartLabel();
    }
    async start() {
      if (!this.active || this.loading || this.tourRunning) return;
      this.loading = true; this.startButton.disabled = true; this.startError.hidden = true;
      try {
        if (!this.renderer.openingPrepared) {
          this.loadingElement.hidden = false;
          this.loadingElement.setAttribute('aria-busy', 'true');
          await this.renderer.prepareForOpening(message => { this.loadingMessage.textContent = message; });
          this.loadingElement.hidden = true;
        }
      } catch (error) {
        this.loadingElement.hidden = true;
        this.startError.textContent = 'เตรียมฉากไม่สำเร็จ กรุณาลองเริ่มเกมอีกครั้ง';
        this.startError.hidden = false;
        console.error('Unable to prepare game scenes before the opening sequence.', error);
        return;
      } finally {
        this.loading = false; this.startButton.disabled = false;
        this.loadingElement.setAttribute('aria-busy', 'false');
      }
      this.pendingStart = true; this.tourRunning = true;
      this.shell.classList.add('tour-mode');
      this.element.classList.add('launching');
      this.stageManager.beginIntro();
      window.setTimeout(() => this.element.classList.add('leaving'), 160);
    }
    onArrival(stage) {
      if (this.pendingStart && stage.id === 'start') {
        this.pendingStart = false; this.advanceTour(1); return;
      }
      if (!this.tourRunning) return;
      if (stage.id === 'light-reaction') {
        this.tourRunning = false; this.active = false; this.element.hidden = true;
        this.element.classList.remove('launching', 'leaving');
        this.shell.classList.remove('tour-mode');
        this.state.completeObjective('overview-ready');
        this.events.emit('journey:world-start');
        return;
      }
      if (stage.index >= 1 && stage.index < 5) {
        if (this.state.checkpointId) this.scheduleTourAdvance(stage.index + 1);
      }
    }
    advanceTour(index) {
      if (!this.tourRunning) return;
      if (index > 5) return;
      this.scheduleTourAdvance(index);
    }
    scheduleTourAdvance(index) {
      this.clearTimer();
      this.nextTourTimer = window.setTimeout(() => {
        if (!this.tourRunning || this.stageManager.isTransitioning) return;
        this.stageManager.goTo(index);
      }, 520);
    }
    clearTimer() { if (this.nextTourTimer) window.clearTimeout(this.nextTourTimer); this.nextTourTimer = null; }
    show() {
      this.clearTimer(); this.active = true; this.pendingStart = false; this.tourRunning = false;
      this.element.hidden = false; this.element.classList.remove('launching', 'leaving');
      this.startError.hidden = true; this.startButton.disabled = false; this.loadingElement.hidden = true;
      this.shell.classList.remove('tour-mode', 'runner-mode');
      this.refreshStartLabel();
    }
    refreshStartLabel() {
      const label = this.element.querySelector('[data-start-game] span');
      if (!label) return;
      label.textContent = this.state.checkpointId === 'calvin-cycle' ? 'ดูฉากจบ' : this.state.checkpointId ? 'เล่นต่อจากจุดพัก' : 'เริ่มเกม';
    }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.OpeningSequence = OpeningSequence;
})(window);
