import { t, setLanguage, getLang, itemName, itemDesc, onLanguageChange } from "../localization/localization.js";
import { RECIPES, canCraft, craft } from "../systems/crafting.js";

export function createUI(root) {
  let toastTimer = null;

  function toast(msg) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      root.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  function clearOverlays() {
    root.querySelectorAll(".overlay, .screen").forEach((n) => n.remove());
  }

  function showMenu({ hasSave, onNew, onContinue, onSettings, onCredits }) {
    clearOverlays();
    const sc = document.createElement("div");
    sc.className = "screen anim-in";
    sc.innerHTML = `
      <div class="panel">
        <h1 class="logo">${t("menu.title")}</h1>
        <p class="tagline">${t("menu.tagline")}</p>
        <button class="btn btn-primary" data-a="continue" ${hasSave ? "" : "disabled"}>${t("menu.continue")}</button>
        <button class="btn btn-ghost" data-a="new">${t("menu.newWorld")}</button>
        <button class="btn btn-ghost" data-a="settings">${t("menu.settings")}</button>
        <button class="btn btn-ghost" data-a="credits">${t("menu.credits")}</button>
        <p class="hint">${t("controls.move")}<br/>${t("controls.jump")}<br/>${t("controls.mine")}</p>
      </div>`;
    sc.addEventListener("click", (e) => {
      const a = e.target.getAttribute?.("data-a");
      if (a === "new") onNew();
      if (a === "continue" && hasSave) onContinue();
      if (a === "settings") onSettings();
      if (a === "credits") toast(t("credits"));
    });
    root.appendChild(sc);
  }

  function ensureHud() {
    let hud = document.getElementById("hud");
    if (hud) return hud;
    hud = document.createElement("div");
    hud.id = "hud";
    hud.className = "hud";
    hud.innerHTML = `
      <div class="bars">
        <div class="bar"><span data-l="hp"></span><div class="track"><i id="hp"></i></div></div>
        <div class="bar"><span data-l="hunger"></span><div class="track"><i id="hunger"></i></div></div>
        <div class="bar"><span data-l="stamina"></span><div class="track"><i id="stamina"></i></div></div>
      </div>
      <div class="hud-right">
        <div class="chip" id="day-chip"></div>
        <div class="chip quest" id="quest-chip"></div>
      </div>
      <div class="hotbar" id="hotbar"></div>`;
    root.appendChild(hud);
    return hud;
  }

  function updateHud(player, inv, dayLabel, questText) {
    const hud = ensureHud();
    hud.querySelector('[data-l="hp"]').textContent = t("hud.hp");
    hud.querySelector('[data-l="hunger"]').textContent = t("hud.hunger");
    hud.querySelector('[data-l="stamina"]').textContent = t("hud.stamina");
    hud.querySelector("#hp").style.width = (player.hp / player.maxHp * 100) + "%";
    hud.querySelector("#hunger").style.width = (player.hunger / 100 * 100) + "%";
    hud.querySelector("#stamina").style.width = (player.stamina / player.maxStamina * 100) + "%";
    hud.querySelector("#day-chip").textContent = `${t("hud.day")} ${dayLabel}`;
    hud.querySelector("#quest-chip").textContent = questText || "";
    const hb = hud.querySelector("#hotbar");
    hb.innerHTML = "";
    for (let i = 0; i < 10; i++) {
      const s = inv.slots[i];
      const d = document.createElement("div");
      d.className = "slot" + (i === inv.hotbar ? " active" : "");
      d.textContent = s ? `${itemName(s.id)[0]||"?"} ${s.count}` : "";
      d.title = s ? itemName(s.id) : "";
      hb.appendChild(d);
    }
  }

  function setHudVisible(v) {
    const hud = document.getElementById("hud");
    if (hud) hud.classList.toggle("hidden", !v);
  }

  function openSettings(settings, onChange, onClose) {
    const ov = document.createElement("div");
    ov.className = "overlay anim-in";
    ov.innerHTML = `
      <div class="panel wide">
        <h2>${t("settings.title")}</h2>
        <label class="row">${t("settings.language")}
          <select id="lang">
            <option value="en">English</option>
            <option value="fa">فارسی</option>
          </select>
        </label>
        <label class="row">${t("settings.graphics")}
          <select id="gfx"><option value="low">${t("settings.low")}</option><option value="medium">${t("settings.medium")}</option><option value="high">${t("settings.high")}</option></select>
        </label>
        <label class="row">${t("settings.animQuality")}
          <select id="anim"><option value="low">${t("settings.low")}</option><option value="medium">${t("settings.medium")}</option><option value="high">${t("settings.high")}</option></select>
        </label>
        <label class="row">${t("settings.uiAnim")} <input type="checkbox" id="uiAnim" /></label>
        <label class="row">${t("settings.reducedMotion")} <input type="checkbox" id="reduced" /></label>
        <label class="row">${t("settings.fps")} <input type="checkbox" id="fps" /></label>
        <button class="btn btn-primary" id="close">${t("settings.close")}</button>
      </div>`;
    root.appendChild(ov);
    ov.querySelector("#lang").value = getLang();
    ov.querySelector("#gfx").value = settings.graphics || "medium";
    ov.querySelector("#anim").value = settings.animQuality || "medium";
    ov.querySelector("#uiAnim").checked = settings.uiAnim !== false;
    ov.querySelector("#reduced").checked = !!settings.reducedMotion;
    ov.querySelector("#fps").checked = !!settings.showFps;
    const apply = () => {
      const lang = ov.querySelector("#lang").value;
      if (lang !== getLang()) setLanguage(lang);
      settings.graphics = ov.querySelector("#gfx").value;
      settings.animQuality = ov.querySelector("#anim").value;
      settings.uiAnim = ov.querySelector("#uiAnim").checked;
      settings.reducedMotion = ov.querySelector("#reduced").checked;
      settings.showFps = ov.querySelector("#fps").checked;
      document.documentElement.classList.toggle("no-anim", settings.reducedMotion || !settings.uiAnim);
      onChange?.(settings);
    };
    ov.querySelector("#lang").onchange = apply;
    ov.querySelector("#gfx").onchange = apply;
    ov.querySelector("#anim").onchange = apply;
    ov.querySelector("#uiAnim").onchange = apply;
    ov.querySelector("#reduced").onchange = apply;
    ov.querySelector("#fps").onchange = apply;
    ov.querySelector("#close").onclick = () => { apply(); ov.remove(); onClose?.(); };
  }

  function openInventory(inv, nearStation, onCrafted, onClose) {
    const ov = document.createElement("div");
    ov.className = "overlay anim-in";
    ov.innerHTML = `
      <div class="panel wide">
        <div class="tabs">
          <button class="tab active" data-tab="inv">${t("menu.inventory")}</button>
          <button class="tab" data-tab="craft">${t("menu.crafting")}</button>
        </div>
        <div id="tab-inv" class="tab-body"></div>
        <div id="tab-craft" class="tab-body hidden"></div>
        <button class="btn btn-ghost" id="close">${t("settings.close")}</button>
      </div>`;
    const invBody = ov.querySelector("#tab-inv");
    inv.slots.forEach((s, i) => {
      const d = document.createElement("div");
      d.className = "inv-slot";
      if (s) {
        d.innerHTML = `<strong>${itemName(s.id)}</strong><span>×${s.count}</span><small>${itemDesc(s.id)}</small>`;
      } else d.textContent = "—";
      if (i === inv.hotbar) d.classList.add("active");
      d.onclick = () => {
        if (i < 10) inv.hotbar = i;
        onClose?.();
        ov.remove();
      };
      invBody.appendChild(d);
    });
    const craftBody = ov.querySelector("#tab-craft");
    for (const r of RECIPES) {
      const ok = canCraft(inv, r, nearStation);
      const d = document.createElement("button");
      d.className = "craft-row";
      d.disabled = !ok;
      const need = Object.entries(r.need).map(([k, v]) => `${itemName(k)}×${v}`).join(", ");
      d.textContent = `${itemName(r.out.id)} ×${r.out.n}  (${need})`;
      d.onclick = () => {
        if (craft(inv, r, nearStation)) {
          toast(t("notify.crafted", { item: itemName(r.out.id) }));
          onCrafted?.(r.out.id);
          ov.remove();
          openInventory(inv, nearStation, onCrafted, onClose);
        } else toast(t("notify.needMats"));
      };
      craftBody.appendChild(d);
    }
    ov.querySelectorAll(".tab").forEach((btn) => {
      btn.onclick = () => {
        ov.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        ov.querySelector("#tab-inv").classList.toggle("hidden", btn.dataset.tab !== "inv");
        ov.querySelector("#tab-craft").classList.toggle("hidden", btn.dataset.tab !== "craft");
      };
    });
    ov.querySelector("#close").onclick = () => { ov.remove(); onClose?.(); };
    root.appendChild(ov);
  }

  function openPause(handlers) {
    const ov = document.createElement("div");
    ov.className = "overlay anim-in";
    ov.innerHTML = `
      <div class="panel">
        <h2>${t("menu.pause")}</h2>
        <button class="btn btn-primary" data-a="resume">${t("menu.resume")}</button>
        <button class="btn btn-ghost" data-a="inv">${t("menu.inventory")}</button>
        <button class="btn btn-ghost" data-a="quests">${t("menu.quests")}</button>
        <button class="btn btn-ghost" data-a="settings">${t("menu.settings")}</button>
        <button class="btn btn-danger" data-a="exit">${t("menu.saveExit")}</button>
      </div>`;
    ov.addEventListener("click", (e) => {
      const a = e.target.getAttribute?.("data-a");
      if (!a) return;
      if (a === "resume") { ov.remove(); handlers.onResume(); }
      if (a === "inv") handlers.onInv();
      if (a === "quests") handlers.onQuests();
      if (a === "settings") handlers.onSettings();
      if (a === "exit") { ov.remove(); handlers.onExit(); }
    });
    root.appendChild(ov);
  }

  function openQuests(quests) {
    const ov = document.createElement("div");
    ov.className = "overlay anim-in";
    let html = `<div class="panel"><h2>${t("menu.quests")}</h2>`;
    for (const q of quests.list) {
      const title = t("quests." + q.key);
      const desc = t("quests." + q.key + "Desc");
      const prog = q.target ? ` (${q.progress || 0}/${q.target})` : "";
      html += `<div class="quest-item ${q.done ? "done" : ""}"><strong>${title}${q.done ? " ✓" : ""}${prog}</strong><p>${desc}</p></div>`;
    }
    html += `<button class="btn btn-ghost" id="c">${t("settings.close")}</button></div>`;
    ov.innerHTML = html;
    ov.querySelector("#c").onclick = () => ov.remove();
    root.appendChild(ov);
  }

  function openDialog(name, lines, onDone) {
    let i = 0;
    const ov = document.createElement("div");
    ov.className = "overlay anim-in";
    const render = () => {
      ov.innerHTML = `<div class="panel"><h2>${name}</h2><p class="dialog">${lines[i]}</p>
        <button class="btn btn-primary" id="n">${i < lines.length - 1 ? "…" : t("settings.close")}</button></div>`;
      ov.querySelector("#n").onclick = () => {
        if (i < lines.length - 1) { i++; render(); }
        else { ov.remove(); onDone?.(); }
      };
    };
    render();
    root.appendChild(ov);
  }

  return {
    toast, showMenu, clearOverlays, updateHud, setHudVisible,
    openSettings, openInventory, openPause, openQuests, openDialog, ensureHud,
  };
}
