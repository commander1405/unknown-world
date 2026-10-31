export function createCamera() {
  return {
    x: 0,
    y: 0,
    zoom: 1,
    follow(target, dt, smoothness = 6) {
      const k = 1 - Math.exp(-smoothness * dt);
      this.x += (target.x - this.x) * k;
      this.y += (target.y - this.y) * k;
    },
    worldToScreen(wx, wy, canvas) {
      return {
        x: (wx - this.x) * this.zoom + canvas.width / 2,
        y: (wy - this.y) * this.zoom + canvas.height / 2,
      };
    },
    screenToWorld(sx, sy, canvas) {
      return {
        x: (sx - canvas.width / 2) / this.zoom + this.x,
        y: (sy - canvas.height / 2) / this.zoom + this.y,
      };
    },
  };
}
