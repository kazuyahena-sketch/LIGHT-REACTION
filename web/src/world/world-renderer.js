(function (root) {
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const roundRect = (ctx, x, y, width, height, radius) => {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r); ctx.closePath();
  };
  const path = (ctx, points, close = false) => {
    ctx.beginPath(); points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    if (close) ctx.closePath();
  };
  const stageIds = root.LightReaction.Stages.reduce((result, stage) => { result[stage.id] = stage.index; return result; }, {});
  const macroTargets = [
    { id: 'cell', x: 620, y: 260, label: 'CELL', index: 1 },
    { id: 'chloroplast', x: 900, y: 330, label: 'CHLOROPLAST', index: 2 },
    { id: 'granum', x: 980, y: 397, label: 'GRANUM', index: 3 },
    { id: 'thylakoid', x: 1018, y: 426, label: 'THYLAKOID', index: 4 }
  ];
  const macroRoutePoints = [{ x: 617, y: 265 }, { x: 900, y: 330 }, { x: 980, y: 397 }, { x: 1018, y: 426 }];
  const reactionRailIds = new Set(['psii', 'pq', 'cytochrome', 'pc', 'psi', 'mirror', 'fd-rocket', 'fnr', 'nadph']);
  const reactionProtonPaths = [
    [{ x: 216, y: 488 }, { x: 255, y: 560 }, { x: 370, y: 634 }, { x: 590, y: 700 }],
    [{ x: 540, y: 490 }, { x: 545, y: 570 }, { x: 570, y: 635 }, { x: 590, y: 700 }],
    [{ x: 620, y: 700 }, { x: 695, y: 650 }, { x: 740, y: 565 }, { x: 760, y: 455 }, { x: 773, y: 375 }]
  ];

  class WorldRenderer {
    constructor(canvas, stations, animator, vfx) {
      this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }); this.stations = stations; this.animator = animator; this.vfx = vfx;
      this.electronRail = stations.filter(station => reactionRailIds.has(station.id)).map(station => ({ x: station.x, y: station.y }));
      this.width = 1; this.height = 1; this.dpr = 1; this.scale = 1; this.stars = Array.from({ length: 95 }, (_, index) => ({ x: (index * 193 + 37) % 1440, y: (index * 317 + 59) % 900, r: .4 + (index % 4) * .18, p: index * .41 }));
      this.journeyMode = false;
      this.backdropCanvas = document.createElement('canvas');
      this.macroAmbientCanvas = document.createElement('canvas');
      this.macroArtworkCanvas = document.createElement('canvas');
      this.transitionRendering = false;
      this.reactionBaseCanvas = null;
      this.reactionBaseReady = false;
      this.membranePattern = document.createElement('canvas'); this.membranePattern.width = 960; this.membranePattern.height = 190;
      const pattern = this.membranePattern.getContext('2d');
      pattern.strokeStyle = 'rgba(107,220,205,.14)'; pattern.setLineDash([2, 12]);
      for (let x = 0; x < this.membranePattern.width; x += 24) { pattern.beginPath(); pattern.moveTo(x, 28); pattern.lineTo(x + 2, 162); pattern.stroke(); }
      pattern.setLineDash([]);
      for (let x = 0; x < this.membranePattern.width; x += 48) {
        pattern.fillStyle = 'rgba(143,224,197,.45)'; pattern.beginPath(); pattern.ellipse(x, 21, 5, 3, 0, 0, TAU); pattern.fill();
        pattern.fillStyle = 'rgba(108,185,191,.35)'; pattern.beginPath(); pattern.ellipse(x + 20, 171, 5, 3, 0, 0, TAU); pattern.fill();
      }
      this.resize(); this.buildMacroCache(); this.buildReactionBaseCache(); window.addEventListener('resize', () => this.resize());
    }
    resize() {
      const rect = this.canvas.getBoundingClientRect(); this.width = Math.max(1, rect.width); this.height = Math.max(1, rect.height);
      this.dpr = Math.min(window.devicePixelRatio || 1, this.journeyMode ? 1 : 2); this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
      this.scale = Math.max(this.width / 1440, this.height / 900);
      const ratio = Math.min(1, 960 / this.width); this.backdropCanvas.width = Math.max(1, Math.round(this.width * ratio)); this.backdropCanvas.height = Math.max(1, Math.round(this.height * ratio));
      const bg = this.backdropCanvas.getContext('2d'); const radius = Math.max(this.backdropCanvas.width, this.backdropCanvas.height) * .78;
      const gradient = bg.createRadialGradient(this.backdropCanvas.width * .49, this.backdropCanvas.height * .43, 14 * ratio, this.backdropCanvas.width * .49, this.backdropCanvas.height * .47, radius);
      gradient.addColorStop(0, '#102733'); gradient.addColorStop(.5, '#0a1921'); gradient.addColorStop(1, '#061116');
      bg.fillStyle = gradient; bg.fillRect(0, 0, this.backdropCanvas.width, this.backdropCanvas.height);
    }
    setJourneyMode(enabled) { if (this.journeyMode === enabled) return; this.journeyMode = enabled; this.resize(); }
    viewport() { return { width: this.width, height: this.height, scale: this.scale }; }
    render(timestamp, currentStage, transition, camera, gameState) {
      const transitionSource = transition.active?.fromStage.id;
      const transitionTarget = transition.active?.toStage.id;
      const cinematicZoom = transition.isActive && (
        (transitionSource === 'granum' && transitionTarget === 'thylakoid')
        || (transitionSource === 'thylakoid' && transitionTarget === 'light-reaction')
      );
      const renderDpr = Math.min(window.devicePixelRatio || 1, this.journeyMode ? 1 : cinematicZoom ? 1.5 : 2);
      if (renderDpr !== this.dpr) {
        this.dpr = renderDpr;
        this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
      }
      const ctx = this.ctx; const time = timestamp / 1000;
      this.transitionRendering = transition.isActive;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); ctx.clearRect(0, 0, this.width, this.height);
      ctx.drawImage(this.backdropCanvas, 0, 0, this.width, this.height);
      const journeyWorld = this.journey?.worldStarted;
      if (!journeyWorld) this.drawStars(ctx, time);
      const viewportScale = this.scale; const dpr = this.dpr;
      ctx.setTransform(dpr * viewportScale, 0, 0, dpr * viewportScale, dpr * this.width / 2, dpr * this.height / 2);
      ctx.translate(camera.shakeOffset.x, camera.shakeOffset.y); ctx.scale(camera.zoom, camera.zoom); ctx.translate(-camera.x, -camera.y);
      const layers = transition.layers(currentStage);
      const macroLayers = layers.length === 2 && layers[0].stage.scene === 'macro' && layers[1].stage.scene === 'macro' ? layers : null;
      const filter = cinematicZoom || camera.blur <= .01 ? 'none' : `blur(${camera.blur}px)`;
      if (macroLayers) {
        const alpha = macroLayers[0].alpha + macroLayers[1].alpha * (1 - macroLayers[0].alpha);
        ctx.save(); ctx.globalAlpha = alpha; ctx.filter = filter;
        this.drawMacroCommon(ctx, time);
        ctx.restore();
        for (const layer of macroLayers) {
          if (layer.alpha <= .005) continue;
          ctx.save(); ctx.globalAlpha = layer.alpha; ctx.filter = filter;
          this.drawMacroOverlay(ctx, layer.stage, gameState, time);
          ctx.restore();
        }
      }
      for (const layer of layers) {
        if (macroLayers && layer.stage.scene === 'macro') continue;
        if (layer.alpha <= .005) continue;
        ctx.save(); ctx.globalAlpha = layer.alpha; ctx.filter = filter;
        if (layer.stage.scene === 'reaction' && this.journey?.worldStarted) this.drawJourneyWorld(ctx, layer.stage, gameState, time, camera);
        else if (layer.stage.scene === 'reaction') this.drawReaction(ctx, layer.stage, gameState, time, camera, transition);
        else this.drawMacro(ctx, layer.stage, gameState, time);
        ctx.restore();
      }
      ctx.save(); ctx.filter = 'none'; this.vfx.draw(ctx); ctx.restore();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawFrameGuides(ctx, currentStage, time);
    }
    drawStars(ctx, time) {
      ctx.save();
      for (const star of this.stars) {
        const x = ((star.x / 1440) * this.width + Math.sin(time * .06 + star.p) * 3 + this.width) % this.width;
        const y = (star.y / 900) * this.height; const alpha = .14 + (Math.sin(time * .42 + star.p) + 1) * .13;
        ctx.globalAlpha = alpha; ctx.fillStyle = star.p % 3 > 1 ? '#a3f0df' : '#9dbbd5'; ctx.beginPath(); ctx.arc(x, y, star.r, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    drawFrameGuides(ctx, stage, time) {
      ctx.save(); ctx.globalAlpha = .26; ctx.strokeStyle = '#63afb0'; ctx.lineWidth = 1;
      const inset = 20; const length = 24; const points = [[inset, inset, 1, 1], [this.width - inset, inset, -1, 1], [inset, this.height - inset, 1, -1], [this.width - inset, this.height - inset, -1, -1]];
      for (const [x, y, dx, dy] of points) { ctx.beginPath(); ctx.moveTo(x, y + dy * length); ctx.lineTo(x, y); ctx.lineTo(x + dx * length, y); ctx.stroke(); }
      if (stage.scene === 'reaction') {
        ctx.globalAlpha = .13; ctx.setLineDash([3, 8]); ctx.beginPath(); ctx.moveTo(26, this.height * .55); ctx.lineTo(this.width - 26, this.height * .55); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.restore();
    }
    drawMacro(ctx, stage, state, time) {
      this.drawMacroCommon(ctx, time);
      this.drawMacroOverlay(ctx, stage, state, time);
    }
    drawMacroCommon(ctx, time) {
      if (this.transitionRendering) {
        ctx.drawImage(this.macroAmbientCanvas, -180, -180);
        this.drawSunbeams(ctx, time);
        ctx.drawImage(this.macroArtworkCanvas, 0, 0, 1440, 900);
        this.drawChloroplastHighlight(ctx, time);
        this.drawMacroRoute(ctx, time);
        return;
      }
      this.drawMacroBackdrop(ctx);
      this.drawSunbeams(ctx, time);
      this.drawMacroArtwork(ctx);
      this.drawChloroplastHighlight(ctx, time);
      this.drawMacroRoute(ctx, time);
    }
    buildMacroCache() {
      this.macroAmbientCanvas.width = 1800; this.macroAmbientCanvas.height = 1260;
      const ambient = this.macroAmbientCanvas.getContext('2d');
      ambient.translate(180, 180);
      this.drawMacroBackdrop(ambient);
      this.macroArtworkCanvas.width = 2880; this.macroArtworkCanvas.height = 1800;
      const artwork = this.macroArtworkCanvas.getContext('2d');
      artwork.scale(2, 2);
      this.drawMacroArtwork(artwork);
    }
    drawMacroBackdrop(ctx) {
      const ambient = ctx.createRadialGradient(865, 435, 40, 850, 445, 570); ambient.addColorStop(0, 'rgba(48,139,124,.14)'); ambient.addColorStop(1, 'rgba(8,30,36,0)');
      ctx.fillStyle = ambient; ctx.fillRect(-180, -180, 1800, 1260);
    }
    drawMacroArtwork(ctx) {
      const cx = 720; const cy = 450;
      const cellGlow = ctx.createRadialGradient(cx - 100, cy - 120, 40, cx, cy, 570); cellGlow.addColorStop(0, 'rgba(92,167,147,.14)'); cellGlow.addColorStop(.78, 'rgba(49,111,103,.07)'); cellGlow.addColorStop(1, 'rgba(54,139,126,.02)');
      ctx.save(); ctx.shadowColor = 'rgba(97,216,187,.24)'; ctx.shadowBlur = 34;
      ctx.fillStyle = cellGlow; ctx.strokeStyle = 'rgba(115,222,194,.48)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(cx, cy, 555, 342, -.05, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = 'rgba(93,182,164,.21)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, 543, 330, -.05, 0, TAU); ctx.stroke();
      ctx.save(); ctx.globalAlpha = .55; ctx.strokeStyle = 'rgba(121,210,187,.16)'; ctx.lineWidth = 1.1;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(cx + ((i % 3) - 1) * 133, cy + ((i % 2) ? 64 : -72), 58 + (i % 3) * 9, 23, -.35, 0, TAU); ctx.stroke(); }
      ctx.restore();
      const nucleus = ctx.createRadialGradient(480, 512, 10, 480, 512, 100); nucleus.addColorStop(0, 'rgba(58,104,124,.4)'); nucleus.addColorStop(1, 'rgba(47,90,111,.08)');
      ctx.fillStyle = nucleus; ctx.strokeStyle = 'rgba(115,191,198,.27)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(485, 505, 94, 76, -.24, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#80aeb0'; ctx.font = '10px "DM Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText('นิวเคลียส', 485, 510);
      this.drawChloroplast(ctx);
    }
    drawMacroOverlay(ctx, stage, state, time) {
      const cx = 720; const cy = 450;
      for (const target of macroTargets) this.drawMacroMarker(ctx, target, state, stage, time);
      if (stage.id === 'start') this.drawStartBeacon(ctx, cx, cy, time);
    }
    drawSunbeams(ctx, time) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 4; i++) {
        const x = 1020 + i * 78; const alpha = .045 + .02 * Math.sin(time * .8 + i);
        const gradient = ctx.createLinearGradient(x, -60, x - 110, 740); gradient.addColorStop(0, `rgba(226,250,154,${alpha})`); gradient.addColorStop(1, 'rgba(118,232,199,0)');
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.moveTo(x, -90); ctx.lineTo(x + 25, -90); ctx.lineTo(x - 60, 570); ctx.lineTo(x - 100, 580); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    drawChloroplast(ctx) {
      const x = 910; const y = 420;
      ctx.save(); ctx.shadowColor = '#55dba9'; ctx.shadowBlur = 28;
      const fill = ctx.createLinearGradient(x - 200, y - 100, x + 190, y + 95); fill.addColorStop(0, '#1d584e'); fill.addColorStop(.5, '#276d5d'); fill.addColorStop(1, '#17483f');
      ctx.fillStyle = fill; ctx.strokeStyle = 'rgba(121,242,192,.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, y, 184, 103, -.18, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = 'rgba(159,245,196,.32)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, 172, 91, -.18, 0, TAU); ctx.stroke();
      for (let stack = 0; stack < 4; stack++) {
        const sx = x - 102 + stack * 65; const sy = y - 29 + Math.sin(stack * .7) * 12;
        for (let disk = 0; disk < 5; disk++) {
          ctx.fillStyle = disk % 2 ? '#367d68' : '#3e9174'; ctx.strokeStyle = 'rgba(161,255,204,.48)'; ctx.lineWidth = .8;
          ctx.beginPath(); ctx.ellipse(sx, sy + disk * 15, 25, 8, -.1, 0, TAU); ctx.fill(); ctx.stroke();
        }
      }
      ctx.strokeStyle = 'rgba(173,248,185,.22)'; ctx.setLineDash([5, 7]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 145, y + 55); ctx.bezierCurveTo(x - 45, y + 10, x + 40, y + 83, x + 147, y + 33); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(195,250,203,.9)'; ctx.font = '11px "DM Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText('CHLOROPLAST', x, y + 147);
      ctx.fillStyle = 'rgba(189,227,200,.58)'; ctx.font = '8px "DM Mono", Consolas, monospace'; ctx.fillText('STROMA', x - 6, y - 72);
      ctx.save(); ctx.translate(1015, 427); ctx.rotate(-.17);
      ctx.fillStyle = 'rgba(34,102,84,.95)'; ctx.strokeStyle = 'rgba(156,247,197,.86)'; ctx.lineWidth = 1.7;
      roundRect(ctx, -43, -61, 86, 122, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#83e2ae'; ctx.font = '8px "DM Mono", Consolas, monospace'; ctx.fillText('THYLAKOID', 0, 78);
      for (let i = -2; i <= 2; i++) { ctx.fillStyle = '#4ba182'; ctx.beginPath(); ctx.ellipse(i * 11, i % 2 * 3, 10, 26, 0, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    drawChloroplastHighlight(ctx, time) {
      ctx.fillStyle = `rgba(214,255,157,${.5 + .3 * Math.sin(time * 3)})`; ctx.shadowColor = '#d7f49b'; ctx.shadowBlur = 13; ctx.beginPath(); ctx.arc(1058, 390, 4, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
    }
    drawMacroRoute(ctx, time) {
      const points = macroRoutePoints;
      ctx.save(); path(ctx, points); ctx.strokeStyle = 'rgba(139,232,193,.28)'; ctx.lineWidth = 1.4; ctx.setLineDash([3, 10]); ctx.lineDashOffset = -time * 9; ctx.stroke(); ctx.setLineDash([]);
      const marker = (time * 70) % 480; const progress = marker / 480; const segment = Math.min(2, Math.floor(progress * 3)); const t = progress * 3 - segment;
      const from = points[segment]; const to = points[segment + 1]; ctx.fillStyle = '#dbff9c'; ctx.shadowColor = '#dbff9c'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, 3, 0, TAU); ctx.fill(); ctx.restore();
    }
    drawMacroMarker(ctx, target, state, stage, time) {
      const unlocked = target.index <= state.furthestIndex; const current = stage.id === target.id;
      ctx.save(); ctx.translate(target.x, target.y); ctx.globalAlpha = unlocked ? 1 : .25;
      ctx.strokeStyle = current ? '#d3f58a' : '#75ddc5'; ctx.lineWidth = current ? 1.5 : 1;
      const radius = current ? 16 + Math.sin(time * 3) * 2 : 11;
      ctx.shadowColor = current ? '#d3f58a' : '#73dccc'; ctx.shadowBlur = current ? 15 : 7;
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fillStyle = ctx.strokeStyle; ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = current ? '#dff8ab' : '#a8cfbf'; ctx.font = '9px "DM Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(target.label, 0, -22);
      if (!unlocked) { ctx.globalAlpha = .45; ctx.strokeStyle = '#8db4ae'; ctx.beginPath(); ctx.arc(0, 0, 3, Math.PI, 0); ctx.lineTo(3, 4); ctx.arc(0, 4, 3, 0, Math.PI); ctx.closePath(); ctx.stroke(); }
      ctx.restore();
    }
    drawStartBeacon(ctx, x, y, time) {
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = .78;
      for (let ring = 0; ring < 3; ring++) { ctx.strokeStyle = `rgba(114,234,214,${.16 - ring * .035})`; ctx.lineWidth = 1; const radius = 82 + ring * 24 + Math.sin(time * 1.5 - ring) * 4; ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(126,239,219,.3)'; ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.arc(0, 0, 60, time * .22, time * .22 + Math.PI * 1.1); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    }
    drawJourneyWorld(ctx, stage, state, time, camera) {
      const half = this.width / (2 * this.scale * camera.zoom);
      const left = camera.x - half - 90; const right = camera.x + half + 90; const span = right - left;
      const stroma = ctx.createLinearGradient(0, 0, 0, 365); stroma.addColorStop(0, '#102a29'); stroma.addColorStop(1, '#183c39');
      const membrane = ctx.createLinearGradient(0, 360, 0, 560); membrane.addColorStop(0, '#26756a'); membrane.addColorStop(.16, '#123d3e'); membrane.addColorStop(.52, '#12363d'); membrane.addColorStop(.85, '#174b50'); membrane.addColorStop(1, '#318477');
      const lumen = ctx.createLinearGradient(0, 550, 0, 900); lumen.addColorStop(0, '#133c4d'); lumen.addColorStop(1, '#091c30');
      ctx.fillStyle = stroma; ctx.fillRect(left, 0, span, 365); ctx.fillStyle = membrane; ctx.fillRect(left, 365, span, 190); ctx.fillStyle = lumen; ctx.fillRect(left, 555, span, 345);
      const haze = ctx.createRadialGradient(camera.x + 220, 412, 30, camera.x + 220, 445, 750); haze.addColorStop(0, 'rgba(87,201,164,.12)'); haze.addColorStop(1, 'rgba(5,18,29,0)');
      ctx.fillStyle = haze; ctx.fillRect(left, 0, span, 900);
      this.drawJourneyMembrane(ctx, left, right, time); this.drawJourneyRegions(ctx, left, right, time);
      this.drawJourneyRail(ctx, left, right, time); this.drawJourneyProtons(ctx, state, time);
      this.drawJourneyStations(ctx, left, right, time, state); this.drawJourneyHazards(ctx, left, right, time);
      this.drawJourneyProducts(ctx, state, time); this.drawRunnerElectron(ctx, time);
    }
    drawJourneyMembrane(ctx, left, right, time) {
      ctx.save(); ctx.strokeStyle = 'rgba(126,235,205,.52)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(left, 378); ctx.bezierCurveTo(left + 250, 365, right - 300, 394, right, 377); ctx.stroke();
      ctx.strokeStyle = 'rgba(143,225,206,.24)'; ctx.beginPath(); ctx.moveTo(left, 545); ctx.bezierCurveTo(left + 320, 561, right - 250, 531, right, 548); ctx.stroke();
      const firstTile = Math.floor(left / this.membranePattern.width) * this.membranePattern.width;
      for (let x = firstTile; x < right; x += this.membranePattern.width) ctx.drawImage(this.membranePattern, x, 365);
      ctx.restore();
    }
    drawJourneyRegions(ctx, left, right, time) {
      const x = left + 115; ctx.save(); ctx.font = '10px \"DM Mono\", Consolas, monospace'; ctx.letterSpacing = '2px'; ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(190,234,169,.68)'; ctx.fillText('STROMA', x, 74);
      ctx.fillStyle = 'rgba(127,235,212,.58)'; ctx.fillText('THYLAKOID MEMBRANE', x, 350);
      ctx.fillStyle = 'rgba(151,202,239,.62)'; ctx.fillText('THYLAKOID LUMEN', x, 606);
      ctx.font = '8px \"DM Mono\", Consolas, monospace'; ctx.letterSpacing = '1px'; ctx.fillStyle = 'rgba(153,216,195,.4)'; ctx.fillText('บริเวณรับอิเล็กตรอน', x, 93);
      ctx.fillStyle = 'rgba(137,194,225,.4)'; ctx.fillText('แหล่งสะสมโปรตอน', x, 624);
      for (let i = 0; i < 5; i++) {
        const px = left + ((i * 257 + time * 8) % Math.max(1, right - left)); const py = 120 + (i * 83) % 205;
        ctx.globalAlpha = .2 + .09 * Math.sin(time * 1.4 + i); ctx.fillStyle = i % 2 ? '#92ecd1' : '#c4ee99';
        ctx.beginPath(); ctx.arc(px, py, 2 + i % 3, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    drawJourneyRail(ctx, left, right, time) {
      ctx.save(); ctx.strokeStyle = 'rgba(118,241,211,.18)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(left, 444); ctx.lineTo(right, 444); ctx.stroke();
      ctx.strokeStyle = 'rgba(197,255,150,.57)'; ctx.lineWidth = 1.1; ctx.setLineDash([3, 11]); ctx.lineDashOffset = -time * 26; ctx.beginPath(); ctx.moveTo(left, 444); ctx.lineTo(right, 444); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = .18; ctx.strokeStyle = '#ddff9d'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, 465); ctx.lineTo(right, 465); ctx.stroke(); ctx.restore();
    }
    drawJourneyProtons(ctx, state, time) {
      for (let i = 0; i < state.lumenProtons; i++) {
        const xBase = i < 4 ? 520 : 1800; const local = i % 4;
        const x = xBase + (local - 1.5) * 24 + Math.sin(time * 1.5 + i) * 3; const y = (i < 4 ? 600 : 650) + Math.cos(time * 1.1 + i * 2) * 12;
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = '#9edfff'; ctx.shadowColor = '#78cfff'; ctx.shadowBlur = 7; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = '#e8fbff'; ctx.font = '7px \"DM Mono\", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText('+', x, y + 2.5); ctx.restore();
      }
      if (state.protonFlowActive) for (let i = 0; i < 4; i++) {
        const phase = (time * 1.1 + i * .25) % 1; const y = 530 - phase * 150;
        ctx.save(); ctx.globalAlpha = .45 + .45 * Math.sin(phase * Math.PI); ctx.fillStyle = '#c7f8ff'; ctx.shadowColor = '#8edcff'; ctx.shadowBlur = 9;
        ctx.beginPath(); ctx.arc(5000 + Math.sin(phase * Math.PI * 2 + i) * 9, y, 4.5, 0, TAU); ctx.fill(); ctx.restore();
      }
    }
    drawJourneyStations(ctx, left, right, time, state) {
      const completeCount = this.journey.completedCount;
      for (let i = 0; i < this.journey.checkpoints.length; i++) {
        const checkpoint = this.journey.checkpoints[i];
        if (checkpoint.x < left - 160 || checkpoint.x > right + 160) continue;
        const station = this.stations.find(item => item.id === checkpoint.stationId); const y = station ? station.y : 444;
        this.drawJourneyStation(ctx, checkpoint, i, checkpoint.x, y, i < completeCount, this.journey.mode === 'station' && i === this.journey.activeCheckpointIndex, i <= completeCount, time, state);
      }
      const extras = this.stations.filter(item => ['mirror', 'reagent', 'nadph', 'proton-pool', 'lock-ring', 'atp'].includes(item.id));
      for (const station of extras) if (station.x >= left - 110 && station.x <= right + 110) this.drawAuxiliaryStation(ctx, station, time, state);
      if (state.lumenProtons) {
        ctx.save(); ctx.fillStyle = 'rgba(8,20,34,.78)'; ctx.strokeStyle = 'rgba(112,191,233,.36)'; roundRect(ctx, 1746, 704, 108, 24, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#b5e5fa'; ctx.font = '8px \"DM Mono\", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText('H⁺ ใน Lumen × ' + state.lumenProtons, 1800, 720); ctx.restore();
      }
    }
    drawJourneyStation(ctx, checkpoint, index, x, y, complete, active, unlocked, time, state) {
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = unlocked ? 1 : .48; const color = active ? '#ddf69a' : complete ? '#9fe7bc' : '#7edbcf';
      ctx.shadowColor = color; ctx.shadowBlur = active ? 12 : complete ? 7 : 4; ctx.strokeStyle = color; ctx.fillStyle = 'rgba(8,25,32,.93)'; ctx.lineWidth = active ? 2 : 1.2;
      const id = checkpoint.id;
      if (id === 'psii' || id === 'psi') {
        roundRect(ctx, -48, -43, 96, 86, 15); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(78,158,128,.5)'; roundRect(ctx, -36, -31, 72, 62, 11); ctx.fill(); ctx.stroke();
        for (let j = -2; j <= 2; j++) { ctx.fillStyle = j === 0 ? '#d7f594' : '#8dddc6'; ctx.beginPath(); ctx.arc(j * 12, 0, 5.5, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#e7f5e3'; ctx.font = '9px \"DM Mono\", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(id === 'psii' ? 'P680' : 'P700', 0, 24);
      } else if (id === 'cytochrome') {
        roundRect(ctx, -47, -54, 94, 108, 16); ctx.fill(); ctx.stroke();
        for (let j = -1; j <= 1; j++) { ctx.fillStyle = j === 0 ? 'rgba(101,197,165,.82)' : 'rgba(54,132,128,.72)'; roundRect(ctx, j * 22 - 8, -34, 16, 68, 5); ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.stroke();
      } else if (id === 'pq' || id === 'pc') {
        ctx.beginPath(); ctx.ellipse(0, 0, 32, 23, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#d5f494'; ctx.beginPath(); ctx.arc(-4, -2, 4, 0, TAU); ctx.fill();
      } else if (id === 'fd-rocket') {
        path(ctx, [{ x: 34, y: 0 }, { x: 11, y: -18 }, { x: -20, y: -18 }, { x: -32, y: 0 }, { x: -20, y: 18 }, { x: 11, y: 18 }], true); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#d7fa9a'; ctx.beginPath(); ctx.arc(2, 0, 7, 0, TAU); ctx.fill();
      } else if (id === 'fnr') {
        path(ctx, [{ x: -41, y: -23 }, { x: -22, y: -43 }, { x: 22, y: -43 }, { x: 41, y: -23 }, { x: 41, y: 23 }, { x: 22, y: 43 }, { x: -22, y: 43 }, { x: -41, y: 23 }], true); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.stroke(); ctx.fillStyle = '#c9f298'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      } else if (id === 'atp-synthase') {
        roundRect(ctx, -39, -72, 78, 144, 22); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(125,221,201,.62)'; roundRect(ctx, -27, -62, 54, 55, 16); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(30,72,88,.9)'; roundRect(ctx, -23, 4, 46, 57, 11); ctx.fill(); ctx.stroke();
        const spin = state.protonFlowActive ? time * 4 : time * .25; ctx.beginPath(); ctx.arc(0, 10, 14, spin, spin + Math.PI * 1.5); ctx.stroke();
      } else if (id === 'calvin-cycle') {
        ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 39, -.65, 1.1); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 39, 1.45, 3.2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 39, 3.55, 5.2); ctx.stroke();
        ctx.fillStyle = '#d5f393'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill();
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = unlocked ? 1 : .6; ctx.fillStyle = complete ? '#b9ebc5' : active ? '#e5f5b0' : '#bed9d2'; ctx.font = '8px \"DM Mono\", Consolas, monospace'; ctx.textAlign = 'center'; ctx.letterSpacing = '.5px';
      const labelY = id === 'fd-rocket' || id === 'fnr' || id === 'calvin-cycle' ? -54 : 66; ctx.fillText(checkpoint.label, 0, labelY);
      if (complete) { ctx.fillStyle = '#d4f594'; ctx.font = '7px \"DM Mono\", Consolas, monospace'; ctx.fillText('✓ บันทึกจุดพักแล้ว', 0, labelY + 13); }
      else if (active) { ctx.fillStyle = '#e0f4a3'; ctx.font = '7px \"DM Mono\", Consolas, monospace'; ctx.fillText('สถานีปัจจุบัน', 0, labelY + 13); }
      else if (!unlocked) { ctx.globalAlpha = .65; ctx.strokeStyle = '#9bb5b4'; ctx.beginPath(); ctx.arc(0, -53, 4, Math.PI, TAU); ctx.lineTo(4, 0); ctx.arc(0, 0, 4, 0, Math.PI); ctx.closePath(); ctx.stroke(); }
      if (active) { ctx.globalAlpha = .32; ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 61 + Math.sin(time * 3) * 4, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
    drawAuxiliaryStation(ctx, station, time, state) {
      ctx.save(); ctx.translate(station.x, station.y); ctx.strokeStyle = 'rgba(132,223,202,.53)'; ctx.fillStyle = 'rgba(8,28,34,.85)'; ctx.lineWidth = 1;
      if (station.kind === 'mirror') {
        path(ctx, [{ x: 0, y: -25 }, { x: 22, y: 0 }, { x: 0, y: 25 }, { x: -22, y: 0 }], true); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.rotate(this.animator.mirrorAngle * Math.PI / 180 + Math.PI / 2); ctx.strokeStyle = '#d5f49a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(17, 0); ctx.stroke(); ctx.restore();
      } else if (station.kind === 'pool') {
        ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.stroke();
        for (let i = 0; i < Math.min(8, state.lumenProtons); i++) { const a = time * .3 + i * TAU / Math.max(1, state.lumenProtons); ctx.fillStyle = '#b8ebff'; ctx.beginPath(); ctx.arc(Math.cos(a) * (17 + i % 3 * 4), Math.sin(a) * (16 + i % 2 * 4), 4, 0, TAU); ctx.fill(); }
      } else if (station.kind === 'ring') {
        ctx.beginPath(); ctx.arc(0, 0, 22 + Math.sin(time * 3) * 2, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, station.radius, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, station.radius * .65, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#e8f4de'; ctx.font = '8px \"DM Mono\", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(station.id === 'nadph' ? 'N' : 'P', 0, 3);
      }
      ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(195,223,212,.72)'; ctx.font = '7px \"DM Mono\", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(station.label, 0, station.radius + 17); ctx.restore();
    }
    drawJourneyHazards(ctx, left, right, time) {
      for (const hazard of this.journey.hazards) {
        if (hazard.x < left - 60 || hazard.x > right + 60) continue;
        const pulse = .78 + .22 * Math.sin(time * 5 + hazard.x); ctx.save(); ctx.translate(hazard.x, hazard.y); ctx.globalAlpha = .78 * pulse;
        ctx.strokeStyle = '#ff9b87'; ctx.fillStyle = 'rgba(152,53,68,.43)'; ctx.shadowColor = '#ff755f'; ctx.shadowBlur = 9;
        ctx.beginPath(); ctx.arc(0, 0, hazard.radius * .72, 0, TAU); ctx.fill(); ctx.stroke();
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + time * .18; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * hazard.radius, Math.sin(a) * hazard.radius); ctx.stroke(); }
        ctx.shadowBlur = 0; ctx.fillStyle = '#ffe2cb'; ctx.font = '8px \"DM Mono\", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(hazard.label, 0, 3);
        ctx.fillStyle = 'rgba(238,174,163,.6)'; ctx.font = '6px \"DM Mono\", Consolas, monospace'; ctx.fillText('อันตรายจาก ROS', 0, hazard.radius + 13); ctx.restore();
      }
    }
    drawJourneyProducts(ctx, state, time) {
      if (state.hasProduct('o2')) {
        const phase = this.animator.oxygenPhase; const y = 390 - phase * 210; const x = 520 + Math.sin(time * 2.1) * 10;
        ctx.save(); ctx.globalAlpha = .45 + .45 * Math.sin(Math.min(1, phase + .2) * Math.PI); ctx.strokeStyle = '#bde7ff'; ctx.fillStyle = 'rgba(143,199,234,.24)'; ctx.shadowColor = '#94d7ff'; ctx.shadowBlur = 7;
        ctx.beginPath(); ctx.arc(x - 7, y, 6, 0, TAU); ctx.arc(x + 7, y - 2, 7, 0, TAU); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = '#c4e3f4'; ctx.font = '8px \"DM Mono\", Consolas, monospace'; ctx.fillText('ปล่อย O₂ แล้ว ↑', x + 19, y - 5); ctx.restore();
      }
      if (state.hasProduct('atp') || state.hasProduct('nadph')) {
        ctx.save(); ctx.strokeStyle = 'rgba(207,244,145,.43)'; ctx.lineWidth = 1.3; ctx.setLineDash([4, 9]); ctx.lineDashOffset = -time * 10;
        if (state.hasProduct('nadph')) { ctx.beginPath(); ctx.moveTo(4570, 142); ctx.bezierCurveTo(4900, 40, 5300, 60, 5600, 150); ctx.stroke(); }
        if (state.hasProduct('atp')) { ctx.beginPath(); ctx.moveTo(5200, 190); ctx.bezierCurveTo(5320, 165, 5480, 130, 5600, 150); ctx.stroke(); }
        ctx.setLineDash([]); ctx.restore();
      }
    }
    drawRunnerElectron(ctx, time) {
      if (!this.runner || !this.journey.worldStarted || this.journey.gameFinished) return;
      const player = this.runner.player; if (this.runner.invulnerable > 0 && Math.floor(time * 14) % 2 === 0) return;
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.translate(player.x, player.y + Math.sin(time * 6) * 2);
      ctx.shadowColor = '#e2ff9b'; ctx.shadowBlur = 12; ctx.fillStyle = '#edffb0'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      ctx.globalAlpha = .52; ctx.beginPath(); ctx.arc(-15, 2, 4.3, 0, TAU); ctx.fill(); ctx.globalAlpha = .26; ctx.beginPath(); ctx.arc(-28, 5, 3, 0, TAU); ctx.fill();
      ctx.globalAlpha = .35; ctx.strokeStyle = '#dbff9e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 13 + Math.sin(time * 4) * 2, 0, TAU); ctx.stroke(); ctx.restore();
    }
    drawReaction(ctx, stage, state, time, camera, transition) {
      if (transition.isActive || camera.zoom <= 1.15) {
        ctx.drawImage(this.reactionBaseCanvas, 0, 0, 1440, 900);
        this.drawMembranePulse(ctx, time);
      } else this.drawReactionBase(ctx, time);
      this.drawReactionRails(ctx, time);
      this.drawPhotonEffects(ctx, stage, time, state); this.drawElectronParticle(ctx, time); this.drawProtons(ctx, time, stage);
      this.drawOxygen(ctx, time, state); this.drawStations(ctx, stage, state, time); this.drawOEC(ctx, state, time);
      this.drawProductLinks(ctx, stage, state, time); this.drawProductInventory(ctx, state, time);
      this.drawReactionAnnotations(ctx, stage);
    }
    buildReactionBaseCache() {
      this.reactionBaseCanvas = document.createElement('canvas');
      this.reactionBaseCanvas.width = 2880; this.reactionBaseCanvas.height = 1800;
      const base = this.reactionBaseCanvas.getContext('2d');
      base.scale(2, 2);
      this.drawReactionBase(base, undefined, 2);
      this.reactionBaseReady = true;
    }
    drawReactionBase(ctx, time, blurScale = 1) {
      const bg = ctx.createLinearGradient(0, 30, 0, 850); bg.addColorStop(0, 'rgba(19,53,51,.66)'); bg.addColorStop(.36, 'rgba(12,39,43,.76)'); bg.addColorStop(.62, 'rgba(9,30,45,.78)'); bg.addColorStop(1, 'rgba(8,23,38,.55)');
      ctx.fillStyle = bg; roundRect(ctx, 36, 42, 1368, 800, 28); ctx.fill();
      ctx.strokeStyle = 'rgba(115,202,188,.2)'; ctx.lineWidth = 1.2; roundRect(ctx, 36, 42, 1368, 800, 28); ctx.stroke();
      this.drawRegionLabels(ctx); this.drawMembraneBase(ctx, blurScale);
      if (Number.isFinite(time)) this.drawMembranePulse(ctx, time);
    }
    drawRegionLabels(ctx) {
      ctx.save(); ctx.font = '10px "DM Mono", Consolas, monospace'; ctx.letterSpacing = '2px'; ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(172,224,172,.69)'; ctx.fillText('STROMA', 79, 91);
      ctx.fillStyle = 'rgba(112,222,209,.68)'; ctx.fillText('THYLAKOID MEMBRANE', 79, 359);
      ctx.fillStyle = 'rgba(137,197,234,.7)'; ctx.fillText('THYLAKOID LUMEN', 79, 811);
      ctx.font = '8px "DM Mono", Consolas, monospace'; ctx.letterSpacing = '1px'; ctx.fillStyle = 'rgba(159,198,186,.47)'; ctx.fillText('บริเวณรับ H⁺', 79, 111);
      ctx.fillStyle = 'rgba(135,184,216,.47)'; ctx.fillText('แหล่งสะสมโปรตอน', 79, 831); ctx.restore();
    }
    drawMembrane(ctx, time) {
      this.drawMembraneBase(ctx);
      this.drawMembranePulse(ctx, time);
    }
    drawMembraneBase(ctx, blurScale = 1) {
      const gradient = ctx.createLinearGradient(0, 365, 0, 550); gradient.addColorStop(0, 'rgba(36,126,116,.62)'); gradient.addColorStop(.18, 'rgba(21,81,85,.91)'); gradient.addColorStop(.54, 'rgba(20,66,75,.96)'); gradient.addColorStop(1, 'rgba(35,117,115,.63)');
      ctx.save(); ctx.shadowColor = 'rgba(63,221,198,.19)'; ctx.shadowBlur = 26 * blurScale; ctx.fillStyle = gradient; roundRect(ctx, 58, 365, 1324, 185, 44); ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(114,229,206,.47)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(85, 383); ctx.bezierCurveTo(430, 366, 945, 396, 1354, 378); ctx.stroke();
      ctx.strokeStyle = 'rgba(139,221,197,.23)'; ctx.beginPath(); ctx.moveTo(85, 533); ctx.bezierCurveTo(480, 552, 988, 520, 1354, 539); ctx.stroke();
      ctx.strokeStyle = 'rgba(125,234,212,.11)'; ctx.lineWidth = 1; ctx.setLineDash([2, 12]);
      for (let x = 115; x < 1375; x += 18) { ctx.beginPath(); ctx.moveTo(x, 397); ctx.lineTo(x + 2, 516); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    drawMembranePulse(ctx, time) {
      ctx.save(); ctx.globalAlpha = .34 + .08 * Math.sin(time * 1.3); ctx.strokeStyle = '#9ff3d7'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(86, 458); ctx.lineTo(1354, 458); ctx.stroke(); ctx.restore();
    }
    drawReactionRails(ctx, time) {
      ctx.save(); path(ctx, this.electronRail); ctx.strokeStyle = 'rgba(86,223,210,.19)'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 9]); ctx.lineDashOffset = -time * 12; ctx.stroke(); ctx.setLineDash([]);
      for (const rail of reactionProtonPaths) { path(ctx, rail); ctx.strokeStyle = 'rgba(112,183,242,.22)'; ctx.lineWidth = 1.1; ctx.setLineDash([2, 8]); ctx.lineDashOffset = time * 8; ctx.stroke(); }
      ctx.setLineDash([]); ctx.restore();
    }
    drawElectronParticle(ctx, time) {
      const electron = this.animator.electronPosition; if (!electron.visible) return;
      if (this.animator.carrier) return;
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.shadowColor = '#d9ff94'; ctx.shadowBlur = 19; ctx.fillStyle = '#dcff9b';
      ctx.beginPath(); ctx.arc(electron.x, electron.y, 5.1, 0, TAU); ctx.fill();
      ctx.globalAlpha = .48; ctx.beginPath(); ctx.arc(electron.x - 11, electron.y + 4, 3, 0, TAU); ctx.fill(); ctx.globalAlpha = .22; ctx.beginPath(); ctx.arc(electron.x - 21, electron.y + 7, 2, 0, TAU); ctx.fill();
      ctx.restore();
    }
    drawProtons(ctx, time, stage) {
      const count = this.animator.protonCount;
      if (!count) return;
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < count; i++) {
        const point = this.animator.protonPosition(i); const pulse = .75 + .25 * Math.sin(time * 3 + i);
        ctx.globalAlpha = .65 + .2 * pulse; ctx.fillStyle = point.flowing ? '#c5f7ff' : '#86d9ff'; ctx.shadowColor = point.flowing ? '#bbf5ff' : '#66bbff'; ctx.shadowBlur = point.flowing ? 19 : 12;
        ctx.beginPath(); ctx.arc(point.x, point.y, 3.1 + pulse, 0, TAU); ctx.fill();
        ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(234,250,255,.92)'; ctx.font = '7px "DM Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText('+', point.x, point.y + 2.5);
      }
      if (stage.index >= 17) { ctx.globalAlpha = .78; ctx.fillStyle = '#9cdcff'; ctx.font = '9px "DM Mono", Consolas, monospace'; ctx.textAlign = 'left'; ctx.fillText(`H⁺ × ${count}`, 626, 755); }
      ctx.restore();
    }
    drawOxygen(ctx, time, state) {
      if (!state.hasProduct('o2')) return;
      const phase = this.animator.oxygenPhase; const x = 226 + Math.sin(phase * 8 + time) * 8; const y = 460 - phase * 148;
      ctx.save(); ctx.globalAlpha = .2 + .7 * Math.sin(Math.min(1, phase + .12) * Math.PI); ctx.strokeStyle = '#bde5ff'; ctx.fillStyle = 'rgba(133,196,236,.15)'; ctx.lineWidth = 1; ctx.shadowColor = '#8ccfff'; ctx.shadowBlur = 11;
      ctx.beginPath(); ctx.arc(x - 7, y, 5.8, 0, TAU); ctx.arc(x + 6, y - 2, 6.8, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 0; ctx.font = '8px "DM Mono", Consolas, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#b9dcf1'; ctx.fillText('ปล่อย O₂ ↑', x + 17, y - 5); ctx.restore();
    }
    drawStations(ctx, stage, state, time) {
      for (const station of this.stations) {
        const unlocked = station.stageIndex <= state.furthestIndex; const active = station.stageId === stage.id;
        this.drawStation(ctx, station, unlocked, active, time, state);
      }
    }
    drawStation(ctx, station, unlocked, active, time, state) {
      const { kind } = station; const position = kind === 'rocket' ? this.animator.rocketPosition : station; const { x, y } = position;
      ctx.save(); ctx.translate(x, y); ctx.globalAlpha = unlocked ? 1 : .12;
      const color = active ? '#dcf49a' : (station.zone === 'lumen' ? '#85c7f1' : '#83e7d2');
      ctx.strokeStyle = color; ctx.fillStyle = 'rgba(9,27,34,.89)'; ctx.lineWidth = active ? 1.7 : 1.05; ctx.shadowColor = color; ctx.shadowBlur = active ? 18 + Math.sin(time * 3) * 4 : unlocked ? 7 : 0;
      if (kind === 'photosystem') {
        roundRect(ctx, -48, -43, 96, 87, 17); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(53,135,116,.42)'; roundRect(ctx, -37, -32, 74, 64, 12); ctx.fill(); ctx.stroke();
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 11, 0, 5, 0, TAU); ctx.fillStyle = i === 0 ? '#dafa9a' : color; ctx.fill(); }
        ctx.fillStyle = '#e5f3e0'; ctx.font = '8px "DM Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(station.id === 'psii' ? 'P680' : 'P700', 0, 22);
      } else if (kind === 'complex') {
        roundRect(ctx, -45, -52, 90, 104, 17); ctx.fill(); ctx.stroke();
        for (let i = -1; i <= 1; i++) { ctx.fillStyle = i ? 'rgba(67,148,137,.68)' : 'rgba(89,191,168,.7)'; roundRect(ctx, -26 + i * 20, -30, 17, 60, 6); ctx.fill(); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, -4, 12, 0, TAU); ctx.stroke();
      } else if (kind === 'synthase') {
        ctx.fillStyle = 'rgba(43,132,128,.85)'; roundRect(ctx, -39, -72, 78, 144, 26); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(119,222,202,.66)'; roundRect(ctx, -28, -61, 56, 61, 22); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(30,72,88,.93)'; roundRect(ctx, -24, 0, 48, 63, 12); ctx.fill(); ctx.stroke();
        const spin = this.animator.protonFlow ? this.animator.synthaseSpin : time * .24;
        ctx.beginPath(); ctx.arc(0, 7, 15, spin, spin + Math.PI * 1.55); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(0, 43); ctx.stroke();
      } else if (kind === 'carrier') {
        ctx.fillStyle = 'rgba(19,55,62,.92)'; ctx.beginPath(); ctx.arc(0, 0, station.radius, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, station.radius * .56, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(-4, -3, 4, 0, TAU); ctx.fillStyle = '#c8f499'; ctx.fill();
        if (this.animator.carrier === station.id) { ctx.globalAlpha = .15; ctx.beginPath(); ctx.arc(0, 0, station.radius + 10, 0, TAU); ctx.stroke(); }
      } else if (kind === 'mirror') {
        path(ctx, [{ x: 0, y: -27 }, { x: 24, y: 0 }, { x: 0, y: 27 }, { x: -24, y: 0 }], true); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.rotate((this.animator.mirrorAngle * Math.PI / 180) + Math.PI / 2); ctx.strokeStyle = '#d7f69b'; ctx.lineWidth = 3; ctx.shadowColor = '#c9f48d'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(-19, 0); ctx.lineTo(19, 0); ctx.stroke(); ctx.restore();
      } else if (kind === 'rocket') {
        path(ctx, [{ x: 30, y: 0 }, { x: 8, y: -15 }, { x: -15, y: -15 }, { x: -25, y: 0 }, { x: -15, y: 15 }, { x: 8, y: 15 }], true); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(1, 0, 6, 0, TAU); ctx.fillStyle = '#d8fa9d'; ctx.fill();
        ctx.fillStyle = '#f0b17a'; path(ctx, [{ x: -23, y: -8 }, { x: -40 - Math.sin(time * 8) * 4, y: 0 }, { x: -23, y: 8 }], true); ctx.fill();
        ctx.fillStyle = '#f3fae8'; ctx.font = '7px "DM Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText('Fd', 0, 2);
        if (position.progress > 0 && position.progress < 1) { ctx.globalAlpha = .4; ctx.strokeStyle = '#e7ff9b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-31, -6); ctx.lineTo(-58 - Math.sin(time * 15) * 6, -6); ctx.moveTo(-31, 6); ctx.lineTo(-58 - Math.sin(time * 15 + 1) * 6, 6); ctx.stroke(); }
      } else if (kind === 'lab' || kind === 'reagent') {
        const size = kind === 'lab' ? 34 : 22; path(ctx, [{ x: -size * .75, y: -size * .4 }, { x: -size * .45, y: -size }, { x: size * .45, y: -size }, { x: size * .75, y: -size * .4 }, { x: size * .75, y: size * .5 }, { x: 0, y: size }, { x: -size * .75, y: size * .5 }], true); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, size * .32, 0, TAU); ctx.stroke(); ctx.fillStyle = '#c9f29b'; ctx.fill();
      } else if (kind === 'pool') {
        ctx.beginPath(); ctx.arc(0, 0, 37, 0, TAU); ctx.stroke();
        for (let i = 0; i < Math.min(8, state.lumenProtons); i++) { const angle = time * .3 + i * TAU / Math.max(1, state.lumenProtons); ctx.beginPath(); ctx.arc(Math.cos(angle) * (17 + i % 3 * 4), Math.sin(angle) * (15 + i % 2 * 5), 4, 0, TAU); ctx.fillStyle = '#b7e8ff'; ctx.fill(); }
      } else if (kind === 'ring') {
        ctx.beginPath(); ctx.arc(0, 0, 20 + Math.sin(time * 3) * 2, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke();
      } else if (kind === 'cycle') {
        ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 34, -.6, 1.15); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 34, 1.5, 3.25); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 34, 3.6, 5.25); ctx.stroke();
        ctx.fillStyle = '#d7f49a'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill();
      } else if (kind === 'product') {
        ctx.beginPath(); ctx.arc(0, 0, station.radius, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, station.radius * .67, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#ecf7dd'; ctx.font = '9px "DM Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(station.id === 'nadph' ? 'N' : 'P', 0, 3);
      }
      ctx.shadowBlur = 0;
      if (unlocked) {
        ctx.globalAlpha = active ? 1 : .79; ctx.fillStyle = active ? '#e2f4b2' : '#b4d4cc'; ctx.font = '8px "DM Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.letterSpacing = '.55px';
        const labelY = station.zone === 'lumen' ? station.radius + 18 : station.radius + 20;
        ctx.fillText(station.label, 0, labelY);
        if (active) { ctx.globalAlpha = .48; ctx.fillStyle = color; ctx.font = '7px "DM Mono", Consolas, monospace'; ctx.fillText('สถานีทำงาน', 0, labelY + 12); }
      } else {
        ctx.globalAlpha = .43; ctx.strokeStyle = '#9eb6b6'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -station.radius - 5, 4, Math.PI, TAU); ctx.lineTo(4, 0); ctx.arc(0, 0, 4, 0, Math.PI); ctx.closePath(); ctx.stroke();
      }
      if (unlocked && !active) { ctx.globalAlpha = .14; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, station.radius + 10 + Math.sin(time * 2 + station.stageIndex) * 2, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
    drawCarrierVehicle(ctx, time) {
      const position = this.animator.carrierPosition; if (!position) return;
      const label = this.animator.carrier === 'pq' ? 'PQ' : 'PC';
      ctx.save(); ctx.translate(position.x, position.y); ctx.shadowColor = '#8cf2dc'; ctx.shadowBlur = 15; ctx.fillStyle = 'rgba(11,35,42,.96)'; ctx.strokeStyle = '#8be4d3'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(0, 0, 23, 13, .04, 0, TAU); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(160,246,212,.57)'; ctx.beginPath(); ctx.ellipse(0, 0, 16, 8, 0, Math.PI * .1, Math.PI * 1.88); ctx.stroke();
      ctx.fillStyle = '#d8fa99'; ctx.shadowColor = '#d8fa99'; ctx.shadowBlur = 6; ctx.beginPath(); ctx.arc(0, 0, 3.3 + Math.sin(time * 5) * .7, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#c6e6d5'; ctx.font = '6px "DM Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(label, 0, 22); ctx.restore();
    }
    drawPhotonEffects(ctx, stage, time, state) {
      const activePSII = stage.id === 'psii' || stage.id === 'water-splitting';
      const activePSI = stage.id === 'psi' || stage.id === 'mirror';
      if (activePSII || activePSI) {
        const x = activePSII ? 185 : 855; const y = activePSII ? 445 : 445;
        const pulse = .42 + .23 * Math.sin(time * 4) + this.animator.lightFlash * .35;
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = Math.max(.15, pulse); ctx.strokeStyle = '#e7ff9b'; ctx.fillStyle = 'rgba(220,255,163,.08)'; ctx.shadowColor = '#e7ff9b'; ctx.shadowBlur = 22;
        path(ctx, [{ x: x - 30, y: 84 }, { x: x + 30, y: 84 }, { x: x + 14, y: y - 44 }, { x: x - 14, y: y - 44 }], true); ctx.fill();
        ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x, 94); ctx.lineTo(x, y - 42); ctx.stroke(); ctx.restore();
      }
      if (stage.id === 'mirror' || state.hasObjective('mirror-aligned')) {
        const angle = this.animator.mirrorAngle * Math.PI / 180; const dx = -2 * Math.sin(angle) * Math.cos(angle); const dy = 1 - 2 * Math.sin(angle) * Math.sin(angle);
        ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = state.hasObjective('mirror-aligned') ? '#dcff9d' : '#c1e9f0'; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = state.hasObjective('mirror-aligned') ? 18 : 9; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(965, 218); ctx.lineTo(965, 322); ctx.stroke(); ctx.beginPath(); ctx.moveTo(965, 323); ctx.lineTo(965 + dx * 205, 323 + dy * 205); ctx.stroke();
        ctx.globalAlpha = .45; ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(855, 445, 7 + Math.sin(time * 4) * 2, 0, TAU); ctx.fill(); ctx.restore();
      }
      this.drawCarrierVehicle(ctx, time);
    }
    drawOEC(ctx, state, time) {
      const active = state.currentIndex === 7; const completed = state.hasObjective('water-split');
      ctx.save(); ctx.translate(224, 486); ctx.globalAlpha = state.furthestIndex >= 7 ? 1 : .36;
      ctx.strokeStyle = 'rgba(168,234,207,.48)'; ctx.fillStyle = 'rgba(8,25,31,.9)'; ctx.lineWidth = 1.2; ctx.shadowColor = active ? '#a6edcf' : '#61cbb9'; ctx.shadowBlur = active ? 12 + this.animator.waterPulse * 12 : 5;
      ctx.beginPath(); ctx.arc(0, 0, 23, 0, TAU); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 4; i++) { const angle = time * .18 + i * TAU / 4; const px = Math.cos(angle) * 14; const py = Math.sin(angle) * 14; ctx.beginPath(); ctx.arc(px, py, 4 + this.animator.waterPulse * 1.2, 0, TAU); ctx.fillStyle = i === 0 ? '#c8f18f' : '#77d9d2'; ctx.fill(); }
      ctx.shadowBlur = 0; ctx.fillStyle = '#c1dad3'; ctx.font = '7px "DM Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(completed ? 'OEC · ทำงานแล้ว' : 'OEC', 0, 34);
      if (active && !completed) { ctx.globalAlpha = .72; ctx.fillStyle = '#d5f2d1'; ctx.font = '6px "DM Mono", Consolas, monospace'; ctx.fillText('2H₂O', -34, -10); ctx.fillText('2H₂O', 36, 10); }
      if (completed) { ctx.globalAlpha = .82; ctx.fillStyle = '#b9dcf1'; ctx.font = '7px "DM Mono", Consolas, monospace'; ctx.fillText('4H⁺ · 4e⁻ · O₂', 0, 46); }
      ctx.restore();
    }
    drawProductLinks(ctx, stage, state, time) {
      const current = stage.index >= stageIds['calvin-cycle']; if (!current) return;
      ctx.save(); ctx.strokeStyle = 'rgba(206,240,143,.52)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 8]); ctx.lineDashOffset = -time * 10;
      path(ctx, [{ x: 900, y: 195 }, { x: 1000, y: 170 }, { x: 1150, y: 145 }]); ctx.stroke();
      path(ctx, [{ x: 1322, y: 143 }, { x: 1260, y: 115 }, { x: 1150, y: 145 }]); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = .45; ctx.fillStyle = '#d3f59a'; ctx.font = '8px "DM Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText('ส่ง ATP + NADPH ไปยัง CALVIN CYCLE', 1078, 108);
      if (state.hasProduct('o2')) { ctx.strokeStyle = 'rgba(178,221,249,.38)'; ctx.setLineDash([2, 7]); path(ctx, [{ x: 220, y: 360 }, { x: 196, y: 290 }, { x: 165, y: 230 }]); ctx.stroke(); ctx.fillStyle = '#afcbe0'; ctx.fillText('ปล่อย O₂ แล้ว', 181, 216); }
      ctx.restore();
    }
    drawProductInventory(ctx, state, time) {
      const badges = [{ id: 'o2', label: 'ปล่อย O₂ แล้ว', x: 230, y: 168, color: '#acd8f4' }, { id: 'nadph', label: 'NADPH', x: 1300, y: 86, color: '#c5ef9b' }, { id: 'atp', label: 'ATP', x: 880, y: 125, color: '#c5ef9b' }];
      for (const badge of badges) {
        if (!state.hasProduct(badge.id)) continue;
        ctx.save(); ctx.globalAlpha = .88; ctx.fillStyle = 'rgba(8,22,29,.78)'; ctx.strokeStyle = `${badge.color}66`; roundRect(ctx, badge.x - 42, badge.y - 11, 84, 22, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = badge.color; ctx.font = '7px "DM Mono", Consolas, monospace'; ctx.textAlign = 'center'; ctx.fillText(badge.label, badge.x, badge.y + 3);
        if (badge.id === 'atp' || badge.id === 'nadph') { ctx.globalAlpha = .45 + .25 * Math.sin(time * 2.5); ctx.strokeStyle = badge.color; ctx.beginPath(); ctx.arc(badge.x, badge.y, 17, 0, TAU); ctx.stroke(); }
        ctx.restore();
      }
    }
    drawReactionAnnotations(ctx, stage) {
      ctx.save(); ctx.fillStyle = 'rgba(188,215,202,.48)'; ctx.font = '8px "DM Mono", Consolas, monospace'; ctx.textAlign = 'right'; ctx.fillText('เส้นทางอิเล็กตรอน  ─ ─ ─ ›', 1360, 599);
      ctx.fillStyle = 'rgba(147,200,236,.5)'; ctx.textAlign = 'left'; ctx.fillText('ทิศทาง H⁺  ↓   ↑', 82, 607);
      ctx.fillStyle = 'rgba(205,235,197,.45)'; ctx.textAlign = 'right'; ctx.fillText(stage.context, 1362, 815);
      ctx.restore();
    }
    pick(screenX, screenY, viewport, camera, stageManager) {
      const worldX = camera.x + (screenX - viewport.width / 2) / (viewport.scale * camera.zoom);
      const worldY = camera.y + (screenY - viewport.height / 2) / (viewport.scale * camera.zoom);
      const scene = stageManager.current.scene; const candidates = scene === 'reaction' ? this.stations.filter(item => stageManager.isUnlocked(item.stageIndex)) : [
        { stageId: 'cell', stageIndex: 1, x: 620, y: 260, radius: 31 },
        { stageId: 'chloroplast', stageIndex: 2, x: 900, y: 330, radius: 34 },
        { stageId: 'granum', stageIndex: 3, x: 980, y: 397, radius: 32 },
        { stageId: 'thylakoid', stageIndex: 4, x: 1018, y: 426, radius: 35 }
      ].filter(item => stageManager.isUnlocked(item.stageIndex));
      let nearest = null; let nearestDistance = Infinity;
      for (const item of candidates) {
        const distance = Math.hypot(worldX - item.x, worldY - item.y); const threshold = Math.max(item.radius + 11, 22 / (viewport.scale * camera.zoom));
        if (distance <= threshold && distance < nearestDistance) { nearest = item; nearestDistance = distance; }
      }
      return nearest ? { index: nearest.stageIndex, id: nearest.stageId } : null;
    }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.WorldRenderer = WorldRenderer;
})(window);
