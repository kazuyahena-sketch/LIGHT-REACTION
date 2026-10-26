(function (root) {
  const firstCheckpointX = 6080;
  const checkpointSpacing = 5900;
  const checkpoints = [
    { id: 'psii', label: 'PSII · OEC', stationId: 'psii', stageId: 'psii', completedStageId: 'water-splitting', game: 'water', copy: 'กดรับพลังงานให้ตรงจังหวะโฟตอน 8 ครั้ง เพื่อกระตุ้น OEC และเติมอิเล็กตรอนให้ PSII' },
    { id: 'pq', label: 'PLASTOQUINONE · PQ', stationId: 'pq', stageId: 'pq', completedStageId: 'pq', game: 'pq-route', copy: 'จัดเลนอิเล็กตรอนให้ตรงช่องรีดอกซ์ แล้วกดผ่านให้ครบ 3 จุด' },
    { id: 'cytochrome', label: 'CYTOCHROME b₆f', stationId: 'cytochrome', stageId: 'cytochrome-complex', completedStageId: 'cytochrome-complex', game: 'proton-pump', copy: 'จับจังหวะปั๊มให้ครบ 4 รอบ เพื่อย้าย H⁺ จาก Stroma เข้า Lumen' },
    { id: 'pc', label: 'PLASTOCYANIN · PC', stationId: 'pc', stageId: 'pc', completedStageId: 'pc', game: 'pc-current', copy: 'พา Plastocyanin ไปตามกระแสใน Lumen พร้อมนำอิเล็กตรอนไปยัง PSI' },
    { id: 'psi', label: 'PSI · P700', stationId: 'psi', stageId: 'psi', completedStageId: 'mirror', game: 'mirror', copy: 'รับโฟตอนอีกครั้ง แล้วปรับกระจกให้ส่งอิเล็กตรอนไปยัง Fd' },
    { id: 'fd-rocket', label: 'FERREDOXIN · Fd', stationId: 'fd-rocket', stageId: 'fd-rocket', completedStageId: 'fd-rocket', game: 'fd-launch', copy: 'สะสมพลังงานและปล่อยอิเล็กตรอนเมื่อแถบชาร์จอยู่ในช่วงส่งต่อ' },
    { id: 'fnr', label: 'ห้องทดลอง FNR', stationId: 'fnr', stageId: 'fnr-laboratory', completedStageId: 'nadph', game: 'reagent', copy: 'เลือกตัวรับอิเล็กตรอนรูปออกซิไดซ์ FNR ใช้อิเล็กตรอน 2 ตัวสร้าง NADPH' },
    { id: 'atp-synthase', label: 'ATP SYNTHASE', stationId: 'atp-synthase', stageId: 'lock-ring', completedStageId: 'atp', game: 'rings', copy: 'หมุนวงแหวนล็อกทั้ง 3 วงให้ตรงกัน จากนั้น H⁺ ใน Lumen จะไหลผ่าน ATP synthase' },
    { id: 'calvin-cycle', label: 'CALVIN CYCLE', stationId: 'calvin', stageId: 'calvin-cycle', completedStageId: 'calvin-cycle', game: 'calvin', copy: 'ส่ง ATP และ NADPH ไปยัง Calvin Cycle ส่วน O₂ ถูกปล่อยออกจากระบบแล้ว' }
  ].map((checkpoint, index) => ({
    ...checkpoint, x: firstCheckpointX + checkpointSpacing * index, approachOffset: 120,
    tunnel: ['psii', 'cytochrome', 'psi', 'fnr', 'atp-synthase'].includes(checkpoint.id)
  }));
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.JourneyCheckpoints = Object.freeze(checkpoints.map(item => Object.freeze(item)));
})(window);
