# SAD CW2 — agent workspace (start here)

This folder (`D:\SAD_CW2`) is your **workspace**: everything you build goes here.

The Obsidian vault at **`C:\Users\user\Documents\SAD-CW2`** is the **channel** between you, the Planner (Claude in claude.ai chat) and Nodir. Handoffs, rules, the brief and the farm facts are there; your log and status go back there.

## Every session
1. Read the vault's `CLAUDE.md` (full rules), then `STATUS.md`, `Handoff.md` and the active handoff in `03 Handoffs/`.
2. Do only that handoff's work, in this folder.
3. Questions for the Planner go in the vault's `Questions.md`. Questions only Nodir can answer: ask him in the chat.
4. End with `/wrap`.

If the vault is not reachable in this session, stop and ask Nodir to attach `C:\Users\user\Documents\SAD-CW2`.

## Layout
```
prototype\   the high-fidelity app (H1): package.json, src\, README.md, screenshots\, VIDEO-SCRIPT.md
diagrams\    PlantUML sources + rendered PNG/SVG (H2)
low-fi\      Nodir's draw.io low-fidelity prototype + exports
report\      SAD_CW2_00018211.docx + build\ script (H3)
```
This folder is one git repo; it is what gets pushed/zipped for the code link. `prototype\` sits at its root so the prototype files are clearly identifiable, as the brief requires.
