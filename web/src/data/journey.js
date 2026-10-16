(function (root) {
  const checkpoints = [
    { id: 'psii', label: 'PSII · OEC', stationId: 'psii', x: 520, approachOffset: 120, stageId: 'psii', completedStageId: 'water-splitting', game: 'water', copy: 'กดรับพลังงานให้ตรงจังหวะโฟตอน 5 ครั้ง เพื่อกระตุ้น OEC และเติมอิเล็กตรอนให้ PSII' },
    { id: 'pq', label: 'PLASTOQUINONE · PQ', stationId: 'pq', x: 1160, approachOffset: 120, stageId: 'pq', completedStageId: 'pq', game: 'pq-route', copy: 'บังคับตัวพาอิเล็กตรอนผ่านช่องรีดอกซ์ที่เปิดอยู่ให้ครบ 3 จุด' },
    { id: 'cytochrome', label: 'CYTOCHROME b₆f', stationId: 'cytochrome', x: 1800, approachOffset: 120, stageId: 'cytochrome-complex', completedStageId: 'cytochrome-complex', game: 'proton-pump', copy: 'จับจังหวะปั๊มให้ครบ 4 รอบ เพื่อย้าย H⁺ จาก Stroma เข้า Lumen' },
    { id: 'pc', label: 'PLASTOCYANIN · PC', stationId: 'pc', x: 2440, approachOffset: 120, stageId: 'pc', completedStageId: 'pc', game: 'pc-current', copy: 'พา Plastocyanin ไปตามกระแสใน Lumen พร้อมนำอิเล็กตรอนไปยัง PSI' },
    { id: 'psi', label: 'PSI · P700', stationId: 'psi', x: 3080, approachOffset: 120, stageId: 'psi', completedStageId: 'mirror', game: 'mirror', copy: 'รับโฟตอนอีกครั้ง แล้วปรับกระจกให้ส่งอิเล็กตรอนไปยัง Fd' },
    { id: 'fd-rocket', label: 'FERREDOXIN · Fd', stationId: 'fd-rocket', x: 3720, approachOffset: 120, stageId: 'fd-rocket', completedStageId: 'fd-rocket', game: 'fd-launch', copy: 'สะสมพลังงานและปล่อยอิเล็กตรอนเมื่อแถบชาร์จอยู่ในช่วงส่งต่อ' },
    { id: 'fnr', label: 'ห้องทดลอง FNR', stationId: 'fnr', x: 4360, approachOffset: 120, stageId: 'fnr-laboratory', completedStageId: 'nadph', game: 'reagent', copy: 'เลือกตัวรับอิเล็กตรอนรูปออกซิไดซ์ FNR ใช้อิเล็กตรอน 2 ตัวสร้าง NADPH' },
    { id: 'atp-synthase', label: 'ATP SYNTHASE', stationId: 'atp-synthase', x: 5000, approachOffset: 120, stageId: 'lock-ring', completedStageId: 'atp', game: 'rings', copy: 'หมุนวงแหวนล็อกทั้ง 3 วงให้ตรงกัน จากนั้น H⁺ ใน Lumen จะไหลผ่าน ATP synthase' },
    { id: 'calvin-cycle', label: 'CALVIN CYCLE', stationId: 'calvin', x: 5640, approachOffset: 120, stageId: 'calvin-cycle', completedStageId: 'calvin-cycle', game: 'calvin', copy: 'ส่ง ATP และ NADPH ไปยัง Calvin Cycle ส่วน O₂ ถูกปล่อยออกจากระบบแล้ว' }
  ];
  const hazards = [
    { x: 245, y: 448, label: '¹O₂', radius: 27 }, { x: 840, y: 448, label: 'ROS', radius: 30 },
    { x: 1480, y: 448, label: '¹O₂', radius: 28 }, { x: 2120, y: 448, label: 'ROS', radius: 30 },
    { x: 2760, y: 448, label: '¹O₂', radius: 28 }, { x: 3400, y: 448, label: 'ROS', radius: 30 },
    { x: 4040, y: 448, label: '¹O₂', radius: 28 }, { x: 4680, y: 448, label: 'ROS', radius: 30 },
    { x: 5320, y: 448, label: '¹O₂', radius: 28 }
  ];
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.JourneyCheckpoints = Object.freeze(checkpoints.map(item => Object.freeze(item)));
  root.LightReaction.JourneyHazards = Object.freeze(hazards.map(item => Object.freeze(item)));
})(window);
