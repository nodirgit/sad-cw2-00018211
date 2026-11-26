// Builds D:\SAD_CW2\report\SAD_CW2_00018211.docx (SAD CW2, student 00018211).
// Run from report/build:  npm run build      (then finish.ps1 updates the contents page and makes a PDF)
// Pulls in automatically, when they exist:
//   links.json                                 video / code / low-fi / AI-export links (empty = yellow placeholder)
//   ../../low-fi/*.png|jpg                      low-fidelity prototype pages (sorted by file name)
//   lowfi.md                                    short low-fi flow description (paragraphs)
//   <vault>/04 Nodir/Methodology.md             Nodir's methodology section (his text, unchanged; "## References" merged)
//   ../../diagrams/*.png + captions.md          class diagrams and their captions
//   img/r*.png                                  report screenshots (node shots.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../..');
const VAULT = process.env.SAD_VAULT ?? 'C:/Users/user/Documents/SAD-CW2';
const OUT = path.resolve(ROOT, 'report', 'SAD_CW2_00018211.docx');
const links = JSON.parse(fs.readFileSync(path.join(here, 'links.json'), 'utf8'));
const today = '26 November 2026';

// ---------- small helpers ----------
const FONT = 'Arial';
const BODY = 24; // 12 pt
const SMALL = 20; // 10 pt (tables, captions)
const DOUBLE = { line: 480 };
const SINGLE = { line: 276 };

/** Inline **bold**, *italic* and `code` (shown plain) to TextRuns. */
function runs(text, opts = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|(?<![.\w*])\*(?=\S)[^*]+?(?<=\S)\*(?![\w*])|`[^`]+`)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...opts }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...opts }));
    else if (t.startsWith('`')) out.push(new TextRun({ text: t.slice(1, -1), ...opts }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, ...opts }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...opts }));
  return out;
}

const p = (text, o = {}) => new Paragraph({ children: runs(text), spacing: { ...DOUBLE, after: 120 }, ...o });
const h1 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, pageBreakBefore: true });
const h2 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, keepNext: true });
const h3 = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_3, keepNext: true });
const placeholder = (text) => new TextRun({ text, highlight: 'yellow', bold: true });
const bullet = (text) => new Paragraph({ children: runs(text), numbering: { reference: 'bullets', level: 0 }, spacing: { ...DOUBLE, after: 0 } });

/** A link, or a yellow placeholder when links.json has no value yet. */
function linkOr(key, label) {
  const url = links[key];
  return url ? new ExternalHyperlink({ link: url, children: [new TextRun({ text: url, style: 'Hyperlink' })] }) : placeholder(`[${label}]`);
}

function caption(text) {
  return new Paragraph({ children: runs(text, { italics: true, size: SMALL }), alignment: AlignmentType.CENTER, spacing: { ...SINGLE, before: 60, after: 240 }, keepLines: true });
}

/** Size that fits a PNG into maxW × maxH pixels (96 dpi). */
function fit(file, maxW, maxH) {
  const buf = fs.readFileSync(file);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const k = Math.min(maxW / w, maxH / h);
  return { width: Math.round(w * k), height: Math.round(h * k) };
}

/** Image scaled to fit maxW × maxH pixels (96 dpi), centred. */
function image(file, maxW, maxH, keepNext = true) {
  const buf = fs.readFileSync(file);
  // PNG width/height live at bytes 16..24
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const k = Math.min(maxW / w, maxH / h);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    keepNext,
    spacing: { ...SINGLE, before: 120 },
    children: [new ImageRun({ type: 'png', data: buf, transformation: { width: Math.round(w * k), height: Math.round(h * k) } })],
  });
}

const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: noBorder, insideVertical: noBorder };

/** A simple table: first row is the header. Widths in percent. */
function table(rows, widths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (r, i) =>
        new TableRow({
          tableHeader: i === 0,
          cantSplit: true,
          children: r.map(
            (c, j) =>
              new TableCell({
                borders,
                width: { size: widths[j], type: WidthType.PERCENTAGE },
                shading: i === 0 ? { fill: 'E7EFE9' } : undefined,
                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: [new Paragraph({ children: runs(c, { size: SMALL, bold: i === 0 }), spacing: SINGLE })],
              }),
          ),
        }),
    ),
  });
}

