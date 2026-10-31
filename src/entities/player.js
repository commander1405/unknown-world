import { TILE } from "../world/tiles.js";

export function createPlayer(x, y) {
  return {
    x, y,
    w: 12,
    h: 24,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    hp: 100,
    maxHp: 100,
    hunger: 100,
    stamina: 100,
    maxStamina: 100,
    anim: 0,
  };
}

export function updatePlayer(p, world, input, dt) {
  const speed = 95;
  const jumpV = 220;
  const grav = 560;
  let mx = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (mx) p.facing = mx;

  const sprint = input.sprint && p.stamina > 4;
  const spd = speed * (sprint ? 1.5 : 1);
  if (sprint && mx) p.stamina = Math.max(0, p.stamina - 20 * dt);
  else p.stamina = Math.min(p.maxStamina, p.stamina + 12 * dt);

  // horizontal
  let nx = p.x + mx * spd * dt;
  if (!collides(world, nx, p.y, p.w, p.h)) p.x = nx;

  // jump
  p.onGround = grounded(world, p.x, p.y, p.w, p.h);
  if (input.jump && p.onGround) {
    p.vy = -jumpV;
    p.onGround = false;
  }

  // gravity
  p.vy += grav * dt;
  if (p.vy > 420) p.vy = 420;
  let ny = p.y + p.vy * dt;
  if (!collides(world, p.x, ny, p.w, p.h)) {
    p.y = ny;
  } else {
    if (p.vy > 0) {
      // snap to ground
      const feet = p.y + p.h;
      const ty = Math.floor((feet + p.vy * dt) / TILE);
      p.y = ty * TILE - p.h;
      p.onGround = true;
    }
    p.vy = 0;
  }

  p.anim += dt * (mx ? 12 : 3);
  p.hunger = Math.max(0, p.hunger - dt * 0.3);
  if (p.hunger <= 0) p.hp = Math.max(0, p.hp - dt * 3.5);
  else if (p.hp < p.maxHp && p.hunger > 45) p.hp = Math.min(p.maxHp, p.hp + dt * 1.8);
}

function collides(world, x, y, w, h) {
  const x0 = Math.floor(x / TILE);
  const y0 = Math.floor(y / TILE);
  const x1 = Math.floor((x + w - 0.01) / TILE);
  const y1 = Math.floor((y + h - 0.01) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (world.solid(tx, ty)) return true;
    }
  }
  return false;
}

function grounded(world, x, y, w, h) {
  return collides(world, x, y + 1, w, h);
}
