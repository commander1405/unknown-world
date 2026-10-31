import { createRng, hash2 } from "./rng.js";

export const WORLD_W = 4200;
export const WORLD_H = 4200;

export function generateWorld(seed = 42) {
  const rng = createRng(seed);
  const objects = [];
  const resources = [];
  const npcs = [];
  const colliders = [];

  // Hand-designed village (center)
  const vx = WORLD_W * 0.5;
  const vy = WORLD_H * 0.5;

  const houses = [
    { x: vx - 120, y: vy - 40, w: 70, h: 55, kind: "house" },
    { x: vx + 40, y: vy - 60, w: 80, h: 60, kind: "house" },
    { x: vx - 30, y: vy + 70, w: 65, h: 50, kind: "house" },
    { x: vx + 130, y: vy + 30, w: 55, h: 48, kind: "hut" },
  ];
  for (const h of houses) {
    objects.push(h);
    colliders.push({ x: h.x, y: h.y + h.h * 0.35, w: h.w * 0.85, h: h.h * 0.4 });
  }

  // Village well
  objects.push({ x: vx + 10, y: vy + 10, r: 18, kind: "well" });
  colliders.push({ x: vx + 10, y: vy + 10, r: 16 });

  // Roads (visual markers)
  objects.push({ x: vx, y: vy, kind: "road_cross" });

  // Cave entrance NW
  const cave = { x: vx - 900, y: vy - 700, w: 90, h: 70, kind: "cave" };
  objects.push(cave);
  colliders.push({ x: cave.x, y: cave.y + 10, w: 70, h: 40 });

  // Lake east
  const lake = { x: vx + 700, y: vy + 200, rx: 220, ry: 140, kind: "lake" };
  objects.push(lake);

  // Mountain ridge north
  for (let i = 0; i < 8; i++) {
    const mx = vx - 400 + i * 110;
    const my = vy - 1100 + Math.sin(i) * 40;
    objects.push({ x: mx, y: my, w: 100 + i * 5, h: 80, kind: "mountain" });
    colliders.push({ x: mx, y: my + 20, w: 70, h: 40 });
  }

  // Elder NPC
  npcs.push({
    id: "elder",
    x: vx - 40,
    y: vy - 10,
    name: "Elder Mira",
    lines: [
      "Traveler… the forest remembers you.",
      "Gather 8 Wood and 5 Berries for the village stores.",
      "Then seek the Whispering Cave to the northwest.",
    ],
  });

  // Procedural trees, rocks, bushes (deterministic)
  for (let i = 0; i < 900; i++) {
    const x = rng() * WORLD_W;
    const y = rng() * WORLD_H;
    // keep village clearing
    if (Math.hypot(x - vx, y - vy) < 220) continue;
    // keep lake clear-ish
    if (Math.hypot(x - lake.x, y - lake.y) < 200) continue;
    const t = rng();
    if (t < 0.55) {
      const tree = {
        x, y,
        kind: "tree",
        variant: Math.floor(rng() * 3),
        scale: 0.75 + rng() * 0.55,
      };
      objects.push(tree);
      colliders.push({ x, y: y + 8, r: 12 * tree.scale });
    } else if (t < 0.75) {
      objects.push({ x, y, kind: "rock", scale: 0.6 + rng() * 0.7 });
      colliders.push({ x, y, r: 10 });
    } else if (t < 0.9) {
      objects.push({ x, y, kind: "bush", scale: 0.7 + rng() * 0.5 });
    } else {
      objects.push({ x, y, kind: "flower", hue: rng() });
    }
  }

  // Resources
  const placeRes = (type, count, minDist) => {
    let placed = 0;
    let guard = 0;
    while (placed < count && guard++ < count * 20) {
      const x = rng() * WORLD_W;
      const y = rng() * WORLD_H;
      if (Math.hypot(x - vx, y - vy) < minDist) continue;
      if (type === "fish" && Math.hypot(x - lake.x, y - lake.y) > 240) continue;
      if (type !== "fish" && Math.hypot(x - lake.x, y - lake.y) < 180) continue;
      resources.push({
        id: `${type}_${placed}_${seed}`,
        type,
        x, y,
        taken: false,
        respawnAt: 0,
      });
      placed++;
    }
  };
  placeRes("wood", 80, 200);
  placeRes("stone", 50, 180);
  placeRes("berry", 60, 150);
  placeRes("herb", 40, 160);
  placeRes("fish", 25, 0);

  // Quest markers
  const landmarks = {
    village: { x: vx, y: vy, name: "Starting Village" },
    cave: { x: cave.x, y: cave.y, name: "Whispering Cave" },
    lake: { x: lake.x, y: lake.y, name: "Silver Lake" },
  };

  return {
    seed,
    width: WORLD_W,
    height: WORLD_H,
    objects,
    resources,
    npcs,
    colliders,
    landmarks,
    spawn: { x: vx + 20, y: vy + 40 },
  };
}

export function isInWater(world, x, y) {
  for (const o of world.objects) {
    if (o.kind === "lake") {
      const dx = (x - o.x) / o.rx;
      const dy = (y - o.y) / o.ry;
      if (dx * dx + dy * dy < 1) return true;
    }
  }
  return false;
}

export function collide(world, x, y, radius = 12) {
  // World bounds
  if (x < radius || y < radius || x > world.width - radius || y > world.height - radius) {
    return true;
  }
  if (isInWater(world, x, y)) return true;
  for (const c of world.colliders) {
    if (c.r != null) {
      if (Math.hypot(x - c.x, y - c.y) < radius + c.r) return true;
    } else {
      const nearestX = Math.max(c.x - c.w / 2, Math.min(x, c.x + c.w / 2));
      const nearestY = Math.max(c.y - c.h / 2, Math.min(y, c.y + c.h / 2));
      if (Math.hypot(x - nearestX, y - nearestY) < radius) return true;
    }
  }
  return false;
}
