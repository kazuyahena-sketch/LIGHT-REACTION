(function (root) {
  class RunnerController {
    constructor(events) {
      this.events = events;
      this.player = { x: 80, y: 444, radius: 13 };
      this.baseY = 444; this.velocityY = 0; this.speed = 218; this.gravity = 760; this.flapVelocity = -157.5; this.energy = 3;
      this.flightBounds = { top: -48, bottom: 948 };
      this.running = false; this.invulnerable = 0; this.held = new Set();
      this.animationTime = 0; this.hitTime = 0; this.flapTime = 0;
    }
    start(x = 80) {
      this.player.x = Math.max(80, x); this.player.y = this.baseY; this.velocityY = 0;
      this.running = true; this.invulnerable = 0; this.held.clear(); this.hitTime = 0; this.flapTime = 0;
      this.events.emit('runner:started', { x: this.player.x });
    }
    pause() { this.running = false; this.held.clear(); this.velocityY = 0; this.player.y = this.baseY; }
    resume() { this.running = true; this.held.clear(); this.events.emit('runner:resumed', { x: this.player.x }); }
    setX(x) { this.player.x = Math.max(0, x); this.player.y = this.baseY; this.velocityY = 0; this.flapTime = 0; }
    keyDown(code, repeat = false) {
      if (!this.running) return false;
      if (code === 'Space') {
        this.held.add(code);
        if (!repeat) this.flap();
        return true;
      }
      return false;
    }
    keyUp(code) { this.held.delete(code); }
    flap() {
      if (!this.running) return false;
      this.velocityY = this.flapVelocity;
      this.flapTime = .18;
      this.events.emit('runner:flap', { x: this.player.x, y: this.player.y });
      return true;
    }
    update(dt, pathBounds = null) {
      if (this.invulnerable > 0) this.invulnerable = Math.max(0, this.invulnerable - dt);
      this.hitTime = Math.max(0, this.hitTime - dt);
      if (!this.running) return;
      this.animationTime += dt;
      this.flapTime = Math.max(0, this.flapTime - dt);
      this.player.x += this.speed * dt;
      this.velocityY += this.gravity * dt;
      this.player.y += this.velocityY * dt;
      const touchesPathBoundary = pathBounds && (
        this.player.y - this.player.radius <= pathBounds.top
        || this.player.y + this.player.radius >= pathBounds.bottom
      );
      const outsideFlightBounds = !pathBounds && (
        this.player.y < this.flightBounds.top || this.player.y > this.flightBounds.bottom
      );
      if (touchesPathBoundary || outsideFlightBounds) {
        this.events.emit('runner:flight-boundary', { x: this.player.x, y: this.player.y });
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
    crash(respawnX) {
      if (!this.running || this.invulnerable > 0) return false;
      const x = this.player.x;
      this.energy -= 1;
      if (this.energy <= 0) this.energy = 3;
      this.setX(respawnX);
      this.running = false; this.invulnerable = .55; this.hitTime = .32; this.held.clear();
      this.events.emit('runner:respawn', { x, respawnX, energy: this.energy });
      return true;
    }
  }
  root.LightReaction = root.LightReaction || {};
  root.LightReaction.RunnerController = RunnerController;
})(window);
