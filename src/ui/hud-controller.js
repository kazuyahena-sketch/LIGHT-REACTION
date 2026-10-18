(function (root) {
  class HUDController {
    constructor(stages, state, eventBus, explanation, onAdvance, isTransitioning, canAdvance, journey = null, runner = null) {
      this.stages = stages; this.state = state; this.eventBus = eventBus; this.explanation = explanation;
      this.onAdvance = onAdvance; this.isTransitioning = isTransitioning; this.canAdvance = canAdvance;
      this.journey = journey; this.runner = runner;
      this.elements = {
        stageIndex: document.getElementById('stage-index'), stageContext: document.getElementById('stage-context'), stageTitle: document.getElementById('stage-title'),
        objectiveTitle: document.getElementById('objective-title'), objectiveCopy: document.getElementById('objective-copy'), stageExplanation: document.getElementById('stage-explanation'),
        noteNumber: document.getElementById('note-number'), progressCount: document.getElementById('progress-count'), progressFill: document.getElementById('progress-fill'),
        advanceButton: document.getElementById('advance-button'), legend: document.getElementById('world-legend'), bioReadout: document.getElementById('bio-readout'), toast: document.getElementById('toast'),
        runnerCount: document.getElementById('runner-checkpoint-count'), runnerStation: document.getElementById('runner-station'), runnerObjective: document.getElementById('runner-objective'),
        runnerProgress: document.getElementById('runner-progress-fill'), runnerEnergy: document.getElementById('runner-energy'), runnerProtons: document.getElementById('runner-protons'),
        productO2: document.getElementById('product-o2'), productNadph: document.getElementById('product-nadph'), productAtp: document.getElementById('product-atp')
      };
      this.toastTimeout = null;
      this.elements.advanceButton.addEventListener('click', () => this.onAdvance());
      eventBus.on('state:changed', () => { this.refresh(); this.updateJourney(); });
      eventBus.on('transition:start', () => this.refresh()); eventBus.on('transition:complete', () => this.refresh());
      eventBus.on('stage:entered', stage => { this.explanation.present(stage); this.refresh(); this.showToast(stage.title); });
      eventBus.on('journey:checkpoint-arrival', ({ checkpoint }) => { this.updateJourney(); });
      eventBus.on('journey:checkpoint-complete', ({ checkpoint }) => {
        this.updateJourney();
        this.showToast('CHECKPOINT SAVED · ' + checkpoint.label, '');
      });
      eventBus.on('journey:continued', () => this.updateJourney());
      this.refresh(); this.updateJourney();
    }
    refresh() {
      const stage = this.stages[this.state.currentIndex] || this.stages[0]; const index = stage.index; const e = this.elements;
      const isStart = stage.id === 'start'; const isFinal = index === this.stages.length - 1;
      e.stageIndex.textContent = String(index).padStart(2, '0'); e.stageContext.textContent = stage.context;
      e.stageTitle.innerHTML = isStart ? 'เดินทางสู่<br><em>LIGHT REACTION</em>' : '<em>' + this.escape(stage.title) + '</em>';
      e.objectiveTitle.textContent = stage.objective; e.objectiveCopy.textContent = this.objectiveDetail(stage);
      e.stageExplanation.textContent = stage.explanation; e.noteNumber.textContent = String(index + 1).padStart(2, '0');
      e.progressCount.innerHTML = String(index).padStart(2, '0') + ' <i>/ ' + this.stages.length + '</i>';
      e.progressFill.style.width = (index / (this.stages.length - 1) * 100) + '%';
      e.bioReadout.classList.toggle('active', index > 0); e.bioReadout.querySelector('b').textContent = stage.signal;
      e.legend.classList.toggle('visible', stage.scene === 'reaction');
      const travelling = this.isTransitioning(); const ready = this.canAdvance();
      e.advanceButton.disabled = travelling || isFinal || (!isStart && !ready);
      e.advanceButton.querySelector('span').textContent = travelling ? 'กำลังเดินทาง…' : isFinal ? 'เดินทางสำเร็จ' : isStart ? 'เริ่มการเดินทาง' : ready ? 'ไปต่อ' : 'ทำภารกิจด้านบนให้สำเร็จ';
      e.advanceButton.querySelector('i').textContent = isFinal ? '✓' : travelling ? '· · ·' : '↗';
    }
    updateJourney() {
      if (!this.journey || !this.runner) return;
      const e = this.elements; const cp = this.journey.activeCheckpoint || this.journey.nextCheckpoint;
      if (this.journey.gameFinished || this.journey.mode === 'complete') {
        e.runnerStation.textContent = 'ปฏิกิริยาใช้แสงสำเร็จ';
        e.runnerObjective.textContent = 'ATP และ NADPH ถึง Calvin Cycle แล้ว ส่วน O₂ ถูกปล่อยหลังการแตกตัวของน้ำ';
      } else if (!cp) {
        e.runnerStation.textContent = 'CALVIN CYCLE';
        e.runnerObjective.textContent = 'เส้นทางอิเล็กตรอนและโปรตอนเสร็จสมบูรณ์แล้ว';
      } else if (this.journey.mode === 'station') {
        e.runnerStation.textContent = cp.label + ' · จุดพัก';
        e.runnerObjective.textContent = cp.copy;
      } else if (this.journey.mode === 'tunnel-entry') {
        e.runnerStation.textContent = cp.label + ' · อุโมงค์โปรตีน';
        e.runnerObjective.textContent = 'กำลังเคลื่อนผ่านช่องทางของโปรตีน · เตรียมเข้าสู่สถานีทดลอง';
      } else if (this.journey.mode === 'checkpoint') {
        e.runnerStation.textContent = cp.label + ' · บันทึกแล้ว';
        e.runnerObjective.textContent = 'ผ่านสถานีแล้ว กำลังเดินทางต่อ';
      } else if (this.journey.mode === 'respawning') {
        e.runnerStation.textContent = 'ปรับระดับการบิน · กลับจุดเซฟ';
        e.runnerObjective.textContent = 'กำลังเริ่มการเดินทางใหม่จากจุดบันทึกล่าสุด';
      } else if (this.journey.mode === 'running') {
        e.runnerStation.textContent = 'ELECTRON FLIGHT · ' + cp.label;
        e.runnerObjective.textContent = 'กด SPACE / คลิก / แตะ เพื่อกระดกขึ้น · ปล่อยให้แรงโน้มถ่วงพาลง';
      } else {
        e.runnerStation.textContent = 'ถัดไป · ' + cp.label;
        e.runnerObjective.textContent = cp.copy + ' ควบคุมระดับการลอยตัวเพื่อเดินทางไปยังโปรตีนถัดไป';
      }
      const current = this.journey.completedCount + (this.journey.mode === 'station' ? 1 : 0);
      e.runnerCount.textContent = String(current).padStart(2, '0') + ' / 09';
      e.runnerProgress.style.width = (this.journey.progress * 100) + '%';
      e.runnerEnergy.textContent = Array.from({ length: 3 }, (_, i) => i < this.runner.energy ? '●' : '○').join(' ');
      e.runnerProtons.textContent = String(this.state.lumenProtons);
      e.productO2.textContent = 'O₂ · ' + (this.state.hasProduct('o2') ? 'ปล่อยแล้ว' : '—');
      e.productNadph.textContent = 'NADPH · ' + (this.state.hasProduct('nadph') ? 'พร้อม' : '—');
      e.productAtp.textContent = 'ATP · ' + (this.state.hasProduct('atp') ? 'พร้อม' : '—');
    }
    objectiveDetail(stage) {
      if (stage.id === 'start') return 'เริ่มเดินทางเข้าสู่โลกของการสังเคราะห์ด้วยแสง';
      if (stage.id === 'light-reaction') return 'ตามเส้นทางอิเล็กตรอนในโลกด้านข้างที่เชื่อมต่ออย่างต่อเนื่อง';
      return stage.explanation;
    }
    showToast(label, prefix = 'ถึงแล้ว · ') {
      const toast = this.elements.toast; toast.textContent = prefix + label; toast.classList.add('visible');
      window.clearTimeout(this.toastTimeout); this.toastTimeout = window.setTimeout(() => toast.classList.remove('visible'), 1900);
    }
    escape(value) { return String(value).replace(/[&<>\"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[character]); }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.HUDController = HUDController;
})(window);
