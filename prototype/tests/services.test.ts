import { describe, expect, it } from 'vitest';
import { AccessPolicy } from '../src/application/services/AccessPolicy';
import { BatchProfitService } from '../src/application/services/BatchProfitService';
import { CrossCheckService } from '../src/application/services/CrossCheckService';
import { FarmService } from '../src/application/services/FarmService';
import { FeedService } from '../src/application/services/FeedService';
import { LightingService } from '../src/application/services/LightingService';
import { MonitoringService } from '../src/application/services/MonitoringService';
import { MortalityService } from '../src/application/services/MortalityService';
import { SupplierService } from '../src/application/services/SupplierService';
import { SupplierType } from '../src/domain/feed/Supplier';
import { SlaughterService } from '../src/application/services/SlaughterService';
import { DomainError } from '../src/domain/DomainError';
import { BazaarAgent, NurataSeller } from '../src/domain/finance/Buyer';
import { Expense, ExpenseCategory } from '../src/domain/finance/Expense';
import { SessionKind } from '../src/domain/slaughter/SlaughterSession';
import { CrossCheckStatus } from '../src/domain/slaughter/WeightTally';
import { SimulatedLightController } from '../src/infrastructure/devices/SimulatedLightController';
import { SimulatedSensorProvider } from '../src/infrastructure/devices/SimulatedSensorProvider';
import { DEMO_USERS, DemoSeeder, SENSOR_BASELINES } from '../src/infrastructure/demo/DemoData';
import { InMemoryRepository } from '../src/infrastructure/persistence/InMemoryRepository';

const [director, worker1, worker2] = DEMO_USERS;

/** Same wiring as the app's container, but with in-memory repositories (DIP in action). */
function setup(now = new Date('2026-11-25T14:00:00')) {
  const repos = {
    farms: new InMemoryRepository<any>(),
    suppliers: new InMemoryRepository<any>(),
    deaths: new InMemoryRepository<any>(),
    feed: new InMemoryRepository<any>(),
    finance: new InMemoryRepository<any>(),
    sessions: new InMemoryRepository<any>(),
  };
  DemoSeeder.seed(repos, now);
  let clock = now;
  const policy = new AccessPolicy();
  const farm = new FarmService(repos.farms, policy);
  const mortality = new MortalityService(repos.deaths, farm, policy, () => clock);
  const profit = new BatchProfitService(repos.finance, farm, policy);
  const feed = new FeedService(repos.feed, repos.suppliers, farm, mortality, profit, policy);
  const slaughter = new SlaughterService(repos.sessions, farm, profit, policy, () => clock);
  const crossCheck = new CrossCheckService(repos.sessions, profit, policy);
  return { repos, farm, mortality, profit, feed, slaughter, crossCheck, setClock: (d: Date) => (clock = d) };
}

describe('FR-01 mortality', () => {
  it('flags the same death reported twice and does not count it', () => {
    const s = setup();
    const before = s.mortality.totalDeaths('batch-h2');
    const first = s.mortality.logDeath('house-2', 1, worker1);
    s.setClock(new Date('2026-11-25T14:01:00'));
    const second = s.mortality.logDeath('house-2', 1, worker2);
    expect(first.duplicateOf).toBeUndefined();
    expect(second.duplicateOf?.getId()).toBe(first.record.getId());
    expect(second.record.isFlaggedDuplicate()).toBe(true);
    expect(s.mortality.totalDeaths('batch-h2')).toBe(before + 1);
    s.mortality.countSeparately(second.record.getId());
    expect(s.mortality.totalDeaths('batch-h2')).toBe(before + 2);
  });

  it('keeps near-simultaneous entries in different houses separate (NFR-02)', () => {
    const s = setup();
    const a = s.mortality.logDeath('house-1', 1, worker1);
    const b = s.mortality.logDeath('house-2', 1, worker2);
    expect(a.record.getBatchId()).toBe('batch-h1');
    expect(b.record.getBatchId()).toBe('batch-h2');
    expect(b.duplicateOf).toBeUndefined();
  });
});

describe('FR-02 feed', () => {
  it('tags the delivery to the open batch of the chosen house and computes feed per bird', () => {
    const s = setup();
    const r = s.feed.recordDelivery('house-2', 'sup-feed-a', 1000, 6_500_000, director);
    expect(r.delivery.getBatchId()).toBe('batch-h2');
    const alive = s.mortality.birdsAlive(s.farm.batch('batch-h2')!);
    expect(r.feedPerBirdKg).toBeCloseTo(3500 / alive);
  });

  it('refuses a cost from a worker (NFR-03)', () => {
    const s = setup();
    expect(() => s.feed.recordDelivery('house-1', 'sup-feed-a', 500, 100, worker1)).toThrow(DomainError);
    expect(s.feed.recordDelivery('house-1', 'sup-feed-a', 500, null, worker1).delivery.hasCost()).toBe(false);
  });
});

