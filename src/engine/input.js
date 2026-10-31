export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, down: false };
  const touch = { active: false, dx: 0, dy: 0, interact: false, inventory: false };

  const onKey = (e, down) => {
    const k = e.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "e", "i", "escape", " "].includes(k)) {
      e.preventDefault();
    }
    if (down) keys.add(k);
    else keys.delete(k);
  };

  window.addEventListener("keydown", (e) => onKey(e, true));
  window.addEventListener("keyup", (e) => onKey(e, false));
  window.addEventListener("blur", () => keys.clear());

  // Joystick
  const joy = document.getElementById("joystick");
  const knob = document.getElementById("joystick-knob");
  let joyId = null;
  const setKnob = (dx, dy) => {
    const max = 36;
    const len = Math.hypot(dx, dy) || 1;
    const cl = Math.min(len, max);
    const nx = (dx / len) * cl;
    const ny = (dy / len) * cl;
    if (knob) {
      knob.style.transform = `translate(${nx}px, ${ny}px)`;
    }
    touch.dx = len > 8 ? dx / len : 0;
    touch.dy = len > 8 ? dy / len : 0;
    touch.active = len > 8;
  };
  const joyHandler = (clientX, clientY) => {
    if (!joy) return;
    const r = joy.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    setKnob(clientX - cx, clientY - cy);
  };
  if (joy) {
    joy.addEventListener("pointerdown", (e) => {
      joyId = e.pointerId;
      joy.setPointerCapture(e.pointerId);
      joyHandler(e.clientX, e.clientY);
    });
    joy.addEventListener("pointermove", (e) => {
      if (e.pointerId !== joyId) return;
      joyHandler(e.clientX, e.clientY);
    });
    const end = (e) => {
      if (e.pointerId !== joyId) return;
      joyId = null;
      setKnob(0, 0);
      touch.active = false;
      touch.dx = 0;
      touch.dy = 0;
    };
    joy.addEventListener("pointerup", end);
    joy.addEventListener("pointercancel", end);
  }
  document.getElementById("btn-interact")?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    touch.interact = true;
  });
  document.getElementById("btn-inventory")?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    touch.inventory = true;
  });

  // Show touch on coarse pointers
  const tc = document.getElementById("touch-controls");
  if (tc && window.matchMedia("(pointer: coarse)").matches) {
    tc.classList.remove("hidden");
  }

  function movementVector() {
    let x = 0, y = 0;
    if (keys.has("w") || keys.has("arrowup")) y -= 1;
    if (keys.has("s") || keys.has("arrowdown")) y += 1;
    if (keys.has("a") || keys.has("arrowleft")) x -= 1;
    if (keys.has("d") || keys.has("arrowright")) x += 1;
    if (touch.active) {
      x += touch.dx;
      y += touch.dy;
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }

  function consume(action) {
    if (action === "interact") {
      if (keys.has("e") || keys.has(" ")) {
        keys.delete("e");
        keys.delete(" ");
        return true;
      }
      if (touch.interact) {
        touch.interact = false;
        return true;
      }
    }
    if (action === "inventory") {
      if (keys.has("i")) {
        keys.delete("i");
        return true;
      }
      if (touch.inventory) {
        touch.inventory = false;
        return true;
      }
    }
    if (action === "pause") {
      if (keys.has("escape")) {
        keys.delete("escape");
        return true;
      }
    }
    return false;
  }

  return { keys, mouse, movementVector, consume };
}
