export function createInventory() {
  return {
    slots: Array.from({ length: 40 }, () => null), // {id, count}
    hotbar: 0,
  };
}

export function addItem(inv, id, count = 1) {
  // stack existing
  for (const s of inv.slots) {
    if (s && s.id === id && s.count < 99) {
      const space = 99 - s.count;
      const n = Math.min(space, count);
      s.count += n;
      count -= n;
      if (count <= 0) return true;
    }
  }
  for (let i = 0; i < inv.slots.length; i++) {
    if (!inv.slots[i]) {
      const n = Math.min(99, count);
      inv.slots[i] = { id, count: n };
      count -= n;
      if (count <= 0) return true;
    }
  }
  return count <= 0;
}

export function countItem(inv, id) {
  return inv.slots.reduce((a, s) => a + (s && s.id === id ? s.count : 0), 0);
}

export function removeItem(inv, id, count = 1) {
  if (countItem(inv, id) < count) return false;
  let left = count;
  for (const s of inv.slots) {
    if (!s || s.id !== id) continue;
    const n = Math.min(s.count, left);
    s.count -= n;
    left -= n;
  }
  inv.slots = inv.slots.map((s) => (s && s.count > 0 ? s : null));
  return true;
}

export function selectedItem(inv) {
  return inv.slots[inv.hotbar] || null;
}
