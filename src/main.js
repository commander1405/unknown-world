import { createInput } from "./engine/input.js";
import { createCamera } from "./engine/camera.js";
import { generateWorld, collide, WORLD_W, WORLD_H } from "./world/map.js";
import { drawWorld, drawPlayer } from "./world/render.js";
import { createQuestState, updateQuests } from "./game/quests.js";
import { createUI } from "./ui/screens.js";
import { hasSave, loadSave, writeSave, clearSave } from "./storage/save.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const uiRoot = document.getElementById("ui-root");
const input = createInput(canvas);
const camera = createCamera();
const ui = createUI(uiRoot);

let mode = "menu"; // menu | play | pause
let world = null;
let player = null;
let inventory = {};
let quests = null;
let settings = { music: 0.5, sfx: 0.5, showFps: false };
let gameTime = 0; // ms in-world clock accumulator for day cycle
let last = performance.now();
let fps = 60;
let paused = false;
let interactLock = false;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) last = performance.now();
});
resize();

function defaultPlayer(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    facing: "down",
    moving: false,
    speed: 145,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    maxStamina: 100,
    level: 1,
    xp: 0,
    xpToLevel: 60,
  };
}

function newGame() {
  const seed = (Math.random() * 1e9) | 0;
  world = generateWorld(seed);
  player = defaultPlayer(world.spawn);
  inventory = {};
  quests = createQuestState();
  gameTime = 0;
  camera.x = player.x;
  camera.y = player.y;
  startPlay();
}

function continueGame() {
  const data = loadSave();
  if (!data) {
    ui.showToast("No save found");
    return;
  }
  world = generateWorld(data.seed);
  // restore resource taken flags
  if (data.resourcesTaken) {
    for (const r of world.resources) {
      if (data.resourcesTaken.includes(r.id)) r.taken = true;
    }
  }
  player = { ...defaultPlayer(world.spawn), ...data.player };
  inventory = { ...data.inventory };
  quests = data.quests || createQuestState();
  gameTime = data.gameTime || 0;
  settings = { ...settings, ...(data.settings || {}) };
  camera.x = player.x;
  camera.y = player.y;
  startPlay();
  ui.showToast("Game loaded");
}

function startPlay() {
  mode = "play";
  paused = false;
  ui.clearScreens();
  ui.setHudVisible(true);
}

function saveGame() {
  if (!world || !player) return;
  writeSave({
    seed: world.seed,
    player: {
      x: player.x,
      y: player.y,
      hp: player.hp,
      maxHp: player.maxHp,
      stamina: player.stamina,
      maxStamina: player.maxStamina,
      level: player.level,
      xp: player.xp,
      xpToLevel: player.xpToLevel,
      facing: player.facing,
    },
    inventory,
    quests,
    gameTime,
    settings,
    resourcesTaken: world.resources.filter((r) => r.taken).map((r) => r.id),
  });
  ui.showToast("Game saved");
}

function dayInfo() {
  // 8 minute full day cycle
  const cycle = 8 * 60 * 1000;
  const t = gameTime % cycle;
  const phase = t / cycle; // 0..1
  let label = "Night";
  if (phase < 0.2) label = "Dawn";
  else if (phase < 0.45) label = "Day";
  else if (phase < 0.55) label = "Noon";
  else if (phase < 0.7) label = "Afternoon";
  else if (phase < 0.85) label = "Dusk";
  // darkness 0 (bright) .. 0.65 (night)
  let dark = 0;
  if (phase < 0.15) dark = 0.45 * (1 - phase / 0.15);
  else if (phase > 0.75) dark = 0.55 * ((phase - 0.75) / 0.25);
  else if (phase > 0.9) dark = 0.55;
  return { phase, label, dark };
}

function tryMove(dt) {
  const v = input.movementVector();
  player.moving = Math.abs(v.x) + Math.abs(v.y) > 0.01;
  if (!player.moving) {
    player.stamina = Math.min(player.maxStamina, player.stamina + 12 * dt);
    return;
  }
  if (v.x < -0.3) player.facing = "left";
  else if (v.x > 0.3) player.facing = "right";
  else if (v.y < -0.3) player.facing = "up";
  else if (v.y > 0.3) player.facing = "down";

  const sprint = input.keys.has("shift") && player.stamina > 1;
  const spd = player.speed * (sprint ? 1.55 : 1) * (player.hp < 25 ? 0.85 : 1);
  if (sprint) player.stamina = Math.max(0, player.stamina - 22 * dt);
  else player.stamina = Math.min(player.maxStamina, player.stamina + 8 * dt);

  const nx = player.x + v.x * spd * dt;
  const ny = player.y + v.y * spd * dt;
  // axis separation
  if (!collide(world, nx, player.y, 12)) player.x = nx;
  if (!collide(world, player.x, ny, 12)) player.y = ny;
  // soft clamp
  player.x = Math.max(20, Math.min(WORLD_W - 20, player.x));
  player.y = Math.max(20, Math.min(WORLD_H - 20, player.y));
}