describe('FR-03 per-batch profit', () => {
  it('sums only that batch, Expense negative and Sale positive', () => {
    const s = setup();
    const p = s.profit.profitFor('batch-h2', director);
    expect(p.entries.every((e) => e.getBatchId() === 'batch-h2')).toBe(true);
    expect(p.totalSales).toBe(0);
    expect(p.profit).toBe(-(16_250_000 + 36_000_000 + 300_000));
    expect(p.profit).toBe(p.totalSales - p.totalCosts);
  });

  it('is hidden from workers (NFR-03)', () => {
    const s = setup();
    expect(() => s.profit.profitFor('batch-h1', worker1)).toThrow('Only the Director');
  });

  it('sends Bazaar Agent sales through the cross-check', () => {
    const s = setup();
    expect(() => s.profit.recordDirectSale('house-1', new BazaarAgent('x'), 10, 26000, new Date(), director)).toThrow(DomainError);
    expect(s.profit.recordDirectSale('house-1', new NurataSeller('y'), 10, 27000, new Date(), director).getAmount()).toBe(270000);
  });
});

describe('FR-04 / NFR-04 slaughter head count', () => {
  it('returns the crew payment at once, and a correction keeps the history', () => {
    const s = setup();
    const session = s.slaughter.startSession('house-2', SessionKind.THINNING, director);
    expect(s.slaughter.recordHeadCount(session.getId(), 1100, 1000, director)).toBe(1_100_000);
    expect(() => s.slaughter.recordHeadCount(session.getId(), 1000, 1000, director)).toThrow(DomainError);
    expect(() => s.slaughter.correctHeadCount(session.getId(), 1080, '  ', director)).toThrow('note');
    expect(s.slaughter.correctHeadCount(session.getId(), 1080, 'Recount at dawn', director)).toBe(1_080_000);
    const hc = s.slaughter.session(session.getId()).getHeadCount()!;
    expect(hc.getReportedCount()).toBe(1100);
    expect(hc.getCorrections()).toHaveLength(1);
    const crew = s.repos.finance.findAll().filter((e: any) => e instanceof Expense && e.getBatchId() === 'batch-h2' && e.getCategory() === ExpenseCategory.CREW);
    expect(crew).toHaveLength(1);
    expect(crew[0].getAmount()).toBe(1_080_000);
  });
});

describe('FR-05 cross-check', () => {
  it('stays pending with one figure and refuses the sale', () => {
    const s = setup();
    expect(s.crossCheck.status('session-demo-2')).toBe(CrossCheckStatus.PENDING);
    expect(() => s.crossCheck.recordSale('session-demo-2', new BazaarAgent('a'), 26000, director)).toThrow('second figure');
  });

  it('refuses on mismatch and records the sale on match', () => {
    const s = setup();
    expect(s.crossCheck.enterRepresentativeKg('session-demo-2', 2500, director)).toBe(CrossCheckStatus.MISMATCH);
    expect(() => s.crossCheck.recordSale('session-demo-2', new BazaarAgent('a'), 26000, director)).toThrow('differ by 30');
    expect(s.crossCheck.enterRepresentativeKg('session-demo-2', 2530, director)).toBe(CrossCheckStatus.MATCH);
    const sale = s.crossCheck.recordSale('session-demo-2', new BazaarAgent('a'), 26000, director);
    expect(sale.getAmount()).toBe(2530 * 26000);
    expect(sale.getBatchId()).toBe('batch-h1');
    expect(() => s.crossCheck.recordSale('session-demo-2', new BazaarAgent('a'), 26000, director)).toThrow('already');
  });
});

describe('FR-07 / FR-08 devices', () => {
  it('flags the hot house against its own range', () => {
    const s = setup();
    const m = new MonitoringService(new SimulatedSensorProvider(SENSOR_BASELINES), s.farm);
    expect(m.check('house-2').abnormal).toBe(true);
    expect(m.check('house-1').abnormal).toBe(false);
  });

  it('does not change the light state when the relay does not confirm', async () => {
    const s = setup();
    const lighting = new LightingService(new SimulatedLightController(0), s.farm);
    expect((await lighting.switchLight('house-2', true)).status).toBe('CONFIRMED');
    await lighting.switchLight('house-2', false);
    await lighting.switchLight('house-2', true);
    const fourth = await lighting.switchLight('house-2', false);
    expect(fourth.status).toBe('UNCONFIRMED');
    expect(s.farm.house('house-2').isLightOn()).toBe(true);
  });
});

