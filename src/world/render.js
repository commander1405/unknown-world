/** Smooth 2D world renderer with viewport culling */

function inView(cam, canvas, x, y, pad = 80) {
  const hw = canvas.width / (2 * cam.zoom) + pad;
  const hh = canvas.height / (2 * cam.zoom) + pad;
  return x > cam.x - hw && x < cam.x + hw && y > cam.y - hh && y < cam.y + hh;
}

export function drawWorld(ctx, world, cam, canvas, time, dayFactor) {
  const ground = ctx.createRadialGradient(0, 0, 10, 0, 0, Math.max(world.width, world.height));
  // Draw ground tiles in viewport as soft patches
  const startX = Math.floor((cam.x - canvas.width / cam.zoom) / 80) * 80;
  const startY = Math.floor((cam.y - canvas.height / cam.zoom) / 80) * 80;
  const endX = cam.x + canvas.width / cam.zoom + 80;
  const endY = cam.y + canvas.height / cam.zoom + 80;

  for (let gy = startY; gy < endY; gy += 80) {
    for (let gx = startX; gx < endX; gx += 80) {
      if (gx < 0 || gy < 0 || gx > world.width || gy > world.height) continue;
      const n = Math.sin(gx * 0.01 + gy * 0.013) * 0.5 + 0.5;
      const g = 95 + n * 35;
      ctx.fillStyle = `rgb(${40 + n * 20}, ${g}, ${55 + n * 15})`;
      ctx.fillRect(gx, gy, 81, 81);
      // grass flecks
      if (n > 0.4) {
        ctx.fillStyle = `rgba(60, ${140 + n * 40}, 70, 0.35)`;
        for (let k = 0; k < 3; k++) {
          const fx = gx + ((k * 37 + gx) % 70);
          const fy = gy + ((k * 53 + gy) % 70);
          ctx.fillRect(fx, fy, 2, 5);
        }
      }
    }
  }

  // Sort objects by y for depth
  const visible = world.objects.filter((o) => inView(cam, canvas, o.x, o.y, 120));
  visible.sort((a, b) => a.y - b.y);

  for (const o of visible) {
    drawObject(ctx, o, time);
  }

  // Resources
  for (const r of world.resources) {
    if (r.taken) continue;
    if (!inView(cam, canvas, r.x, r.y, 40)) continue;
    drawResource(ctx, r, time);
  }

  // NPCs
  for (const n of world.npcs) {
    if (!inView(cam, canvas, n.x, n.y, 40)) continue;
    drawNpc(ctx, n, time);
  }

  // Day/night overlay handled outside
}

