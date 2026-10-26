(function (root) {
  const LR = root.LightReaction;
  class GameApp {
    constructor() {
      this.canvas = document.getElementById('world');
      this.shell = document.querySelector('.game-shell');
      this.events = new LR.EventBus();
      this.state = new LR.GameState(this.events, LR.Stages.length);
      this.camera = new LR.CameraController();
      this.transition = new LR.SceneTransition(this.camera, this.events);
      this.vfx = new LR.VFXHooks(this.events);
      this.audio = new LR.AudioHooks(this.events);
      this.minigames = new LR.MinigameHost(this.events);
      this.panel = new LR.MinigamePanel(document.getElementById('minigame-panel'), this.events);
      this.macroPanel = new LR.MacroChallengePanel(document.getElementById('macro-panel'), this.events);
      this.macroJourney = new LR.MacroJourneyController(this.events, this.macroPanel, this.state);
      this.renderer = new LR.WorldRenderer(this.canvas, LR.Stations, null, this.vfx);
      this.stageManager = new LR.StageManager(LR.Stages, this.state, this.transition, this.events, this.vfx, this.audio);
      this.animator = new LR.BiologyAnimator(this.events, this.state, this.vfx);
      this.renderer.animator = this.animator;
      this.runner = new LR.RunnerController(this.events);
      this.journey = new LR.JourneyController(LR.JourneyCheckpoints, LR.Stages, this.state, this.runner, this.camera, this.minigames, this.panel, this.events, this.vfx, this.audio, this.renderer);
      this.renderer.runner = this.runner; this.renderer.journey = this.journey;
      this.explanation = new LR.ExplanationDirector(this.events);
      const initialStage = this.stageManager.current;
      this.camera.x = initialStage.camera.x; this.camera.y = initialStage.camera.y; this.camera.zoom = initialStage.camera.zoom;
      this.animator.stage = initialStage;
      this.hud = new LR.HUDController(LR.Stages, this.state, this.events, this.explanation, () => this.advance(), () => this.stageManager.isTransitioning, () => this.stageManager.canAdvance(), this.journey, this.runner);
      this.intro = new LR.OpeningSequence(document.getElementById('intro-screen'), this.stageManager, this.events, this.state);
      this.events.on('game:restart-request', () => this.stageManager.restart());
      this.events.on('game:menu-request', () => {
        this.renderer.setJourneyMode(false);
        this.shell.classList.remove('runner-mode', 'journey-complete', 'ending-mode', 'station-mode', 'flight-gate');
        this.intro.show();
      });
      this.input = new LR.InputController(this.canvas, this.camera, this.stageManager, this.renderer, () => this.renderer.viewport(), message => this.hud.showToast(message), () => this.intro.active, this.runner, this.journey);
      this.events.on('journey:world-start', () => { this.renderer.setJourneyMode(true); this.shell.classList.add('runner-mode'); if (this.journey.gameFinished) this.shell.classList.add('journey-complete'); });
      this.events.on('journey:complete', () => this.shell.classList.add('journey-complete'));
      this.events.on('game:reset', () => { this.renderer.setJourneyMode(false); this.shell.classList.remove('runner-mode', 'journey-complete', 'ending-mode', 'station-mode', 'flight-gate'); });
      this.events.on('biology:water-split', () => this.camera.shake(5, .32));
      this.events.on('product:earned', () => this.audio.cue('product-formed'));
      this.events.on('journey:checkpoint-arrival', ({ checkpoint, index, total }) => this.hud.showToast('CHECKPOINT REACHED · ' + (index + 1) + ' / ' + total + ' · ' + checkpoint.label, ''));
      this.lastFrame = 0; this.running = false; this.hudUpdateElapsed = 0; this.completionIdleElapsed = 0;
      this.frame = this.frame.bind(this);
      this.events.on('transition:start', () => this.start());
      this.events.on('game:reset', () => this.stop());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stop();
        else if (!this.intro.active || this.intro.tourRunning) this.start();
      });
    }
    advance() { const advanced = this.stageManager.advance(); if (advanced) this.hud.refresh(); }
    start() { if (this.running) return; this.running = true; this.lastFrame = performance.now(); requestAnimationFrame(this.frame); }
    frame(timestamp) {
      if (!this.running || document.hidden) return;
      const dt = Math.min(.12, Math.max(0, (timestamp - this.lastFrame) / 1000)); this.lastFrame = timestamp;
      this.transition.update(dt); this.camera.update(dt);
      if (this.journey.worldStarted) this.animator.updateJourney(dt);
      else this.animator.update(dt);
      this.journey.update(dt); this.vfx.update(dt);
      const atFlightGate = this.journey.mode === 'flight-gate';
      this.shell.classList.toggle('flight-gate', atFlightGate);
      const passButton = document.querySelector('[data-flight-action="pass"]');
      if (passButton) passButton.disabled = !atFlightGate;
      const helpButton = document.querySelector('[data-flight-action="help"]');
      if (helpButton) helpButton.disabled = !this.journey.tutorialTargetId || this.journey.tutorialTargetId !== 'flight-align';
      const canAdjustFlightLane = ['running', 'flight-gate'].includes(this.journey.mode);
      document.querySelectorAll('[data-flight-action="up"], [data-flight-action="down"]').forEach(button => { button.disabled = !canAdjustFlightLane; });
      this.hudUpdateElapsed += dt;
      if (this.hudUpdateElapsed >= .08) { this.hudUpdateElapsed = 0; this.hud.updateJourney(); }
      this.renderer.render(timestamp, this.stageManager.current, this.transition, this.camera, this.state);
      if (this.journey.mode === 'complete' && !this.transition.isActive && !this.camera.transition && this.vfx.effects.length === 0) {
        this.completionIdleElapsed += dt;
        if (this.completionIdleElapsed >= .35) { this.stop(); return; }
      } else this.completionIdleElapsed = 0;
      requestAnimationFrame(this.frame);
    }
    stop() { this.running = false; this.lastFrame = 0; }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const app = new GameApp();
    root.LightReactionApp = app;
  }, { once: true });
})(window);
