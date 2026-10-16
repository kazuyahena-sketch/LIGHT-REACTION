(function (root) {
  const definitions = {
    water: { title: 'OEC · แตกตัวของน้ำ', eyebrow: 'PSII · สลายน้ำ', copy: 'กดรับโฟตอนเมื่อแถบพลังงานเลื่อนผ่านช่องเรืองแสง ทำให้ครบ 8 จังหวะเพื่อเติมอิเล็กตรอนให้ PSII' },
    'pq-route': { title: 'ตามเส้นทาง PQ', eyebrow: 'PLASTOQUINONE · ถ่ายทอดรีดอกซ์', copy: 'ที่แต่ละช่องบนเยื่อ นำอิเล็กตรอนไปยังช่องเปิดซึ่งแสดงด้วยรอยเรืองแสงของตัวพา' },
    'proton-pump': { title: 'ขับเคลื่อนปั๊มโปรตอน', eyebrow: 'CYTOCHROME b₆f · ความต่าง H⁺ ใน Lumen', copy: 'ปล่อยแรงดันเมื่อแถบพลังงานเข้าเขตเรืองแสงให้ครบ 4 รอบ เพื่อย้าย H⁺ จาก Stroma เข้าสู่ Lumen' },
    'pc-current': { title: 'ตามกระแสใน Lumen', eyebrow: 'PLASTOCYANIN · การส่งต่อ PC', copy: 'นำ Plastocyanin ผ่านช่องกระแส 4 จุดด้าน Lumen ไปยัง PSI' },
    mirror: { title: 'สะท้อนแสงเข้าสู่ PSI', eyebrow: 'PSI · รับโฟตอนเพื่อกระตุ้น P700', copy: 'หมุนกระจกให้แสงสะท้อนเข้าสู่ PSI สังเกตเส้นทางแสงและจุดรับที่เรืองแสง แล้วล็อกเมื่อแสงตกตรงเป้า' },
    'fd-launch': { title: 'ส่งอิเล็กตรอนด้วย Fd', eyebrow: 'FERREDOXIN · ส่งต่ออิเล็กตรอน', copy: 'สะสมพลังงาน แล้วปล่อยอิเล็กตรอนเมื่อเครื่องหมายอยู่ในช่วงส่งต่อ' },
    reagent: { title: 'ประกอบปฏิกิริยาใน FNR', eyebrow: 'FERREDOXIN–NADP⁺ REDUCTASE', copy: 'เลือก NADP⁺ รูปออกซิไดซ์ จากนั้นส่ง e⁻ 2 ตัวและ H⁺ เข้า FNR เพื่อสร้าง NADPH' },
    rings: { title: 'เชื่อมการทำงาน ATP synthase', eyebrow: 'แรงขับจากโปรตอน · วงแหวนล็อก 3 วง', copy: 'หมุนวงแหวนจนช่องทั้งสามตรงกัน จากนั้น H⁺ ใน Lumen จะไหลผ่านกังหัน' },
    calvin: { title: 'ส่งมอบผลิตภัณฑ์', eyebrow: 'CALVIN CYCLE · ส่งต่อพลังงาน', copy: 'ส่ง ATP และ NADPH จากปฏิกิริยาใช้แสงไปยัง Calvin Cycle ส่วน O₂ ถูกปล่อยออกจากระบบแล้ว' }
  };
  class MinigamePanel {
    constructor(element, eventBus) {
      this.element = element; this.eventBus = eventBus; this.current = null;
      element.addEventListener('click', event => {
        const button = event.target.closest('[data-action]');
        if (!button || button.disabled || button.dataset.action === 'mirror-aim') return;
        this.eventBus.emit('minigame:action', { action: button.dataset.action, value: button.dataset.value, index: Number(button.dataset.index) });
      });
      element.addEventListener('input', event => {
        if (!event.target.matches('[data-action="mirror-aim"]')) return;
        const angle = Number(event.target.value);
        if (!Number.isFinite(angle)) return;
        this.updateMirror(angle);
        this.eventBus.emit('minigame:action', { action: 'mirror-aim', value: angle });
      });
      window.addEventListener('keydown', event => {
        if (event.code !== 'Space' || this.current?.id !== 'water' || this.current.success) return;
        event.preventDefault(); this.eventBus.emit('minigame:action', { action: 'water-tap' });
      });
      eventBus.on('stage:leaving', () => this.hide());
      eventBus.on('game:reset', () => this.hide());
    }
    show(id, model = {}) { this.current = { id, model: id === 'mirror' ? {} : model, success: false }; this.element.hidden = false; this.element.closest('.game-shell')?.classList.add('station-mode'); this.render(id === 'mirror' ? { angle: model.angle ?? 20 } : undefined); }
    update(model) {
      if (!this.current || this.current.success) return;
      if (this.current.id === 'mirror') { this.updateMirror(model.angle); return; }
      this.current.model = model;
      if (this.current.id === 'water') {
        this.element.style.setProperty('--beat-progress', String(model.beatPhase || 0));
        const count = this.element.querySelector('[data-water-count]'); if (count) count.textContent = (model.hits || 0) + ' / ' + (model.total || 8);
        const taps = this.element.querySelector('.water-tap'); if (taps) taps.classList.toggle('in-window', Boolean(model.beatWindow));
      } else if (this.current.id === 'rings') {
        model.angles.forEach((angle, index) => {
          const dial = this.element.querySelector('[data-ring="' + index + '"]');
          if (dial) { dial.style.setProperty('--ring-angle', angle + 'deg'); dial.classList.toggle('aligned', model.aligned[index]); }
        });
        const status = this.element.querySelector('[data-ring-count]'); if (status) status.textContent = model.aligned.filter(Boolean).length + ' / 3 จัดแนวแล้ว';
        const engage = this.element.querySelector('[data-action="ring-engage"]'); if (engage) engage.disabled = !model.aligned.every(Boolean);
      } else if (this.current.id === 'pq-route' || this.current.id === 'pc-current') {
        this.element.querySelectorAll('[data-route-gate]').forEach((slot, index) => {
          slot.classList.toggle('passed', index < model.gate); slot.classList.toggle('current', index === model.gate);
        });
        const count = this.element.querySelector('[data-route-count]'); if (count) count.textContent = model.gate + ' / ' + model.safe.length + ' จุด';
        const carrier = this.element.querySelector('[data-route-carrier]');
        if (carrier) carrier.style.setProperty('--carrier-progress', (model.gate / Math.max(1, model.safe.length) * 100) + '%');
      } else if (this.current.id === 'proton-pump') {
        const count = this.element.querySelector('[data-pump-count]'); if (count) count.textContent = model.transferred + ' / ' + model.total + ' H⁺';
        this.element.querySelectorAll('[data-proton-chip]').forEach((chip, index) => chip.classList.toggle('transferred', index < model.transferred));
        const button = this.element.querySelector('[data-action="pump-pulse"]'); if (button) button.disabled = model.transferred >= model.total;
        const pressure = this.element.querySelector('.pump-pressure > i > b');
        if (pressure) pressure.style.left = (Math.max(0, Math.min(1, model.phase || 0)) * 100) + '%';
        const pulse = this.element.querySelector('[data-action="pump-pulse"]'); if (pulse) pulse.classList.toggle('pulse-window', Boolean(model.window));
      } else if (this.current.id === 'reagent') {
        this.element.querySelectorAll('[data-action="reagent-pick"]').forEach(button => {
          button.classList.toggle('selected', button.dataset.value === model.selected);
          button.disabled = Boolean(model.selected === 'nadp-plus');
        });
        const electrons = this.element.querySelector('[data-reagent-electrons]'); if (electrons) electrons.textContent = model.electrons + ' / 2 e⁻';
        const proton = this.element.querySelector('[data-reagent-proton]'); if (proton) proton.classList.toggle('loaded', Boolean(model.proton));
        const electronButton = this.element.querySelector('[data-action="reagent-electron"]'); if (electronButton) electronButton.disabled = !model.selected || model.electrons >= 2;
        const protonButton = this.element.querySelector('[data-action="reagent-proton"]'); if (protonButton) protonButton.disabled = !model.selected || model.electrons < 2 || model.proton;
        const synthesize = this.element.querySelector('[data-action="reagent-synthesize"]'); if (synthesize) synthesize.disabled = !model.selected || model.electrons < 2 || !model.proton;
      } else if (this.current.id === 'fd-launch') {
        this.element.style.setProperty('--fd-charge', String(model.charge || 0));
        this.element.style.setProperty('--fd-charge-pct', ((model.charge || 0) * 100) + '%');
        const count = this.element.querySelector('[data-fd-charge]'); if (count) count.textContent = Math.round((model.charge || 0) * 100) + '%';
        const button = this.element.querySelector('[data-action="fd-release"]'); if (button) button.disabled = model.charge < .64 || model.charge > .9;
        const start = this.element.querySelector('[data-action="fd-charge"]'); if (start) start.disabled = Boolean(model.charging);
      } else if (this.current.id === 'calvin') {
        ['atp', 'nadph'].forEach(product => {
          const slot = this.element.querySelector('[data-calvin="' + product + '"]');
          if (slot) slot.classList.toggle('loaded', Boolean(model[product]));
          const button = this.element.querySelector('[data-action="calvin-load"][data-value="' + product + '"]');
          if (button) button.disabled = Boolean(model[product]);
        });
      } else if (this.current.id === 'mirror') {
        this.updateMirror(model.angle ?? 20);
      }
    }
    updateMirror(angle) {
      angle = Number(angle);
      if (!Number.isFinite(angle)) return;
      angle = Math.max(20, Math.min(70, angle));
      const line = this.element.querySelector('[data-mirror-reflected]');
      const surface = this.element.querySelector('[data-mirror-surface]');
      const target = this.element.querySelector('[data-mirror-psi]');
      if (!line) return;
      const radians = (2 * Number(angle) - 90) * Math.PI / 180;
      const endY = 104 + Math.tan(radians) * 200;
      line.setAttribute('y2', String(endY));
      if (surface) surface.setAttribute('transform', 'rotate(' + angle + ' 80 104)');
      const error = Math.abs(Number(angle) - 45);
      if (target) { target.classList.toggle('near-hit', error <= 5); target.classList.toggle('on-target', error <= 2); }
      const slider = this.element.querySelector('[data-action="mirror-aim"]');
      if (slider && Number(slider.value) !== angle) slider.value = String(angle);
      this.element.style.setProperty('--mirror-angle', angle + 'deg');
      if (error <= 2) this.status('แสงตกตรงจุดรับ PSI · ล็อกเพื่อกระตุ้น P700', 'success');
      else if (error <= 9) this.status('แสงใกล้จุดรับ PSI แล้ว · ปรับอีกเล็กน้อย', 'neutral');
      else this.status(endY < 104 ? 'แสงสะท้อนสูงกว่าจุดรับ PSI' : 'แสงสะท้อนต่ำกว่าจุดรับ PSI', 'neutral');
    }
    lockMirror(angle) {
      const slider = this.element.querySelector('[data-action="mirror-aim"]');
      const lock = this.element.querySelector('[data-action="mirror-lock"]');
      this.updateMirror(angle);
      if (slider) slider.disabled = true;
      if (lock) lock.disabled = true;
    }
    mirrorChargePhase(phase) {
      this.element.dataset.mirrorPhase = phase;
      const status = {
        flash: 'โฟตอนชนจุดรับแล้ว · PSI กำลังตอบสนอง',
        ring: 'วงพลังงานกำลังกระจายผ่าน PSI',
        psi: 'P700 เรืองแสง · อิเล็กตรอนได้รับพลังงาน',
        electron: 'อิเล็กตรอนพลังงานสูงพร้อมส่งต่อไปยัง Fd'
      }[phase] || 'ถ่ายโอนพลังงานผ่าน PSI';
      this.status(status, 'success');
    }
    status(message, tone = 'neutral') {
      const line = this.element.querySelector('[data-game-status]');
      if (line) { line.textContent = message; line.dataset.tone = tone; }
    }
    success(title, copy, buttonLabel = 'ไปต่อ', buttonAction = 'panel-close') {
      if (!this.current) { this.element.hidden = false; this.current = { id: 'success', model: {}, success: true }; }
      this.element.closest('.game-shell')?.classList.add('station-mode');
      this.current.success = true;
      const button = buttonLabel ? '<button class="mini-button" type="button" data-action="' + buttonAction + '">' + buttonLabel + ' <span>↗</span></button>' : '';
      this.element.innerHTML = '<div class="minigame-card success-card"><div class="mini-eyebrow">บันทึกจุดพักแล้ว</div><h2>' + title + '</h2><p>' + copy + '</p><div class="success-glyph" aria-hidden="true">✓</div><div class="mini-status" data-game-status>ปลดล็อกเส้นทาง · กำลังเดินทางต่อ…</div>' + button + '</div>';
    }
    render(modelOverride) {
      if (!this.current) return;
      const id = this.current.id; const model = modelOverride || this.current.model || {}; const def = definitions[id];
      if (!def) return;
      let game = '';
      if (id === 'water') game = '<div class="water-track"><div class="water-orbit"><i></i><i></i><i></i><b>H₂O</b></div><div class="capture-band"></div><div class="beat-marker"></div></div><div class="mini-meter-row"><span>ถ่ายโอนพลังงานสู่ OEC</span><b data-water-count>0 / 8</b></div><button class="mini-button water-tap" type="button" data-action="water-tap">รับพลังงาน <span>SPACE</span></button>';
      if (id === 'pq-route' || id === 'pc-current') {
        const gates = model.safe.map((lane, index) => '<div class="route-gate" data-route-gate="' + index + '"><span class="route-branch ' + (lane < 0 ? 'safe-top' : 'safe-bottom') + '"></span><b>' + String(index + 1).padStart(2, '0') + '</b></div>').join('');
        const pc = id === 'pc-current'; const action = pc ? 'pc-lane' : 'route-lane';
        game = '<div class="carrier-route ' + (pc ? 'lumen-route' : '') + '"><div class="route-carrier" data-route-carrier><i></i><b>' + (pc ? 'PC' : 'e⁻') + '</b></div>' + gates + '</div><div class="mini-meter-row"><span>' + (pc ? 'กระแสใน Lumen' : 'ช่องรีดอกซ์') + '</span><b data-route-count>0 / ' + model.safe.length + ' จุด</b></div><div class="choice-row"><button class="mini-button" type="button" data-action="' + action + '" data-value="-1">' + (pc ? 'ย้อนกระแส' : 'ช่องบน') + ' <span>↑</span></button><button class="mini-button" type="button" data-action="' + action + '" data-value="1">' + (pc ? 'ตามกระแส' : 'ช่องล่าง') + ' <span>↓</span></button></div>';
      }
      if (id === 'proton-pump') game = '<div class="pump-display"><div class="pump-side"><small>STROMA</small><div class="pump-chips"><i data-proton-chip="0">H⁺</i><i data-proton-chip="1">H⁺</i><i data-proton-chip="2">H⁺</i><i data-proton-chip="3">H⁺</i></div></div><div class="pump-machine"><span>แรงดัน</span><b>↕</b><small>b₆f</small></div><div class="pump-side lumen"><small>LUMEN</small><div class="pump-chips"><i>H⁺</i><i>H⁺</i><i>H⁺</i><i>H⁺</i></div></div></div><div class="pump-pressure"><i><b></b></i><span>ปล่อยปั๊มในเขตแรงดันพร้อม</span></div><div class="mini-meter-row"><span>ย้ายโปรตอน</span><b data-pump-count>0 / 4 H⁺</b></div><button class="mini-button" type="button" data-action="pump-pulse">ปล่อยแรงดัน b₆f <span>↕</span></button>';
      if (id === 'mirror') game = '<div class="mirror-light-lab"><svg viewBox="0 0 320 205" role="img" aria-label="ลำแสงจากแหล่งกำเนิดสะท้อนผ่านกระจกเข้าสู่ PSI แล้วส่งอิเล็กตรอนไปยัง Fd"><defs><linearGradient id="mirrorBeam" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#fff1ac"/><stop offset="1" stop-color="#baffef"/></linearGradient></defs><circle class="light-source" cx="80" cy="21" r="10"/><text x="80" y="12" text-anchor="middle">แหล่งกำเนิดแสง</text><line class="mirror-incoming-ray" x1="80" y1="31" x2="80" y2="104"/><circle class="mirror-contact" cx="80" cy="104" r="4"/><line class="mirror-surface" data-mirror-surface x1="57" y1="104" x2="103" y2="104" transform="rotate(20 80 104)"/><line class="mirror-reflected-ray" data-mirror-reflected x1="80" y1="104" x2="280" y2="-134"/><circle class="psi-target-ring" data-mirror-psi cx="280" cy="104" r="22"/><circle class="energy-ring-wave" cx="280" cy="104" r="22"/><circle class="psi-target-core" cx="280" cy="104" r="10"/><text class="psi-label" x="280" y="139" text-anchor="middle">PSI · P700</text><path class="electron-path" d="M280 128 L280 166"/><circle class="charged-electron" cx="280" cy="128" r="4"/><circle class="fd-target" cx="280" cy="174" r="9"/><text class="fd-label" x="280" y="197" text-anchor="middle">Fd</text><text class="mirror-label" x="80" y="139" text-anchor="middle">MIRROR</text></svg><div class="mirror-legend"><span><i class="legend-photon"></i>เส้นทึบ · โฟตอน</span><span><i class="legend-electron"></i>เส้นประ · อิเล็กตรอน</span></div></div><label class="angle-control"><span>หมุนกระจกเพื่อเปลี่ยนทิศทางลำแสง</span><input type="range" min="20" max="70" value="' + (model.angle ?? 20) + '" data-action="mirror-aim" aria-label="หมุนกระจกเพื่อเล็งลำแสงให้เข้า PSI"></label><button class="mini-button" type="button" data-action="mirror-lock">ล็อกแนวแสงเมื่อถึง PSI <span>↗</span></button>';
      if (id === 'fd-launch') game = '<div class="fd-launcher"><div class="charge-scale"><i></i><b></b></div><div class="mini-meter-row"><span>พลังงานอิเล็กตรอน</span><b data-fd-charge>0%</b></div></div><div class="choice-row"><button class="mini-button" type="button" data-action="fd-charge">เริ่มสะสมพลังงาน <span>เริ่ม</span></button><button class="mini-button" type="button" data-action="fd-release" disabled>ส่งต่อไป FNR <span>↗</span></button></div><button class="mini-button secondary-mini" type="button" data-action="fd-reset">เริ่มสะสมใหม่ <span>↺</span></button>';
      if (id === 'reagent') game = '<div class="vial-rack">' + model.options.map(option => '<button class="vial-option" type="button" data-action="reagent-pick" data-value="' + option.id + '" aria-label="เลือก ' + option.formula + '"><i class="vial-glass"><b></b></i><span>' + option.formula + '</span></button>').join('') + '</div><div class="reagent-lab"><div class="reagent-reactor"><b>FNR</b><span>NADP⁺</span><i data-reagent-proton>H⁺</i><small data-reagent-electrons>0 / 2 e⁻</small></div><div class="reagent-actions"><button class="mini-button" type="button" data-action="reagent-electron" disabled>ส่งอิเล็กตรอน <span>e⁻</span></button><button class="mini-button" type="button" data-action="reagent-proton" disabled>เติมโปรตอน <span>H⁺</span></button></div></div><button class="mini-button reagent-synthesize" type="button" data-action="reagent-synthesize" disabled>ให้ FNR สร้าง NADPH <span>↗</span></button><div class="reagent-equation">NADP⁺ + 2e⁻ + H⁺ → NADPH</div>';
      if (id === 'rings') {
        const rings = [0, 1, 2].map(index => '<div class="ring-control"><button type="button" data-action="ring-turn" data-index="' + index + '" data-value="-1" aria-label="หมุนวงแหวน ' + (index + 1) + ' ทวนเข็มนาฬิกา">‹</button><div class="lock-dial" data-ring="' + index + '" style="--ring-angle:' + model.angles[index] + 'deg"><i></i><b>' + String(index + 1).padStart(2, '0') + '</b></div><button type="button" data-action="ring-turn" data-index="' + index + '" data-value="1" aria-label="หมุนวงแหวน ' + (index + 1) + ' ตามเข็มนาฬิกา">›</button></div>').join('');
        game = '<div class="ring-console">' + rings + '</div><div class="mini-meter-row"><span>ช่องเชื่อมพลังงาน</span><b data-ring-count>0 / 3 จัดแนวแล้ว</b></div><button class="mini-button" type="button" data-action="ring-engage" ' + (model.aligned.every(Boolean) ? '' : 'disabled') + '>เริ่มกังหัน <span>↗</span></button>';
      }
      if (id === 'calvin') game = '<div class="calvin-slots"><div class="calvin-slot" data-calvin="atp"><b>ATP</b><span>พลังงาน</span></div><div class="calvin-slot" data-calvin="nadph"><b>NADPH</b><span>พลังรีดิวซ์</span></div></div><div class="choice-row"><button class="mini-button" type="button" data-action="calvin-load" data-value="atp">ใส่ ATP <span>＋</span></button><button class="mini-button" type="button" data-action="calvin-load" data-value="nadph">ใส่ NADPH <span>＋</span></button></div>';
      this.element.innerHTML = '<div class="minigame-card"><button class="mini-close" type="button" data-action="panel-close" aria-label="ปิดหน้าสถานี">×</button><div class="mini-eyebrow">' + def.eyebrow + '</div><h2>' + def.title + '</h2><p>' + def.copy + '</p>' + game + '<div class="mini-status" data-game-status>รอการควบคุม</div></div>';
      this.element.style.setProperty('--beat-progress', String(model.beatPhase || 0));
      this.element.style.setProperty('--mirror-angle', (model.angle ?? -24) + 'deg');
      this.element.style.setProperty('--fd-charge', String(model.charge || 0));
      this.element.style.setProperty('--fd-charge-pct', ((model.charge || 0) * 100) + '%');
      if (id === 'mirror') this.updateMirror(model.angle ?? 20);
    }
    hide() { this.current = null; this.element.hidden = true; this.element.replaceChildren(); this.element.closest('.game-shell')?.classList.remove('station-mode'); }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.MinigamePanel = MinigamePanel;
})(window);