// ---------- inputs that arrive later ----------
const imgFiles = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(png)$/i.test(f)).sort().map((f) => path.join(dir, f)) : []);
const lowfiImages = imgFiles(path.join(ROOT, 'low-fi'));
const lowfiText = fs.existsSync(path.join(here, 'lowfi.md')) ? fs.readFileSync(path.join(here, 'lowfi.md'), 'utf8').trim() : '';

function readMethodology() {
  const file = path.join(VAULT, '04 Nodir', 'Methodology.md');
  if (!fs.existsSync(file)) return { body: '', refs: [] };
  let md = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  md = md.replace(/^#\s+Methodology \(Nodir's final text\)\s*$/m, '');
  const [body, refs = ''] = md.split(/^#{1,3}\s*References\s*$/im);
  return { body: body.trim(), refs: refs.split('\n').map((l) => l.replace(/^[-*]\s+/, '').trim()).filter(Boolean) };
}

/** Nodir's Markdown → paragraphs (headings, paragraphs, bullet and numbered lists, pipe tables). Text unchanged. */
function markdown(md) {
  const out = [];
  const lines = md.split(/\r?\n/);
  let para = [];
  const flush = () => {
    if (para.length) out.push(p(para.join(' ')));
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { flush(); continue; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flush(); out.push(m[1].length <= 2 ? h2(m[2]) : h3(m[2])); continue; }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) { flush(); out.push(bullet(m[1])); continue; }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) { flush(); out.push(new Paragraph({ children: runs(m[1]), numbering: { reference: 'numbers', level: 0, instance: out.length }, spacing: { ...DOUBLE, after: 0 } })); continue; }
    if (line.trim().startsWith('|')) {
      flush();
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      i--;
      const n = Math.max(...rows.map((r) => r.length));
      out.push(table(rows.map((r) => [...r, ...Array(n - r.length).fill('')]), Array(n).fill(100 / n)), new Paragraph({ text: '', spacing: SINGLE }));
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return out;
}

function captionsFromFile() {
  const md = fs.readFileSync(path.join(ROOT, 'diagrams', 'captions.md'), 'utf8');
  const get = (id) => (md.split(`## Figure ${id}`)[1] ?? '').split('\n## ')[0].split('\n').slice(1).join(' ').trim();
  return { arch: get('2.1'), detail: get('2.2') };
}

// ---------- content ----------
let fig = 0;
const nextFig = () => `Figure 1.${++fig}`;

const titlePage = [
  new Paragraph({ text: '', spacing: { before: 2400 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Westminster International University in Tashkent', size: 28 })], spacing: { after: 240 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Systems Analysis and Design (6BUIS026C)', size: 28 })], spacing: { after: 600 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Coursework 2', bold: true, size: 40 })], spacing: { after: 240 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Solution design: prototypes, UML class diagrams and development methodology', size: 30 })], spacing: { after: 600 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Case: Nurota Halol Parranda MCHJ (broiler farm, Nurata)', size: 26 })], spacing: { after: 1200 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Student ID: 00018211', size: 26 })], spacing: { after: 120 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Module leader: Said Abduvaliev', size: 26 })], spacing: { after: 120 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: today, size: 26 })] }),
];

const contents = [
  new Paragraph({ children: [new TextRun({ text: 'Contents', bold: true, size: 32 })], pageBreakBefore: true, spacing: { after: 240 } }),
  new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
];

