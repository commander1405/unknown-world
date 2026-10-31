import { initLanguage, t, itemName, getLang } from "./localization/localization.js";
import { createRenderer } from "./core/renderer.js";
import { createInput } from "./core/input.js";
import { World } from "./world/world.js";
import { TILE, T, DROP_FOR, HARDNESS, PLACEABLE } from "./world/tiles.js";
import { surfaceHeight } from "./world/generator.js";
import { createPlayer, updatePlayer } from "./entities/player.js";
import { createInventory, addItem, selectedItem, removeItem } from "./systems/inventory.js";
import { createQuests, onGather, onCrafted } from "./systems/quests.js";
import { createUI } from "./ui/ui.js";
import { hasSave, loadGame, saveGame } from "./storage/save.js";

initLanguage();

const canvas = document.getElementById("game");
const renderer = createRenderer(canvas);
const input = createInput();
const ui = createUI(document.getElementById("ui-root"));

let mode = "menu";
let world = null;
let player = null;
let inv = null;
let quests = null;
let settings = {
  graphics: "medium",
  animQuality: "medium",
  uiAnim: true,
  reducedMotion: false,
  showFps: false,
};
let cam = { x: 0, y: 0 };
let dayTime = 0; // seconds, 10 min cycle
let paused = false;
let uiOpen = false;
let mineProg = 0;
let mineKey = null;
let last = performance.now();
let fps = 60;
let guide = null;

function dayPhase() {
  const cycle = 600; // 10 minutes
  return (dayTime % cycle) / cycle;
}
function dayLabel() {
  const p = dayPhase();
  const d = Math.floor(dayTime / 600) + 1;
  let phase = "Night";
  if (p < 0.2) phase = "Dawn";
  else if (p < 0.45) phase = "Day";
  else if (p < 0.55) phase = "Noon";
  else if (p < 0.7) phase = "Afternoon";
  else if (p < 0.85) phase = "Dusk";
  return `${d}`;
}

function spawnPos(seed) {
  const x = 0;
  const ground = surfaceHeight(0, seed);
  return { x: 8 * TILE, y: (ground - 3) * TILE };
}

function nearStation() {
  if (!player || !world) return null;
  const cx = Math.floor((player.x + player.w / 2) / TILE);
  const cy = Math.floor((player.y + player.h / 2) / TILE);
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const id = world.getTile(cx + dx, cy + dy);
      if (id === T.WORKBENCH) return "workbench";
      if (id === T.FURNACE) return "furnace";
    }
  }
  return null;
}

function cursorTile() {
  const w = window.innerWidth, h = window.innerHeight;
  const st = input.poll();
  const wx = cam.x + (st.mx - w / 2);
  const wy = cam.y + (st.my - h / 2);
  return { tx: Math.floor(wx / TILE), ty: Math.floor(wy / TILE) };
}

function toolPower() {
  const s = selectedItem(inv);
  if (!s) return { axe: 0.3, pick: 0.2 };
  if (s.id === "ironPickaxe") return { axe: 0.5, pick: 2.2 };
  if (s.id === "pickaxe") return { axe: 0.4, pick: 1.2 };
  if (s.id === "axe") return { axe: 1.4, pick: 0.35 };
  return { axe: 0.35, pick: 0.25 };
}

function tryMine(dt) {
  const st = input.poll();
  if (!st.mine) {
    mineProg = 0;
    mineKey = null;
    return;
  }
  const { tx, ty } = cursorTile();
  // range limit
  const pcx = (player.x + player.w / 2) / TILE;
  const pcy = (player.y + player.h / 2) / TILE;
  if (Math.hypot(tx + 0.5 - pcx, ty + 0.5 - pcy) > 5) return;
  const id = world.getTile(tx, ty);
  if (!id || id === T.AIR) return;
  const key = tx + "," + ty;
  if (mineKey !== key) {
    mineKey = key;
    mineProg = 0;
  }
  const hard = HARDNESS[id] || 1;
  const pow = toolPower();
  let rate = pow.pick;
  if (id === T.WOOD || id === T.LEAVES) rate = pow.axe;
  mineProg += (rate / hard) * dt;
  if (mineProg >= 1) {
    const drop = DROP_FOR[id];
    world.setTile(tx, ty, T.AIR);
    mineProg = 0;
    if (drop) {
      addItem(inv, drop, 1);
      ui.toast(t("notify.gathered", { item: itemName(drop), n: 1 }));
      const notes = onGather(quests, drop, 1);
      for (const n of notes) ui.toast(t("notify.questDone", { title: t("quests." + n) }));
    }
  }
}

