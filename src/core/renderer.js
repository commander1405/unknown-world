import { TILE, CHUNK, T, TILE_COLOR } from "../world/tiles.js";

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  let dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  window.addEventListener("resize", resize);
  resize();

  function drawTile(tx, ty, id, lights) {
    const c = TILE_COLOR[id];
    if (!c) return;
    const x = tx * TILE;
    const y = ty * TILE;
    ctx.fillStyle = c[0];
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = c[1];
    ctx.fillRect(x, y + TILE - 4, TILE, 4);
    ctx.fillRect(x + TILE - 3, y, 3, TILE);
    if (id === T.GRASS) {
      ctx.fillStyle = "#4caa50";
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 2 + i * 3, y + 2, 2, 3);
    }
    if (id === T.COAL || id === T.COPPER || id === T.IRON) {
      ctx.fillStyle = c[1];
      ctx.fillRect(x + 4, y + 4, 3, 3);
      ctx.fillRect(x + 9, y + 8, 4, 3);
    }
    if (id === T.TORCH) {
      ctx.fillStyle = "#c08030";
      ctx.fillRect(x + 7, y + 6, 2, 8);
      ctx.fillStyle = "#ffe080";
      ctx.fillRect(x + 6, y + 3, 4, 4);
    }
    if (id === T.WORKBENCH) {
      ctx.fillStyle = "#503018";
      ctx.fillRect(x + 1, y + 10, 14, 5);
      ctx.fillRect(x + 2, y + 4, 3, 6);
      ctx.fillRect(x + 11, y + 4, 3, 6);
    }
    if (id === T.FURNACE) {
      ctx.fillStyle = "#ff6020";
      ctx.fillRect(x + 5, y + 8, 6, 5);
    }
  }

  function render(world, player, cam, dayPhase, gfx) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // sky
    const sky = skyColor(dayPhase);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // sun/moon
    const sunX = w * 0.15 + Math.cos(dayPhase * Math.PI * 2) * w * 0.35;
    const sunY = h * 0.35 + Math.sin(dayPhase * Math.PI * 2) * h * 0.28;
    if (dayPhase < 0.75) {
      ctx.fillStyle = "#ffe08a";
      ctx.beginPath();
      ctx.arc(sunX, Math.min(sunY, h * 0.55), 14, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#e8eef8";
      ctx.beginPath();
      ctx.arc(w * 0.75, h * 0.18, 10, 0, Math.PI * 2);
      ctx.fill();
      if (gfx !== "low") {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        for (let i = 0; i < 30; i++) {
          const sx = (i * 97) % w;
          const sy = (i * 53) % (h * 0.5);
          ctx.fillRect(sx, sy, 2, 2);
        }
      }
    }

    ctx.save();
    ctx.translate(Math.floor(w / 2 - cam.x), Math.floor(h / 2 - cam.y));
    ctx.imageSmoothingEnabled = false;

    const viewTilesX = Math.ceil(w / TILE) + 4;
    const viewTilesY = Math.ceil(h / TILE) + 4;
    const startTX = Math.floor((cam.x - w / 2) / TILE) - 1;
    const startTY = Math.floor((cam.y - h / 2) / TILE) - 1;

    for (let ty = startTY; ty < startTY + viewTilesY; ty++) {
      for (let tx = startTX; tx < startTX + viewTilesX; tx++) {
        const id = world.getTile(tx, ty);
        if (id) drawTile(tx, ty, id);
      }
    }

    // player pixel character
    drawPlayer(ctx, player);

    ctx.restore();

    // night veil
    const dark = nightAlpha(dayPhase);
    if (dark > 0.02) {
      ctx.fillStyle = `rgba(6,10,24,${dark})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawPlayer(ctx, p) {
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x + 1, y + p.h - 2, p.w - 2, 3);
    // legs
    const leg = Math.sin(p.anim) > 0 ? 1 : 0;
    ctx.fillStyle = "#2a3544";
    ctx.fillRect(x + 2, y + 16, 3, 8 + leg);
    ctx.fillRect(x + 7, y + 16, 3, 8 - leg);
    // body
    ctx.fillStyle = "#3d8f7a";
    ctx.fillRect(x + 1, y + 6, 10, 12);
    // head
    ctx.fillStyle = "#e8c4a0";
    ctx.fillRect(x + 2, y, 8, 7);
    // eyes
    ctx.fillStyle = "#1a1a1a";
    if (p.facing >= 0) {
      ctx.fillRect(x + 7, y + 2, 2, 2);
    } else {
      ctx.fillRect(x + 3, y + 2, 2, 2);
    }
    // hair
    ctx.fillStyle = "#2a2030";
    ctx.fillRect(x + 2, y, 8, 2);
  }

  return { render, resize, ctx, canvas };
}

function skyColor(phase) {
  // 0 dawn .. 0.5 noon .. 1 night
  if (phase < 0.2) return "#7ab0d0";
  if (phase < 0.45) return "#87c0e8";
  if (phase < 0.55) return "#6aaee0";
  if (phase < 0.7) return "#e09060";
  if (phase < 0.85) return "#405888";
  return "#121828";
}

function nightAlpha(phase) {
  if (phase < 0.7) return 0;
  if (phase < 0.85) return ((phase - 0.7) / 0.15) * 0.55;
  return 0.6;
}