function nearestInteractable() {
  let best = null;
  let bestD = 48;
  for (const n of world.npcs) {
    const d = Math.hypot(player.x - n.x, player.y - n.y);
    if (d < bestD) {
      bestD = d;
      best = { type: "npc", ref: n };
    }
  }
  for (const r of world.resources) {
    if (r.taken) continue;
    const d = Math.hypot(player.x - r.x, player.y - r.y);
    if (d < 40 && d < bestD) {
      bestD = d;
      best = { type: "resource", ref: r };
    }
  }
  return best;
}

function doInteract() {
  if (interactLock || paused) return;
  const target = nearestInteractable();
  if (!target) {
    ui.showToast("Nothing to interact with");
    return;
  }
  if (target.type === "npc") {
    interactLock = true;
    ui.openDialog(target.ref.name, target.ref.lines, () => {
      interactLock = false;
    });
  } else if (target.type === "resource") {
    const r = target.ref;
    r.taken = true;
    inventory[r.type] = (inventory[r.type] || 0) + 1;
    player.xp += 2;
    ui.showToast(`Gathered ${r.type}`);
    const notes = updateQuests(quests, player, inventory, world);
    for (const n of notes) ui.showToast(n);
  }
}

function openPause() {
  if (mode !== "play") return;
  paused = true;
  ui.openPause({
    onResume: () => {
      paused = false;
      last = performance.now();
    },
    onSave: () => saveGame(),
    onQuests: () => ui.openQuests(quests),
    onSettings: () => ui.openSettings(settings, (s) => { settings = s; }),
    onMenu: () => {
      paused = false;
      mode = "menu";
      ui.setHudVisible(false);
      showMenu();
    },
  });
}

function showMenu() {
  mode = "menu";
  ui.setHudVisible(false);
  ui.showMainMenu({
    hasSave: hasSave(),
    onContinue: continueGame,
    onNew: newGame,
    onSettings: () => ui.openSettings(settings, (s) => { settings = s; }),
  });
}

function update(dt) {
  if (mode !== "play" || paused || interactLock) return;
  gameTime += dt * 1000;
  tryMove(dt);
  camera.follow(player, dt, 5.5);

  if (input.consume("interact")) doInteract();
  if (input.consume("inventory")) {
    interactLock = true;
    ui.openInventory(inventory, () => { interactLock = false; });
  }
  if (input.consume("pause")) openPause();

  // slow hp regen daytime
  const { dark } = dayInfo();
  if (dark < 0.2 && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + 2 * dt);
  }

  const notes = updateQuests(quests, player, inventory, world);
  for (const n of notes) ui.showToast(n);

  const { label } = dayInfo();
  ui.updateHud(player, inventory, quests, label);
}

function render(now) {
  // logical size
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  if (mode === "menu" || !world) {
    // ambient menu background
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0c1a28");
    g.addColorStop(1, "#050a10");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);

  drawWorld(ctx, world, camera, { width: w, height: h }, now, dayInfo().phase);
  drawPlayer(ctx, player, now);

  // interact hint
  const t = nearestInteractable();
  if (t && !paused) {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(player.x - 36, player.y - 52, 72, 16);
    ctx.fillStyle = "#9fe8d8";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t.type === "npc" ? "E — Talk" : "E — Gather", player.x, player.y - 40);
  }

  ctx.restore();

  // day/night veil
  const { dark } = dayInfo();
  if (dark > 0.01) {
    ctx.fillStyle = `rgba(4, 8, 20, ${dark})`;
    ctx.fillRect(0, 0, w, h);
    // soft vignette moon feel
    if (dark > 0.3) {
      const vg = ctx.createRadialGradient(w * 0.7, h * 0.15, 10, w * 0.7, h * 0.15, 180);
      vg.addColorStop(0, "rgba(200, 220, 255, 0.08)");
      vg.addColorStop(1, "transparent");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
    }
  }

  if (settings.showFps) {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(8, h - 28, 70, 20);
    ctx.fillStyle = "#9fe8d8";
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${fps | 0} FPS`, 14, h - 14);
  }
  ctx.restore();
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fps = fps * 0.9 + (1 / Math.max(dt, 0.001)) * 0.1;
  update(dt);
  render(now);
  requestAnimationFrame(frame);
}

// Autosave every 60s while playing
setInterval(() => {
  if (mode === "play" && world && !paused) saveGame();
}, 60000);

showMenu();
requestAnimationFrame(frame);
