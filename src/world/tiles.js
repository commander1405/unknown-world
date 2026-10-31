export const TILE = 16;
export const CHUNK = 32;

export const T = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  WOOD: 4,
  LEAVES: 5,
  COAL: 6,
  COPPER: 7,
  IRON: 8,
  WORKBENCH: 9,
  FURNACE: 10,
  TORCH: 11,
};

export const TILE_SOLID = {
  [T.AIR]: false,
  [T.GRASS]: true,
  [T.DIRT]: true,
  [T.STONE]: true,
  [T.WOOD]: true,
  [T.LEAVES]: false,
  [T.COAL]: true,
  [T.COPPER]: true,
  [T.IRON]: true,
  [T.WORKBENCH]: true,
  [T.FURNACE]: true,
  [T.TORCH]: false,
};

export const TILE_COLOR = {
  [T.AIR]: null,
  [T.GRASS]: ["#3d8c40", "#2f6b32"],
  [T.DIRT]: ["#8b5a2b", "#6b4423"],
  [T.STONE]: ["#7a8088", "#5a6068"],
  [T.WOOD]: ["#6b4423", "#4a2f18"],
  [T.LEAVES]: ["#2d8a4a", "#1f6a38"],
  [T.COAL]: ["#3a3a3a", "#2a2a2a"],
  [T.COPPER]: ["#8a5a3a", "#b87333"],
  [T.IRON]: ["#9aa0a8", "#c0c4cc"],
  [T.WORKBENCH]: ["#a07040", "#704828"],
  [T.FURNACE]: ["#606068", "#404048"],
  [T.TORCH]: ["#e8c040", "#ff8030"],
};

export const DROP_FOR = {
  [T.GRASS]: "dirt",
  [T.DIRT]: "dirt",
  [T.STONE]: "stone",
  [T.WOOD]: "wood",
  [T.LEAVES]: "berry",
  [T.COAL]: "coal",
  [T.COPPER]: "copper",
  [T.IRON]: "iron",
  [T.WORKBENCH]: "workbench",
  [T.FURNACE]: "furnace",
  [T.TORCH]: "torch",
};

export const HARDNESS = {
  [T.GRASS]: 0.4,
  [T.DIRT]: 0.45,
  [T.STONE]: 1.2,
  [T.WOOD]: 0.8,
  [T.LEAVES]: 0.15,
  [T.COAL]: 1.4,
  [T.COPPER]: 1.6,
  [T.IRON]: 2.0,
  [T.WORKBENCH]: 0.5,
  [T.FURNACE]: 0.8,
  [T.TORCH]: 0.1,
};

export const PLACEABLE = {
  dirt: T.DIRT,
  stone: T.STONE,
  wood: T.WOOD,
  workbench: T.WORKBENCH,
  furnace: T.FURNACE,
  torch: T.TORCH,
};