describe('NFR-05 houses by configuration', () => {
  it('adds a third house with its own batch', () => {
    const s = setup();
    const h = s.farm.addHouse('House 3', 7000, director);
    s.farm.startBatch(h.getId(), 7000, new Date(), director);
    expect(s.farm.houses()).toHaveLength(3);
    expect(s.mortality.logDeath(h.getId(), 2, worker1).record.getHouseId()).toBe(h.getId());
    expect(() => s.farm.addHouse('House 4', 5000, worker1)).toThrow('Only the Director');
  });

  it('edits a house: rename, capacity not below the birds placed, names unique', () => {
    const s = setup();
    const h = s.farm.editHouse('house-2', 'Small house', 7000, director);
    expect(h.getName()).toBe('Small house');
    expect(s.farm.house('house-2').getCapacity()).toBe(7000);
    expect(() => s.farm.editHouse('house-2', 'Small house', 5000, director)).toThrow(DomainError); // 6,000 chicks placed
    expect(() => s.farm.editHouse('house-2', 'House 1', 7000, director)).toThrow('already a house');
    expect(() => s.farm.editHouse('house-2', 'X', 7000, worker1)).toThrow('Only the Director');
  });

  it('deletes a house only without an open batch', () => {
    const s = setup();
    expect(() => s.farm.removeHouse('house-2', director)).toThrow('Close the batch first');
    s.farm.closeBatch('house-2', director);
    s.farm.removeHouse('house-2', director);
    expect(s.farm.houses().map((h) => h.getId())).toEqual(['house-1']);
    s.farm.closeBatch('house-1', director);
    expect(() => s.farm.removeHouse('house-1', director)).toThrow('at least one house');
  });
});

describe('NFR-05 suppliers by configuration', () => {
  it('adds, renames and removes suppliers; past deliveries keep the name', () => {
    const s = setup();
    const suppliers = new SupplierService(s.repos.suppliers, new AccessPolicy());
    const c = suppliers.addSupplier('Demo Feed Factory C', SupplierType.FEED, director);
    expect(s.feed.feedSuppliers().map((x) => x.getName())).toContain('Demo Feed Factory C');
    expect(() => suppliers.addSupplier('demo feed factory a', SupplierType.FEED, director)).toThrow('already a supplier');
    expect(() => suppliers.addSupplier('X', SupplierType.FEED, worker1)).toThrow('Only the Director');

    suppliers.renameSupplier(c.getId(), 'Demo Feed Factory C (Navoi)', director);
    const { delivery } = s.feed.recordDelivery('house-1', c.getId(), 1000, null, worker1);
    suppliers.removeSupplier(c.getId(), director);

    expect(s.feed.feedSuppliers().map((x) => x.getId())).not.toContain(c.getId());
    expect(delivery.getSupplier().getName()).toBe('Demo Feed Factory C (Navoi)');
    expect(() => s.feed.recordDelivery('house-1', c.getId(), 500, null, worker1)).toThrow('Pick a supplier');
  });
});

