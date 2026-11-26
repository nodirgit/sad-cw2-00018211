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
| `npm test` | 35 unit tests of the business rules (Vitest) |
| `npm run typecheck` | TypeScript strict check |
| `npm run build` | production build into `dist/` |
| `npm run screenshots` | with `npm run dev` running: clicks through every screen in Chrome/Edge and saves `screenshots/*.png` |

## Screens and requirements

After login a **bottom bar** holds the main sections, like a phone app: **Main** (houses, log death, feed delivery, batch profit) · **Slaughter** (sessions, crew pay, agent cross-check) · **Sales** (direct sale, Bazaar Agent sale, latest sales) · **Expenses** (expense entry) · **Profile** (who is logged in, settings, log out). Each section keeps its own screens with *Back*; tapping a section opens its first screen. A Worker's bar has only **Main** and **Profile** (NFR-03).

| Screen | Requirement | What it shows |
|---|---|---|
| Login | NFR-03 | a 4-digit PIN only: the PIN says who is logging in |
| Main (Director) | FR-07, FR-08, NFR-01 | one card per house: batch day, chicks, deaths today / in batch, live temperature and humidity with an alert outside the house's range, light switch; tiles *Log death*, *Feed delivery*, *Batch profit* |
| Main (Worker) | NFR-03 | the same house cards, only *Log death* and *Feed delivery*, no money anywhere |
| Log death | FR-01, NFR-02 | house + count + Save; the same count in the same house within 2 minutes is flagged **possible duplicate** and not counted twice, with "it was a different bird — count it"; latest entries can be corrected or deleted |
| Feed delivery | FR-02, NFR-03 | supplier (picked from the partners, or *＋ New feed supplier* for the Director) → house → that house's open batch; feed per bird for the batch; the cost field only for the Director, and it becomes a batch cost; deliveries can be corrected or deleted |
| Batch profit | FR-03 | per house: running profit, costs by category, sales by buyer (name and group), entries — each batch on its own; manual expenses and direct sales can be edited or deleted here, linked entries say where they are changed |
| Slaughter session | FR-04, NFR-04 | head count + rate → crew payment shown at once; "Correct count" needs a note and keeps the history; an empty session can be deleted |
| Agent cross-check | FR-05 | agent's kg (Telegram photo) vs Trusted Representative's kg → PENDING / MATCH / MISMATCH; the Bazaar agent is picked from the partners (or added); *Record sale* only on MATCH; *Undo sale* if it was recorded by mistake |
| Sales | FR-03, FR-05 | *Direct sale* and *Bazaar Agent sale* (opens the cross-check), then the latest sales of all buyers with the total |
| Direct sale | FR-03 | sales to resellers (e.g. the Nurata seller), the shop and clients: the buyer is picked by name from the partners, grouped, or added on the spot with *＋ New partner*; kg, price per kg (prefilled from that buyer's last sale, else the case's price for the group), date, house → total, saved to that house's batch; recent direct sales can be edited or deleted. Bazaar Agent sales stay on the cross-check (FR-05) |
| Expenses | FR-03, FR-06 | a normal form (amount, date, category, what for, house) that always works; **voice is an optional helper**: speak (Web Speech API, Uzbek) or type a sentence and it fills the form; anything unsure is amber and must be checked before saving; recent expenses (last 7 days at first; 30 days, all or chosen dates) with count and total, each can be edited or deleted |
| Profile | NFR-03, FR-07, NFR-05 | the logged-in user and role, **Log out**; for the Director the settings, grouped like a phone's settings: **Houses** (list → one house: details, batch, normal range, delete; add a house), **Partners** (everyone we trade with, in groups — we sell to: Bazaar agents, Resellers, Shop, Clients; we buy from: Feed suppliers, Chick suppliers — add, rename, delete), **Expense categories** (the six built-in ones are fixed; add, rename and delete your own, which appear as extra buttons on the Expenses form and in Batch profit), **Demo data** (what is invented, reset) |
| Flock density tile | FR-09 | disabled: "coming later (needs camera analytics)" |

Screenshots of every screen are in [`screenshots/`](screenshots).

## Editing and deleting records

Every record a person enters can be corrected or deleted, unless another record depends on it. Then the screen says where it is changed instead.

| Record | Edit | Delete | Rule |
|---|---|---|---|
| Death | count | yes | the person who logged it, or the Director; only while the batch is open |
| Feed delivery | supplier, kg, cost | yes | a Worker only for deliveries without a cost (NFR-03); the FEED expense follows the cost |
| Expense typed in | all fields | yes | Director; feed costs and crew pay are changed with their delivery / session |
| Direct sale (reseller, shop, client) | kg, price per kg | yes | Director |
| Bazaar Agent sale | — | *Undo sale* on the cross-check | then the weights can be corrected and the sale recorded again (FR-05) |
| Slaughter session | head count by *correction with a note* | only while empty | a counted session is the crew's pay record (NFR-04) |
| House | name, capacity | when no open batch | capacity never below the chicks placed; at least one house |
| Batch | chicks placed, start date; close / reopen | — | its records hang on it |
| Partner (buyer or supplier) | name | yes (archived) | past sales and deliveries keep the name |
| Expense category (your own) | name | yes (archived) | past expenses keep the name; the six built-in categories are fixed (feed deliveries, crew pay and the voice helper use them) |

## What is simulated or demo

- **Sensors** (FR-07): `SimulatedSensorProvider` — a random walk around a baseline per house. House 2 runs hot on purpose so the alert is visible. Labelled "Simulated sensor" in the app.
- **Light relay** (FR-08): `SimulatedLightController` — 0.7 s delay; every 4th command "loses the connection" and returns *not confirmed*, and the app keeps the old state and says so.
- **Voice** (FR-06): speech-to-text is the browser's Web Speech API (Chrome/Edge); the parsing is our own `RuleBasedVoiceParser` (rules, no AI service). It only fills the expense form; the form works without it.
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
                     FeedService, PartnerService, ExpenseCategoryService, BatchProfitService, SlaughterService, CrossCheckService, VoiceEntryService,
                     MonitoringService, LightingService
  domain/            entities, value objects, enums, abstract classes — no React, no storage
    people/          User (abstract), Director, Worker
    farm/            Farm ◆ House ◆ Batch, BatchStatus, MortalityRecord
    partners/        Partner (abstract) ← Buyer, Supplier
    feed/            Supplier, SupplierType, FeedDelivery
    finance/         FinancialEntry (abstract), Expense, Sale, ExpenseCategory, CustomCategory, Buyer, BuyerGroup
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
  - `Partner.groupLabel()`: a Buyer and a Supplier each name their own group;
  - `Buyer.requiresCrossCheck()`: only a Bazaar agent's sales are cross-checked (by its group).
