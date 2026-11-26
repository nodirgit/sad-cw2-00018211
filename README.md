# SAD CW2 — student 00018211

Systems Analysis and Design (6BUIS026C), Coursework 2, for the broiler farm **Nurota Halol Parranda MCHJ**.

**The high-fidelity prototype is in [`prototype/`](prototype)** — a phone-first web app (React + TypeScript + Vite) that runs the farm's records from CW1's requirements (FR-01…FR-08, NFR-01…NFR-05): deaths, feed per batch, slaughter head count and crew pay, the Bazaar agent weight cross-check, sales, expenses with an optional voice helper, batch profit, live house climate and lights (simulated), PIN login with money hidden from workers.

## Run it

Needs Node.js 18 or newer.

```
cd prototype
npm install
npm run dev        # http://localhost:5173 — Director PIN 1234, Workers 1111 / 2222
npm test           # unit tests of the business rules
```

Everything else (screens, design, what is simulated, demo data) is in [`prototype/README.md`](prototype/README.md).

## Folders

| Folder | Contents |
|---|---|
| [`prototype/`](prototype) | High-fidelity prototype: source, tests, screenshots, video script |
| `diagrams/` | UML class diagrams (architecture + detailed), PlantUML sources and PNG/SVG |
| `low-fi/` | Low-fidelity prototype (draw.io) and its exports |
| `report/build/` | The script that builds the Word report (the report itself is submitted separately) |

## AI use

The brief allows AI for the high-fidelity prototype. This prototype was built with **Claude Code** (an AI coding agent), working from the CW1 requirements and handoffs, and changed after the student's own review of the running app. The class diagrams were drafted from this code. The low-fidelity prototype and the methodology section are the student's own work.
