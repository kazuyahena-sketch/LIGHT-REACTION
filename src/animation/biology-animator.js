(function (root) {
  const route = [
    { x: 185, y: 445 }, { x: 365, y: 408 }, { x: 540, y: 445 }, { x: 700, y: 520 },
    { x: 855, y: 445 }, { x: 1080, y: 280 }, { x: 1235, y: 268 }, { x: 1322, y: 143 }
  ];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const mix = (a, b, t) => a + (b - a) * t;

  class BiologyAnimator {
    constructor(eventBus, state, vfx) {
      this.eventBus = eventBus; this.state = state; this.vfx = vfx;
      this.time = 0; this.stage = null; this.stageElapsed = 0;
      this.electronFrom = route[0]; this.electronTo = route[0]; this.electronTween = 1;
      this.carrier = null; this.rocketProgress = 0; this.lightFlash = 0; this.waterPulse = 0;
      this.synthaseSpin = 0; this.protonTransit = 0; this.mirrorAngle = -24; this.oxygenElapsed = 0; this.oxygenReleased = false;
      eventBus.on('stage:entered', stage => this.enterStage(stage));
      eventBus.on('biology:water-split', () => { this.waterPulse = 1; this.oxygenElapsed = 0; this.oxygenReleased = true; });
      eventBus.on('biology:proton-consumed', () => { this.protonTransit = Math.min(4, this.protonTransit + 1); });
      eventBus.on('minigame:mirror-angle', angle => { this.mirrorAngle = angle; });
      eventBus.on('minigame:mirror-success', () => { this.lightFlash = 1; });
      eventBus.on('game:reset', () => {
        this.stage = null; this.stageElapsed = 0; this.electronFrom = route[0]; this.electronTo = route[0]; this.electronTween = 1;
        this.carrier = null; this.rocketProgress = 0; this.lightFlash = 0; this.waterPulse = 0; this.synthaseSpin = 0; this.protonTransit = 0; this.mirrorAngle = -24; this.oxygenElapsed = 0; this.oxygenReleased = false;
      });
    }
    enterStage(stage) {
      this.stage = stage; this.stageElapsed = 0;
      this.carrier = stage.id === 'pq' ? 'pq' : stage.id === 'pc' ? 'pc' : null;
      if (stage.id === 'fd-rocket') { this.rocketProgress = 0; this.lightFlash = 1; }
    }
    travelTo(index, duration = 1.5) {
      this.electronFrom = this.electronPosition;
      this.electronTo = route[clamp(index, 0, route.length - 1)];
      this.electronTween = 0; this.electronDuration = duration; this.electronElapsed = 0;
    }
    update(dt) {
      this.time += dt; this.stageElapsed += dt;
      this.waterPulse = Math.max(0, this.waterPulse - dt * 1.3);
      this.lightFlash = Math.max(0, this.lightFlash - dt * 1.15);
      if (this.oxygenReleased) this.oxygenElapsed = Math.min(5.5, this.oxygenElapsed + dt);
      if (this.electronTween < 1) {
        this.electronElapsed = Math.min(this.electronDuration, this.electronElapsed + dt);
        const t = this.electronElapsed / this.electronDuration;
        this.electronTween = t * t * (3 - 2 * t);
      }
      if (this.stage?.id === 'fd-rocket') this.rocketProgress = Math.min(1, this.rocketProgress + dt / 1.9);
      if (this.state.protonFlowActive) this.synthaseSpin += dt * (3 + (8 - this.state.lumenProtons) * .4);
      this.protonTransit = Math.max(0, this.protonTransit - dt * .42);
    }
    updateJourney(dt) {
      this.time += dt;
      this.waterPulse = Math.max(0, this.waterPulse - dt * 1.3);
      this.lightFlash = Math.max(0, this.lightFlash - dt * 1.15);
      if (this.oxygenReleased) this.oxygenElapsed = Math.min(5.5, this.oxygenElapsed + dt);
    }
    get electronPosition() {
      const t = this.electronTween; const a = this.electronFrom; const b = this.electronTo;
      const pulse = this.electronTween >= 1 ? Math.sin(this.time * 3.1) * 2 : 0;
      return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) + pulse, visible: (this.stage?.index ?? 0) >= 6 };
    }
    get electronTravel() { return this.electronTween; }
    get carrierPosition() {
      if (!this.carrier) return null;
      const electron = this.electronPosition;
      const offset = this.carrier === 'pq' ? { x: 0, y: -10 } : { x: 0, y: -13 };
      return { x: electron.x + offset.x, y: electron.y + offset.y };
    }
    get rocketPosition() {
      const start = { x: 1080, y: 280 }; const end = { x: 1235, y: 268 };
      const t = this.stage?.id === 'fd-rocket' ? this.rocketProgress : this.stage && this.stage.index > 13 ? 1 : 0;
      return { x: mix(start.x, end.x, t), y: mix(start.y, end.y, t) - Math.sin(t * Math.PI) * 16, progress: t };
    }
    get protonCount() { return this.state.lumenProtons; }
    get protonFlow() { return this.state.protonFlowActive; }
    protonPosition(index) {
      const count = Math.max(1, this.protonCount);
      if (this.state.protonFlowActive && index < this.protonTransit) {
        const phase = (this.protonTransit - index) % 1;
        return { x: 760 + Math.sin(phase * Math.PI * 2) * 5, y: mix(520, 374, phase), flowing: true };
      }
      const angle = index * 2.4 + this.time * .2;
      return { x: 590 + Math.cos(angle) * (20 + index * 3), y: 700 + Math.sin(angle) * (16 + index * 2), flowing: false };
    }
    get oxygenPhase() { return this.oxygenReleased ? this.oxygenElapsed / 5.5 : 0; }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.BiologyAnimator = BiologyAnimator;
})(window);
