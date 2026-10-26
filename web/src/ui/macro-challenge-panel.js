(function (root) {
  const titles = {
    cell: ['ทางแยก', 'เซลล์พืช'], chloroplast: ['ทางเข้า', 'Chloroplast'],
    granum: ['ช่อง Thylakoid', 'Granum'], thylakoid: ['สมดุลพลังงาน', 'Thylakoid']
  };
  const tutorials = {
    cell: { goal: 'จัด e⁻ ให้อยู่เลนที่สว่าง แล้วกดผ่านทางแยกได้ทันทีเมื่ออยู่ตรงช่อง', controls: 'คลิกปุ่มขยับขึ้น / ขยับลง แล้วคลิกผ่านช่อง', steps: ['ดูว่าเลนใดสว่างเป็นเป้าหมาย', 'ขยับอิเล็กตรอนให้ตรงเลนนั้น', 'กดผ่านช่องเพื่อเดินทางต่อทันที', 'ทำซ้ำตามเป้าหมายจนครบ 4 รอบ'] },
    chloroplast: { goal: 'เลือกทาง A, B หรือ C ที่สว่างตรงกับสัญญาณแสง', controls: 'คลิกปุ่มทาง A / ทาง B / ทาง C', steps: ['ติดตามสัญญาณแสงไปยังช่องทางเข้า', 'ดูว่าช่อง A, B หรือ C ช่องใดสว่าง', 'คลิกเลือกช่องที่สว่างเพื่อผ่านทันที', 'ทำซ้ำตามเป้าหมายจนครบ 4 รอบ'] },
    granum: { goal: 'หมุนช่องเปิดของแผ่น Thylakoid ให้ตรงเส้นเป้าหมาย แล้วกดล็อกได้ทันที', controls: 'คลิกหมุนย้อน / หมุนต่อ แล้วคลิกล็อกช่องเปิด', steps: ['ดูแนวช่องเป้าหมายที่สว่าง', 'คลิกหมุนแผ่นจนช่องเปิดตรงแนว', 'กดล็อกช่องเปิดเพื่อผ่านทันที', 'ทำซ้ำตามเป้าหมายจนครบ 4 รอบ'] },
    thylakoid: { goal: 'นำ H⁺ เข้า Lumen ก่อนส่ง e⁻ ไป PSII แล้วกดยืนยันรอบ', controls: 'คลิกนำ H⁺ เข้า Lumen, ส่ง e⁻ ไป PSII และยืนยันรอบ', steps: ['คลิกนำ H⁺ จาก Stroma เข้า Lumen', 'คลิกส่ง e⁻ ไปยัง PSII', 'ตรวจว่าลำดับทั้งสองครบแล้ว', 'กดยืนยันเพื่อจบรอบทันที'] }
  };
  const tutorialsSeenThisSession = new Set();
  const tutorialSeen = id => tutorialsSeenThisSession.has(id) || (() => { try { return root.localStorage.getItem('lr-macro-tutorial-v1-' + id) === 'seen'; } catch (_) { return false; } })();
  const markTutorialSeen = id => { tutorialsSeenThisSession.add(id); try { root.localStorage.setItem('lr-macro-tutorial-v1-' + id, 'seen'); } catch (_) {} };
  class MacroChallengePanel {
    constructor(element, events) {
      this.element = element; this.events = events; this.current = null;
      element.addEventListener('click', event => {
        const tutorialButton = event.target.closest('[data-tutorial-action]');
        if (tutorialButton) {
          const action = tutorialButton.dataset.tutorialAction;
          if (action === 'help') this.events.emit('macro:tutorial-request', { id: this.current?.stage?.id || null });
          else if (action === 'replay') this.replayTutorial();
          else this.dismissTutorial(action === 'skip');
          return;
        }
        const button = event.target.closest('[data-macro-action]');
        if (!button || button.disabled) return;
        this.events.emit('macro:journey-action', { action: button.dataset.macroAction, value: button.dataset.value });
      });
      events.on('game:reset', () => this.close());
    }
    get isTutorialActive() { return Boolean(this.current?.tutorialActive); }
    open(stage, model) { this.current = { stage, model, tutorialActive: Boolean(tutorials[stage.id] && !tutorialSeen(stage.id)) }; this.element.hidden = false; this.element.classList.toggle('tutorial-active', this.current.tutorialActive); this.render(); }
    openTutorial() {
      if (!this.current || this.current.tutorialActive || !tutorials[this.current.stage.id]) return false;
      this.current.tutorialActive = true; this.element.classList.add('tutorial-active');
      this.render();
      this.element.querySelector('[data-tutorial-action="play"]')?.focus({ preventScroll: true });
      return true;
    }
    replayTutorial() {
      if (!this.isTutorialActive) return;
      this.render();
    }
    dismissTutorial(skipped) {
      if (!this.isTutorialActive) return;
      const id = this.current.stage.id; this.current.tutorialActive = false; markTutorialSeen(id);
      this.element.querySelector('.macro-tutorial')?.remove(); this.element.classList.remove('tutorial-active');
      const window = this.element.querySelector('.macro-game-window');
      window?.removeAttribute('inert'); window?.removeAttribute('aria-hidden');
      this.element.querySelector('.macro-card')?.removeAttribute('data-tutorial-id');
      this.status(skipped ? 'ข้ามคำแนะนำแล้ว · เริ่มภารกิจได้เลย' : 'พร้อมแล้ว · ควบคุมภารกิจด้วยปุ่มด้านล่าง', 'success');
      this.element.querySelector('[data-macro-action]:not(:disabled)')?.focus({ preventScroll: true });
      this.events.emit('macro:tutorial-dismissed', { id, skipped });
    }
    update(model) {
      if (!this.current) return;
      this.current.model = model;
      const c = this.element; const fill = c.querySelector('[data-macro-fill]');
      if (fill) fill.style.transform = 'scaleX(' + Math.max(0, Math.min(1, model.phase || 0)) + ')';
      const count = c.querySelector('[data-macro-round]'); if (count) count.textContent = (model.round + 1) + ' / ' + model.rounds;
      if (model.id === 'cell') {
        c.querySelectorAll('[data-cell-lane]').forEach((lane, i) => { lane.classList.toggle('selected', i === model.lane); lane.classList.toggle('route-target', i === model.target); });
        const electron = c.querySelector('.cell-electron'); if (electron) electron.style.top = ['19%','50%','81%'][model.lane];
      } else if (model.id === 'chloroplast') {
        c.querySelectorAll('[data-chloro-port]').forEach((port, i) => port.classList.toggle('active', i === model.target));
        const pulse = c.querySelector('.light-pulse'); if (pulse) pulse.style.setProperty('--route-x', ['62%','75%','88%'][model.target]);
      }
      if (model.id === 'granum') {
        const dial = c.querySelector('[data-granum-disk]'); if (dial) dial.style.setProperty('--opening-angle', (model.rotation * 90) + 'deg');
        const target = c.querySelector('[data-granum-target]'); if (target) target.style.setProperty('--opening-angle', (model.target * 90) + 'deg');
      }
      if (model.id === 'thylakoid') {
        c.classList.toggle('proton-ready', model.flow.includes('proton'));
        c.classList.toggle('electron-ready', model.flow.includes('electron'));
        const proton = c.querySelector('[data-macro-action="macro-thylakoid-flow"][data-value="proton"]');
        const electron = c.querySelector('[data-macro-action="macro-thylakoid-flow"][data-value="electron"]');
        if (proton) { proton.disabled = model.flow.includes('proton'); proton.querySelector('span').textContent = model.flow.includes('proton') ? '✓' : '↓'; }
        if (electron) { electron.disabled = !model.flow.includes('proton') || model.flow.includes('electron'); electron.querySelector('span').textContent = model.flow.includes('electron') ? '✓' : '→'; }
      }
    }
    visual(model) {
      if (model.id === 'cell') return '<div class="cell-corridor"><span class="cell-wall"></span><div class="cell-lanes">' + [0,1,2].map(i => '<i data-cell-lane="' + i + '" class="' + (i === model.lane ? 'selected ' : '') + (i === model.target ? 'route-target' : '') + '"><b>' + ['บน','กลาง','ล่าง'][i] + '</b></i>').join('') + '</div><span class="cell-electron">e⁻</span></div>';
      if (model.id === 'chloroplast') return '<div class="chloroplast-gates"><span class="light-pulse"></span><div class="chloro-signal"><b>☼</b><span>สัญญาณแสง</span></div><div class="chloro-ports"><i data-chloro-port="0" class="' + (model.target === 0 ? 'active' : '') + '">A</i><i data-chloro-port="1" class="' + (model.target === 1 ? 'active' : '') + '">B</i><i data-chloro-port="2" class="' + (model.target === 2 ? 'active' : '') + '">C</i></div><small>เยื่อหุ้ม Chloroplast</small></div>';
      if (model.id === 'granum') return '<div class="granum-stack"><i></i><i></i><i></i><div class="granum-disk" data-granum-disk><b></b></div><span class="granum-target" data-granum-target></span><small>ปรับช่องเปิดให้ตรงกับเส้นทาง</small></div>';
      return '<div class="thylakoid-flow"><div class="flow-zone stroma-zone"><b>Stroma</b><i>H⁺</i></div><div class="flow-membrane"><span class="proton-channel">H⁺</span><span class="electron-channel">e⁻</span><b>เยื่อ Thylakoid</b></div><div class="flow-zone lumen-zone"><b>Lumen</b><i>PSII</i></div><div class="flow-arrows"><span>↓</span><span>→</span></div></div>';
    }
    controls(model) {
      if (model.id === 'cell') return '<div class="macro-controls"><button data-macro-action="macro-cell-move" data-value="-1">ขยับขึ้น <span>↑</span></button><button data-macro-action="macro-cell-move" data-value="1">ขยับลง <span>↓</span></button><button class="macro-primary" data-macro-action="macro-cell-pass">ผ่านช่อง <span>↗</span></button></div>';
      if (model.id === 'chloroplast') return '<div class="macro-controls macro-three"><button data-macro-action="macro-chloro-route" data-value="0">ทาง A</button><button data-macro-action="macro-chloro-route" data-value="1">ทาง B</button><button data-macro-action="macro-chloro-route" data-value="2">ทาง C</button></div>';
      if (model.id === 'granum') return '<div class="macro-controls"><button data-macro-action="macro-granum-turn" data-value="-1">หมุนย้อน <span>↶</span></button><button data-macro-action="macro-granum-turn" data-value="1">หมุนต่อ <span>↷</span></button><button class="macro-primary" data-macro-action="macro-granum-lock">ล็อกช่องเปิด <span>↗</span></button></div>';
      const flow = model.flow || [];
      return '<div class="macro-controls"><button data-macro-action="macro-thylakoid-flow" data-value="proton" ' + (flow.includes('proton') ? 'disabled' : '') + '>นำ H⁺ เข้า Lumen <span>' + (flow.includes('proton') ? '✓' : '↓') + '</span></button><button data-macro-action="macro-thylakoid-flow" data-value="electron" ' + (!flow.includes('proton') || flow.includes('electron') ? 'disabled' : '') + '>ส่ง e⁻ ไป PSII <span>' + (flow.includes('electron') ? '✓' : '→') + '</span></button><button class="macro-primary" data-macro-action="macro-thylakoid-lock">ยืนยันรอบ <span>↗</span></button></div>';
    }
    render() {
      const { stage, model } = this.current; const [kicker, name] = titles[stage.id] || ['สำรวจ', stage.title];
      const hint = { cell: 'เลื่อนไปเลนที่สว่าง แล้วกดผ่านช่องได้ทันที', chloroplast: 'เลือก A / B / C ที่สว่างให้ตรงสัญญาณ', granum: 'หมุนช่องเปิดให้ตรงเป้าหมาย แล้วกดล็อก', thylakoid: 'นำ H⁺ เข้า Lumen ก่อนส่ง e⁻ ไป PSII แล้วกดยืนยัน' }[stage.id] || 'ดูเป้าหมายแล้วลงมือได้ทันที';
      const tutorialActive = this.current.tutorialActive;
      const lanePosition = ['19%', '50%', '81%'];
      const tutorialAttrs = tutorialActive ? ' data-tutorial-id="' + stage.id + '"' + (stage.id === 'chloroplast' ? ' data-tutorial-target="' + model.target + '"' : '') + (stage.id === 'cell' ? ' style="--tutorial-electron-from:' + lanePosition[model.lane] + ';--tutorial-electron-to:' + lanePosition[model.target] + '"' : '') : '';
      this.element.innerHTML = '<div class="macro-card"' + tutorialAttrs + '><div class="macro-topline"><div class="macro-eyebrow">MICRO GAMEPLAY · ' + kicker + '</div><button class="macro-help" type="button" data-tutorial-action="help" aria-label="เปิดวิธีเล่น">?</button></div><h2>' + name + '</h2><p>' + stage.explanation + '</p><div class="macro-brief">' + (stage.objective || '') + '</div><div class="macro-game-window"' + (tutorialActive ? ' inert aria-hidden="true"' : '') + '><div class="macro-visual" data-macro-visual>' + this.visual(model) + '</div><div class="macro-clock"><span>รอบปัจจุบัน</span><b data-macro-round>' + (model.round + 1) + ' / ' + model.rounds + '</b><i><em data-macro-fill style="transform:scaleX(' + Math.max(0, Math.min(1, model.phase || 0)) + ')"></em></i></div>' + this.controls(model) + '<div class="macro-status" data-macro-status>' + hint + '</div></div></div>' + (tutorialActive ? this.tutorialMarkup(stage, name) : '');
      this.update(model);
      if (this.current.tutorialActive) this.element.querySelector('[data-tutorial-action="play"]')?.focus({ preventScroll: true });
    }
    tutorialMarkup(stage, name) {
      const guide = tutorials[stage.id]; if (!guide) return '';
      const duration = Math.max(5.6, guide.steps.length * .8) + 's';
      const steps = guide.steps.map((step, index) => '<li style="--step:' + index + ';animation-delay:-' + (index * .8) + 's"><span>' + String(index + 1).padStart(2, '0') + '</span>' + step + '</li>').join('');
      return '<section class="macro-tutorial" role="dialog" aria-modal="true" aria-label="วิธีเล่น ' + name + '"><button class="tutorial-close" type="button" data-tutorial-action="close" aria-label="ปิดคำแนะนำ">×</button><div class="tutorial-heading"><span>คู่มือภารกิจ · ' + (titles[stage.id] || ['สำรวจ'])[0] + '</span><h3>' + name + '</h3><p>' + guide.goal + '</p></div><p class="tutorial-context">หน้าต่างภารกิจด้านบนใช้ฉาก วัตถุ และปุ่มควบคุมจริง</p><ol class="tutorial-steps" style="--step-count:' + guide.steps.length + ';--step-duration:' + duration + '">' + steps + '</ol><p class="tutorial-controls"><b>การควบคุมจริง</b> · ' + guide.controls + '</p><div class="tutorial-actions"><button class="tutorial-play" type="button" data-tutorial-action="play">เริ่มเล่น <span>↗</span></button><button class="tutorial-skip" type="button" data-tutorial-action="skip">ข้าม</button><button class="tutorial-replay" type="button" data-tutorial-action="replay">ดูคำแนะนำซ้ำ</button></div></section>';
    }
    status(message, tone = 'neutral') { const line = this.element.querySelector('[data-macro-status]'); if (line) { line.textContent = message; line.dataset.tone = tone; } }
    close() { this.current = null; this.element.hidden = true; this.element.classList.remove('tutorial-active'); this.element.replaceChildren(); }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.MacroChallengePanel = MacroChallengePanel;
})(window);
