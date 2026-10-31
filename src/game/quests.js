export function createQuestState() {
  return {
    active: [
      {
        id: "supplies",
        title: "Village Supplies",
        desc: "Collect 8 Wood and 5 Berries for Elder Mira.",
        done: false,
      },
      {
        id: "cave",
        title: "Whispering Cave",
        desc: "Discover the cave northwest of the village.",
        done: false,
      },
      {
        id: "lake",
        title: "Silver Lake",
        desc: "Reach Silver Lake east of the village.",
        done: false,
      },
    ],
  };
}

export function updateQuests(quests, player, inventory, world) {
  const notes = [];
  const supplies = quests.active.find((q) => q.id === "supplies");
  if (supplies && !supplies.done) {
    if ((inventory.wood || 0) >= 8 && (inventory.berry || 0) >= 5) {
      supplies.done = true;
      notes.push("Quest complete: Village Supplies");
      player.xp += 40;
    }
  }
  const cave = quests.active.find((q) => q.id === "cave");
  if (cave && !cave.done) {
    const c = world.landmarks.cave;
    if (Math.hypot(player.x - c.x, player.y - c.y) < 80) {
      cave.done = true;
      notes.push("Quest complete: Whispering Cave");
      player.xp += 50;
    }
  }
  const lake = quests.active.find((q) => q.id === "lake");
  if (lake && !lake.done) {
    const l = world.landmarks.lake;
    if (Math.hypot(player.x - l.x, player.y - l.y) < 160) {
      lake.done = true;
      notes.push("Quest complete: Silver Lake");
      player.xp += 35;
    }
  }
  // level up
  while (player.xp >= player.xpToLevel) {
    player.xp -= player.xpToLevel;
    player.level += 1;
    player.xpToLevel = Math.floor(60 + player.level * 35);
    player.maxHp += 8;
    player.hp = player.maxHp;
    player.maxStamina += 5;
    notes.push(`Level up! You are now level ${player.level}`);
  }
  return notes;
}
