import { fbm, hash } from "./noise.js";
import { T, CHUNK } from "./tiles.js";

export function surfaceHeight(wx, seed) {
  const n = fbm(wx * 0.012, 0, seed, 5);
  const hills = fbm(wx * 0.004, 10, seed + 7, 3);
  return Math.floor(48 + n * 18 + hills * 22);
}

export function generateChunk(cx, cy, seed) {
  const size = CHUNK * CHUNK;
  const tiles = new Uint8Array(size);
  for (let ly = 0; ly < CHUNK; ly++) {
    for (let lx = 0; lx < CHUNK; lx++) {
      const wx = cx * CHUNK + lx;
      const wy = cy * CHUNK + ly;
      const ground = surfaceHeight(wx, seed);
      let id = T.AIR;
      if (wy > ground + 40) {
        id = T.STONE;
        const ore = hash(wx, wy, seed + 99);
        if (ore > 0.97) id = T.IRON;
        else if (ore > 0.94) id = T.COPPER;
        else if (ore > 0.90) id = T.COAL;
        // caves
        const cave = fbm(wx * 0.05, wy * 0.05, seed + 50, 3);
        if (cave > 0.62 && wy > ground + 8) id = T.AIR;
      } else if (wy > ground) {
        id = T.DIRT;
        if (wy > ground + 6) {
          const t = hash(wx, wy, seed);
          if (t > 0.92) id = T.STONE;
        }
      } else if (wy === ground) {
        id = T.GRASS;
      } else if (wy < ground) {
        // trees
        if (wy >= ground - 6 && wy < ground) {
          const treeSpot = hash(Math.floor(wx / 5) * 5, ground, seed + 3);
          if (treeSpot > 0.78) {
            const baseX = Math.floor(wx / 5) * 5 + 2;
            if (wx === baseX && wy > ground - 5) id = T.WOOD;
            else if (Math.abs(wx - baseX) <= 2 && wy <= ground - 3 && wy >= ground - 6) id = T.LEAVES;
          }
        }
      }
      tiles[ly * CHUNK + lx] = id;
    }
  }
  return tiles;
}
