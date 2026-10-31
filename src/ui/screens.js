export function createUI(root) {
  const hud = document.createElement("div");
  hud.className = "hud hidden";
  hud.innerHTML = `
    <div class="hud-top">
      <div class="bars">
        <div class="bar-row"><span>HP</span><div class="bar-track"><div class="bar-fill hp" id="bar-hp"></div></div></div>
        <div class="bar-row"><span>ST</span><div class="bar-track"><div class="bar-fill st" id="bar-st"></div></div></div>
        <div class="bar-row"><span>XP</span><div class="bar-track"><div class="bar-fill xp" id="bar-xp"></div></div></div>
      </div>
      <div class="hud-right">
        <div class="chip" id="chip-level">Lv 1</div>
        <div class="chip" id="chip-time">Dawn</div>
        <div class="chip quest-chip" id="chip-quest"><strong>Quest</strong><span>—</span></div>
      </div>
    </div>
  `;
  root.appendChild(hud);

  let toastEl = null;
  let toastTimer = null;

  function showToast(msg) {
    if (toastEl) toastEl.remove();
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    toastEl.textContent = msg;
    root.appendChild(toastEl);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl?.remove(), 2600);
  }

  function showMainMenu({ hasSave, onContinue, onNew, onSettings }) {
    clearScreens();
    const sc = document.createElement("div");
    sc.className = "screen";
    sc.id = "main-menu";
    sc.innerHTML = `
      <div class="panel">
        <h1 class="logo">UNKNOWN WORLD</h1>
        <p class="tagline">Explore. Survive. Remember.</p>
        <button class="btn btn-primary" id="m-continue" ${hasSave ? "" : "disabled style='opacity:0.4'"}>Continue</button>
        <button class="btn btn-ghost" id="m-new">New Game</button>
        <button class="btn btn-ghost" id="m-settings">Settings</button>
        <p class="hint">WASD / Arrows move · E interact · I inventory · ESC pause<br/>Touch controls on mobile</p>
      </div>
    `;
    root.appendChild(sc);
    sc.querySelector("#m-continue")?.addEventListener("click", () => hasSave && onContinue());
    sc.querySelector("#m-new")?.addEventListener("click", () => {
      if (hasSave && !confirm("Start a new game? Existing save will be replaced after you play and save.")) return;
      onNew();
    });
    sc.querySelector("#m-settings")?.addEventListener("click", onSettings);
  }

  function clearScreens() {
    root.querySelectorAll(".screen, .modal-backdrop").forEach((n) => n.remove());
  }

  function setHudVisible(v) {
    hud.classList.toggle("hidden", !v);
  }

  function updateHud(player, inventory, quests, timeLabel) {
    const hp = document.getElementById("bar-hp");
    const st = document.getElementById("bar-st");
    const xp = document.getElementById("bar-xp");
    if (hp) hp.style.width = `${(player.hp / player.maxHp) * 100}%`;
    if (st) st.style.width = `${(player.stamina / player.maxStamina) * 100}%`;
    if (xp) xp.style.width = `${(player.xp / player.xpToLevel) * 100}%`;
    const lv = document.getElementById("chip-level");
    if (lv) lv.textContent = `Lv ${player.level}`;
    const tm = document.getElementById("chip-time");
    if (tm) tm.textContent = timeLabel;
    const q = document.getElementById("chip-quest");
    if (q) {
      const active = quests.active.find((x) => !x.done) || quests.active[quests.active.length - 1];
      q.innerHTML = `<strong>${active?.title || "Quests"}</strong><span>${active?.done ? "All complete" : active?.desc || ""}</span>`;
    }
  }

  function openInventory(inventory, onClose) {
    const bd = document.createElement("div");
    bd.className = "modal-backdrop";
    const items = Object.entries(inventory).filter(([, n]) => n > 0);
    bd.innerHTML = `
      <div class="modal">
        <div class="close-row"><h2>Inventory</h2><button class="btn btn-ghost" id="inv-close" style="width:auto;padding:8px 14px">Close</button></div>
        <div class="inv-grid" id="inv-grid"></div>
      </div>
    `;
    const grid = bd.querySelector("#inv-grid");
    if (!items.length) {
      grid.innerHTML = `<p style="color:var(--muted)">Empty — explore and gather resources.</p>`;
    } else {
      for (const [name, qty] of items) {
        const d = document.createElement("div");
        d.className = "inv-item";
        d.innerHTML = `<div class="qty">${qty}</div><div class="name">${name}</div>`;
        grid.appendChild(d);
      }
    }
    bd.querySelector("#inv-close").onclick = () => { bd.remove(); onClose?.(); };
    bd.addEventListener("click", (e) => { if (e.target === bd) { bd.remove(); onClose?.(); } });
    root.appendChild(bd);
  }

  function openQuests(quests, onClose) {
    const bd = document.createElement("div");
    bd.className = "modal-backdrop";
    bd.innerHTML = `<div class="modal"><div class="close-row"><h2>Quest Log</h2><button class="btn btn-ghost" id="q-close" style="width:auto;padding:8px 14px">Close</button></div><div class="quest-list" id="q-list"></div></div>`;
    const list = bd.querySelector("#q-list");
    for (const q of quests.active) {
      const d = document.createElement("div");
      d.className = "quest-item" + (q.done ? " done" : "");
      d.innerHTML = `<h3>${q.title}${q.done ? " ✓" : ""}</h3><p>${q.desc}</p>`;
      list.appendChild(d);
    }
    bd.querySelector("#q-close").onclick = () => { bd.remove(); onClose?.(); };
    root.appendChild(bd);
  }

  function openPause({ onResume, onSave, onQuests, onSettings, onMenu }) {
    const bd = document.createElement("div");
    bd.className = "modal-backdrop";
    bd.id = "pause-menu";
    bd.innerHTML = `
      <div class="modal">
        <h2>Paused</h2>
        <button class="btn btn-primary" id="p-resume">Resume</button>
        <button class="btn btn-ghost" id="p-save">Save Game</button>
        <button class="btn btn-ghost" id="p-quests">Quest Log</button>
        <button class="btn btn-ghost" id="p-settings">Settings</button>
        <button class="btn btn-danger" id="p-menu">Main Menu</button>
      </div>
    `;
    bd.querySelector("#p-resume").onclick = () => { bd.remove(); onResume(); };
    bd.querySelector("#p-save").onclick = () => onSave();
    bd.querySelector("#p-quests").onclick = () => onQuests();
    bd.querySelector("#p-settings").onclick = () => onSettings();
    bd.querySelector("#p-menu").onclick = () => { bd.remove(); onMenu(); };
    root.appendChild(bd);
  }

  function openSettings(settings, onChange, onClose) {
    const bd = document.createElement("div");
    bd.className = "modal-backdrop";
    bd.innerHTML = `
      <div class="modal">
        <div class="close-row"><h2>Settings</h2><button class="btn btn-ghost" id="s-close" style="width:auto;padding:8px 14px">Close</button></div>
        <div class="settings-row"><span>Music volume</span><input type="range" id="s-music" min="0" max="1" step="0.05" value="${settings.music}" /></div>
        <div class="settings-row"><span>SFX volume</span><input type="range" id="s-sfx" min="0" max="1" step="0.05" value="${settings.sfx}" /></div>
        <div class="settings-row"><span>Show FPS</span><input type="checkbox" id="s-fps" ${settings.showFps ? "checked" : ""} /></div>
      </div>
    `;
    const apply = () => {
      settings.music = +bd.querySelector("#s-music").value;
      settings.sfx = +bd.querySelector("#s-sfx").value;
      settings.showFps = bd.querySelector("#s-fps").checked;
      onChange?.(settings);
    };
    bd.querySelector("#s-music").oninput = apply;
    bd.querySelector("#s-sfx").oninput = apply;
    bd.querySelector("#s-fps").onchange = apply;
    bd.querySelector("#s-close").onclick = () => { bd.remove(); onClose?.(); };
    root.appendChild(bd);
  }

  function openDialog(name, lines, onClose) {
    const bd = document.createElement("div");
    bd.className = "modal-backdrop";
    let i = 0;
    const render = () => {
      bd.innerHTML = `
        <div class="modal">
          <h2>${name}</h2>
          <p style="color:var(--muted);line-height:1.55;min-height:3.2em">${lines[i]}</p>
          <button class="btn btn-primary" id="d-next">${i < lines.length - 1 ? "Next" : "Close"}</button>
        </div>
      `;
      bd.querySelector("#d-next").onclick = () => {
        if (i < lines.length - 1) {
          i++;
          render();
        } else {
          bd.remove();
          onClose?.();
        }
      };
    };
    render();
    root.appendChild(bd);
  }

  return {
    showMainMenu,
    clearScreens,
    setHudVisible,
    updateHud,
    showToast,
    openInventory,
    openQuests,
    openPause,
    openSettings,
    openDialog,
  };
}