const intro = [
  h1('Introduction'),
  p('The CW1 analysis found that the farm’s records are split across the Director’s paper notebook (deaths, feed deliveries), the pDaftar bookkeeping app (costs and revenue) and a camera app that records nothing, while the three figures that decide money — dead birds, the slaughter crew’s head count and the bazaar agent’s kg total — are passed on by word of mouth. The proposed system replaces this with one phone app in which each record is entered by the person who sees it, at the moment and in the house where it happens, and is tied to the batch it belongs to. This report designs that system for the requirements catalogued in CW1 (FR-01 to FR-08 and NFR-01 to NFR-05; FR-09, flock density, is left for a later release). Section 1 presents the low- and high-fidelity prototypes, Section 2 the class diagrams of the working prototype, and Section 3 the development methodology proposed for the farm.'),
];

// --- 1.1 low fidelity
const lowfi = [h1('1. Prototypes'), h2('1.1 Low-fidelity prototype')];
if (lowfiText) lowfi.push(...markdown(lowfiText));
else lowfi.push(new Paragraph({ children: [placeholder('[LOW-FI FLOW DESCRIPTION — written once the draw.io pages are exported to low-fi/]')], spacing: DOUBLE }));
lowfi.push(new Paragraph({ children: [new TextRun('Draw.io file (linked pages): '), linkOr('lowfi', 'LOW-FI LINK')], spacing: DOUBLE }));
if (lowfiImages.length) {
  for (const f of lowfiImages) {
    lowfi.push(image(f, 600, 760), caption(`${nextFig()} — Low-fidelity prototype: ${path.basename(f, path.extname(f)).replace(/^\d+[-_ ]*/, '').replace(/[-_]/g, ' ')}`));
  }
} else {
  lowfi.push(new Paragraph({ children: [placeholder('[LOW-FI IMAGES — exported pages from low-fi/ are inserted here automatically]')], spacing: DOUBLE }));
}

// --- 1.2 high fidelity
const SHOTS = [
  ['r1-main', 'Main (Director): live temperature and humidity per house with the out-of-range alert on House 2, and remote lights (FR-07, FR-08, NFR-01).'],
  ['r2-duplicate', 'Log death: the same death logged twice in two minutes is flagged and not counted twice (FR-01, NFR-02).'],
  ['r3-feed', 'Feed delivery: tied to supplier, house and that house’s open batch, with feed per bird for the batch (FR-02).'],
  ['r4-slaughter', 'Slaughter session: the crew’s pay appears as soon as the head count is entered; a recount is a correction with a note (FR-04, NFR-04).'],
  ['r5-pending', 'Agent cross-check: only the agent’s figure has arrived, so the check stays PENDING and no sale can be recorded (FR-05).'],
  ['r6-match', 'Agent cross-check: both figures agree (MATCH), so the sale to the Bazaar agent can be recorded (FR-05).'],
  ['r7-voice', 'Expenses: the optional voice helper fills the form; fields it is unsure of stay amber until the Director checks them (FR-06).'],
  ['r8-profit', 'Batch profit: running profit of each house’s batch, costs by category and sales by buyer (FR-03, NFR-03).'],
  ['r9-houses', 'Settings → Houses: a house is added by name and capacity, without changing code (NFR-05).'],
  ['r10-worker-feed', 'Worker login: no cost field and only the Main and Profile sections — money stays with the Director (NFR-03).'],
];

