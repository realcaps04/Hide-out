# HIDEOUT

**Hide well. Trust nobody. Survive the hunt.**

HIDEOUT is a stylized browser-based hide-and-seek game. This repository contains the first playable local prototype of *The Forgotten Basement*.

**GitHub:** [github.com/realcaps04/Hide-out](https://github.com/realcaps04/Hide-out)

## Included in Prototype 01

- Branded HIDEOUT game menu
- Avatar builder with lobby portraits
- Pre-game player lobby (private / public / join code)
- Stylized 3D basement environment
- Third-person keyboard movement and drag-to-look camera
- Interactive hiding locations
- Timed hide and hunt phases
- Finder training with catch mechanics
- Match result screen

## Run it locally

1. Install [Node.js](https://nodejs.org/).
2. In this project folder, run `npm install`.
3. Run `npm run dev`.
4. Open the local address shown in the terminal, normally `http://localhost:5173`.

```bash
git clone https://github.com/realcaps04/Hide-out.git
cd Hide-out
npm install
npm run dev
```

## Controls

| Control | Action |
| --- | --- |
| W A S D / arrow keys | Move |
| Shift | Sprint |
| Drag pointer | Look around |
| E | Hide, leave a hiding spot, or catch |
| F | Flashlight |

## Planned next stages

- Shared player movement and server-authoritative match rules
- Online accounts and player stats
- Voice and text chat
- Mobile controls and public deployment
