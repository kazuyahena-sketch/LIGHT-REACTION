(function (root) {
  class VFXHooks {
    constructor(eventBus) { this.eventBus = eventBus; this.effects = []; this.nextId = 1; }
    emit(type, options = {}) {
      const effect = { id: this.nextId++, type, x: options.x ?? 720, y: options.y ?? 450, intensity: options.intensity ?? 1, age: 0, life: options.life ?? 1.2 };
      this.effects.push(effect);
      this.eventBus.emit('vfx:emit', { type, options });
      return effect.id;
    }
    update(dt) { for (const effect of this.effects) effect.age += dt; this.effects = this.effects.filter(effect => effect.age < effect.life); }
    draw(ctx) {
      for (const effect of this.effects) {
        const progress = effect.age / effect.life; const fade = 1 - progress; const radius = (8 + progress * 36) * effect.intensity;
        ctx.save(); ctx.globalAlpha = Math.max(0, fade * .55); ctx.strokeStyle = effect.type === 'oxygen-release' ? '#a8dcff' : '#9df7d3'; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 18;
        ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(effect.x, effect.y, radius * .58, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
    }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.VFXHooks = VFXHooks;
})(window);
