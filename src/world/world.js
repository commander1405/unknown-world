import { CHUNK, TILE, T, TILE_SOLID } from "./tiles.js";
import { generateChunk } from "./generator.js";

export class World {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.chunks = new Map(); // key "cx,cy" -> {tiles:Uint8Array, dirty:boolean}
    this.mods = new Map(); // "wx,wy" -> tileId (persistent modifications)
  }

  key(cx, cy) {
    return cx + "," + cy;
  }

  ensureChunk(cx, cy) {
    const k = this.key(cx, cy);
    if (this.chunks.has(k)) return this.chunks.get(k);
    const tiles = generateChunk(cx, cy, this.seed);
    // apply mods
    for (let ly = 0; ly < CHUNK; ly++) {
      for (let lx = 0; lx < CHUNK; lx++) {
        const wx = cx * CHUNK + lx;
        const wy = cy * CHUNK + ly;
        const mk = wx + "," + wy;
        if (this.mods.has(mk)) tiles[ly * CHUNK + lx] = this.mods.get(mk);
      }
    }
    const ch = { cx, cy, tiles, dirty: false };
    this.chunks.set(k, ch);
    return ch;
  }

  unloadFar(px, py, keep = 4) {
    const pcx = Math.floor(px / CHUNK);
    const pcy = Math.floor(py / CHUNK);
    for (const [k, ch] of this.chunks) {
      if (Math.abs(ch.cx - pcx) > keep || Math.abs(ch.cy - pcy) > keep) {
        this.chunks.delete(k);
      }
    }
  }

  getTile(wx, wy) {
    const cx = Math.floor(wx / CHUNK);
    const cy = Math.floor(wy / CHUNK);
    const lx = ((wx % CHUNK) + CHUNK) % CHUNK;
    const ly = ((wy % CHUNK) + CHUNK) % CHUNK;
    const ch = this.ensureChunk(cx, cy);
    return ch.tiles[ly * CHUNK + lx];
  }

  setTile(wx, wy, id) {
    const cx = Math.floor(wx / CHUNK);
    const cy = Math.floor(wy / CHUNK);
    const lx = ((wx % CHUNK) + CHUNK) % CHUNK;
    const ly = ((wy % CHUNK) + CHUNK) % CHUNK;
    const ch = this.ensureChunk(cx, cy);
    ch.tiles[ly * CHUNK + lx] = id;
    ch.dirty = true;
    this.mods.set(wx + "," + wy, id);
  }

  solid(wx, wy) {
    return !!TILE_SOLID[this.getTile(wx, wy)];
  }

  // axis-aligned collision for entity box in tile coords (float)
  resolve(x, y, w, h, vx, vy) {
    // x,y top-left in world pixels; convert to tiles via TILE
    let nx = x + vx;
    let ny = y + vy;
    const hw = w;
    const hh = h;
    // horizontal
    if (vx !== 0) {
      const left = Math.floor(nx / TILE);
      const right = Math.floor((nx + hw - 0.01) / TILE);
      const top = Math.floor(y / TILE);
      const bot = Math.floor((y + hh - 0.01) / TILE);
      for (let ty = top; ty <= bot; ty++) {
        for (let tx = left; tx <= right; tx++) {
          if (this.solid(tx, ty)) {
            if (vx > 0) nx = tx * TILE - hw;
            else nx = (tx + 1) * TILE;
            vx = 0;
          }
        }
      }
    }
    // vertical
    if (vy !== 0) {
      const left = Math.floor(nx / TILE);
      const right = Math.floor((nx + hw - 0.01) / TILE);
      const top = Math.floor((y + vy) / TILE);
      const bot = Math.floor((y + vy + hh - 0.01) / TILE);
      for (let ty = top; ty <= bot; ty++) {
        for (let tx = left; tx <= right; tx++) {
          if (this.solid(tx, ty)) {
            if (vy > 0) {
              ny = ty * TILE - hh;
              vy = 0;
            } else {
              ny = (ty + 1) * TILE;
              vy = 0;
            }
          }
        }
      }
    }
    return { x: nx, y: ny, vx, vy };
  }

  onGround(x, y, w, h) {
    const feet = y + h + 0.5;
    const left = Math.floor(x / TILE);
    const right = Math.floor((x + w - 0.01) / TILE);
    const ty = Math.floor(feet / TILE);
    for (let tx = left; tx <= right; tx++) {
      if (this.solid(tx, ty)) return true;
    }
    return false;
  }

  serializeMods() {
    const out = [];
    for (const [k, v] of this.mods) out.push([k, v]);
    return out;
  }

  loadMods(arr) {
    this.mods.clear();
    if (!arr) return;
    for (const [k, v] of arr) this.mods.set(k, v);
    this.chunks.clear();
  }
}
