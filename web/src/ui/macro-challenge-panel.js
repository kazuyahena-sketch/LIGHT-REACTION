(function (root) {
  const titles = {
    cell: ['ทางแยก', 'เซลล์พืช'], chloroplast: ['ทางเข้า', 'Chloroplast'],
    granum: ['ช่อง Thylakoid', 'Granum'], thylakoid: ['สมดุลพลังงาน', 'Thylakoid']
  };
  class MacroChallengePanel {
    constructor(element, events) {
      this.element = element; this.events = events; this.current = null;
      element.addEventListener('click', event => {
        const button = event.target.closest('[data-macro-action]');
        if (!button || button.disabled) return;
        this.events.emit('macro:journey-action', { action: button.dataset.macroAction, value: button.dataset.value });
      });
      events.on('game:reset', () => this.close());
    }
    open(stage, model) { this.current = { stage, model }; this.element.hidden = false; this.render(); }
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
      const hint = { cell: 'ขยับให้อยู่เลนที่เรืองแสง แล้วกดยืนยันในช่วงท้ายแถบ', chloroplast: 'รอสัญญาณแสงถึงช่องที่สว่าง แล้วเลือกช่องนั้น', granum: 'หมุนช่องเปิดให้ตรงเส้นเป้าหมาย แล้วล็อกในช่วงท้ายแถบ', thylakoid: 'นำ H⁺ เข้า Lumen ก่อนส่ง e⁻ ไป PSII แล้วจึงยืนยัน' }[stage.id] || 'สังเกตเส้นทางแล้วลงมือในจังหวะที่เหมาะสม';
      this.element.innerHTML = '<div class="macro-card"><div class="macro-eyebrow">MICRO GAMEPLAY · ' + kicker + '</div><h2>' + name + '</h2><p>' + stage.explanation + '</p><div class="macro-brief">' + (stage.objective || '') + '</div><div class="macro-visual" data-macro-visual>' + this.visual(model) + '</div><div class="macro-clock"><span>ความคืบหน้า</span><b data-macro-round>1 / ' + model.rounds + '</b><i><em data-macro-fill></em></i></div>' + this.controls(model) + '<div class="macro-status" data-macro-status>' + hint + '</div></div>';
      this.update(model);
    }
    status(message, tone = 'neutral') { const line = this.element.querySelector('[data-macro-status]'); if (line) { line.textContent = message; line.dataset.tone = tone; } }
    close() { this.current = null; this.element.hidden = true; this.element.replaceChildren(); }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.MacroChallengePanel = MacroChallengePanel;
})(window);
