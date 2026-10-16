(function (root) {
  class RunnerController {
    constructor(events) {
      this.events = events;
      this.player = { x: 80, y: 444, radius: 13 };
      this.baseY = 444; this.velocityY = 0; this.speed = 218; this.energy = 3;
      this.running = false; this.invulnerable = 0; this.diveHeld = false;
      this.held = new Set();
    }
    start(x = 80) {
      this.player.x = Math.max(80, x); this.player.y = this.baseY; this.velocityY = 0;
      this.running = true; this.invulnerable = 0; this.held.clear();
      this.events.emit('runner:started', { x: this.player.x });
    }
    pause() { this.running = false; this.held.clear(); this.velocityY = 0; this.player.y = this.baseY; }
    resume() { this.running = true; this.held.clear(); this.events.emit('runner:resumed', { x: this.player.x }); }
    setX(x) { this.player.x = Math.max(0, x); this.player.y = this.baseY; this.velocityY = 0; }
    keyDown(code, repeat = false) {
      if (!this.running) return false;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        this.held.add(code);
        if ((code === 'Space' || code === 'ArrowUp') && !repeat) this.jump();
        if (code === 'ArrowDown') this.diveHeld = true;
        return true;
      }
      return false;
    }
    keyUp(code) {
      this.held.delete(code);
      if (code === 'ArrowDown') this.diveHeld = false;
    }
    jump() {
      if (!this.running || this.player.y < this.baseY - 1) return false;
      this.velocityY = -425;
      this.events.emit('runner:jump', { x: this.player.x });
      return true;
    }
    update(dt) {
      if (this.invulnerable > 0) this.invulnerable = Math.max(0, this.invulnerable - dt);
      if (!this.running) return;
      const modifier = (this.held.has('ArrowRight') ? 1.28 : 1) * (this.held.has('ArrowLeft') ? .72 : 1);
      this.player.x += this.speed * modifier * dt;
      if (this.player.y < this.baseY || this.velocityY < 0) {
        this.velocityY += (this.diveHeld ? 1750 : 1120) * dt;
        this.player.y += this.velocityY * dt;
        if (this.player.y >= this.baseY) { this.player.y = this.baseY; this.velocityY = 0; }
      }
    }
    takeHit(respawnX) {
      if (!this.running || this.invulnerable > 0) return false;
      this.energy -= 1; this.invulnerable = 1.45;
      const lost = this.energy <= 0;
      if (lost) { this.energy = 3; this.setX(respawnX); }
      this.events.emit(lost ? 'runner:respawn' : 'runner:damaged', { energy: this.energy, x: this.player.x, respawnX });
      return true;
    }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.RunnerController = RunnerController;
})(window);