function drawObject(ctx, o, time) {
  if (o.kind === "tree") {
    const s = o.scale || 1;
    ctx.save();
    ctx.translate(o.x, o.y);
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 16 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // trunk
    const trunk = ctx.createLinearGradient(-4, 0, 4, 0);
    trunk.addColorStop(0, "#5a3a22");
    trunk.addColorStop(1, "#3d2616");
    ctx.fillStyle = trunk;
    ctx.fillRect(-4 * s, -8 * s, 8 * s, 22 * s);
    // canopy layers
    const colors = o.variant === 0
      ? ["#1f5c38", "#2d7a4a", "#3d9a5e"]
      : o.variant === 1
        ? ["#245a40", "#34805a", "#4aab72"]
        : ["#1a4a32", "#286848", "#3a8a5e"];
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.ellipse(0, -22 * s - i * 10 * s, (22 - i * 3) * s, (16 - i * 2) * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (o.kind === "rock") {
    const s = o.scale || 1;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(0, 6, 14 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createLinearGradient(-12, -10, 12, 8);
    g.addColorStop(0, "#8a9098");
    g.addColorStop(1, "#4a5058");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-14 * s, 4 * s);
    ctx.quadraticCurveTo(-10 * s, -12 * s, 0, -10 * s);
    ctx.quadraticCurveTo(12 * s, -12 * s, 14 * s, 2 * s);
    ctx.quadraticCurveTo(4 * s, 8 * s, -14 * s, 4 * s);
    ctx.fill();
    ctx.restore();
  } else if (o.kind === "bush") {
    const s = o.scale || 1;
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(0, 6, 14 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2d6b3e";
    ctx.beginPath();
    ctx.ellipse(-6 * s, 0, 10 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(6 * s, 0, 10 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(0, -6 * s, 11 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3f8a52";
    ctx.beginPath();
    ctx.ellipse(0, -4 * s, 8 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (o.kind === "flower") {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.strokeStyle = "#3a7a40";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(0, -4);
    ctx.stroke();
    const hue = 20 + o.hue * 320;
    ctx.fillStyle = `hsl(${hue}, 70%, 65%)`;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 4, -6 + Math.sin(a) * 4, 3, 2.5, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f5e6a0";
    ctx.beginPath();
    ctx.arc(0, -6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (o.kind === "house" || o.kind === "hut") {
    drawHouse(ctx, o);
  } else if (o.kind === "well") {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a7078";
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a4050";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a9098";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.lineTo(-14, -22);
    ctx.lineTo(14, -22);
    ctx.lineTo(14, -4);
    ctx.stroke();
    ctx.restore();
  } else if (o.kind === "cave") {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.fillStyle = "#3a4048";
    ctx.beginPath();
    ctx.moveTo(-45, 25);
    ctx.quadraticCurveTo(-50, -35, 0, -40);
    ctx.quadraticCurveTo(50, -35, 45, 25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#12151a";
    ctx.beginPath();
    ctx.ellipse(0, 8, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(100, 180, 200, 0.15)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (o.kind === "lake") {
    ctx.save();
    const wave = Math.sin(time * 0.002) * 3;
    const g = ctx.createRadialGradient(o.x, o.y, 10, o.x, o.y, o.rx);
    g.addColorStop(0, "#4a9ebb");
    g.addColorStop(0.5, "#2a6a88");
    g.addColorStop(1, "#1a4058");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(o.x, o.y, o.rx + wave, o.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(180, 230, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(o.x, o.y, o.rx * 0.7, o.ry * 0.65, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (o.kind === "mountain") {
    ctx.save();
    ctx.translate(o.x, o.y);
    const g = ctx.createLinearGradient(0, -o.h, 0, o.h * 0.3);
    g.addColorStop(0, "#d8dde4");
    g.addColorStop(0.35, "#7a8490");
    g.addColorStop(1, "#4a545e");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-o.w / 2, o.h * 0.3);
    ctx.lineTo(0, -o.h * 0.6);
    ctx.lineTo(o.w / 2, o.h * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.moveTo(-12, -o.h * 0.35);
    ctx.lineTo(0, -o.h * 0.6);
    ctx.lineTo(14, -o.h * 0.3);
    ctx.lineTo(4, -o.h * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (o.kind === "road_cross") {
    ctx.save();
    ctx.strokeStyle = "rgba(160, 140, 100, 0.35)";
    ctx.lineWidth = 28;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(o.x - 180, o.y);
    ctx.lineTo(o.x + 180, o.y);
    ctx.moveTo(o.x, o.y - 160);
    ctx.lineTo(o.x, o.y + 160);
    ctx.stroke();
    ctx.restore();
  }
}

function drawHouse(ctx, o) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, o.h * 0.45, o.w * 0.45, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // walls
  const wall = ctx.createLinearGradient(-o.w / 2, 0, o.w / 2, 0);
  wall.addColorStop(0, "#8b6a4a");
  wall.addColorStop(1, "#6a4a32");
  ctx.fillStyle = wall;
  ctx.fillRect(-o.w / 2, -o.h * 0.15, o.w, o.h * 0.55);
  // roof
  const roof = ctx.createLinearGradient(0, -o.h * 0.55, 0, 0);
  roof.addColorStop(0, "#a84838");
  roof.addColorStop(1, "#6e2e24");
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(-o.w / 2 - 6, -o.h * 0.12);
  ctx.lineTo(0, -o.h * 0.55);
  ctx.lineTo(o.w / 2 + 6, -o.h * 0.12);
  ctx.closePath();
  ctx.fill();
  // door
  ctx.fillStyle = "#3a2818";
  ctx.fillRect(-8, o.h * 0.12, 16, o.h * 0.28);
  // window
  ctx.fillStyle = "#c9e6f0";
  ctx.fillRect(o.w * 0.15, -o.h * 0.02, 12, 12);
  ctx.restore();
}

function drawResource(ctx, r, time) {
  ctx.save();
  ctx.translate(r.x, r.y);
  const bob = Math.sin(time * 0.004 + r.x) * 2;
  if (r.type === "wood") {
    ctx.fillStyle = "#6b4423";
    ctx.fillRect(-8, -4 + bob, 16, 8);
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(-6, -6 + bob, 12, 4);
  } else if (r.type === "stone") {
    ctx.fillStyle = "#7a8088";
    ctx.beginPath();
    ctx.ellipse(0, bob, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (r.type === "berry") {
    ctx.fillStyle = "#2d6b3e";
    ctx.beginPath();
    ctx.ellipse(0, 2 + bob, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c04060";
    for (const [ox, oy] of [[-4, -2], [3, -3], [0, 1]]) {
      ctx.beginPath();
      ctx.arc(ox, oy + bob, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (r.type === "herb") {
    ctx.strokeStyle = "#4a9a5a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.quadraticCurveTo(-6, 0 + bob, 0, -8 + bob);
    ctx.quadraticCurveTo(6, 0 + bob, 0, 6);
    ctx.stroke();
  } else if (r.type === "fish") {
    ctx.fillStyle = "#6ab0c8";
    ctx.beginPath();
    ctx.ellipse(0, bob, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-10, bob);
    ctx.lineTo(-16, bob - 5);
    ctx.lineTo(-16, bob + 5);
    ctx.fill();
  }
  ctx.restore();
}

function drawNpc(ctx, n, time) {
  ctx.save();
  ctx.translate(n.x, n.y);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(0, 10, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // body
  ctx.fillStyle = "#4a6a8a";
  ctx.beginPath();
  ctx.ellipse(0, 2, 11, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // head
  ctx.fillStyle = "#e0c4a8";
  ctx.beginPath();
  ctx.arc(0, -14, 9, 0, Math.PI * 2);
  ctx.fill();
  // staff
  ctx.strokeStyle = "#8a6a40";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, 12);
  ctx.lineTo(16, -20);
  ctx.stroke();
  ctx.fillStyle = "rgba(120, 220, 200, 0.5)";
  ctx.beginPath();
  ctx.arc(16, -22, 4 + Math.sin(time * 0.005) * 1, 0, Math.PI * 2);
  ctx.fill();
  // nameplate
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(-28, -36, 56, 12);
  ctx.fillStyle = "#d0e8f0";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(n.name, 0, -27);
  ctx.restore();
}

export function drawPlayer(ctx, player, time) {
  ctx.save();
  ctx.translate(player.x, player.y);
  const facing = player.facing || "down";
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 12, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const walk = player.moving ? Math.sin(time * 0.012) * 3 : 0;
  // legs
  ctx.fillStyle = "#2a3a4a";
  ctx.fillRect(-7, 4 + walk, 5, 10);
  ctx.fillRect(2, 4 - walk, 5, 10);
  // body cloak
  const body = ctx.createLinearGradient(-10, -8, 10, 12);
  body.addColorStop(0, "#3d8f7a");
  body.addColorStop(1, "#1e5a4c");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  // head
  ctx.fillStyle = "#e8c4a0";
  ctx.beginPath();
  ctx.arc(0, -16, 9, 0, Math.PI * 2);
  ctx.fill();
  // hair
  ctx.fillStyle = "#2a2030";
  ctx.beginPath();
  ctx.arc(0, -18, 9, Math.PI, 0);
  ctx.fill();
  // eyes direction
  ctx.fillStyle = "#1a1a1a";
  const ox = facing === "left" ? -2 : facing === "right" ? 2 : 0;
  const oy = facing === "up" ? -2 : 0;
  ctx.beginPath();
  ctx.arc(-3 + ox, -16 + oy, 1.4, 0, Math.PI * 2);
  ctx.arc(3 + ox, -16 + oy, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // backpack
  ctx.fillStyle = "#5a4030";
  ctx.fillRect(-6, -4, 12, 10);
  ctx.restore();
}