describe('Editing and deleting records', () => {
  const total = (s: ReturnType<typeof setup>, batchId: string) => s.profit.profitFor(batchId, director).profit;

  it('deaths: the person who logged it or the Director may correct or delete; totals follow', () => {
    const s = setup();
    const { record } = s.mortality.logDeath('house-2', 3, worker1);
    const before = s.mortality.totalDeaths('batch-h2');
    s.mortality.editDeath(record.getId(), 2, worker1);
    expect(s.mortality.totalDeaths('batch-h2')).toBe(before - 1);
    expect(() => s.mortality.editDeath(record.getId(), 5, worker2)).toThrow('Only the person who logged it');
    s.mortality.deleteDeath(record.getId(), director);
    expect(s.mortality.totalDeaths('batch-h2')).toBe(before - 3);
  });

  it('feed: editing the cost replaces its FEED expense; deleting removes both; workers only touch deliveries without a cost', () => {
    const s = setup();
    const { delivery } = s.feed.recordDelivery('house-2', 'sup-feed-a', 1000, 6_500_000, director);
    const withCost = total(s, 'batch-h2');
    s.feed.editDelivery(delivery.getId(), 'sup-feed-a', 1000, 5_000_000, director);
    expect(total(s, 'batch-h2')).toBe(withCost + 1_500_000);
    expect(() => s.feed.deleteDelivery(delivery.getId(), worker1)).toThrow('only the Director');
    s.feed.deleteDelivery(delivery.getId(), director);
    expect(total(s, 'batch-h2')).toBe(withCost + 6_500_000);
    expect(s.feed.deliveriesFor('batch-h2').map((d) => d.getId())).not.toContain(delivery.getId());

    const { delivery: w } = s.feed.recordDelivery('house-2', 'sup-feed-b', 500, null, worker1);
    s.feed.editDelivery(w.getId(), 'sup-feed-b', 600, null, worker1);
    expect(() => s.feed.editDelivery(w.getId(), 'sup-feed-b', 600, 100, worker1)).toThrow('Only the Director');
  });

  it('expenses: hand-typed ones can be edited and deleted; linked ones are locked', () => {
    const s = setup();
    const e = s.profit.recordExpense('house-2', ExpenseCategory.VET, 100_000, 'vitamins', new Date(), director);
    const after = total(s, 'batch-h2');
    s.profit.editExpense(e.getId(), ExpenseCategory.VET, 150_000, 'vitamins', new Date(), director);
    expect(total(s, 'batch-h2')).toBe(after - 50_000);
    s.profit.deleteExpense(e.getId(), director);
    expect(total(s, 'batch-h2')).toBe(after + 100_000);
    expect(() => s.profit.deleteExpense('exp-feed-demo-3', director)).toThrow('feed delivery');
    expect(() => s.profit.editExpense('exp-crew-session-demo-1', ExpenseCategory.CREW, 1, 'x', new Date(), director)).toThrow('head count');
  });

  it('sessions: an empty session can be deleted; a counted one is kept (NFR-04); a sale can be undone', () => {
    const s = setup();
    const empty = s.slaughter.startSession('house-2', SessionKind.THINNING, director);
    s.slaughter.deleteSession(empty.getId(), director);
    expect(s.slaughter.allSessions().map((x) => x.getId())).not.toContain(empty.getId());
    expect(() => s.slaughter.deleteSession('session-demo-2', director)).toThrow('crew paid');

    const before = total(s, 'batch-h1');
    s.crossCheck.undoSale('session-demo-1', director);
    expect(total(s, 'batch-h1')).toBe(before - 2640 * 26000);
    expect(s.slaughter.session('session-demo-1').isSold()).toBe(false);
    s.crossCheck.enterAgentKg('session-demo-1', 2641, director); // weights editable again
    expect(() => s.crossCheck.enterAgentKg('session-demo-2', 1, director)).not.toThrow();
  });

  it('batches: placement can be corrected and a closed batch reopened', () => {
    const s = setup();
    s.farm.editBatch('house-2', 5900, new Date('2026-11-13T08:00:00'), director);
    expect(s.farm.openBatch('house-2').getChicksPlaced()).toBe(5900);
    expect(() => s.farm.editBatch('house-2', 7000, new Date('2026-11-13T08:00:00'), director)).toThrow('at most');
    s.farm.closeBatch('house-2', director);
    s.farm.reopenBatch('house-2', director);
    expect(s.farm.openBatch('house-2').getId()).toBe('batch-h2');
  });

  it('direct sales can be corrected or deleted; Bazaar Agent sales only through the cross-check', () => {
    const s = setup();
    const sale = s.profit.recordDirectSale('house-1', new NurataSeller('n'), 100, 27000, new Date(), director);
    s.profit.editDirectSale(sale.getId(), 110, 27000, director);
    expect(s.profit.profitFor('batch-h1', director).entries.find((e) => e.getId() === sale.getId())?.getAmount()).toBe(110 * 27000);
    s.profit.deleteEntry(sale.getId(), director);
    expect(s.profit.profitFor('batch-h1', director).entries.some((e) => e.getId() === sale.getId())).toBe(false);
    expect(() => s.profit.deleteEntry('sale-demo-1', director)).toThrow('cross-check');
  });

  it('lists all sales, and direct sales (shop, Nurata seller, client) without Bazaar Agent sales', () => {
    const s = setup();
    const sale = s.profit.recordDirectSale('house-2', new NurataSeller('Nurata market'), 150, 27000, new Date(), director);
    const list = s.profit.directSales(director);
    expect(list.map((x) => x.getId())).toContain(sale.getId());
    expect(list.every((x) => !x.getBuyer().requiresCrossCheck())).toBe(true);
    const all = s.profit.allSales(director).map((x) => x.getId());
    expect(all).toContain(sale.getId());
    expect(all).toContain('sale-demo-1');
    expect(sale.getBatchId()).toBe('batch-h2');
    expect(() => s.profit.directSales(worker1)).toThrow('Only the Director');
    expect(() => s.profit.recordDirectSale('house-2', new BazaarAgent('a'), 10, 26000, new Date(), director)).toThrow('cross-check');
  });
});