function shotGrid() {
  const cols = 3;
  const rows = [];
  for (let i = 0; i < SHOTS.length; i += cols) {
    const cells = SHOTS.slice(i, i + cols).map(([file, text]) =>
      new TableCell({
        borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
        width: { size: 33, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.TOP,
        children: [image(path.join(here, 'img', `${file}.png`), 160, 330, false), caption(`${nextFig()} — ${text}`)],
      }),
    );
    while (cells.length < cols) cells.push(new TableCell({ borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder }, children: [new Paragraph('')] }));
    rows.push(new TableRow({ cantSplit: true, children: cells }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows });
}

const REQ_TABLE = [
  ['Requirement', 'What the prototype does', 'Screen'],
  ['FR-01 Mortality logging', 'Any worker logs a death in the house where it is found; the same count in the same house within two minutes is flagged as a possible duplicate and kept out of the total until someone confirms it was a different bird.', 'Log death'],
  ['FR-02 Feed per batch', 'Each delivery is recorded against its supplier and the open batch of the chosen house, so two houses on different schedules never share a pool; feed per bird is shown at once.', 'Feed delivery'],
  ['FR-03 Per-batch profit', 'Every cost and sale is booked to the batch open in its house; Batch profit shows running profit per house, costs by category and sales by buyer.', 'Batch profit, Sales, Expenses'],
  ['FR-04 Crew head count', 'Head count × rate gives the crew’s pay on the same screen; a recount is stored as a correction with a required note and the first count stays in the history.', 'Slaughter'],
  ['FR-05 Agent cross-check', 'The agent’s kg (from his Telegram photo) and the Trusted Representative’s kg are stored per session; PENDING until both exist, MISMATCH if they differ, and *Record sale* only on MATCH.', 'Agent cross-check'],
  ['FR-06 Voice entry', 'The expense form works typed; the optional voice helper fills amount, date, category and reason, and anything it is unsure of must be confirmed before saving.', 'Expenses'],
  ['FR-07 House climate', 'Each house shows temperature and humidity and flags readings outside the range the Director set for that house.', 'Main'],
  ['FR-08 Remote lights', 'Lights are switched per house; a command that is not confirmed says so instead of assuming it worked.', 'Main'],
  ['NFR-01 Phone, one hand', 'Phone-first layout with large buttons, a bottom bar for the five sections and high-contrast colours for daylight.', 'All'],
  ['NFR-02 Several workers', 'Each worker has a PIN; every record carries its house, batch and author, so entries from both houses at once stay separate.', 'All'],
  ['NFR-03 Money privacy', 'Login by PIN; costs, sales and profit appear only under the Director; a worker’s feed form has no cost field.', 'All'],
  ['NFR-04 Pay before the crew leaves', 'The pay figure is shown in the same visit as the count is entered.', 'Slaughter'],
  ['NFR-05 Configuration', 'Houses, batches, trading partners (with TIN and contacts) and extra expense categories are added in Profile → Settings, not in code.', 'Profile'],
];

const hifi = [
  h2('1.2 High-fidelity prototype'),
  new Paragraph({ children: [new TextRun({ text: 'Video (≤ 1 minute, recorded on a phone): ', bold: true }), linkOr('video', 'VIDEO LINK')], spacing: DOUBLE }),
  new Paragraph({ children: [new TextRun({ text: 'Code: ', bold: true }), linkOr('code', 'CODE LINK'), new TextRun(' — the prototype is the folder prototype/ at the root of the repository.')], spacing: DOUBLE }),
  p('The high-fidelity prototype is an executable, phone-first web app written in TypeScript with React and built with Vite (Microsoft, n.d.; Meta Platforms, n.d.; Vite, n.d.). It runs in a phone’s web browser with nothing to install, which suits a Director who is rarely in one place (NFR-01). It was built with an AI coding agent from the CW1 requirements and then changed after the author used it as Director and worker: for example login by PIN alone, a bottom bar with the sections Main, Slaughter, Sales, Expenses and Profile, editable and deletable records, and a partner list with TIN and contact details. Table 1.1 maps every requirement to what the prototype does; the screenshots below show the main functions.'),
  new Paragraph({ children: runs('Table 1.1 — CW1 requirements and how the prototype meets them', { italics: true, size: SMALL }), spacing: { ...SINGLE, after: 60 }, keepNext: true }),
  table(REQ_TABLE, [20, 62, 18]),
  new Paragraph({ text: '', spacing: SINGLE }),
  h3('What is simulated and what is left out'),
  bullet('Temperature and humidity readings and the light relays are simulated (`SimulatedSensorProvider`, `SimulatedLightController`). They sit behind the `SensorProvider` and `LightController` interfaces, so real sensors replace them without changing the screens or services.'),
  bullet('Voice uses the browser’s speech recognition and a rule-based parser written for the farm’s words (Uzbek, English, Russian); it needs Chrome on a secure connection, so the phone video uses the typed form.'),
  bullet('Data is kept in the browser’s storage behind the `Repository<T>` interface; names of suppliers, the crew rate, chick and feed prices and all counts are labelled demo values.'),
  bullet('FR-09 (flock density) needs camera analytics and is shown only as a disabled “coming later” tile.'),
  h3('Screenshots of the main functions'),
  shotGrid(),
];

// --- 2 class diagrams
const caps = captionsFromFile();
const diagrams = [
  h1('2. UML Class Diagrams'),
  h2('2.1 Overall architecture'),
  image(path.join(ROOT, 'diagrams', 'architecture.png'), 560, 735),
  caption('Figure 2.1 — Overall architecture: the four layers, the domain sub-packages, the main classes and how they interact'),
  p('Both diagrams describe the prototype’s real code: every class, property, method and relationship on the detailed diagram exists in prototype/src with the same name and type, which a script in the diagrams folder checks. They were drawn with PlantUML (PlantUML, n.d.) in the module’s notation: visibility as + − # ~, abstract classes in italics, enumerations and interfaces marked.'),
  p(caps.arch.replace(/`/g, '')),
  p('This is the Dependency Inversion Principle (Martin, 2003): the services depend on interfaces they own, and only the composition root knows the concrete storage and devices.'),
];

const detailIntro = [
  h2('2.2 Detailed class diagram'),
  p('The important part is the core that records the farm’s batches and money, split so every property and method stays readable: people, houses, batches, partners and feed (Figure 2.2a), and expenses, sales, slaughter and the agent cross-check (Figure 2.2b).'),
];
const detailA = [image(path.join(ROOT, 'diagrams', 'detail-a.png'), 960, 600), caption('Figure 2.2a — Detailed class diagram, part 1: people, farm, partners and feed')];
const detailB = [
  new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: SINGLE, children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(ROOT, 'diagrams', 'detail-b.png')), transformation: fit(path.join(ROOT, 'diagrams', 'detail-b.png'), 930, 470) })] }),
  caption('Figure 2.2b — Detailed class diagram, part 2: money, slaughter and the agent cross-check'),
];
const REL_TABLE = [
  ['Relationship', 'Where it is used in Figure 2.2 (multiplicity)', 'What it means for the farm'],
  ['Generalization', 'User ← Director, Worker; Partner ← Buyer, Supplier; FinancialEntry ← Expense, Sale', 'one login rule; one partner list; profit is one sum'],
  ['Realization', 'LocalStorageRepository<T> realizes Repository<T>', 'storage can change, services do not'],
  ['Association', 'MortalityRecord → User (loggedBy); Sale → Buyer; each record → its Batch (all 0..* to 1)', 'who entered a record and which batch it is in'],
  ['Aggregation', 'FeedDelivery ◇ Supplier (0..* to 1)', 'a supplier outlives a deleted delivery'],
  ['Composition', 'Farm ◆ House (1..*); House ◆ Batch (0..*); SlaughterSession ◆ HeadCountRecord (0..1) and WeightTally (1); HeadCountRecord ◆ HeadCountCorrection (0..*)', 'parts that mean nothing outside their whole'],
  ['Dependency', 'CrossCheckService ⇢ WeightTally, Buyer, Sale; Batch ⇢ BatchStatus; Buyer ⇢ BuyerGroup; WeightTally ⇢ CrossCheckStatus', 'the service uses these in its methods only'],
];
const detailOutro = [
  p(caps.detail.replace(/`/g, '')),
  new Paragraph({ children: runs('Table 2.1 — Relationship types used in the detailed class diagram', { italics: true, size: SMALL }), spacing: { ...SINGLE, after: 60 }, keepNext: true }),
  table(REL_TABLE, [16, 54, 30]),
];

// --- 3 methodology (Nodir's text)
const meth = readMethodology();
const methodology = [h1('3. Development Methodology')];
if (meth.body) methodology.push(...markdown(meth.body));
else methodology.push(new Paragraph({ children: [placeholder('[METHODOLOGY — Nodir’s own text from 04 Nodir/Methodology.md is inserted here automatically]')], spacing: DOUBLE }));

// --- AI use statement
const aiUse = [
  h1('AI use statement'),
  p('Generative AI was used in this coursework, as the brief allows for the high-fidelity prototype. Claude Code (Anthropic, n.d.), an AI coding agent, built the high-fidelity prototype from the CW1 requirements, drafted the two class diagrams from that code and assembled this report, including the drafts of the introduction and of Sections 1.2 and 2. A planning assistant (Claude in the claude.ai chat) wrote the task descriptions the agent worked from. I decided the scope and which requirements to cover, used and reviewed the running prototype and had it changed in twelve rounds of fixes, checked the diagrams, drew the low-fidelity prototype and wrote the development methodology section myself.'),
  new Paragraph({ children: [new TextRun('The exported AI chats are available at: '), linkOr('aiExports', 'AI EXPORT LINK')], spacing: DOUBLE }),
];

// --- references (Westminster Harvard), sorted; Nodir's references merged in
const REFS = [
  'Anthropic (n.d.) Claude Code overview. Available at: https://docs.anthropic.com/en/docs/claude-code/overview [Accessed 26 November 2026].',
  'Martin, R.C. (2003) Agile software development: principles, patterns, and practices. Upper Saddle River, NJ: Prentice Hall.',
  'Meta Platforms (n.d.) React. Available at: https://react.dev [Accessed 26 November 2026].',
  'Microsoft (n.d.) TypeScript. Available at: https://www.typescriptlang.org [Accessed 26 November 2026].',
  'PlantUML (n.d.) PlantUML. Available at: https://plantuml.com [Accessed 26 November 2026].',
  'Vite (n.d.) Vite: next generation frontend tooling. Available at: https://vite.dev [Accessed 26 November 2026].',
  ...meth.refs,
]
  .filter((r, i, a) => a.indexOf(r) === i)
  .sort((a, b) => a.localeCompare(b));
const references = [
  h1('References'),
  ...REFS.map((r) => new Paragraph({ children: runs(r), spacing: { ...DOUBLE, after: 120 }, indent: { left: 720, hanging: 720 } })),
];

// ---------- document ----------
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SMALL })] })] });
const emptyFooter = new Footer({ children: [new Paragraph('')] });
const portrait = { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } };
const landscape = { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } };

