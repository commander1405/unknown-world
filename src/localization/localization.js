import en from "./en.js";
import fa from "./fa.js";

const catalogs = { en, fa };
let current = "en";
let strings = en;
const listeners = new Set();

export function getLang() {
  return current;
}

export function t(path, vars = {}) {
  const parts = path.split(".");
  let v = strings;
  for (const p of parts) {
    v = v?.[p];
    if (v == null) return path;
  }
  if (typeof v !== "string") return path;
  return v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ""));
}

export function setLanguage(lang) {
  if (!catalogs[lang]) lang = "en";
  current = lang;
  strings = catalogs[lang];
  document.documentElement.lang = lang === "fa" ? "fa" : "en";
  document.documentElement.dir = strings.dir || "ltr";
  try {
    localStorage.setItem("uw-lang", lang);
  } catch (_) {}
  for (const fn of listeners) {
    try { fn(lang); } catch (_) {}
  }
}

export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function initLanguage() {
  let lang = "en";
  try {
    lang = localStorage.getItem("uw-lang") || "en";
  } catch (_) {}
  setLanguage(lang);
}

export function itemName(id) {
  return t(`items.${id}`) !== `items.${id}` ? t(`items.${id}`) : id;
}

export function itemDesc(id) {
  return t(`itemDesc.${id}`) !== `itemDesc.${id}` ? t(`itemDesc.${id}`) : "";
}

export function blockName(id) {
  return t(`blocks.${id}`) !== `blocks.${id}` ? t(`blocks.${id}`) : id;
}
