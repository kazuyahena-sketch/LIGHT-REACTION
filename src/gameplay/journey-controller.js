(function (root) {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const ringTargets = Object.freeze([0, 120, 240]);
  const ringInitialAngles = Object.freeze([90, 270, 150]);
  const reagentOptions = [
    { id: 'nadp-plus', formula: 'NADP⁺', correct: true },
    { id: 'nad-plus', formula: 'NAD⁺', correct: false },
    { id: 'nadph', formula: 'NADPH', correct: false },
    { id: 'nadp', formula: 'NADP', correct: false }
  ];
  class JourneyController {
    constructor(checkpoints, stages, state, runner, camera, minigames, panel, events, vfx, audio, renderer) {
      this.checkpoints = checkpoints; this.stages = stages; this.state = state;
      this.runner = runner; this.camera = camera; this.minigames = minigames; this.panel = panel;
      this.events = events; this.vfx = vfx; this.audio = audio; this.renderer = renderer;
      this.worldStarted = false; this.mode = 'intro'; this.activeCheckpointIndex = -1;
      this.flightGates = []; this.flightGateIndex = 0; this.passedFlightGate = null;
      this.followPoint = { x: 0, y: 450 };
      this.followPlayer = () => { this.followPoint.x = this.runner.player.x + 260; return this.followPoint; };
      this.stationElapsed = 0; this.waterHits = 0; this.waterPhase = 0; this.fdCharge = 0;
      this.stationUiElapsed = 0;
      this.pumpPhase = 0; this.reagentState = { selected: null, electrons: 0, proton: false };
      this.routeGate = 0; this.routeSafe = []; this.routeLane = 0; this.pumpCount = 0; this.ringAngles = [...ringInitialAngles];
      this.protonFlowClock = 0; this.protonFlowCount = 0; this.protonFlowRunning = false; this.protonFlowSaveBatch = false; this.autoContinue = 0;
      this.entryTimer = 0; this.respawnTimer = 0; this.checkpointPulse = 0;
      this.mirrorLocked = false;
      this.flightTutorialReturnMode = 'running';
      this.gameFinished = false; this.reagents = [];
      ['water', 'pq-route', 'proton-pump', 'pc-current', 'mirror', 'fd-launch', 'reagent', 'rings', 'calvin'].forEach(id => {
        this.minigames.register(id, { prepare: context => this.panel.show(id, context.model), close: () => this.panel.hide() });
      });
      events.on('journey:world-start', () => this.startWorld());
      events.on('minigame:action', data => this.action(data));
      events.on('minigame:tutorial-request', ({ id }) => this.openTutorialForCurrentProgress(id));
      events.on('game:menu-request', () => this.returnToMenu());
      events.on('minigame:tutorial-dismissed', data => this.onTutorialDismissed(data));
      events.on('game:reset', () => this.reset());
      events.on('runner:respawn', ({ respawnX, x }) => {
        this.flightGateIndex = this.nextFlightGateIndex(Number.isFinite(respawnX) ? respawnX : x);
        if (this.mode === 'respawning') {
          this.camera.transition = null; this.camera.blur = 0;
          this.camera.x = this.runner.player.x + 260; this.camera.y = 450; this.camera.zoom = .86;
          this.camera.setFollow(this.followPlayer);
          this.vfx.emit('checkpoint-respawn', { x: respawnX, y: 444, intensity: .75 });
        } else {
          this.camera.focus({ x: x + 260, y: 450, zoom: .86 }, .42);
          this.camera.setFollow(this.followPlayer);
          this.vfx.emit('checkpoint-respawn', { x, y: 444, intensity: .75 });
        }
      });
      events.on('runner:damaged', ({ x }) => { this.camera.shake(5, .22); this.vfx.emit('radical-hit', { x, y: 444, intensity: .7 }); this.audio.cue('input-miss'); });
      events.on('runner:flap', ({ x, y }) => { this.vfx.emit('electron-transfer', { x: x - 12, y: y + 9, intensity: .22 }); this.audio.cue('electron-transfer'); });
      events.on('runner:flight-boundary', () => this.respawnAtSavePoint());
    }
    get completedCount() {
      if (!this.state.checkpointId) return 0;
      const index = this.checkpoints.findIndex(item => item.id === this.state.checkpointId);
      return Math.max(0, index + 1);
    }
    get activeCheckpoint() { return this.activeCheckpointIndex >= 0 ? this.checkpoints[this.activeCheckpointIndex] : null; }
    get nextCheckpoint() { return this.checkpoints[this.completedCount] || null; }
    get tutorialTargetId() {
      if (this.mode === 'station' && this.activeCheckpoint && this.minigames.active?.id === this.activeCheckpoint.game) return this.activeCheckpoint.game;
      return ['running', 'flight-gate'].includes(this.mode) ? 'flight-align' : null;
    }
    get flightGate() { return this.flightGates[this.flightGateIndex] || null; }
    get nextFlightGate() { return this.flightGates[this.flightGateIndex + 1] || null; }
    get flightGateCount() { return this.flightGates.length; }
    get progress() {
      const checkpoint = this.nextCheckpoint;
      if (!checkpoint) return 1;
      const startX = this.state.checkpointId ? this.state.checkpointX : 80;
      const endX = checkpoint.x - checkpoint.approachOffset;
      return clamp((this.runner.player.x - startX) / Math.max(1, endX - startX), 0, 1);
    }
    buildFlightGates() {
      const gates = []; const fractions = [.33, .66, .91]; const lanes = [2, 0, 1];
      this.checkpoints.forEach((checkpoint, checkpointIndex) => {
        const startX = checkpointIndex ? this.checkpoints[checkpointIndex - 1].x + 65 : 80;
        const endX = checkpoint.x - checkpoint.approachOffset;
        fractions.forEach((fraction, gateInSegment) => gates.push({
          x: Math.round(startX + (endX - startX) * fraction),
          lane: lanes[gateInSegment], checkpointIndex, gateInSegment, index: gates.length
        }));
      });
      return gates;
    }
    nextFlightGateIndex(x) {
      const next = this.flightGates.findIndex(gate => gate.x > x + 1);
      return next < 0 ? this.flightGates.length : next;
    }
    onTutorialDismissed({ id }) {
      if (id !== 'flight-align' || this.mode !== 'flight-tutorial') return;
      const returnMode = this.flightTutorialReturnMode === 'flight-gate' ? 'flight-gate' : 'running';
      this.panel.hide(); this.mode = returnMode;
      if (returnMode === 'running') this.runner.resume();
      else this.runner.holdAtGate();
      this.camera.setFollow(this.followPlayer);
      this.events.emit('journey:mode-changed', this.mode);
    }
    openTutorialForCurrentProgress(requestedId = null) {
      const id = this.tutorialTargetId;
      if (!id || (requestedId && requestedId !== id)) return false;
      if (id !== 'flight-align') {
        if (this.panel.current?.id !== id || this.mode !== 'station') return false;
        return this.panel.openTutorial();
      }
      if (!this.worldStarted) return false;
      this.flightTutorialReturnMode = this.mode;
      this.runner.holdAtGate();
      this.mode = 'flight-tutorial';
      this.panel.show('flight-align', { lane: this.runner.lane, target: this.flightGate || this.nextFlightGate, next: this.nextFlightGate }, { forceTutorial: true });
      this.events.emit('journey:mode-changed', this.mode);
      return true;
    }
    openFlightTutorial() { return this.openTutorialForCurrentProgress('flight-align'); }

    startWorld() {
      if (this.worldStarted) return;
      this.worldStarted = true;
      const isComplete = this.state.hasObjective('products-delivered') && this.state.checkpointId === 'calvin-cycle';
      if (isComplete) {
        this.gameFinished = true; this.mode = 'complete'; this.runner.pause();
        this.camera.focus({ x: this.checkpoints[this.checkpoints.length - 1].x + 160, y: 450, zoom: .86 }, .9);
        this.panel.ending({ completed: this.completedCount, total: this.checkpoints.length, products: this.availableProducts() });
        this.events.emit('journey:complete', { products: ['ATP', 'NADPH', 'O₂'] });
        return;
      }
      const spawnX = this.state.checkpointId ? this.state.checkpointX : 80;
      this.runner.start(spawnX); this.runner.pause();
      this.flightGateIndex = this.nextFlightGateIndex(spawnX); this.passedFlightGate = null;
      this.activeCheckpointIndex = -1;
      this.camera.focus({ x: spawnX + 260, y: 450, zoom: .86 }, .82);
      this.camera.setFollow(this.followPlayer);
      this.events.emit('journey:resumed', { x: spawnX, checkpointId: this.state.checkpointId, completed: this.completedCount });
      if (this.panel.hasUnseenTutorial?.('flight-align')) {
        this.flightTutorialReturnMode = 'running';
        this.mode = 'flight-tutorial'; this.panel.show('flight-align', { lane: this.runner.lane, target: this.flightGate, next: this.nextFlightGate });
        this.events.emit('journey:mode-changed', this.mode);
        return;
      }
      this.mode = 'entry'; this.entryTimer = .82;
      this.events.emit('journey:mode-changed', this.mode);
    }
    update(dt) {
      if (!this.worldStarted || this.mode === 'complete') return;
      if (this.passedFlightGate) {
        this.passedFlightGate.elapsed += dt;
        if (this.passedFlightGate.elapsed >= .42) this.passedFlightGate = null;
      }
      if (this.mode === 'flight-tutorial') return;
      this.checkpointPulse = Math.max(0, this.checkpointPulse - dt);
      if (this.mode === 'entry' || this.mode === 'tunnel-entry') {
        this.entryTimer -= dt;
        if (this.entryTimer <= 0) {
          if (this.mode === 'tunnel-entry') {
            this.mode = 'station'; this.stationElapsed = 0; this.stationUiElapsed = 0;
            this.openCheckpointGame(this.activeCheckpoint);
          } else {
            this.mode = 'running'; this.runner.resume();
          }
          this.events.emit('journey:mode-changed', this.mode);
        }
        return;
      }
      if (this.mode === 'respawning') {
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) { this.mode = 'running'; this.runner.resume(); this.events.emit('journey:mode-changed', this.mode); }
        return;
      }
      if (this.mode === 'running') {
        const nextX = this.runner.player.x + this.runner.speed * dt;
        const pathBounds = this.renderer?.journeyPathBoundsAt(this.camera, nextX);
        this.runner.update(dt, pathBounds);
        if (this.mode !== 'running') return;
        const checkpoint = this.nextCheckpoint;
        if (checkpoint && this.runner.running && this.runner.player.x >= checkpoint.x - checkpoint.approachOffset) {
          if (checkpoint.tunnel && Math.abs(this.runner.player.y - this.runner.baseY) > 42) {
            this.respawnAtSavePoint();
            return;
          }
          this.arriveAtCheckpoint(checkpoint);
        }
        return;
      }
      if (this.mode === 'flight-gate') {
        this.runner.update(dt, this.renderer?.journeyPathBoundsAt(this.camera, this.runner.player.x) || null);
        return;
      }
      if (this.mode === 'station') {
        if (this.panel.isTutorialActive) return;
        this.stationElapsed += dt;
        this.stationUiElapsed += dt;
        const updateStationUI = this.stationUiElapsed >= .08;
        if (updateStationUI) this.stationUiElapsed = 0;
        if (this.minigames.active?.id === 'water') {
          this.waterPhase = (this.stationElapsed % 1.22) / 1.22;
          if (updateStationUI) this.panel.update({ hits: this.waterHits, beatPhase: this.waterPhase, beatWindow: Math.abs(this.waterPhase - .51) <= .12, total: 8 });
        }
        if (this.minigames.active?.id === 'proton-pump') {
          this.pumpPhase = (this.stationElapsed % 2.65) / 2.65;
          if (updateStationUI) this.panel.update({ transferred: this.pumpCount, total: 4, phase: this.pumpPhase, window: this.pumpPhase >= .67 && this.pumpPhase <= .88 });
        }
        if (this.minigames.active?.id === 'fd-launch' && this.fdCharge > 0 && this.fdCharge < 1) {
          this.fdCharge = Math.min(1, this.fdCharge + dt * .42);
          if (updateStationUI) this.panel.update({ charge: this.fdCharge, charging: true });
        }
        if (this.activeCheckpoint?.id === 'atp-synthase' && this.protonFlowRunning) this.updateProtonFlow(dt);
      }
      if (this.mode === 'checkpoint') {
        this.autoContinue -= dt;
        if (this.autoContinue <= 0 && this.mode === 'checkpoint') this.continueJourney();
      }
    }
    adjustFlightLane(direction) {
      if (!['running', 'flight-gate'].includes(this.mode) || ![-1, 1].includes(direction)) return false;
      const lane = clamp(this.runner.lane + direction, 0, 2);
      if (lane === this.runner.lane) return false;
      const bounds = this.renderer?.journeyPathBoundsAt(this.camera, this.runner.player.x) || null;
      this.runner.setLane(lane, bounds, this.mode === 'flight-gate');
      this.events.emit('journey:flight-lane-changed', { lane, targetLane: this.flightGate?.lane ?? null });
      return true;
    }
    passFlightGate() {
      if (this.mode !== 'flight-gate' || !this.flightGate) return false;
      const gate = this.flightGate;
      const bounds = this.renderer?.journeyPathBoundsAt(this.camera, this.runner.player.x) || null;
      const visuallyAligned = Math.abs(this.runner.player.y - this.runner.laneY(bounds)) <= 4;
      if (this.runner.lane !== gate.lane || !visuallyAligned) {
        const message = this.runner.lane !== gate.lane
          ? 'ตำแหน่งยังไม่ตรงช่อง · เป้าหมายอยู่เลน' + ['บน', 'กลาง', 'ล่าง'][gate.lane] + ' ปรับ ↑ / ↓ แล้วลองอีกครั้ง'
          : 'อิเล็กตรอนกำลังจัดแนวกับช่อง · รอสักครู่แล้วกดผ่านอีกครั้ง';
        this.events.emit('journey:flight-feedback', { tone: this.runner.lane !== gate.lane ? 'error' : 'neutral', message });
        if (this.runner.lane !== gate.lane) this.audio.cue('input-miss');
        return false;
      }
      this.passedFlightGate = { ...gate, elapsed: 0 };
      this.flightGateIndex += 1; this.mode = 'running'; this.runner.resume();
      this.vfx.emit('electron-transfer', { x: gate.x, y: this.runner.player.y, intensity: .72 }); this.audio.cue('electron-transfer');
      this.events.emit('journey:flight-gate-passed', { gate, index: this.flightGateIndex, total: this.flightGates.length });
      this.events.emit('journey:mode-changed', this.mode);
      return true;
    }
    respawnAtSavePoint() {
      if (this.mode !== 'running' || this.runner.invulnerable > 0) return;
      const spawnX = this.state.checkpointId ? this.state.checkpointX : 80;
      this.mode = 'respawning'; this.respawnTimer = .34;
      this.runner.crash(spawnX);
    }
    arriveAtCheckpoint(checkpoint) {
      this.activeCheckpointIndex = this.checkpoints.indexOf(checkpoint);
      this.runner.setX(checkpoint.x - checkpoint.approachOffset); this.runner.pause();
      const entersTunnel = checkpoint.tunnel;
      this.mode = entersTunnel ? 'tunnel-entry' : 'station';
      this.entryTimer = entersTunnel ? .42 : 0; this.stationElapsed = 0; this.stationUiElapsed = 0; this.checkpointPulse = 1.5; this.events.emit('state:changed', this.state.snapshot());
      const stage = this.stages.find(item => item.id === checkpoint.stageId);
      if (stage) this.state.setCurrentIndex(stage.index);
      this.events.emit('journey:checkpoint-arrival', { checkpoint, index: this.activeCheckpointIndex, total: this.checkpoints.length });
      this.camera.setFollow(this.followPlayer);
      if (entersTunnel) this.camera.focus({ x: this.runner.player.x + 120, y: 444, zoom: .86 }, .42);
      else this.openCheckpointGame(checkpoint);
      this.audio.cue('station-arrival');
    }
    openCheckpointGame(checkpoint) {
      this.waterHits = 0; this.fdCharge = 0; this.pumpCount = 0; this.routeGate = 0;
      let model = {};
      if (checkpoint.game === 'water') model = { hits: 0, beatPhase: 0, total: 8 };
      if (checkpoint.game === 'pq-route') { this.routeSafe = [1, -1, 1]; this.routeLane = 0; model = { gate: 0, safe: [...this.routeSafe], lane: this.routeLane }; }
      if (checkpoint.game === 'proton-pump') model = { transferred: 0, total: 4, phase: 0, window: false };
      if (checkpoint.game === 'pc-current') { this.routeSafe = [-1, 1, 1, -1]; model = { gate: 0, safe: [...this.routeSafe], carrier: 0 }; }
      if (checkpoint.game === 'mirror') { this.mirrorAngle = 20; this.mirrorLocked = false; this.events.emit('minigame:mirror-angle', this.mirrorAngle); model = { angle: this.mirrorAngle }; }
      if (checkpoint.game === 'fd-launch') model = { charge: 0, charging: false };
      if (checkpoint.game === 'reagent') { this.reagents = this.shuffle(reagentOptions.map(item => ({ ...item }))); this.reagentState = { selected: null, electrons: 0, proton: false }; model = { options: this.reagents, ...this.reagentState }; }
      if (checkpoint.game === 'rings') {
        this.ringAngles = [...ringInitialAngles]; this.protonFlowClock = 0; this.protonFlowCount = 0; this.protonFlowRunning = false;
        this.state.setProtonFlowActive(false); model = this.ringModel();
      }
      if (checkpoint.game === 'calvin') model = { atp: false, nadph: false };
      this.minigames.open(checkpoint.game, { model, checkpoint });
    }
    action({ action, value, index }) {
      if (action === 'panel-restart') { this.events.emit('game:restart-request'); return; }
      if (action === 'panel-menu') { if (this.mode === 'complete') this.events.emit('game:menu-request'); return; }
      if (action === 'panel-close') {
        if (this.mode === 'checkpoint' || this.mode === 'complete') { this.panel.hide(); return; }
        this.panel.status('ทำภารกิจสถานีนี้ให้สำเร็จเพื่อบันทึกจุดพัก', 'neutral'); return;
      }
      if (this.mode !== 'station' || !this.activeCheckpoint || this.panel.isTutorialActive) return;
      const game = this.activeCheckpoint.game;
      if (action === 'water-tap' && game === 'water') this.tapWater();
      if (action === 'route-lane' && game === 'pq-route') this.alignRouteLane(value);
      if (action === 'route-pass' && game === 'pq-route') this.passRouteGate();
      if (action === 'pump-pulse' && game === 'proton-pump') this.pumpProton();
      if (action === 'pc-lane' && game === 'pc-current') this.chooseRoute(value, 'pc');
      if (action === 'mirror-aim' && game === 'mirror' && !this.mirrorLocked) {
        if (value == null || value === '') return;
        const angle = Number(value); if (!Number.isFinite(angle)) return;
        this.mirrorAngle = clamp(angle, 20, 70);
        this.panel.update({ angle: this.mirrorAngle }); this.events.emit('minigame:mirror-angle', this.mirrorAngle);
      }
      if (action === 'mirror-lock' && game === 'mirror') this.lockMirror();
      if (action === 'fd-charge' && game === 'fd-launch') { this.fdCharge = Math.max(.02, this.fdCharge); this.panel.update({ charge: this.fdCharge, charging: true }); this.panel.status('กำลังสะสมพลังงานให้อิเล็กตรอนจาก PSI', 'neutral'); }
      if (action === 'fd-release' && game === 'fd-launch') this.releaseFd();
      if (action === 'fd-reset' && game === 'fd-launch') { this.fdCharge = 0; this.panel.update({ charge: 0, charging: false }); this.panel.status('ล้างประจุแล้ว · เริ่มสะสมพลังงานใหม่', 'neutral'); }
      if (action === 'reagent-pick' && game === 'reagent') this.pickReagent(value);
      if (action === 'reagent-electron' && game === 'reagent') this.addFNRElectron();
      if (action === 'reagent-proton' && game === 'reagent') this.addFNRProton();
      if (action === 'reagent-synthesize' && game === 'reagent') this.synthesizeNADPH();
      if (action === 'ring-turn' && game === 'rings') this.turnRing(index, Number(value));
      if (action === 'ring-engage' && game === 'rings') this.engageRings();
      if (action === 'calvin-load' && game === 'calvin') this.loadCalvinProduct(value);
    }
    tapWater() {
      if (Math.abs(this.waterPhase - .51) > .12) { this.panel.status('จังหวะคลาด · รอให้โฟตอนผ่านแถบรับพลังงาน', 'error'); this.audio.cue('input-miss'); return; }
      this.waterHits += 1; this.panel.status(`กระตุ้น OEC แล้ว · ${this.waterHits} / 8`, 'success'); this.audio.cue('water-hit');
      this.vfx.emit('oec-charge', { x: this.activeCheckpoint.x, y: 444, intensity: .4 + this.waterHits * .1 });
      if (this.waterHits >= 8) this.finishCheckpoint({ kind: 'water' });
    }
    chooseRoute(value, type = 'pq') {
      const lane = Number(value); const expected = this.routeSafe[this.routeGate];
      if (lane === expected) {
        this.routeGate += 1; this.audio.cue('electron-transfer');
        const game = type === 'pc' ? 'pc-current' : 'pq-route';
        this.panel.update({ gate: this.routeGate, safe: [...this.routeSafe], carrier: this.routeGate });
        this.panel.status(type === 'pc' ? 'PC เคลื่อนตามกระแสใน Lumen' : 'อิเล็กตรอนผ่านช่อง PQ แล้ว', 'success');
        if (this.routeGate >= this.routeSafe.length) this.finishCheckpoint({ kind: game });
      } else {
        this.routeGate = 0; this.panel.update({ gate: 0, safe: [...this.routeSafe], carrier: 0 });
        this.panel.status(type === 'pc' ? 'หลุดจากกระแส · ตามแนวสีน้ำเงิน' : 'พลาดเส้นทาง · เลือกช่องรีดอกซ์ที่เปิดอยู่', 'error');
        this.audio.cue('input-miss');
      }
    }
    alignRouteLane(value) {
      const lane = Number(value);
      if (this.routeGate >= this.routeSafe.length || ![-1, 1].includes(lane)) return;
      this.routeLane = lane;
      this.panel.update({ gate: this.routeGate, safe: [...this.routeSafe], lane: this.routeLane });
      this.panel.status(lane === this.routeSafe[this.routeGate] ? 'ตรงกับช่องเป้าหมายแล้ว · กด SPACE เพื่อผ่าน' : 'ตำแหน่งยังไม่ตรง · ปรับขึ้นหรือลงตามช่องเรืองแสง', lane === this.routeSafe[this.routeGate] ? 'success' : 'neutral');
    }
    passRouteGate() {
      if (this.routeGate >= this.routeSafe.length) return;
      if (this.routeLane !== this.routeSafe[this.routeGate]) {
        this.panel.status('ยังไม่ตรงช่อง · ดูตำแหน่งอิเล็กตรอนแล้วปรับ ↑ / ↓ ก่อนผ่าน', 'error');
        this.audio.cue('input-miss');
        return;
      }
      this.routeGate += 1;
      this.audio.cue('electron-transfer');
      this.panel.update({ gate: this.routeGate, safe: [...this.routeSafe], lane: this.routeLane });
      this.panel.routePassed?.();
      this.panel.status('อิเล็กตรอนผ่านช่อง PQ แล้ว · ' + this.routeGate + ' / ' + this.routeSafe.length, 'success');
      this.vfx.emit('electron-transfer', { x: this.activeCheckpoint.x + (this.routeGate - 1) * 32, y: this.routeLane < 0 ? 392 : 496, intensity: .55 });
      if (this.routeGate >= this.routeSafe.length) this.finishCheckpoint({ kind: 'pq-route' });
    }
    pumpProton() {
      if (this.pumpCount >= 4) return;
      if (this.pumpPhase < .67 || this.pumpPhase > .88) { this.panel.status('แรงดันยังไม่ถึงจุดปล่อย · รอแถบพลังงานเข้าช่องเรืองแสง', 'error'); this.audio.cue('input-miss'); return; }
      this.pumpCount += 1; this.panel.update({ transferred: this.pumpCount, total: 4, phase: this.pumpPhase, window: true });
      this.panel.status(`ย้าย H⁺ เข้า Lumen แล้ว · ${this.pumpCount} / 4`, 'success');
      this.vfx.emit('proton-pump', { x: this.activeCheckpoint.x, y: 520, intensity: .4 + this.pumpCount * .12 });
      this.audio.cue('proton-pumped');
      if (this.pumpCount === 4) this.finishCheckpoint({ kind: 'proton-pump' });
    }
    lockMirror() {
      if (this.mirrorLocked) return;
      if (Math.abs(this.mirrorAngle - 45) > 2) { this.panel.status(this.mirrorAngle < 45 ? 'แสงยังตกไม่ถึงจุดรับ PSI · ปรับแนวกระจกอีกครั้ง' : 'แสงเลยจุดรับ PSI ไปแล้ว · ปรับแนวกระจกอีกครั้ง', 'error'); this.audio.cue('input-miss'); return; }
      this.mirrorLocked = true;
      this.panel.lockMirror(this.mirrorAngle);
      this.events.emit('minigame:mirror-success'); this.vfx.emit('mirror-align', { x: this.activeCheckpoint.x, y: 310, intensity: 1 });
      this.audio.cue('mirror-aligned');
      this.finishCheckpoint({ kind: 'mirror', angle: this.mirrorAngle });
    }
    releaseFd() {
      if (this.fdCharge < .64 || this.fdCharge > .9) { this.panel.status(this.fdCharge < .64 ? 'พลังงานยังต่ำ · กดเริ่มสะสมพลังงานอีกครั้ง' : 'พลังงานสูงเกินไป · เริ่มใหม่แล้วปล่อยในช่วงเรืองแสง', 'error'); this.audio.cue('input-miss'); return; }
      this.vfx.emit('electron-transfer', { x: this.activeCheckpoint.x, y: 270, intensity: 1 }); this.audio.cue('electron-transfer');
      this.finishCheckpoint({ kind: 'fd-launch' });
    }
    pickReagent(id) {
      const selected = this.reagents.find(item => item.id === id);
      if (!selected) return;
      if (!selected.correct) { this.panel.status('สารไม่ถูกต้อง · FNR ต้องใช้ NADP⁺ รูปออกซิไดซ์', 'error'); this.audio.cue('input-miss'); return; }
      if (this.state.electronSupply < 2) { this.panel.status('รออิเล็กตรอนจาก Ferredoxin ก่อนเริ่มปฏิกิริยา', 'error'); return; }
      this.reagentState.selected = 'nadp-plus'; this.panel.update({ options: this.reagents, ...this.reagentState });
      this.panel.status('จับ NADP⁺ เข้ากับ FNR แล้ว · ส่งอิเล็กตรอนจาก Fd เข้าปฏิกิริยา', 'success');
    }
    addFNRElectron() {
      const r = this.reagentState;
      if (!r.selected) { this.panel.status('เลือกตัวรับอิเล็กตรอนก่อน', 'neutral'); return; }
      if (r.electrons >= 2) return;
      if (this.state.electronSupply < 2) { this.panel.status('ยังมีอิเล็กตรอนไม่พอจาก Ferredoxin', 'error'); return; }
      r.electrons += 1; this.panel.update({ options: this.reagents, ...r });
      this.panel.status(r.electrons < 2 ? 'รับอิเล็กตรอนตัวแรกแล้ว · ส่งตัวที่สองต่อ' : 'รับอิเล็กตรอนครบ 2 ตัว · เติม H⁺ จาก Stroma', 'success');
    }
    addFNRProton() {
      const r = this.reagentState;
      if (r.electrons < 2) { this.panel.status('ส่งอิเล็กตรอนให้ครบ 2 ตัวก่อนเติม H⁺', 'error'); return; }
      r.proton = true; this.panel.update({ options: this.reagents, ...r });
      this.panel.status('เติม H⁺ จาก Stroma แล้ว · พร้อมให้ FNR สร้าง NADPH', 'success');
    }
    synthesizeNADPH() {
      const r = this.reagentState;
      if (!r.selected || r.electrons < 2 || !r.proton) { this.panel.status('ตรวจสอบ NADP⁺, e⁻ 2 ตัว และ H⁺ ให้ครบก่อน', 'error'); return; }
      this.finishCheckpoint({ kind: 'reagent', reagent: 'NADP⁺' });
    }
    ringModel() {
      const isAligned = (angle, target) => { const distance = Math.abs(angle - target); return Math.min(distance, 360 - distance) <= 7.5; };
      const aligned = this.ringAngles.map((angle, i) => isAligned(angle, ringTargets[i]));
      return { angles: [...this.ringAngles], aligned };
    }
    turnRing(index, step) {
      if (!Number.isInteger(index) || index < 0 || index > 2 || ![-1, 1].includes(step)) return;
      this.ringAngles[index] = (this.ringAngles[index] + step * 15 + 360) % 360;
      const model = this.ringModel(); this.panel.update(model); this.panel.status(model.aligned[index] ? `วงแหวน ${index + 1} ตรงตำแหน่งแล้ว` : 'หมุนวงแหวนให้ช่องทั้งสามตรงกัน', model.aligned[index] ? 'success' : 'neutral');
      this.audio.cue('ring-turn');
    }
    engageRings() {
      if (this.protonFlowRunning) { this.panel.status('H⁺ กำลังไหลผ่าน ATP synthase · รอให้ครบก่อน', 'neutral'); return false; }
      if (!this.ringModel().aligned.every(Boolean)) { this.panel.status('จัดแนววงแหวนทั้งสามก่อนเริ่มกังหัน', 'error'); return false; }
      if (this.state.lumenProtons < 8) { this.panel.status('สร้างความต่าง H⁺ ให้ครบก่อน · จากน้ำและ Cytochrome b₆f', 'error'); return false; }
      this.state.beginSaveBatch(); this.protonFlowSaveBatch = true;
      this.protonFlowClock = 0; this.protonFlowCount = 0; this.protonFlowRunning = true; this.state.setProtonFlowActive(true);
      this.panel.update(this.ringModel());
      this.panel.status('H⁺ กำลังไหลจาก Lumen กลับสู่ Stroma', 'success'); this.audio.cue('turbine-start');
      this.vfx.emit('turbine-start', { x: this.activeCheckpoint.x, y: 444, intensity: .9 });
      return true;
    }
    updateProtonFlow(dt) {
      if (!this.protonFlowRunning) return false;
      if (this.mode !== 'station' || this.activeCheckpoint?.id !== 'atp-synthase') { this.cancelProtonFlow(true); return false; }
      this.protonFlowClock += dt;
      while (this.protonFlowClock >= .45 && this.protonFlowCount < 4) {
        this.protonFlowClock -= .45;
        // Keep partial H⁺ use in memory only. The checkpoint save after all four
        // transfers commits it; reloads before that return to the prior reserve.
        if (!this.state.consumeLumenProton('atp-synthase', false)) {
          this.cancelProtonFlow(true);
          this.panel.status('H⁺ ไม่พอให้จบการไหล · คืนทรัพยากรแล้ว ลองเริ่มอีกครั้ง', 'error');
          return false;
        }
        this.protonFlowCount += 1;
        this.vfx.emit('proton-flow', { x: this.activeCheckpoint.x, y: 444, intensity: .4 + this.protonFlowCount * .13 });
        this.panel.update(this.ringModel());
        this.panel.status(`H⁺ ผ่าน ATP synthase แล้ว · ${this.protonFlowCount} / 4`, 'success');
      }
      if (this.protonFlowCount >= 4) {
        this.protonFlowRunning = false; this.state.setProtonFlowActive(false);
        this.finishCheckpoint({ kind: 'rings' });
        this.commitProtonFlowSaveBatch();
        return true;
      }
      return false;
    }
    cancelProtonFlow(refund = false) {
      const consumed = this.protonFlowCount;
      this.protonFlowRunning = false; this.protonFlowClock = 0; this.protonFlowCount = 0;
      this.state.setProtonFlowActive(false);
      if (refund && consumed > 0) this.state.addLumenProtons(consumed, 'atp-synthase-cancelled');
      this.commitProtonFlowSaveBatch();
      return consumed;
    }
    commitProtonFlowSaveBatch() {
      if (!this.protonFlowSaveBatch) return false;
      this.protonFlowSaveBatch = false;
      return this.state.commitSaveBatch();
    }
    loadCalvinProduct(product) {
      if (!['atp', 'nadph'].includes(product) || !this.state.hasProduct(product)) { this.panel.status('ยังไม่มีผลิตภัณฑ์นี้', 'error'); return; }
      this.calvinLoaded = this.calvinLoaded || new Set(); this.calvinLoaded.add(product);
      const model = { atp: this.calvinLoaded.has('atp'), nadph: this.calvinLoaded.has('nadph') };
      this.panel.update(model); this.panel.status(`ส่ง ${product.toUpperCase()} ไปยัง Calvin Cycle แล้ว`, 'success'); this.audio.cue('product-formed');
      if (model.atp && model.nadph) this.finishCheckpoint({ kind: 'calvin' });
    }
    finishCheckpoint(result) {
      const checkpoint = this.activeCheckpoint;
      if (!checkpoint || this.mode !== 'station') return;
      if (result.kind === 'water') {
        this.state.addLumenProtons(4, 'water-splitting'); this.state.addElectronSupply(4); this.state.earnProduct('o2');
        this.state.completeObjective('water-split');
        this.events.emit('biology:water-split', { reaction: '2H₂O → 4H⁺ + 4e⁻ + O₂', protons: 4, electrons: 4, oxygen: 1 });
        this.vfx.emit('oxygen-release', { x: checkpoint.x, y: 350, intensity: 1 }); this.vfx.emit('water-split', { x: checkpoint.x, y: 444, intensity: 1 });
      } else if (result.kind === 'proton-pump') {
        const added = this.state.addLumenProtons(4, 'cytochrome-b6f');
        this.events.emit('biology:protons-pumped', { source: 'cytochrome-b6f', amount: added, total: this.state.lumenProtons });
      } else if (result.kind === 'mirror') {
        this.state.completeObjective('mirror-aligned'); this.events.emit('biology:psi-recharged', { angle: result.angle });
      } else if (result.kind === 'reagent') {
        if (!this.state.consumeElectrons(2)) { this.panel.status('ต้องมีอิเล็กตรอน 2 ตัวเพื่อสร้าง NADPH', 'error'); return; }
        this.state.earnProduct('nadph'); this.state.completeObjective('nadph-synthesized');
        this.events.emit('biology:product-formed', { product: 'nadph', reaction: 'NADP⁺ + 2e⁻ + H⁺ → NADPH' });
      } else if (result.kind === 'rings') {
        this.state.earnProduct('atp'); this.state.completeObjective('proton-flow-complete');
        this.events.emit('biology:product-formed', { product: 'atp', reaction: 'ADP + Pi → ATP' });
      } else if (result.kind === 'calvin') {
        this.state.completeObjective('products-delivered'); this.events.emit('biology:products-delivered', { products: ['atp', 'nadph'], oxygenReleased: this.state.hasProduct('o2') });
      }
      const stage = this.stages.find(item => item.id === checkpoint.completedStageId);
      const stageIndex = stage ? stage.index : this.state.currentIndex;
      const saveX = checkpoint.x + 65;
      this.state.saveCheckpoint(checkpoint.id, saveX, stageIndex);
      this.minigames.complete(result);
      this.vfx.emit('checkpoint-saved', { x: checkpoint.x, y: 444, intensity: 1 }); this.audio.cue('checkpoint-saved');
      this.runner.pause();
      const isFinal = checkpoint.id === 'calvin-cycle';
      if (isFinal) {
        this.gameFinished = true; this.mode = 'complete'; this.panel.ending({ completed: this.completedCount, total: this.checkpoints.length, products: this.availableProducts() });
        this.events.emit('journey:complete', { products: ['ATP', 'NADPH', 'O₂'] });
      } else {
        this.mode = 'checkpoint'; this.autoContinue = 1.5;
        this.panel.success(checkpoint.label + ' · จุดพัก', this.successCopy(result.kind), null, null);
      }
      this.events.emit('journey:checkpoint-complete', { checkpoint, index: this.activeCheckpointIndex, total: this.checkpoints.length, result });
      this.events.emit('journey:mode-changed', this.mode);
    }
    successCopy(kind) {
      const lines = {
        water: '2H₂O → 4H⁺ + 4e⁻ + O₂ อิเล็กตรอนกลับไปทดแทนให้ PSII, H⁺ เข้าสู่ Lumen และ O₂ ถูกปล่อยออกจากระบบ',
        'pq-route': 'Plastoquinone รับอิเล็กตรอนจาก PSII แล้วนำไปส่งต่อให้ Cytochrome b₆f',
        'proton-pump': 'Cytochrome b₆f ย้าย H⁺ จำนวน 4 ตัวเข้าสู่ Lumen ของ Thylakoid',
        'pc-current': 'Plastocyanin นำอิเล็กตรอนผ่าน Lumen ไปยัง Photosystem I',
        mirror: 'โฟตอนตัวที่สองเพิ่มพลังงานให้อิเล็กตรอนที่ PSI แล้วส่งต่อไปยัง Ferredoxin',
        'fd-launch': 'Ferredoxin ส่งอิเล็กตรอนพลังงานสูงไปยัง FNR',
        reagent: 'FNR ใช้อิเล็กตรอน 2 ตัวรีดิวซ์ NADP⁺ และสร้าง NADPH',
        rings: 'H⁺ จาก Lumen 4 ตัวไหลผ่าน ATP synthase และขับเคลื่อนการสร้าง ATP'
      };
      return lines[kind] || 'บันทึกจุดพักแล้ว พร้อมเดินทางต่อ';
    }
    availableProducts() {
      return [
        ['atp', 'ATP'], ['nadph', 'NADPH'], ['o2', 'O₂']
      ].filter(([id]) => this.state.hasProduct(id)).map(([, label]) => label);
    }
    continueJourney() {
      this.panel.hide(); this.activeCheckpointIndex = -1; this.mode = 'running';
      this.runner.setX(this.state.checkpointX); this.runner.resume();
      this.flightGateIndex = this.nextFlightGateIndex(this.state.checkpointX); this.passedFlightGate = null;
      this.camera.focus({ x: this.runner.player.x + 260, y: 450, zoom: .86 }, .45);
      this.camera.setFollow(this.followPlayer);
      this.events.emit('journey:continued', { x: this.state.checkpointX, completed: this.completedCount });
    }
    shuffle(items) {
      for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
      return items;
    }
    reset() {
      this.worldStarted = false; this.mode = 'intro'; this.activeCheckpointIndex = -1; this.stationElapsed = 0;
      this.waterHits = 0; this.fdCharge = 0; this.routeGate = 0; this.pumpCount = 0; this.protonFlowCount = 0; this.protonFlowRunning = false; this.protonFlowSaveBatch = false; this.protonFlowClock = 0; this.state.setProtonFlowActive(false); this.mirrorLocked = false; this.reagentState = { selected: null, electrons: 0, proton: false }; this.stationUiElapsed = 0;
      this.autoContinue = 0; this.gameFinished = false; this.calvinLoaded = null; this.routeLane = 0;
      this.flightGateIndex = 0; this.passedFlightGate = null;
      this.respawnTimer = 0; this.checkpointPulse = 0;
      this.runner.pause(); this.camera.setFollow(null); this.panel.hide();
    }
    returnToMenu() {
      this.cancelProtonFlow(true);
      this.worldStarted = false; this.mode = 'intro'; this.activeCheckpointIndex = -1;
      this.passedFlightGate = null;
      this.runner.pause(); this.camera.setFollow(null); this.panel.hide();
    }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.JourneyController = JourneyController;
})(window);
