(function (root) {
  const definitions = {
    water: { title: 'OEC · แตกตัวของน้ำ', eyebrow: 'PSII · สลายน้ำ', copy: 'กดรับพลังงานเมื่อเส้นผ่านช่องเรืองแสงให้ครบ 8 จังหวะ เพื่อเติมอิเล็กตรอนให้ PSII' },
    'pq-route': { title: 'จัดตำแหน่งแล้วผ่านช่อง PQ', eyebrow: 'PLASTOQUINONE · ถ่ายทอดรีดอกซ์', copy: 'ปรับเลนอิเล็กตรอนให้ตรงช่องเรืองแสง แล้วกดผ่านทีละช่องจนครบ 3 จุด' },
    'flight-align': { title: 'จัดตำแหน่งอิเล็กตรอน · Electron Flight', eyebrow: 'THYLAKOID · ALIGN & PASS', copy: 'ปรับเลนให้ตรงกับช่องเป้าหมาย แล้วกดผ่านเพื่อเดินทางต่อ' },
    'proton-pump': { title: 'ขับเคลื่อนปั๊มโปรตอน', eyebrow: 'CYTOCHROME b₆f · ความต่าง H⁺ ใน Lumen', copy: 'กดปล่อยแรงดันเมื่อแถบเข้าเขตเรืองแสงครบ 4 รอบ เพื่อย้าย H⁺ จาก Stroma เข้าสู่ Lumen' },
    'pc-current': { title: 'ตามช่องกระแสใน Lumen', eyebrow: 'PLASTOCYANIN · การส่งต่อ PC', copy: 'ดูช่องบนหรือล่างที่เปิด แล้วเลือกช่องให้ครบ 4 จุดเพื่อนำ PC ไปยัง PSI' },
    mirror: { title: 'สะท้อนแสงเข้าสู่ PSI', eyebrow: 'PSI · รับโฟตอนเพื่อกระตุ้น P700', copy: 'เลื่อนแถบมุมกระจกจนลำแสงสะท้อนเข้า PSI แล้วกดล็อกแนวแสง' },
    'fd-launch': { title: 'ส่งอิเล็กตรอนด้วย Fd', eyebrow: 'FERREDOXIN · ส่งต่ออิเล็กตรอน', copy: 'เริ่มสะสมพลังงาน แล้วกดส่งต่อเมื่อเครื่องหมายอยู่ในช่วงเรืองแสง 64–90%' },
    reagent: { title: 'ประกอบปฏิกิริยาใน FNR', eyebrow: 'FERREDOXIN–NADP⁺ REDUCTASE', copy: 'เลือก NADP⁺ จากนั้นส่ง e⁻ 2 ตัวและเติม H⁺ เพื่อสร้าง NADPH' },
    rings: { title: 'เชื่อมการทำงาน ATP synthase', eyebrow: 'แรงขับจากโปรตอน · วงแหวนล็อก 3 วง', copy: 'หมุนวงแหวนให้ช่องทั้งสามตรงกัน แล้วเริ่มกังหันให้ H⁺ ไหลผ่าน' },
    calvin: { title: 'ส่งมอบผลิตภัณฑ์', eyebrow: 'CALVIN CYCLE · ส่งต่อพลังงาน', copy: 'ใส่ ATP และ NADPH ที่สร้างได้ลงในช่องของ Calvin Cycle ให้ครบทั้งสองชนิด' }
  };
  const tutorials = {
    water: {
      goal: 'รับพลังงานตอนที่ตัวชี้ผ่านแถบสว่างให้ครบ 8 ครั้ง', controls: 'กด SPACE หรือคลิก “รับพลังงาน” · กดพลาดไม่เพิ่มจำนวน',
      steps: ['สังเกตแถบรับพลังงานที่เรืองแสง', 'กดรับพลังงานเมื่อเส้นตัวชี้อยู่ในแถบ', 'ทำซ้ำ 8 ครั้งเพื่อกระตุ้น OEC'],
    },
    'pq-route': {
      goal: 'เลื่อน e⁻ ไปเลนของช่องเป้าหมาย แล้วกดผ่านทีละช่องให้ครบ 3 จุด', controls: '↑ / ↓ ปรับเลน · SPACE ผ่านช่อง · คลิกปุ่มบนจอได้',
      steps: ['ตัวชี้เริ่มที่ตำแหน่งอิเล็กตรอน', 'ช่องเรืองแสงบอกเลนเป้าหมายปัจจุบัน', 'กด ↑ หรือ ↓ เพื่อจัดตำแหน่ง', 'อิเล็กตรอนขยับไปยังเลนนั้น', 'กด SPACE เพื่อผ่านช่อง', 'เมื่อผ่านแล้ว เป้าหมายถัดไปจะสว่าง', 'กด “เริ่มเล่น” เพื่อควบคุมเส้นทางจริง'],
    },
    'flight-align': {
      goal: 'ขยับอิเล็กตรอนไปยังเลนของช่องเรืองแสง แล้วกดผ่านเพื่อไปยังช่องถัดไป', controls: 'กด ↑ / ↓ หรือปุ่มบนจอเพื่อปรับตำแหน่ง · กด SPACE, แตะฉาก หรือ “ผ่านช่อง” เมื่อถึงช่อง',
      steps: ['ดูอิเล็กตรอนของผู้เล่นบนฉากจริง', 'ช่องสว่างบอกเลนเป้าหมายปัจจุบัน', 'กด ↑ หรือ ↓ เพื่อปรับตำแหน่งให้ตรงเลน', 'อิเล็กตรอนจัดตำแหน่งตรงกับช่อง', 'กด SPACE หรือแตะฉากเพื่อผ่านช่อง', 'ช่องถัดไปสว่างให้เห็นล่วงหน้า', 'กด “เริ่มเล่น” แล้วควบคุมเส้นทางด้วยตนเอง'],
    },
    'proton-pump': {
      goal: 'จับจังหวะในช่องแรงดันพร้อม แล้วส่ง H⁺ จาก Stroma เข้า Lumen 4 ครั้ง', controls: 'คลิก “ปล่อยแรงดัน b₆f” เมื่อแถบอยู่ในช่องสว่าง · กดพลาดไม่เพิ่มจำนวน',
      steps: ['ดูแถบแรงดันที่กำลังเคลื่อน', 'รอให้ตัวชี้เข้าช่องเรืองแสง', 'กดปล่อยแรงดันเพื่อย้าย H⁺', 'ทำซ้ำจนครบ 4 โปรตอน'],
    },
    'pc-current': {
      goal: 'เลือกช่องบนหรือล่างตามสัญญาณในแต่ละจุด เพื่อนำ PC ผ่านกระแสครบ 4 จุด', controls: 'คลิก “ช่องบน” หรือ “ช่องล่าง” ตามช่องเรืองแสง · หากเลือกผิด เส้นทางจะเริ่มใหม่',
      steps: ['สังเกตช่องเรืองแสงถัดไปบนเส้นทาง', 'คลิกปุ่มช่องบนหรือล่างให้ตรงกัน', 'PC จะเคลื่อนไปยังจุดถัดไป', 'ทำให้ครบ 4 จุดจนถึง PSI'],
    },
    mirror: {
      goal: 'ปรับมุมให้ลำแสงสะท้อนชนจุดรับ PSI แล้วล็อก', controls: 'ลากแถบมุมมอง หรือโฟกัสแถบแล้วใช้ ← / → · คลิกล็อกเมื่อวงรับ PSI สว่าง',
      steps: ['ดูเส้นทางลำแสงที่เปลี่ยนตามมุมกระจก', 'ปรับจนแสงชนวงรับ PSI', 'กดล็อกเพื่อกระตุ้น P700', 'อิเล็กตรอนพลังงานสูงส่งต่อไปยัง Fd'],
    },
    'fd-launch': {
      goal: 'เริ่มสะสม แล้วส่งอิเล็กตรอนเมื่อพลังงานอยู่ในช่วง 64–90%', controls: 'คลิกเริ่มสะสม แล้วคลิกส่งต่อในช่วงเรืองแสง · หากเกิน 90% ให้เริ่มใหม่',
      steps: ['กดเริ่มสะสมพลังงาน', 'ดูตัวชี้บนแถบชาร์จ', 'กดส่งต่อเมื่ออยู่ในช่วงสว่าง', 'หากแถบเกินช่วง ให้ล้างประจุและเริ่มใหม่'],
    },
    reagent: {
      goal: 'เลือก NADP⁺ แล้วเติม e⁻ 2 ตัวและ H⁺ เพื่อสร้าง NADPH', controls: 'คลิกสารและปุ่มส่ง e⁻ / เติม H⁺ / สังเคราะห์ตามลำดับ',
      steps: ['เลือกตัวรับ NADP⁺', 'ส่งอิเล็กตรอนให้ครบ 2 ตัว', 'เติม H⁺ หนึ่งตัว', 'ให้ FNR สร้าง NADPH'],
    },
    rings: {
      goal: 'เมื่อมี H⁺ ใน Lumen อย่างน้อย 8 ตัว ให้หมุนวงแหวนทั้งสามให้ตรงแล้วเริ่ม ATP synthase', controls: 'คลิก ‹ / › ที่แต่ละวง แล้วคลิก “เริ่มกังหัน”',
      steps: ['ตรวจว่ามี H⁺ ใน Lumen อย่างน้อย 8 ตัว', 'หมุนวงแหวนจนช่องทั้งสามตรงกัน', 'คลิกเริ่มกังหันให้ H⁺ ไหลกลับ 4 ตัว', 'เมื่อโปรตอนไหลครบ ระบบสร้าง ATP'],
    },
    calvin: {
      goal: 'ส่ง ATP และ NADPH ที่มีอยู่ไปยัง Calvin Cycle ให้ครบสองช่อง', controls: 'คลิก “ใส่ ATP” และ “ใส่ NADPH”',
      steps: ['คลิกใส่ ATP เพื่อส่งพลังงาน', 'คลิกใส่ NADPH เพื่อส่งพลังรีดิวซ์', 'ตรวจดูว่าทั้งสองช่องถูกเติมแล้ว', 'Calvin Cycle รับผลิตภัณฑ์ครบ'],
    }
  };
  const tutorialsSeenThisSession = new Set();
  const tutorialSeen = id => tutorialsSeenThisSession.has(id) || (() => {
    try { return root.localStorage.getItem('lr-tutorial-v1-' + id) === 'seen'; } catch (_) { return false; }
  })();
  const markTutorialSeen = id => { tutorialsSeenThisSession.add(id); try { root.localStorage.setItem('lr-tutorial-v1-' + id, 'seen'); } catch (_) {} };

  class MinigamePanel {
    constructor(element, eventBus) {
      this.element = element; this.eventBus = eventBus; this.current = null;
      element.addEventListener('click', event => {
        const tutorialButton = event.target.closest('[data-tutorial-action]');
        if (tutorialButton) {
          const action = tutorialButton.dataset.tutorialAction;
          if (action === 'help') this.eventBus.emit('minigame:tutorial-request', { id: this.current?.id || null });
          else if (action === 'replay') this.replayTutorial();
          else this.dismissTutorial(action === 'skip');
          return;
        }
        const button = event.target.closest('[data-action]');
        if (!button || button.disabled || button.dataset.action === 'mirror-aim') return;
        this.eventBus.emit('minigame:action', { action: button.dataset.action, value: button.dataset.value, index: Number(button.dataset.index) });
      });
      element.addEventListener('input', event => {
        if (!event.target.matches('[data-action="mirror-aim"]') || this.isTutorialActive) return;
        const angle = Number(event.target.value);
        if (!Number.isFinite(angle)) return;
        this.updateMirror(angle);
        this.eventBus.emit('minigame:action', { action: 'mirror-aim', value: angle });
      });
      window.addEventListener('keydown', event => this.onKeyDown(event), true);
      eventBus.on('stage:leaving', () => this.hide());
      eventBus.on('game:reset', () => this.hide());
    }
    get isTutorialActive() { return Boolean(this.current?.tutorialActive); }
    hasUnseenTutorial(id) { return Boolean(tutorials[id] && !tutorialSeen(id)); }
    openTutorial() {
      if (!this.current || this.current.success || this.current.tutorialActive || !tutorials[this.current.id]) return false;
      this.current.tutorialActive = true; this.element.classList.add('tutorial-active');
      this.render();
      this.element.querySelector('[data-tutorial-action="play"]')?.focus({ preventScroll: true });
      return true;
    }
    replayTutorial() {
      if (!this.isTutorialActive) return;
      this.render();
    }
    onKeyDown(event) {
      if (event.defaultPrevented || this.current?.success || this.isTutorialActive) return;
      if (this.current?.id === 'water' && event.code === 'Space') {
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat) this.eventBus.emit('minigame:action', { action: 'water-tap' });
        return;
      }
      if (!['pq-route', 'flight-align'].includes(this.current?.id)) return;
      if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat && this.current.id === 'pq-route') this.eventBus.emit('minigame:action', { action: 'route-lane', value: event.code === 'ArrowUp' ? -1 : 1 });
      } else if (event.code === 'Space') {
        event.preventDefault(); event.stopPropagation();
        if (!event.repeat && this.current.id === 'pq-route') this.eventBus.emit('minigame:action', { action: 'route-pass' });
      }
    }
    dismissTutorial(skipped) {
      if (!this.isTutorialActive) return;
      const id = this.current.id;
      this.current.tutorialActive = false; markTutorialSeen(id);
      this.element.querySelector('.mini-tutorial')?.remove();
      this.element.classList.remove('tutorial-active');
      const window = this.element.querySelector('.minigame-window');
      window?.removeAttribute('inert'); window?.removeAttribute('aria-hidden');
      this.element.querySelector('.minigame-card')?.removeAttribute('data-tutorial-id');
      this.element.querySelector('.minigame-card')?.removeAttribute('data-tutorial-stage');
      this.status(skipped ? 'ข้ามคำแนะนำแล้ว · เริ่มเล่นได้เลย' : 'พร้อมแล้ว · เริ่มควบคุมมินิเกม', 'success');
      if (id !== 'flight-align') this.element.querySelector('.minigame-card [data-action]:not([data-action="panel-close"]):not(:disabled)')?.focus({ preventScroll: true });
      this.eventBus.emit('minigame:tutorial-dismissed', { id, skipped });
      if (id === 'flight-align') document.getElementById('world')?.focus({ preventScroll: true });
    }
    show(id, model = {}, options = {}) {
      this.current = { id, model: id === 'mirror' ? {} : model, success: false, tutorialActive: Boolean(tutorials[id] && (options.forceTutorial || !tutorialSeen(id))) };
      this.element.hidden = false;
      this.element.dataset.minigame = id;
      const shell = this.element.closest('.game-shell');
      if (id === 'flight-align') shell?.classList.remove('station-mode');
      else shell?.classList.add('station-mode');
      this.element.classList.toggle('tutorial-active', this.current.tutorialActive);
      this.render(id === 'mirror' ? { angle: model.angle ?? 20 } : undefined);
    }
    update(model) {
      if (!this.current || this.current.success) return;
      if (this.current.id === 'mirror') { this.updateMirror(model.angle); return; }
      this.current.model = model;
      if (this.current.id === 'water') {
        this.element.style.setProperty('--beat-progress', String(model.beatPhase || 0));
        const count = this.element.querySelector('[data-water-count]'); if (count) count.textContent = (model.hits || 0) + ' / ' + (model.total || 8);
        const taps = this.element.querySelector('.water-tap'); if (taps) taps.classList.toggle('in-window', Boolean(model.beatWindow));
      } else if (this.current.id === 'rings') {
        this.updateRings(model);
      } else if (this.current.id === 'pq-route' || this.current.id === 'pc-current') {
        this.element.querySelectorAll('[data-route-gate]').forEach((slot, index) => {
          slot.classList.toggle('passed', index < model.gate);
          slot.classList.toggle('current', index === model.gate);
          slot.classList.toggle('next-target', index === model.gate + 1);
        });
        const count = this.element.querySelector('[data-route-count]'); if (count) count.textContent = model.gate + ' / ' + model.safe.length + (this.current.id === 'pc-current' ? ' จุด' : ' ช่อง');
        const carrier = this.element.querySelector('[data-route-carrier]');
        if (carrier) {
          const progress = model.gate >= model.safe.length ? 100 : (model.gate + .5) / Math.max(1, model.safe.length) * 100;
          carrier.style.setProperty('--carrier-progress', progress + '%');
          if (this.current.id === 'pq-route') carrier.style.setProperty('--carrier-y', model.lane === 0 ? '48px' : model.lane < 0 ? '24px' : '72px');
        }
        const laneLabel = this.element.querySelector('[data-current-lane]');
        if (laneLabel && this.current.id === 'pq-route') laneLabel.textContent = model.lane === 0 ? 'กลาง' : model.lane < 0 ? 'บน' : 'ล่าง';
        this.element.querySelectorAll('[data-route-lane-option]').forEach(button => button.classList.toggle('selected', Number(button.dataset.routeLaneOption) === model.lane));
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
    routePassed() {
      const carrier = this.element.querySelector('[data-route-carrier]');
      if (!carrier) return;
      carrier.classList.remove('is-passing'); void carrier.offsetWidth; carrier.classList.add('is-passing');
    }
    updateRings(model) {
      const aligned = model.aligned || [];
      (model.angles || []).forEach((angle, index) => {
        const dial = this.element.querySelector('[data-ring="' + index + '"]');
        if (dial) { dial.style.setProperty('--ring-angle', angle + 'deg'); dial.classList.toggle('aligned', Boolean(aligned[index])); }
      });
      const count = this.element.querySelector('[data-ring-count]');
      if (count) count.textContent = aligned.filter(Boolean).length + ' / 3 จัดแนวแล้ว';
      const engage = this.element.querySelector('[data-action="ring-engage"]');
      if (engage) engage.disabled = !aligned.every(Boolean);
    }
    lockMirror(angle) {
      const slider = this.element.querySelector('[data-action="mirror-aim"]');
      const lock = this.element.querySelector('[data-action="mirror-lock"]');
      this.updateMirror(angle);
      if (slider) slider.disabled = true;
      if (lock) lock.disabled = true;
    }
    status(message, tone = 'neutral') {
      const line = this.element.querySelector('[data-game-status]');
      if (line) { line.textContent = message; line.dataset.tone = tone; }
    }
    ringGameMarkup(model) {
      const angles = model.angles || [];
      const aligned = model.aligned || [];
      const rings = angles.map((angle, index) => {
        return '<div class="ring-control"><button type="button" data-action="ring-turn" data-index="' + index + '" data-value="-1" aria-label="หมุนวงแหวน ' + (index + 1) + ' ทวนเข็มนาฬิกา">‹</button><div class="lock-dial' + (aligned[index] ? ' aligned' : '') + '" data-ring="' + index + '" style="--ring-angle:' + angle + 'deg"><i></i><b>' + String(index + 1).padStart(2, '0') + '</b></div><button type="button" data-action="ring-turn" data-index="' + index + '" data-value="1" aria-label="หมุนวงแหวน ' + (index + 1) + ' ตามเข็มนาฬิกา">›</button></div>';
      }).join('');
      return '<div class="ring-console">' + rings + '</div><div class="mini-meter-row"><span>ช่องเชื่อมพลังงาน</span><b data-ring-count>' + aligned.filter(Boolean).length + ' / 3 จัดแนวแล้ว</b></div><button class="mini-button" type="button" data-action="ring-engage"' + (aligned.every(Boolean) ? '' : ' disabled') + '>เริ่มกังหัน <span>↗</span></button>';
    }
    tutorialMarkup(id) {
      const guide = tutorials[id]; if (!guide) return '';
      const steps = guide.steps.map((step, index) => '<li style="--step:' + index + ';animation-delay:-' + (index * .8) + 's"><span>' + String(index + 1).padStart(2, '0') + '</span>' + step + '</li>').join('');
      const duration = Math.max(5.6, guide.steps.length * .8) + 's';
      const context = id === 'flight-align' ? 'ฉาก Electron Flight ด้านหลังเป็นสนามและเป้าหมายจริง' : 'หน้าต่างเกมด้านบนใช้ตำแหน่ง วัตถุ และปุ่มควบคุมจริง';
      return '<section class="mini-tutorial" role="dialog" aria-modal="true" aria-label="วิธีเล่น ' + definitions[id].title + '"><button class="tutorial-close" type="button" data-tutorial-action="close" aria-label="ปิดคำแนะนำ">×</button><div class="tutorial-heading"><span>คู่มือการทดลอง · ' + definitions[id].eyebrow + '</span><h3>' + definitions[id].title + '</h3><p>' + guide.goal + '</p></div><p class="tutorial-context">' + context + '</p><ol class="tutorial-steps" style="--step-count:' + guide.steps.length + ';--step-duration:' + duration + '">' + steps + '</ol><p class="tutorial-controls"><b>การควบคุมจริง</b> · ' + guide.controls + '</p><div class="tutorial-actions"><button class="tutorial-play" type="button" data-tutorial-action="play">เริ่มเล่น <span>↗</span></button><button class="tutorial-skip" type="button" data-tutorial-action="skip">ข้าม</button><button class="tutorial-replay" type="button" data-tutorial-action="replay">ดูคำแนะนำซ้ำ</button></div></section>';
    }
    ending({ completed, total, products }) {
      const availableProducts = products.join(' · ');
      this.current = { id: 'ending', model: {}, success: true, tutorialActive: false };
      this.element.hidden = false;
      this.element.removeAttribute('data-minigame');
      const shell = this.element.closest('.game-shell');
      shell?.classList.add('station-mode', 'ending-mode');
      this.element.innerHTML = '<div class="ending-card" role="dialog" aria-modal="true" aria-labelledby="ending-title"><div class="ending-eyebrow">LIGHT REACTION · JOURNEY COMPLETE</div><div class="ending-glyph" aria-hidden="true"><i>e⁻</i><span>✓</span></div><h2 id="ending-title">จบการเดินทางของอิเล็กตรอนแล้ว!</h2><p>ATP และ NADPH ถึง Calvin Cycle แล้ว ส่วน O₂ ถูกปล่อยหลังการแตกตัวของน้ำ</p><div class="ending-results"><span>จุดชีววิทยาที่ผ่าน <b>' + completed + ' / ' + total + '</b></span><span>ผลิตภัณฑ์ที่เกมบันทึก <b>' + availableProducts + '</b></span></div><section class="learning-summary" aria-labelledby="learning-summary-title"><h3 id="learning-summary-title">สรุปสิ่งที่ได้เรียนรู้</h3><ol><li><b>PSII · OEC:</b> พลังงานแสงช่วยให้การแตกตัวของน้ำทดแทน e⁻ ให้ PSII พร้อมได้ 4H⁺ และปล่อย O₂</li><li><b>สายพาอิเล็กตรอน:</b> e⁻ เคลื่อนจาก PSII ผ่าน PQ, Cytochrome b₆f และ PC ไป PSI; b₆f ปั๊ม H⁺ อีก 4 ตัวเข้า Lumen</li><li><b>PSI · Fd · FNR:</b> แสงกระตุ้น e⁻ อีกครั้ง แล้ว FNR ใช้ NADP⁺, 2e⁻ และ H⁺ เพื่อสร้าง NADPH</li><li><b>ATP synthase:</b> H⁺ ไหลจาก Lumen กลับสู่ Stroma และขับการสร้าง ATP จาก ADP + Pi</li></ol><p><b>ผลิตภัณฑ์และการเชื่อมต่อ:</b> ปฏิกิริยาใช้แสงปล่อย O₂, เก็บพลังงานใน ATP และส่งพลังรีดิวซ์ด้วย NADPH; Calvin cycle ใช้ ATP กับ NADPH ช่วยสร้างคาร์โบไฮเดรต เกมนี้จบที่การส่ง ATP และ NADPH ให้ Calvin cycle โดยไม่ได้จำลองการสร้างน้ำตาล</p></section><div class="ending-actions"><button class="mini-button ending-restart" type="button" data-action="panel-restart">เล่นอีกครั้ง <span>↺</span></button><button class="mini-button ending-menu" type="button" data-action="panel-menu">กลับเมนูหลัก <span>⌂</span></button></div></div>';
    }
    success(title, copy, buttonLabel = 'ไปต่อ', buttonAction = 'panel-close') {
      if (!this.current) { this.element.hidden = false; this.current = { id: 'success', model: {}, success: true }; }
      this.element.closest('.game-shell')?.classList.add('station-mode');
      this.current.success = true;
      const button = buttonLabel ? '<button class="mini-button" type="button" data-action="' + buttonAction + '">' + buttonLabel + ' <span>↗</span></button>' : '';
      this.element.innerHTML = '<div class="minigame-card success-card"><div class="mini-eyebrow">บันทึกจุดพักแล้ว</div><h2>' + title + '</h2><p>' + copy + '</p><div class="success-glyph" aria-hidden="true">✓</div><div class="mini-status" data-game-status>ปลดล็อกเส้นทาง · กำลังเดินทางต่อ…</div>' + button + '</div>';
    }
    gameMarkup(id, model) {
      let game = '';
      if (id === 'water') game = '<div class="water-track"><div class="water-orbit"><i></i><i></i><i></i><b>H₂O</b></div><div class="capture-band"></div><div class="beat-marker"></div></div><div class="mini-meter-row"><span>ถ่ายโอนพลังงานสู่ OEC</span><b data-water-count>' + (model.hits || 0) + ' / ' + (model.total || 8) + '</b></div><button class="mini-button water-tap" type="button" data-action="water-tap">รับพลังงาน <span>SPACE</span></button>';
      if (id === 'pq-route' || id === 'pc-current') {
        const gates = model.safe.map((lane, index) => '<div class="route-gate' + (index === model.gate ? ' current' : '') + (index === model.gate + 1 ? ' next-target' : '') + '" data-route-gate="' + index + '"><span class="route-branch ' + (lane < 0 ? 'safe-top' : 'safe-bottom') + '"></span><b>' + String(index + 1).padStart(2, '0') + '</b></div>').join('');
        const pc = id === 'pc-current';
        const buttons = pc
          ? '<div class="choice-row"><button class="mini-button" type="button" data-action="pc-lane" data-value="-1">ช่องบน <span>↑</span></button><button class="mini-button" type="button" data-action="pc-lane" data-value="1">ช่องล่าง <span>↓</span></button></div>'
          : '<div class="route-readout">เลนอิเล็กตรอน <b data-current-lane>' + (model.lane === 0 ? 'กลาง' : model.lane < 0 ? 'บน' : 'ล่าง') + '</b> <span>·</span> เป้าหมายถัดไปสว่างล่วงหน้า</div><div class="choice-row route-lane-controls"><button class="mini-button' + (model.lane < 0 ? ' selected' : '') + '" type="button" data-action="route-lane" data-value="-1" data-route-lane-option="-1">เลนบน <span>↑</span></button><button class="mini-button' + (model.lane > 0 ? ' selected' : '') + '" type="button" data-action="route-lane" data-value="1" data-route-lane-option="1">เลนล่าง <span>↓</span></button></div><button class="mini-button route-pass" type="button" data-action="route-pass">ผ่านช่อง <span>SPACE</span></button>';
        game = '<div class="carrier-route ' + (pc ? 'lumen-route' : 'align-route') + '"><div class="route-lanes" aria-hidden="true"><i></i><i></i></div><div class="route-carrier" data-route-carrier style="--carrier-progress:' + ((model.gate + .5) / model.safe.length * 100) + '%"><i></i><b>' + (pc ? 'PC' : 'e⁻') + '</b></div>' + gates + '</div><div class="mini-meter-row"><span>' + (pc ? 'ช่องในกระแส Lumen' : 'ช่องที่ผ่านแล้ว') + '</span><b data-route-count>' + model.gate + ' / ' + model.safe.length + (pc ? ' จุด' : ' ช่อง') + '</b></div>' + buttons;
      }
      if (id === 'proton-pump') game = '<div class="pump-display"><div class="pump-side"><small>STROMA</small><div class="pump-chips"><i data-proton-chip="0">H⁺</i><i data-proton-chip="1">H⁺</i><i data-proton-chip="2">H⁺</i><i data-proton-chip="3">H⁺</i></div></div><div class="pump-machine"><span>แรงดัน</span><b>↕</b><small>b₆f</small></div><div class="pump-side lumen"><small>LUMEN</small><div class="pump-chips"><i>H⁺</i><i>H⁺</i><i>H⁺</i><i>H⁺</i></div></div></div><div class="pump-pressure"><i><b></b></i><span>ปล่อยปั๊มในเขตแรงดันพร้อม</span></div><div class="mini-meter-row"><span>ย้ายโปรตอน</span><b data-pump-count>' + model.transferred + ' / ' + model.total + ' H⁺</b></div><button class="mini-button' + (model.window ? ' pulse-window' : '') + '" type="button" data-action="pump-pulse">ปล่อยแรงดัน b₆f <span>↕</span></button>';
      if (id === 'mirror') game = '<div class="mirror-light-lab"><svg viewBox="0 0 320 205" role="img" aria-label="ลำแสงจากแหล่งกำเนิดสะท้อนผ่านกระจกเข้าสู่ PSI แล้วส่งอิเล็กตรอนไปยัง Fd"><defs><linearGradient id="mirrorBeam" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#fff1ac"/><stop offset="1" stop-color="#baffef"/></linearGradient></defs><circle class="light-source" cx="80" cy="21" r="10"/><text x="80" y="12" text-anchor="middle">แหล่งกำเนิดแสง</text><line class="mirror-incoming-ray" x1="80" y1="31" x2="80" y2="104"/><circle class="mirror-contact" cx="80" cy="104" r="4"/><line class="mirror-surface" data-mirror-surface x1="57" y1="104" x2="103" y2="104" transform="rotate(' + Number(model.angle ?? 20) + ' 80 104)"/><line class="mirror-reflected-ray" data-mirror-reflected x1="80" y1="104" x2="280" y2="' + (104 + Math.tan((2 * Number(model.angle ?? 20) - 90) * Math.PI / 180) * 200) + '"/><circle class="psi-target-ring" data-mirror-psi cx="280" cy="104" r="22"/><circle class="psi-target-core" cx="280" cy="104" r="10"/><text class="psi-label" x="280" y="139" text-anchor="middle">PSI · P700</text><path class="electron-path" d="M280 128 L280 166"/><circle class="fd-target" cx="280" cy="174" r="9"/><text class="fd-label" x="280" y="197" text-anchor="middle">Fd</text><text class="mirror-label" x="80" y="139" text-anchor="middle">MIRROR</text></svg><div class="mirror-legend"><span><i class="legend-photon"></i>เส้นทึบ · โฟตอน</span><span><i class="legend-electron"></i>เส้นประ · อิเล็กตรอน</span></div></div><label class="angle-control"><span>หมุนกระจกเพื่อเปลี่ยนทิศทางลำแสง</span><input type="range" min="20" max="70" value="' + (model.angle ?? 20) + '" data-action="mirror-aim" aria-label="หมุนกระจกเพื่อเล็งลำแสงให้เข้า PSI"></label><button class="mini-button" type="button" data-action="mirror-lock">ล็อกแนวแสงเมื่อถึง PSI <span>↗</span></button>';
      if (id === 'fd-launch') game = '<div class="fd-launcher"><div class="charge-scale"><i></i><b style="transform:scaleX(' + (model.charge || 0) + ')"></b></div><div class="mini-meter-row"><span>พลังงานอิเล็กตรอน</span><b data-fd-charge>' + Math.round((model.charge || 0) * 100) + '%</b></div></div><div class="choice-row"><button class="mini-button" type="button" data-action="fd-charge">เริ่มสะสมพลังงาน <span>เริ่ม</span></button><button class="mini-button" type="button" data-action="fd-release"' + (model.charge < .64 || model.charge > .9 ? ' disabled' : '') + '>ส่งต่อไป FNR <span>↗</span></button></div><button class="mini-button secondary-mini" type="button" data-action="fd-reset">เริ่มสะสมใหม่ <span>↺</span></button>';
      if (id === 'reagent') game = '<div class="vial-rack">' + model.options.map(option => '<button class="vial-option' + (option.id === model.selected ? ' selected' : '') + '" type="button" data-action="reagent-pick" data-value="' + option.id + '" aria-label="เลือก ' + option.formula + '"><i class="vial-glass"><b></b></i><span>' + option.formula + '</span></button>').join('') + '</div><div class="reagent-lab"><div class="reagent-reactor"><b>FNR</b><span>NADP⁺</span><i data-reagent-proton' + (model.proton ? ' class="loaded"' : '') + '>H⁺</i><small data-reagent-electrons>' + model.electrons + ' / 2 e⁻</small></div><div class="reagent-actions"><button class="mini-button" type="button" data-action="reagent-electron"' + (!model.selected || model.electrons >= 2 ? ' disabled' : '') + '>ส่งอิเล็กตรอน <span>e⁻</span></button><button class="mini-button" type="button" data-action="reagent-proton"' + (!model.selected || model.electrons < 2 || model.proton ? ' disabled' : '') + '>เติมโปรตอน <span>H⁺</span></button></div></div><button class="mini-button reagent-synthesize" type="button" data-action="reagent-synthesize"' + (!model.selected || model.electrons < 2 || !model.proton ? ' disabled' : '') + '>ให้ FNR สร้าง NADPH <span>↗</span></button><div class="reagent-equation">NADP⁺ + 2e⁻ + H⁺ → NADPH</div>';
      if (id === 'rings') game = this.ringGameMarkup(model);
      if (id === 'calvin') game = '<div class="calvin-slots"><div class="calvin-slot' + (model.atp ? ' loaded' : '') + '" data-calvin="atp"><b>ATP</b><span>พลังงาน</span></div><div class="calvin-slot' + (model.nadph ? ' loaded' : '') + '" data-calvin="nadph"><b>NADPH</b><span>พลังรีดิวซ์</span></div></div><div class="choice-row"><button class="mini-button" type="button" data-action="calvin-load" data-value="atp"' + (model.atp ? ' disabled' : '') + '>ใส่ ATP <span>＋</span></button><button class="mini-button" type="button" data-action="calvin-load" data-value="nadph"' + (model.nadph ? ' disabled' : '') + '>ใส่ NADPH <span>＋</span></button></div>';
      return game;
    }
    render(modelOverride) {
      if (!this.current) return;
      const id = this.current.id; const model = modelOverride || this.current.model || {}; const def = definitions[id];
      if (!def) return;
      const game = this.gameMarkup(id, model);
      const tutorialActive = this.current.tutorialActive;
      const isFlight = id === 'flight-align';
      const tutorialAttrs = tutorialActive ? ' data-tutorial-id="' + id + '"' : '';
      const windowMarkup = isFlight ? '' : '<div class="minigame-window"' + (tutorialActive ? ' inert aria-hidden="true"' : '') + '>' + game + '</div>';
      this.element.innerHTML = '<div class="minigame-card"' + tutorialAttrs + '><button class="mini-help" type="button" data-tutorial-action="help" aria-label="เปิดวิธีเล่น">?</button><button class="mini-close" type="button" data-action="panel-close" aria-label="ปิดหน้าสถานี">×</button><div class="mini-eyebrow">' + def.eyebrow + '</div><h2>' + def.title + '</h2><p>' + def.copy + '</p>' + windowMarkup + '<div class="mini-status" data-game-status>รอการควบคุม</div></div>' + (tutorialActive ? this.tutorialMarkup(id) : '');
      this.element.style.setProperty('--beat-progress', String(model.beatPhase || 0));
      this.element.style.setProperty('--mirror-angle', (model.angle ?? -24) + 'deg');
      this.element.style.setProperty('--fd-charge', String(model.charge || 0));
      this.element.style.setProperty('--fd-charge-pct', ((model.charge || 0) * 100) + '%');
      this.update(model);
      if (id === 'rings') this.updateRings(model);
      if (this.current.tutorialActive) this.element.querySelector('[data-tutorial-action="play"]')?.focus({ preventScroll: true });
    }
    hide() { this.current = null; this.element.hidden = true; this.element.replaceChildren(); this.element.removeAttribute('data-minigame'); this.element.closest('.game-shell')?.classList.remove('station-mode', 'ending-mode'); }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.MinigamePanel = MinigamePanel;
})(window);
