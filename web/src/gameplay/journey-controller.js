(function (root) {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const ringTargets = [0, 120, 240];
  const reagentOptions = [
    { id: 'nadp-plus', formula: 'NADP⁺', correct: true },
    { id: 'nad-plus', formula: 'NAD⁺', correct: false },
    { id: 'nadph', formula: 'NADPH', correct: false },
    { id: 'nadp', formula: 'NADP', correct: false }
  ];

  class JourneyController {
    constructor(checkpoints, hazards, stages, state, runner, camera, minigames, panel, events, vfx, audio) {
      this.checkpoints = checkpoints; this.hazards = hazards; this.stages = stages; this.state = state;
      this.runner = runner; this.camera = camera; this.minigames = minigames; this.panel = panel;
      this.events = events; this.vfx = vfx; this.audio = audio;
      this.worldStarted = false; this.mode = 'intro'; this.activeCheckpointIndex = -1;
      this.stationElapsed = 0; this.waterHits = 0; this.waterPhase = 0; this.fdCharge = 0;
      this.stationUiElapsed = 0;
      this.pumpPhase = 0; this.reagentState = { selected: null, electrons: 0, proton: false };
      this.routeGate = 0; this.routeSafe = []; this.pumpCount = 0; this.ringAngles = [90, 270, 150];
      this.protonFlowClock = 0; this.protonFlowCount = 0; this.autoContinue = 0; this.hazardClock = 0;
      this.entryTimer = 0;
      this.mirrorLocked = false; this.mirrorSequenceElapsed = 0; this.mirrorSequencePhase = '';
      this.gameFinished = false; this.reagents = [];
      ['water', 'pq-route', 'proton-pump', 'pc-current', 'mirror', 'fd-launch', 'reagent', 'rings', 'calvin'].forEach(id => {
        this.minigames.register(id, { prepare: context => this.panel.show(id, context.model), close: () => this.panel.hide() });
      });
      events.on('journey:world-start', () => this.startWorld());
      events.on('minigame:action', data => this.action(data));
      events.on('game:reset', () => this.reset());
      events.on('runner:respawn', ({ x }) => { this.camera.focus({ x: x + 260, y: 450, zoom: .86 }, .42); this.camera.setFollow(() => ({ x: this.runner.player.x + 260, y: 450 })); this.vfx.emit('checkpoint-respawn', { x, y: 444, intensity: .75 }); });
      events.on('runner:damaged', ({ x }) => { this.camera.shake(5, .22); this.vfx.emit('radical-hit', { x, y: 444, intensity: .7 }); this.audio.cue('input-miss'); });
      events.on('runner:jump', ({ x }) => { this.vfx.emit('electron-jump', { x, y: 444, intensity: .36 }); this.audio.cue('electron-transfer'); });
    }
    get completedCount() {
      if (!this.state.checkpointId) return 0;
      const index = this.checkpoints.findIndex(item => item.id === this.state.checkpointId);
      return Math.max(0, index + 1);
    }
    get activeCheckpoint() { return this.activeCheckpointIndex >= 0 ? this.checkpoints[this.activeCheckpointIndex] : null; }
    get nextCheckpoint() { return this.checkpoints[this.completedCount] || null; }
    get progress() { return clamp(this.runner.player.x / this.checkpoints[this.checkpoints.length - 1].x, 0, 1); }

    startWorld() {
      this.worldStarted = true;
      const isComplete = this.state.hasObjective('products-delivered') && this.state.checkpointId === 'calvin-cycle';
      if (isComplete) {
        this.gameFinished = true; this.mode = 'complete'; this.runner.pause();
        this.camera.focus({ x: this.checkpoints[this.checkpoints.length - 1].x + 160, y: 450, zoom: .86 }, .9);
        this.panel.success('ปฏิกิริยาใช้แสงสำเร็จ', 'ATP และ NADPH ถึง Calvin Cycle แล้ว ส่วน O₂ ถูกปล่อยหลังการแตกตัวของน้ำ', 'เริ่มการเดินทางใหม่', 'panel-restart');
        this.events.emit('journey:complete', { products: ['ATP', 'NADPH', 'O₂'] });
        return;
      }
      const spawnX = this.state.checkpointId ? this.state.checkpointX : 80;
      this.runner.start(spawnX); this.runner.pause();
      this.mode = 'entry'; this.entryTimer = .82; this.activeCheckpointIndex = -1;
      this.camera.focus({ x: spawnX + 260, y: 450, zoom: .86 }, .82);
      this.camera.setFollow(() => ({ x: this.runner.player.x + 260, y: 450 }));
      this.events.emit('journey:resumed', { x: spawnX, checkpointId: this.state.checkpointId, completed: this.completedCount });
    }
    update(dt) {
      if (!this.worldStarted) return;
      if (this.mode === 'entry') {
        this.entryTimer -= dt;
        if (this.entryTimer <= 0) { this.mode = 'running'; this.runner.resume(); this.events.emit('journey:mode-changed', this.mode); }
        return;
      }
      if (this.mode === 'running') {
        this.runner.update(dt);
        this.checkHazards(dt);
        const checkpoint = this.nextCheckpoint;
        if (checkpoint && this.runner.running && this.runner.player.x >= checkpoint.x - checkpoint.approachOffset) this.arriveAtCheckpoint(checkpoint);
        return;
      }
      if (this.mode === 'station') {
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
        if (this.activeCheckpoint?.id === 'atp-synthase' && this.protonFlowCount > 0 && this.protonFlowCount < 4) this.updateProtonFlow(dt);
        if (this.mirrorLocked) this.updateMirrorSequence(dt);
      }
      if (this.mode === 'checkpoint' || this.mode === 'complete') {
        this.autoContinue -= dt;
        if (this.autoContinue <= 0 && this.mode === 'checkpoint') this.continueJourney();
      }
    }
    checkHazards(dt) {
      if (this.runner.invulnerable > 0 || this.hazardClock > 0) { this.hazardClock = Math.max(0, this.hazardClock - dt); return; }
      const player = this.runner.player;
      for (const hazard of this.hazards) {
        if (Math.abs(player.x - hazard.x) < hazard.radius + player.radius && Math.abs(player.y - hazard.y) < hazard.radius + player.radius + 3) {
          this.runner.takeHit(this.state.checkpointId ? this.state.checkpointX : 80);
          this.hazardClock = .8;
          return;
        }
      }
    }
    arriveAtCheckpoint(checkpoint) {
      this.activeCheckpointIndex = this.checkpoints.indexOf(checkpoint);
      this.runner.setX(checkpoint.x - checkpoint.approachOffset); this.runner.pause();
      this.mode = 'station'; this.stationElapsed = 0; this.stationUiElapsed = 0; this.events.emit('state:changed', this.state.snapshot());
      const stage = this.stages.find(item => item.id === checkpoint.stageId);
      if (stage) this.state.setCurrentIndex(stage.index);
      this.events.emit('journey:checkpoint-arrival', { checkpoint, index: this.activeCheckpointIndex, total: this.checkpoints.length });
      this.camera.setFollow(() => ({ x: this.runner.player.x + 260, y: 450 }));
      this.openCheckpointGame(checkpoint);
      this.audio.cue('station-arrival');
    }
    openCheckpointGame(checkpoint) {
      this.waterHits = 0; this.fdCharge = 0; this.pumpCount = 0; this.routeGate = 0;
      let model = {};
      if (checkpoint.game === 'water') model = { hits: 0, beatPhase: 0, total: 8 };
      if (checkpoint.game === 'pq-route') { this.routeSafe = [1, -1, 1]; model = { gate: 0, safe: [...this.routeSafe] }; }
      if (checkpoint.game === 'proton-pump') model = { transferred: 0, total: 4, phase: 0, window: false };
      if (checkpoint.game === 'pc-current') { this.routeSafe = [-1, 1, 1, -1]; model = { gate: 0, safe: [...this.routeSafe], carrier: 0 }; }
      if (checkpoint.game === 'mirror') { this.mirrorAngle = 20; this.mirrorLocked = false; this.mirrorSequenceElapsed = 0; this.mirrorSequencePhase = ''; this.events.emit('minigame:mirror-angle', this.mirrorAngle); model = { angle: this.mirrorAngle }; }
      if (checkpoint.game === 'fd-launch') model = { charge: 0, charging: false };
      if (checkpoint.game === 'reagent') { this.reagents = this.shuffle(reagentOptions.map(item => ({ ...item }))); this.reagentState = { selected: null, electrons: 0, proton: false }; model = { options: this.reagents, ...this.reagentState }; }
      if (checkpoint.game === 'rings') { this.ringAngles = [90, 270, 150]; this.protonFlowClock = 0; this.protonFlowCount = 0; model = this.ringModel(); }
      if (checkpoint.game === 'calvin') model = { atp: false, nadph: false };
      this.minigames.open(checkpoint.game, { model, checkpoint });
    }
    action({ action, value, index }) {
      if (action === 'panel-restart') { this.events.emit('game:restart-request'); return; }
      if (action === 'panel-close') {
        if (this.mode === 'checkpoint' || this.mode === 'complete') { this.panel.hide(); return; }
        this.panel.status('ทำภารกิจสถานีนี้ให้สำเร็จเพื่อบันทึกจุดพัก', 'neutral'); return;
      }
      if (this.mode !== 'station' || !this.activeCheckpoint) return;
      const game = this.activeCheckpoint.game;
      if (action === 'water-tap' && game === 'water') this.tapWater();
      if (action === 'route-lane' && game === 'pq-route') this.chooseRoute(value);
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
      this.mirrorLocked = true; this.mirrorSequenceElapsed = 0; this.mirrorSequencePhase = '';
      this.panel.lockMirror(this.mirrorAngle);
      this.events.emit('minigame:mirror-success'); this.vfx.emit('mirror-align', { x: this.activeCheckpoint.x, y: 310, intensity: 1 });
      this.audio.cue('mirror-aligned'); this.panel.mirrorChargePhase('flash');
    }
    updateMirrorSequence(dt) {
      this.mirrorSequenceElapsed += dt;
      const elapsed = this.mirrorSequenceElapsed;
      const phase = elapsed < .36 ? 'flash' : elapsed < .86 ? 'ring' : elapsed < 1.42 ? 'psi' : 'electron';
      if (phase !== this.mirrorSequencePhase) { this.mirrorSequencePhase = phase; this.panel.mirrorChargePhase(phase); }
      if (elapsed >= 2.05) { this.mirrorLocked = false; this.finishCheckpoint({ kind: 'mirror', angle: this.mirrorAngle }); }
    }
    releaseFd() {
      if (this.fdCharge < .64 || this.fdCharge > .9) { this.panel.status(this.fdCharge < .64 ? 'พลังงานยังต่ำ · กดค้างเพื่อสะสมต่อ' : 'พลังงานสูงเกินไป · เริ่มใหม่และจับจังหวะปล่อย', 'error'); this.audio.cue('input-miss'); return; }
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
      const aligned = this.ringAngles.map((angle, i) => { const distance = Math.abs(angle - ringTargets[i]); return Math.min(distance, 360 - distance) <= 7.5; });
      return { angles: [...this.ringAngles], aligned };
    }
    turnRing(index, step) {
      if (!Number.isInteger(index) || index < 0 || index > 2 || ![-1, 1].includes(step)) return;
      this.ringAngles[index] = (this.ringAngles[index] + step * 15 + 360) % 360;
      const model = this.ringModel(); this.panel.update(model); this.panel.status(model.aligned[index] ? `วงแหวน ${index + 1} ตรงตำแหน่งแล้ว` : 'หมุนวงแหวนให้ช่องทั้งสามตรงกัน', model.aligned[index] ? 'success' : 'neutral');
      this.audio.cue('ring-turn');
    }
    engageRings() {
      if (!this.ringModel().aligned.every(Boolean)) return;
      if (this.state.lumenProtons < 8) { this.panel.status('สร้างความต่าง H⁺ ให้ครบก่อน · จากน้ำและ Cytochrome b₆f', 'error'); return; }
      this.protonFlowClock = 0; this.protonFlowCount = .001; this.state.setProtonFlowActive(true);
      this.panel.status('H⁺ กำลังไหลจาก Lumen กลับสู่ Stroma', 'success'); this.audio.cue('turbine-start');
      this.vfx.emit('turbine-start', { x: this.activeCheckpoint.x, y: 444, intensity: .9 });
    }
    updateProtonFlow(dt) {
      this.protonFlowClock += dt;
      while (this.protonFlowClock >= .45 && this.protonFlowCount < 4) {
        this.protonFlowClock -= .45; this.protonFlowCount += 1;
        if (!this.state.consumeLumenProton('atp-synthase')) break;
        this.vfx.emit('proton-flow', { x: this.activeCheckpoint.x, y: 444, intensity: .4 + this.protonFlowCount * .13 });
        this.panel.status(`H⁺ ผ่าน ATP synthase แล้ว · ${this.protonFlowCount} / 4`, 'success');
      }
      if (this.protonFlowCount >= 4) {
        this.state.setProtonFlowActive(false); this.protonFlowCount = 0;
        this.finishCheckpoint({ kind: 'rings' });
      }
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
        this.gameFinished = true; this.mode = 'complete'; this.panel.success('ปฏิกิริยาใช้แสงสำเร็จ', 'ATP และ NADPH ถึง Calvin Cycle แล้ว ส่วน O₂ ถูกปล่อยหลังการแตกตัวของน้ำ', 'เริ่มการเดินทางใหม่', 'panel-restart');
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
    continueJourney() {
      this.panel.hide(); this.activeCheckpointIndex = -1; this.mode = 'running';
      this.runner.setX(this.state.checkpointX); this.runner.resume();
      this.camera.focus({ x: this.runner.player.x + 260, y: 450, zoom: .86 }, .45);
      this.camera.setFollow(() => ({ x: this.runner.player.x + 260, y: 450 }));
      this.events.emit('journey:continued', { x: this.state.checkpointX, completed: this.completedCount });
    }
    shuffle(items) {
      for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
      return items;
    }
    reset() {
      this.worldStarted = false; this.mode = 'intro'; this.activeCheckpointIndex = -1; this.stationElapsed = 0;
      this.waterHits = 0; this.fdCharge = 0; this.routeGate = 0; this.pumpCount = 0; this.protonFlowCount = 0; this.mirrorLocked = false; this.reagentState = { selected: null, electrons: 0, proton: false }; this.stationUiElapsed = 0;
      this.autoContinue = 0; this.gameFinished = false; this.calvinLoaded = null;
      this.runner.pause(); this.camera.setFollow(null); this.panel.hide();
    }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.JourneyController = JourneyController;
})(window);
