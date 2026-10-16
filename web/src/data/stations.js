(function (root) {
  const stations = [
    { id: 'psii', stageId: 'water-splitting', label: 'PSII · OEC', kind: 'photosystem', x: 520, y: 445, radius: 35, zone: 'membrane' },
    { id: 'pq', stageId: 'pq', label: 'สายพา PQ', kind: 'carrier', x: 1160, y: 408, radius: 25, zone: 'membrane' },
    { id: 'cytochrome', stageId: 'cytochrome-complex', label: 'CYTOCHROME b₆f', kind: 'complex', x: 1800, y: 445, radius: 37, zone: 'membrane' },
    { id: 'pc', stageId: 'pc', label: 'สายพา PC', kind: 'carrier', x: 2440, y: 520, radius: 24, zone: 'lumen' },
    { id: 'psi', stageId: 'psi', label: 'PSI', kind: 'photosystem', x: 3080, y: 445, radius: 35, zone: 'membrane' },
    { id: 'mirror', stageId: 'mirror', label: 'กระจกสะท้อนแสง', kind: 'mirror', x: 3240, y: 323, radius: 25, zone: 'stroma' },
    { id: 'fd-rocket', stageId: 'fd-rocket', label: 'FERREDOXIN · Fd', kind: 'rocket', x: 3720, y: 280, radius: 29, zone: 'stroma' },
    { id: 'fnr', stageId: 'fnr-laboratory', label: 'ห้องทดลอง FNR', kind: 'lab', x: 4360, y: 268, radius: 40, zone: 'stroma' },
    { id: 'reagent', stageId: 'reagent-selection', label: 'เลือกสารตั้งต้น', kind: 'reagent', x: 4440, y: 335, radius: 22, zone: 'stroma' },
    { id: 'nadph', stageId: 'nadph', label: 'NADPH', kind: 'product', x: 4570, y: 143, radius: 26, zone: 'stroma' },
    { id: 'proton-pool', stageId: 'h-accumulation', label: 'H⁺ ใน Lumen', kind: 'pool', x: 4840, y: 700, radius: 35, zone: 'lumen' },
    { id: 'atp-synthase', stageId: 'atp-synthase', label: 'ATP SYNTHASE', kind: 'synthase', x: 5000, y: 455, radius: 42, zone: 'membrane' },
    { id: 'lock-ring', stageId: 'lock-ring', label: 'วงแหวน ATP synthase', kind: 'ring', x: 5025, y: 380, radius: 21, zone: 'stroma' },
    { id: 'atp', stageId: 'atp', label: 'ATP', kind: 'product', x: 5200, y: 195, radius: 27, zone: 'stroma' },
    { id: 'calvin', stageId: 'calvin-cycle', label: 'CALVIN CYCLE', kind: 'cycle', x: 5640, y: 145, radius: 46, zone: 'stroma' }
  ];
  const byStageId = new Map(root.LightReaction.Stages.map(stage => [stage.id, stage.index]));
  root.LightReaction.Stations = Object.freeze(stations.map(station => Object.freeze({ ...station, stageIndex: byStageId.get(station.stageId) })));
})(window);