function tryPlace() {
  const st = input.poll();
  if (!st.place) return;
  st.place = false;
  const sel = selectedItem(inv);
  if (!sel || !PLACEABLE[sel.id]) return;
  const { tx, ty } = cursorTile();
  const pcx = (player.x + player.w / 2) / TILE;
  const pcy = (player.y + player.h / 2) / TILE;
  if (Math.hypot(tx + 0.5 - pcx, ty + 0.5 - pcy) > 5) return;
  if (world.getTile(tx, ty) !== T.AIR) {
    ui.toast(t("notify.cannotPlace"));
    return;
  }
  // don't place inside player
  const px0 = Math.floor(player.x / TILE);
  const py0 = Math.floor(player.y / TILE);
  const px1 = Math.floor((player.x + player.w - 1) / TILE);
  const py1 = Math.floor((player.y + player.h - 1) / TILE);
  if (tx >= px0 && tx <= px1 && ty >= py0 && ty <= py1) {
    ui.toast(t("notify.cannotPlace"));
    return;
  }
  if (!removeItem(inv, sel.id, 1)) return;
  world.setTile(tx, ty, PLACEABLE[sel.id]);
}

function interactGuide() {
  if (!guide || uiOpen) return;
  const d = Math.hypot(player.x - guide.x, player.y - guide.y);
  if (d > 40) return;
  uiOpen = true;
  const lines = [t("npc.guide1"), t("npc.guide2"), t("npc.guide3"), t("npc.guide4")];
  ui.openDialog(t("npc.guideName"), lines, () => {
    uiOpen = false;
    if (!quests.gotStarterAxe) {
      addItem(inv, "axe", 1);
      quests.gotStarterAxe = true;
      ui.toast(t("notify.gathered", { item: itemName("axe"), n: 1 }));
    }
    const q = quests.list.find((x) => x.id === "guide");
    if (q && !q.done) {
      q.done = true;
      ui.toast(t("notify.questDone", { title: t("quests.guide") }));
    }
  });
}

async function persist() {
  if (!world || !player) return;
  await saveGame({
    seed: world.seed,
    player: { x: player.x, y: player.y, hp: player.hp, hunger: player.hunger, stamina: player.stamina },
    inv,
    quests,
    dayTime,
    mods: world.serializeMods(),
    settings,
    lang: getLang(),
  });
  ui.toast(t("notify.saved"));
}

async function startNew() {
  if (await hasSave()) {
    if (!confirm(t("confirm.newWorld"))) return;
  }
  ui.toast(t("notify.worldGen"));
  const seed = (Math.random() * 1e9) | 0;
  world = new World(seed);
  const sp = spawnPos(seed);
  player = createPlayer(sp.x, sp.y);
  inv = createInventory();
  addItem(inv, "torch", 4);
  quests = createQuests();
  guide = { x: sp.x + 48, y: sp.y };
  dayTime = 60;
  cam.x = player.x;
  cam.y = player.y;
  mode = "play";
  paused = false;
  ui.clearOverlays();
  ui.setHudVisible(true);
}

async function startContinue() {
  const data = await loadGame();
  if (!data) {
    ui.toast("—");
    return;
  }
  world = new World(data.seed || 1);
  world.loadMods(data.mods || []);
  const sp = spawnPos(world.seed);
  player = createPlayer(data.player?.x ?? sp.x, data.player?.y ?? sp.y);
  if (data.player) {
    player.hp = data.player.hp ?? 100;
    player.hunger = data.player.hunger ?? 100;
    player.stamina = data.player.stamina ?? 100;
  }
  inv = data.inv || createInventory();
  quests = data.quests || createQuests();
  dayTime = data.dayTime || 0;
  settings = { ...settings, ...(data.settings || {}) };
  guide = { x: spawnPos(world.seed).x + 48, y: spawnPos(world.seed).y };
  cam.x = player.x;
  cam.y = player.y;
  mode = "play";
  ui.clearOverlays();
  ui.setHudVisible(true);
  ui.toast(t("notify.saved"));
}

async function showMenu() {
  mode = "menu";
  ui.setHudVisible(false);
  const hs = await hasSave();
  ui.showMenu({
    hasSave: hs,
    onNew: () => startNew(),
    onContinue: () => startContinue(),
    onSettings: () => ui.openSettings(settings, (s) => { settings = s; }),
    onCredits: () => {},
  });
}

function activeQuestText() {
  const q = quests?.list.find((x) => !x.done);
  if (!q) return "";
  return t("quests." + q.key);
}

