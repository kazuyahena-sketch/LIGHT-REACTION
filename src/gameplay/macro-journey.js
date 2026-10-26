(function (root) {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const stages = {
    cell: { title: 'ลัดเลาะภายใน CELL', copy: 'ขยับอิเล็กตรอนผ่านทางแยกของไซโทพลาซึม แล้วกดยืนยันเมื่อเข้าเขตปลอดภัย', rounds: 4, lanes: [0, 2, 1, 0] },
    chloroplast: { title: 'ค้นหาทางเข้า Chloroplast', copy: 'ตามสัญญาณแสงที่กำลังเคลื่อนที่ แล้วเลือกช่องทางเข้าที่ตรงกับสัญญาณ', rounds: 4, routes: [2, 0, 1, 2] },
    granum: { title: 'ลอดช่องของ Granum', copy: 'หมุนแผ่น Thylakoid ให้ช่องเปิดตรงกับทางผ่าน แล้วล็อกตำแหน่ง', rounds: 4, openings: [1, 3, 0, 2] },
    thylakoid: { title: 'เตรียมสมดุลใน Thylakoid', copy: 'จัดลำดับการไหลของ H⁺ เข้าสู่ Lumen และส่งอิเล็กตรอนไปยัง PSII ก่อนยืนยันรอบ', rounds: 4, sequence: ['proton', 'electron'] }
  };

  class MacroJourneyController {
    constructor(events, panel, state) {
      this.events = events; this.panel = panel; this.state = state; this.current = null;
      this.events.on('stage:arrived', stage => this.begin(stage));
      this.events.on('macro:journey-action', data => this.action(data));
      this.events.on('macro:tutorial-request', ({ id }) => this.openCurrentTutorial(id));
      this.events.on('game:reset', () => this.reset());
    }
    begin(stage) {
      if (!stages[stage.id] || this.state.checkpointId) return;
      this.current = { id: stage.id, stage, definition: stages[stage.id], round: 0, lane: 1, rotation: 0, routeIndex: 0, flow: [], attempts: 0 };
      this.refresh(); this.panel.open(stage, this.model());
      this.events.emit('macro:journey-opened', { stage });
    }
    get target() { return this.current?.definition[this.current.id === 'cell' ? 'lanes' : this.current.id === 'chloroplast' ? 'routes' : 'openings']?.[this.current.round] ?? 0; }
    model() {
      if (!this.current) return {};
      const c = this.current; const d = c.definition;
      return { id: c.id, round: c.round, rounds: d.rounds, phase: clamp(c.round / d.rounds, 0, 1), lane: c.lane, target: this.target, rotation: c.rotation, flow: [...c.flow], sequence: d.sequence || [], routeIndex: c.routeIndex, attempts: c.attempts };
    }
    refresh() { if (this.current) this.panel.update(this.model()); }
    openCurrentTutorial(id) {
      const c = this.current;
      if (!c || c.id !== id || this.state.checkpointId || this.state.currentIndex !== c.stage.index || this.panel.current?.stage?.id !== id) return false;
      return this.panel.openTutorial();
    }
    action({ action, value }) {
      const c = this.current; if (!c) return;
      if (this.panel.isTutorialActive) return;
      if (c.id === 'cell') this.cellAction(action, value);
      else if (c.id === 'chloroplast') this.chloroplastAction(action, value);
      else if (c.id === 'granum') this.granumAction(action, value);
      else if (c.id === 'thylakoid') this.thylakoidAction(action, value);
    }
    cellAction(action, value) {
      const c = this.current;
      if (action === 'macro-cell-move') { c.lane = clamp(c.lane + Number(value), 0, 2); this.refresh(); return; }
      if (action !== 'macro-cell-pass') return;
      if (c.lane !== this.target) { c.attempts += 1; this.panel.status('ยังอยู่ผิดช่อง · ปรับไปยังเลนที่มีแสงนำทางแล้วลองอีกครั้ง', 'error'); this.refresh(); return; }
      this.advanceRound('ผ่านทางแยกของเซลล์แล้ว');
    }
    chloroplastAction(action, value) {
      if (action !== 'macro-chloro-route') return;
      if (Number(value) !== this.target) { this.current.attempts += 1; this.panel.status('ช่องนี้ไม่ตรงกับสัญญาณ · เลือกช่องที่สว่างแล้วลองอีกครั้ง', 'error'); this.refresh(); return; }
      this.advanceRound('ผ่านเยื่อหุ้ม Chloroplast แล้ว');
    }
    granumAction(action, value) {
      const c = this.current;
      if (action === 'macro-granum-turn') { c.rotation = (c.rotation + Number(value) + 4) % 4; this.refresh(); return; }
      if (action !== 'macro-granum-lock') return;
      if (c.rotation !== this.target) { c.attempts += 1; this.panel.status('ช่องยังไม่ตรงแนว · หมุนแผ่นให้ตรงเป้าหมายแล้วลองอีกครั้ง', 'error'); this.refresh(); return; }
      this.advanceRound('ลอดช่อง Granum แล้ว');
    }
    thylakoidAction(action, value) {
      const c = this.current;
      if (action === 'macro-thylakoid-flow') {
        const expected = c.definition.sequence[c.flow.length];
        if (!expected) return;
        if (value !== expected) { c.flow = []; c.attempts += 1; this.panel.status('ลำดับยังไม่ถูก · โปรตอนเข้าด้าน Lumen ก่อน แล้วส่ง e⁻ ไป PSII', 'error'); this.refresh(); return; }
        c.flow.push(value); this.refresh();
        this.panel.status(c.flow.length === 1 ? 'เกิด Proton gradient แล้ว · ส่งอิเล็กตรอนไป PSII' : 'เส้นทางพลังงานพร้อม · รอจังหวะยืนยัน', 'success');
        return;
      }
      if (action !== 'macro-thylakoid-lock') return;
      if (c.flow.length !== c.definition.sequence.length) { this.panel.status('ทำลำดับ H⁺ และ e⁻ ให้ครบก่อนยืนยัน', 'error'); return; }
      this.advanceRound('เส้นทางใน Thylakoid พร้อมแล้ว');
    }
    advanceRound(message) {
      const c = this.current; this.panel.status(message, 'success');
      c.round += 1; c.lane = 1; c.rotation = 0; c.flow = [];
      if (c.round >= c.definition.rounds) {
        const stage = c.stage; this.current = null; this.panel.close();
        this.events.emit('macro:journey-complete', { stage, nextIndex: stage.index + 1 });
        return;
      }
      this.refresh();
    }
    reset() { this.current = null; this.panel.close(); }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.MacroJourneyController = MacroJourneyController;
})(window);
