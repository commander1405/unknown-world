import { countItem, removeItem, addItem } from "./inventory.js";

export const RECIPES = [
  { id: "stick", out: { id: "stick", n: 4 }, need: { wood: 1 }, station: null },
  { id: "torch", out: { id: "torch", n: 4 }, need: { stick: 1, coal: 1 }, station: null },
  { id: "axe", out: { id: "axe", n: 1 }, need: { wood: 5, stick: 2 }, station: null },
  { id: "pickaxe", out: { id: "pickaxe", n: 1 }, need: { wood: 4, stone: 6 }, station: null },
  { id: "sword", out: { id: "sword", n: 1 }, need: { wood: 6, stick: 1 }, station: null },
  { id: "workbench", out: { id: "workbench", n: 1 }, need: { wood: 10 }, station: null },
  { id: "furnace", out: { id: "furnace", n: 1 }, need: { stone: 20 }, station: "workbench" },
  { id: "ironBar", out: { id: "ironBar", n: 1 }, need: { iron: 2, coal: 1 }, station: "furnace" },
  { id: "ironPickaxe", out: { id: "ironPickaxe", n: 1 }, need: { ironBar: 4, stick: 2 }, station: "workbench" },
];

export function canCraft(inv, recipe, nearStation) {
  if (recipe.station && nearStation !== recipe.station) return false;
  for (const [k, v] of Object.entries(recipe.need)) {
    if (countItem(inv, k) < v) return false;
  }
  return true;
}

export function craft(inv, recipe, nearStation) {
  if (!canCraft(inv, recipe, nearStation)) return false;
  for (const [k, v] of Object.entries(recipe.need)) removeItem(inv, k, v);
  addItem(inv, recipe.out.id, recipe.out.n);
  return true;
}