const doc = new Document({
  creator: 'Student 00018211',
  title: 'SAD CW2 — 00018211',
  // The contents page is filled in by finish.ps1 (Word), so Word never asks to update fields on open.
  features: { updateFields: false },
  styles: {
    default: { document: { run: { font: FONT, size: BODY }, paragraph: { spacing: DOUBLE } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 32, bold: true, color: '0B5D34' }, paragraph: { spacing: { before: 240, after: 240, line: 360 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 28, bold: true }, paragraph: { spacing: { before: 240, after: 120, line: 360 }, outlineLevel: 1, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 24, bold: true }, paragraph: { spacing: { before: 200, after: 80, line: 360 }, outlineLevel: 2, keepNext: true } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [
    { properties: { ...portrait, titlePage: true }, footers: { default: footer, first: emptyFooter }, children: [...titlePage, ...contents, ...intro, ...lowfi, ...hifi, ...diagrams, ...detailIntro] },
    { properties: landscape, footers: { default: footer }, children: [...detailA, ...detailB] },
    { properties: portrait, footers: { default: footer }, children: [...detailOutro, ...methodology, ...aiUse, ...references] },
  ],
});

fs.writeFileSync(OUT, await Packer.toBuffer(doc));
const missing = Object.entries(links).filter(([, v]) => !v).map(([k]) => k);
console.log(`Wrote ${OUT}`);
console.log(`Low-fi images: ${lowfiImages.length} · low-fi text: ${lowfiText ? 'yes' : 'placeholder'} · methodology: ${meth.body ? 'Nodir’s text' : 'placeholder'} · links missing: ${missing.join(', ') || 'none'}`);