function update(dt) {
  if (mode !== "play" || paused || uiOpen) return;
  const st = input.poll();
  if (input.consume("pause")) {
    paused = true;
    ui.openPause({
      onResume: () => { paused = false; },
      onInv: () => {
        uiOpen = true;
        ui.openInventory(inv, nearStation(), (id) => {
          const n = onCrafted(quests, id);
          if (n) ui.toast(t("notify.questDone", { title: t("quests." + n) }));
        }, () => { uiOpen = false; });
      },
      onQuests: () => ui.openQuests(quests),
      onSettings: () => ui.openSettings(settings, (s) => { settings = s; }),
      onExit: async () => {
        await persist();
        paused = false;
        await showMenu();
      },
    });
    return;
  }
  if (input.consume("inv")) {
    uiOpen = true;
    ui.openInventory(inv, nearStation(), (id) => {
      const n = onCrafted(quests, id);
      if (n) ui.toast(t("notify.questDone", { title: t("quests." + n) }));
    }, () => { uiOpen = false; });
  }
  if (st.hotbarSelect != null) {
    inv.hotbar = st.hotbarSelect;
    st.hotbarSelect = null;
  }
  if (st.hotbarDelta) {
    inv.hotbar = (inv.hotbar + st.hotbarDelta + 10) % 10;
    st.hotbarDelta = 0;
  }

  // reset lateral from keyboard each frame via poll logic
  const keys = input.state;
  updatePlayer(player, world, {
    left: keys.left,
    right: keys.right,
    jump: keys.jump,
    sprint: keys.sprint,
  }, dt, settings);

  // eat berry with F
  // interact
  if (keys.jump === false && false) {}
  // E interact is inv — use press near guide with mine off: Space already jump
  // Use interact when player presses "e" handled as inv; separate: click near guide
  const distGuide = guide ? Math.hypot(player.x - guide.x, player.y - guide.y) : 999;
  if (distGuide < 36 && input.consume("inv") === false) {
    // allow talk via double-tap mine briefly — simpler: auto prompt chip
  }

  tryMine(dt);
  tryPlace();
  world.unloadFar(player.x / TILE, player.y / TILE, settings.graphics === "low" ? 3 : 5);

  // camera
  const k = 1 - Math.exp(-6 * dt);
  cam.x += (player.x + player.w / 2 - cam.x) * k;
  cam.y += (player.y + player.h / 2 - cam.y) * k;

  dayTime += dt;
  if (player.hp <= 0) {
    ui.toast(t("notify.died"));
    const sp = spawnPos(world.seed);
    player.x = sp.x;
    player.y = sp.y;
    player.hp = player.maxHp * 0.6;
    player.hunger = 40;
  }

  // talk to guide: hold interact — map key "e" already inventory; use Enter
  // Check: if player collides near guide and presses jump while looking — skip
  // Add: key f for interact
  if (distGuide < 40 && (input.state.mine && mineProg === 0)) {
    // soft: show talk by pressing place near guide without selected placeable
  }

  ui.updateHud(player, inv, dayLabel(), activeQuestText());
}

// Interact key: listen for KeyF and KeyEnter
window.addEventListener("keydown", (e) => {
  if (mode === "play" && !paused && !uiOpen && (e.key === "f" || e.key === "F" || e.key === "Enter")) {
    interactGuide();
  }
});

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  fps = fps * 0.9 + (1 / Math.max(dt, 0.001)) * 0.1;
  // reset one-shot keyboard move sticky from touch by re-polling
  if (mode === "play" && !paused) {
    // clear pure keyboard flags each frame after poll inside update
  }
  update(dt);
  if (mode === "play" && world && player) {
    renderer.render(world, player, cam, dayPhase(), settings.graphics);
    // draw guide
    const ctx = renderer.ctx;
    const w = window.innerWidth, h = window.innerHeight;
    ctx.save();
    ctx.translate(Math.floor(w / 2 - cam.x), Math.floor(h / 2 - cam.y));
    ctx.imageSmoothingEnabled = false;
    if (guide) {
      ctx.fillStyle = "#6a90b8";
      ctx.fillRect(Math.floor(guide.x), Math.floor(guide.y), 12, 24);
      ctx.fillStyle = "#e8c4a0";
      ctx.fillRect(Math.floor(guide.x) + 2, Math.floor(guide.y) - 6, 8, 7);
      if (Math.hypot(player.x - guide.x, player.y - guide.y) < 48) {
        ctx.fillStyle = "#fff";
        ctx.font = "10px monospace";
        ctx.fillText("F", Math.floor(guide.x) + 2, Math.floor(guide.y) - 10);
      }
    }
    // mine break overlay
    if (mineKey && mineProg > 0) {
      const [tx, ty] = mineKey.split(",").map(Number);
      ctx.strokeStyle = `rgba(255,255,255,${0.4 + mineProg * 0.5})`;
      ctx.strokeRect(tx * TILE + 2, ty * TILE + 2, TILE - 4, TILE - 4);
    }
    ctx.restore();
    if (settings.showFps) {
      ctx.fillStyle = "#9fe";
      ctx.font = "12px monospace";
      ctx.fillText((fps | 0) + " FPS", 8, window.innerHeight - 8);
    }
  }
  requestAnimationFrame(frame);
}

setInterval(() => {
  if (mode === "play" && world && !paused) persist();
}, 45000);

showMenu();
requestAnimationFrame(frame);
