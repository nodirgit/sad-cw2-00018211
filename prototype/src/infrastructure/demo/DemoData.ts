import { Repository } from '../../application/ports/Repository';
import { FARM_ID } from '../../application/services/FarmService';
import { ThresholdRange } from '../../domain/environment/ThresholdRange';
import { Batch } from '../../domain/farm/Batch';
import { BatchStatus } from '../../domain/farm/BatchStatus';
import { Farm } from '../../domain/farm/Farm';
import { House } from '../../domain/farm/House';
import { MortalityRecord } from '../../domain/farm/MortalityRecord';
import { FeedDelivery } from '../../domain/feed/FeedDelivery';
import { Supplier, SupplierType } from '../../domain/feed/Supplier';
import { BazaarAgent, Client, ShopCustomer } from '../../domain/finance/Buyer';
import { Expense, ExpenseCategory, ExpenseSource } from '../../domain/finance/Expense';
import { FinancialEntry } from '../../domain/finance/FinancialEntry';
import { Sale } from '../../domain/finance/Sale';
import { Director } from '../../domain/people/Director';
import { User } from '../../domain/people/User';
import { Worker } from '../../domain/people/Worker';
import { HeadCountRecord } from '../../domain/slaughter/HeadCountRecord';
import { SessionKind, SlaughterSession } from '../../domain/slaughter/SlaughterSession';
import { WeightTally } from '../../domain/slaughter/WeightTally';
import { Baseline } from '../devices/SimulatedSensorProvider';

/*
 * DEMO DATA. Farm names, house count, capacities, buyers and buyer prices come from
 * Farm Facts (CW1). Everything marked "demo" below is NOT known from the case and is
 * invented only so the prototype has something to show: supplier names, chick and feed
 * prices, the crew rate per head, death counts, kg figures, PINs.
 */

export const STORAGE_PREFIX = 'parranda.';
const SEEDED_KEY = `${STORAGE_PREFIX}seeded`;

export const DEMO_USERS: User[] = [
  new Director('u-director', 'Director', '1234'),
  new Worker('u-worker1', 'Worker 1', '1111'),
  new Worker('u-worker2', 'Worker 2', '2222'),
];

export const DEMO_PINS = 'Director 1234 · Worker 1 1111 · Worker 2 2222';

export interface DemoDefaults {
  /** demo: the real crew rate per head is not known */
  crewRatePerHead: number;
  /** Farm Facts: ~26,000 / ~27,000 / ~28,000 UZS/kg; Client price is a demo value */
  pricePerKg: Record<string, number>;
}

export const DEMO_DEFAULTS: DemoDefaults = {
  crewRatePerHead: 1000,
  pricePerKg: { 'Bazaar Agent': 26000, 'Nurata Seller': 27000, 'Shop Customer': 28000, Client: 27000 },
};

/** Simulated sensor baselines: House 2 runs hot on purpose so the FR-07 alert shows. */
export const SENSOR_BASELINES: Record<string, Baseline> = {
  'house-1': { temperatureC: 22.5, humidityPct: 62 },
  'house-2': { temperatureC: 32.8, humidityPct: 60 },
};

export interface DemoRepositories {
  farms: Repository<Farm>;
  suppliers: Repository<Supplier>;
  deaths: Repository<MortalityRecord>;
  feed: Repository<FeedDelivery>;
  finance: Repository<FinancialEntry>;
  sessions: Repository<SlaughterSession>;
}

/** Writes the demo farm on first load; "Reset demo data" clears it so it is written again. */
export class DemoSeeder {
  private readonly storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  isSeeded(): boolean {
    return this.storage.getItem(SEEDED_KEY) === 'yes';
  }

  seedIfEmpty(repos: DemoRepositories, now: Date = new Date()): void {
    if (this.isSeeded()) return;
    DemoSeeder.seed(repos, now);
    this.storage.setItem(SEEDED_KEY, 'yes');
  }

