# Parranda Farm — high-fidelity prototype

SAD Coursework 2 (6BUIS026C), student 00018211.
A phone-first web app for **Nurota Halol Parranda MCHJ**, the broiler farm from CW1. It implements the main functions of the proposed system: requirements FR-01 to FR-08 and NFR-01 to NFR-05 from the CW1 requirements catalogue.

The prototype was built with an AI coding agent (Claude Code), as the brief allows. The class structure follows the design in handoff H1 and is what the UML class diagrams (H2) describe.

## Run it

Needs Node.js 18 or later.

```
cd prototype
npm install
npm run dev
```

Open http://localhost:5173. On a desktop the app shows as a phone-width column (NFR-01); use the browser's device toolbar at 390 × 844 for a phone frame.

| Login | PIN |
|---|---|
| Director | 1234 |
| Worker 1 | 1111 |
| Worker 2 | 2222 |

Other commands:

| Command | What it does |
|---|---|
| `npm test` | 19 unit tests of the business rules (Vitest) |
| `npm run typecheck` | TypeScript strict check |
| `npm run build` | production build into `dist/` |
| `npm run screenshots` | with `npm run dev` running: clicks through every screen in Chrome/Edge and saves `screenshots/*.png` |

## Screens and requirements

| Screen | Requirement | What it shows |
|---|---|---|
| Login | NFR-03 | user + 4-digit PIN |
| Director home | FR-07, FR-08, NFR-01 | one card per house: batch day, chicks, deaths today / in batch, live temperature and humidity with an alert outside the house's range, light switch |
| Worker home | NFR-03 | the same house cards, only *Log death* and *Feed delivery*, no money anywhere |
| Log death | FR-01, NFR-02 | house + count + Save; the same count in the same house within 2 minutes is flagged **possible duplicate** and not counted twice, with "it was a different bird — count it" |
| Feed delivery | FR-02, NFR-03 | supplier → house → that house's open batch; feed per bird for the batch; the cost field only for the Director, and it becomes a batch cost |
| Batch profit | FR-03 | per house: running profit, costs by category, sales by buyer, entries — each batch on its own |
| Slaughter session | FR-04, NFR-04 | head count + rate → crew payment shown at once; "Correct count" needs a note and keeps the history |
| Agent cross-check | FR-05 | agent's kg (Telegram photo) vs Trusted Representative's kg → PENDING / MATCH / MISMATCH; *Record sale* only on MATCH |
| Voice entry | FR-06 | microphone (Web Speech API, Uzbek) or text → amount, date, category, reason; anything unsure is amber and must be confirmed before saving |
| Settings | FR-07, NFR-05 | normal range per house, **add a house** (name + capacity) and start its batch, reset demo data |
| Flock density tile | FR-09 | disabled: "coming later (needs camera analytics)" |

Screenshots of every screen are in [`screenshots/`](screenshots).

## What is simulated or demo

- **Sensors** (FR-07): `SimulatedSensorProvider` — a random walk around a baseline per house. House 2 runs hot on purpose so the alert is visible. Labelled "Simulated sensor" in the app.
- **Light relay** (FR-08): `SimulatedLightController` — 0.7 s delay; every 4th command "loses the connection" and returns *not confirmed*, and the app keeps the old state and says so.
- **Voice** (FR-06): speech-to-text is the browser's Web Speech API (Chrome/Edge); the parsing is our own `RuleBasedVoiceParser` (rules, no AI service). The text box always works without a microphone.
- **Storage**: the browser's `localStorage` behind the `Repository<T>` interface. A real database would be a new class implementing the same interface, changed in `src/app/container.ts` only.
- **Demo data** (`src/infrastructure/demo/DemoData.ts`): two houses on different schedules (House 1 day 38, thinning started; House 2 day 12). Farm, buyers and buyer prices (~26,000 / 27,000 / 28,000 UZS per kg) come from the case. **Invented demo values:** supplier names, chick price, feed price, crew rate per head (1,000 UZS), client price, all counts and kg, the PINs.

## Out of scope

**FR-09 Flock density analysis** needs camera video analytics. The prototype does not fake an estimate; it shows the function as "coming later".

## Code structure — layered architecture

```
src/
  app/container.ts   composition root: the only place that picks concrete classes (DIP)
  presentation/      React screens and components; no business rules
  application/
    ports/           interfaces: Repository<T>, VoiceParser, SensorProvider, LightController, SpeechRecognizer
    services/        one responsibility each (SRP): AuthService, AccessPolicy, FarmService, MortalityService,
                     FeedService, BatchProfitService, SlaughterService, CrossCheckService, VoiceEntryService,
                     MonitoringService, LightingService
  domain/            entities, value objects, enums, abstract classes — no React, no storage
    people/          User (abstract), Director, Worker
    farm/            Farm ◆ House ◆ Batch, BatchStatus, MortalityRecord
    feed/            Supplier, SupplierType, FeedDelivery
    finance/         FinancialEntry (abstract), Expense, Sale, ExpenseCategory, Buyer (abstract) + 4 buyer types
    slaughter/       SlaughterSession ◆ HeadCountRecord ◆ HeadCountCorrection, WeightTally, SessionKind, CrossCheckStatus
    environment/     SensorReading, ThresholdRange
    voice/           ParsedEntry, ParsedField
  infrastructure/    implementations of the ports
    persistence/     LocalStorageRepository, InMemoryRepository, serializers
    devices/         SimulatedSensorProvider, SimulatedLightController, BrowserSpeechRecognizer
    voice/           RuleBasedVoiceParser
    demo/            demo users and demo farm
tests/               unit tests (services with in-memory repositories; voice parser)
```

Dependencies point one way: `presentation → application → domain`; `infrastructure` implements the `application/ports` interfaces. Every requirement is referenced in a code comment (`// FR-05` …).

Design principles used (Lecture 10):

- **Encapsulate the change:** devices, storage and the voice parser sit behind interfaces.
- **Single responsibility:** one service per job.
- **Dependency inversion:** services receive interfaces through their constructors; the tests pass in-memory repositories instead of localStorage.
- **Polymorphism:**
  - `FinancialEntry.signedAmount()`: Expense is negative and Sale positive, so profit is one sum;
  - `User.canViewFinancials()`: only the Director sees money;
  - `Buyer.requiresCrossCheck()`: only the Bazaar Agent's sales are cross-checked.
