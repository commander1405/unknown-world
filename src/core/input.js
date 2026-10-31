export function createInput() {
  const state = {
    left: false,
    right: false,
    jump: false,
    sprint: false,
    inv: false,
    pause: false,
    mine: false,
    place: false,
    mx: 0,
    my: 0,
    hotbarDelta: 0,
  };
  const keys = new Set();

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    keys.add(k);
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault();
    if (k === "e" || k === "i") state.inv = true;
    if (k === "escape") state.pause = true;
    if (k >= "1" && k <= "9") state.hotbarSelect = (+k - 1);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());

  window.addEventListener("mousemove", (e) => {
    state.mx = e.clientX;
    state.my = e.clientY;
  });
  window.addEventListener("mousedown", (e) => {
    if (e.button === 0) state.mine = true;
    if (e.button === 2) state.place = true;
  });
  window.addEventListener("mouseup", (e) => {
    if (e.button === 0) state.mine = false;
    if (e.button === 2) state.place = false;
  });
  window.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("wheel", (e) => {
    state.hotbarDelta += e.deltaY > 0 ? 1 : -1;
  }, { passive: true });

  // Touch UI hooks
  const joy = document.getElementById("joystick");
  const knob = document.getElementById("joystick-knob");
  let jid = null;
  const setJoy = (dx, dy) => {
    const max = 40;
    const len = Math.hypot(dx, dy) || 1;
    const c = Math.min(len, max);
    if (knob) knob.style.transform = `translate(${(dx / len) * c}px,${(dy / len) * c}px)`;
    state.left = dx < -12;
    state.right = dx > 12;
    state.jump = dy < -20;
  };
  if (joy) {
    joy.addEventListener("pointerdown", (e) => {
      jid = e.pointerId;
      joy.setPointerCapture(jid);
      const r = joy.getBoundingClientRect();
      setJoy(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    });
    joy.addEventListener("pointermove", (e) => {
      if (e.pointerId !== jid) return;
      const r = joy.getBoundingClientRect();
      setJoy(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    });
    const end = (e) => {
      if (e.pointerId !== jid) return;
      jid = null;
      setJoy(0, 0);
      state.left = state.right = state.jump = false;
      if (knob) knob.style.transform = "translate(0,0)";
    };
    joy.addEventListener("pointerup", end);
    joy.addEventListener("pointercancel", end);
  }
  document.getElementById("btn-mine")?.addEventListener("pointerdown", (e) => { e.preventDefault(); state.mine = true; });
  document.getElementById("btn-mine")?.addEventListener("pointerup", () => { state.mine = false; });
  document.getElementById("btn-jump")?.addEventListener("pointerdown", (e) => { e.preventDefault(); state.jump = true; });
  document.getElementById("btn-jump")?.addEventListener("pointerup", () => { state.jump = false; });
  document.getElementById("btn-inv")?.addEventListener("pointerdown", (e) => { e.preventDefault(); state.inv = true; });
  document.getElementById("btn-place")?.addEventListener("pointerdown", (e) => { e.preventDefault(); state.place = true; });
  document.getElementById("btn-place")?.addEventListener("pointerup", () => { state.place = false; });

  if (window.matchMedia("(pointer: coarse)").matches) {
    document.getElementById("touch-controls")?.classList.remove("hidden");
  }

  function poll() {
    state.left = state.left || keys.has("a") || keys.has("arrowleft");
    state.right = state.right || keys.has("d") || keys.has("arrowright");
    // keyboard overrides sticky touch jump only when keys present
    if (keys.has("a") || keys.has("arrowleft") || keys.has("d") || keys.has("arrowright") || keys.has("w") || keys.has(" ") || keys.has("arrowup")) {
      state.left = keys.has("a") || keys.has("arrowleft");
      state.right = keys.has("d") || keys.has("arrowright");
      state.jump = keys.has("w") || keys.has(" ") || keys.has("arrowup");
    }
    state.sprint = keys.has("shift");
    return state;
  }

  function consume(flag) {
    if (state[flag]) {
      state[flag] = false;
      return true;
    }
    return false;
  }

  return { poll, consume, state };
}