  reset(): void {
    Object.keys(this.storage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .forEach((k) => this.storage.removeItem(k));
  }

  /** Public so the unit tests can build the same farm in memory. */
  static seed(repos: DemoRepositories, now: Date): void {
    const DAY = 24 * 60 * 60 * 1000;
    const MIN = 60 * 1000;
    const daysAgo = (n: number, hour = 9) => {
      const d = new Date(now.getTime() - n * DAY);
      d.setHours(hour, 0, 0, 0);
      return d;
    };
    const minutesAgo = (m: number) => new Date(now.getTime() - m * MIN);
    const [director, worker1, worker2] = DEMO_USERS;

    // Two houses on different schedules (FR-02 / FR-03 edge case)
    const h1Batch = new Batch('batch-h1', 'house-1', daysAgo(38), 8000, BatchStatus.SLAUGHTERING);
    const h2Batch = new Batch('batch-h2', 'house-2', daysAgo(12), 6000, BatchStatus.OPEN);
    const house1 = new House('house-1', 'House 1', 10000, new ThresholdRange(18, 26, 50, 70), true, [h1Batch]);
    const house2 = new House('house-2', 'House 2', 6000, new ThresholdRange(26, 32, 50, 70), false, [h2Batch]);
    repos.farms.save(new Farm(FARM_ID, 'Nurota Halol Parranda MCHJ', [house1, house2]));

    const chickSupplier = new Supplier('sup-chicks', 'Demo Chick Supplier (Tashkent)', SupplierType.CHICKS);
    const feedA = new Supplier('sup-feed-a', 'Demo Feed Factory A', SupplierType.FEED);
    const feedB = new Supplier('sup-feed-b', 'Demo Feed Factory B', SupplierType.FEED);
    [chickSupplier, feedA, feedB].forEach((s) => repos.suppliers.save(s));

    // Deaths (demo counts)
    const deaths: [string, string, Date, number, User, boolean?][] = [
      ['batch-h1', 'house-1', daysAgo(30, 8), 25, director],
      ['batch-h1', 'house-1', daysAgo(20, 8), 40, director],
      ['batch-h1', 'house-1', daysAgo(10, 7), 31, worker1],
      ['batch-h1', 'house-1', daysAgo(3, 10), 12, worker2],
      ['batch-h1', 'house-1', daysAgo(1, 16), 6, worker1],
      ['batch-h1', 'house-1', minutesAgo(95), 2, worker1],
      ['batch-h1', 'house-1', minutesAgo(40), 1, worker2],
      ['batch-h1', 'house-1', minutesAgo(39), 1, worker1, true], // same bird reported by a second worker
      ['batch-h2', 'house-2', daysAgo(8, 9), 18, worker2],
      ['batch-h2', 'house-2', daysAgo(4, 11), 9, worker1],
      ['batch-h2', 'house-2', daysAgo(1, 14), 5, worker2],
      ['batch-h2', 'house-2', minutesAgo(60), 1, worker1],
    ];
    deaths.forEach(([batchId, houseId, at, count, user, dup], i) => repos.deaths.save(new MortalityRecord(`death-demo-${i + 1}`, batchId, houseId, at, count, user, dup ?? false)));

    // Feed deliveries from two suppliers (demo prices: 6,500 UZS/kg)
    const feeds: [string, string, Supplier, Date, number, number][] = [
      ['feed-demo-1', 'batch-h1', feedA, daysAgo(38), 4000, 26_000_000],
      ['feed-demo-2', 'batch-h1', feedB, daysAgo(18), 6000, 39_000_000],
      ['feed-demo-3', 'batch-h2', feedB, daysAgo(12), 2500, 16_250_000],
    ];
    for (const [id, batchId, supplier, date, kg, cost] of feeds) {
      repos.feed.save(new FeedDelivery(id, batchId, supplier, date, kg, cost));
      repos.finance.save(new Expense(`exp-${id}`, batchId, date, cost, ExpenseCategory.FEED, `${kg.toLocaleString('en-US')} kg, ${supplier.getName()}`, ExpenseSource.FEED_DELIVERY));
    }

    // Other costs (demo amounts)
    const expenses: [string, string, Date, number, ExpenseCategory, string][] = [
      ['exp-demo-chicks-h1', 'batch-h1', daysAgo(38), 48_000_000, ExpenseCategory.CHICKS, '8,000 chicks (demo price 6,000 each, paid at end of cycle)'],
      ['exp-demo-chicks-h2', 'batch-h2', daysAgo(12), 36_000_000, ExpenseCategory.CHICKS, '6,000 chicks (demo price 6,000 each, paid at end of cycle)'],
      ['exp-demo-vet-h1', 'batch-h1', daysAgo(15), 450_000, ExpenseCategory.VET, 'Vitamins'],
      ['exp-demo-vet-h2', 'batch-h2', daysAgo(5), 300_000, ExpenseCategory.VET, 'Vaccine'],
      ['exp-demo-driver-1', 'batch-h1', daysAgo(2, 23), 200_000, ExpenseCategory.DRIVER, 'Thinning night 1'],
      ['exp-demo-driver-2', 'batch-h1', daysAgo(1, 23), 200_000, ExpenseCategory.DRIVER, 'Thinning night 2'],
    ];
    expenses.forEach(([id, batchId, date, amount, cat, note]) => repos.finance.save(new Expense(id, batchId, date, amount, cat, note)));

    // Thinning night 1: counted, cross-checked (MATCH) and sold to the Bazaar Agent
    const s1 = new SlaughterSession('session-demo-1', 'batch-h1', daysAgo(2, 22), SessionKind.THINNING, new HeadCountRecord(1200, DEMO_DEFAULTS.crewRatePerHead, daysAgo(2, 23)), new WeightTally(2640, 2640), 'sale-demo-1');
    // Thinning night 2: counted; the agent's figure arrived, the representative's not yet → PENDING
    const s2 = new SlaughterSession('session-demo-2', 'batch-h1', daysAgo(1, 22), SessionKind.THINNING, new HeadCountRecord(1150, DEMO_DEFAULTS.crewRatePerHead, daysAgo(1, 23)), new WeightTally(2530, undefined));
    for (const s of [s1, s2]) {
      repos.sessions.save(s);
      const hc = s.getHeadCount()!;
      repos.finance.save(new Expense(`exp-crew-${s.getId()}`, s.getBatchId(), s.getDate(), hc.crewPayment(), ExpenseCategory.CREW, `${hc.effectiveCount().toLocaleString('en-US')} head × ${hc.getRatePerHead().toLocaleString('en-US')}`, ExpenseSource.CREW_PAY));
    }

    const p = DEMO_DEFAULTS.pricePerKg;
    repos.finance.save(new Sale('sale-demo-1', 'batch-h1', daysAgo(1, 10), new BazaarAgent('Bazaar Agent (Navoi bazaar)'), 2640, p['Bazaar Agent']));
    repos.finance.save(new Sale('sale-demo-2', 'batch-h1', daysAgo(1, 15), new ShopCustomer("Shop at the Director's house"), 120, p['Shop Customer']));
    repos.finance.save(new Sale('sale-demo-3', 'batch-h1', daysAgo(5, 12), new Client('Client order, 80 birds'), 176, p.Client));
  }
}
