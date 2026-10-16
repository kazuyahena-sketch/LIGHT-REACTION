(function (root) {
  class AudioHooks {
    constructor(eventBus) { this.eventBus = eventBus; this.cues = new Map(); }
    registerCue(id, audioSource) { this.cues.set(id, audioSource); }
    cue(id, payload = {}) {
      const source = this.cues.get(id);
      if (source instanceof HTMLAudioElement) { source.currentTime = 0; source.play().catch(() => {}); }
      this.eventBus.emit('audio:cue', { id, payload, available: Boolean(source) });
    }
    stopAll() { for (const source of this.cues.values()) if (source instanceof HTMLAudioElement) { source.pause(); source.currentTime = 0; } }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.AudioHooks = AudioHooks;
})(window);
