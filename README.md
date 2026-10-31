# UNKNOWN WORLD

2D side-scrolling sandbox survival game (Terraria-inspired) for the browser.

**Play:** https://commander1405.github.io/unknown-world/

## Features

- Infinite horizontal procedural world (chunk-based, deterministic seed)
- Pixel-style Canvas rendering (nearest-neighbor)
- Mining, chopping, placing blocks
- Inventory + crafting (axe, pickaxe, workbench, furnace, iron tools)
- Guide NPC, quests, hunger / health / stamina
- Day / night cycle
- Full **English / فارسی** localization (Settings → Language)
- Animated UI with reduced-motion option
- Desktop + mobile landscape controls
- Save via IndexedDB (+ LocalStorage fallback)

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Move | A/D or Arrows | Joystick |
| Jump | W / Space / Up | Jump button |
| Mine | Left mouse | Mine button |
| Place | Right mouse | Place button |
| Inventory / Craft | E or I | I |
| Talk to Guide | F or Enter | near Guide |
| Pause | Esc | — |

## Languages

Settings → Language → English or فارسی. Instant switch, RTL for Persian, preference saved.

## Run locally

```bash
npx serve .
```

Open the served URL (ES modules need HTTP).

## Stack

Vanilla HTML/CSS/JS modules. No build step. GitHub Pages from `main` `/`.
