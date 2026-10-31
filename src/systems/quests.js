export function createQuests() {
  return {
    list: [
      { id: "guide", key: "guide", done: false },
      { id: "chop", key: "chop", done: false, progress: 0, target: 10 },
      { id: "craftAxe", key: "craftAxe", done: false },
      { id: "mine", key: "mine", done: false, progress: 0, target: 15 },
    ],
    talkedGuide: false,
    gotStarterAxe: false,
  };
}

export function onGather(quests, itemId, n = 1) {
  const notes = [];
  if (itemId === "wood") {
    const q = quests.list.find((x) => x.id === "chop");
    if (q && !q.done) {
      q.progress = Math.min(q.target, (q.progress || 0) + n);
      if (q.progress >= q.target) {
        q.done = true;
        notes.push("chop");
      }
    }
  }
  if (itemId === "stone") {
    const q = quests.list.find((x) => x.id === "mine");
    if (q && !q.done) {
      q.progress = Math.min(q.target, (q.progress || 0) + n);
      if (q.progress >= q.target) {
        q.done = true;
        notes.push("mine");
      }
    }
  }
  return notes;
}

export function onCrafted(quests, itemId) {
  if (itemId === "axe") {
    const q = quests.list.find((x) => x.id === "craftAxe");
    if (q && !q.done) {
      q.done = true;
      return "craftAxe";
    }
  }
  return null;
}
