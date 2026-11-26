import { Repository } from '../../application/ports/Repository';
import { DomainError } from '../../domain/DomainError';
import { ThresholdRange } from '../../domain/environment/ThresholdRange';
import { Batch } from '../../domain/farm/Batch';
import { BatchStatus } from '../../domain/farm/BatchStatus';
import { Farm } from '../../domain/farm/Farm';
import { House } from '../../domain/farm/House';
import { MortalityRecord } from '../../domain/farm/MortalityRecord';
import { FeedDelivery } from '../../domain/feed/FeedDelivery';
import { Supplier, SupplierType } from '../../domain/feed/Supplier';
import { BazaarAgent, Buyer, Client, NurataSeller, ShopCustomer } from '../../domain/finance/Buyer';
import { CustomCategory } from '../../domain/finance/CustomCategory';
import { Expense, ExpenseCategory, ExpenseSource } from '../../domain/finance/Expense';
import { FinancialEntry } from '../../domain/finance/FinancialEntry';
import { Sale } from '../../domain/finance/Sale';
import { User } from '../../domain/people/User';
import { HeadCountCorrection } from '../../domain/slaughter/HeadCountCorrection';
import { HeadCountRecord } from '../../domain/slaughter/HeadCountRecord';
import { SessionKind, SlaughterSession } from '../../domain/slaughter/SlaughterSession';
import { WeightTally } from '../../domain/slaughter/WeightTally';
import { Serializer } from './Serializer';

const d = (iso: string) => new Date(iso);

export const farmSerializer: Serializer<Farm> = {
  toRecord: (farm) => ({
    id: farm.getId(),
    name: farm.getName(),
    houses: farm.getHouses().map((h) => ({
      id: h.getId(),
      name: h.getName(),
      capacity: h.getCapacity(),
      lightOn: h.isLightOn(),
      thresholds: [h.getThresholds().getMinTempC(), h.getThresholds().getMaxTempC(), h.getThresholds().getMinHumidityPct(), h.getThresholds().getMaxHumidityPct()],
      batches: h.getBatches().map((b) => ({ id: b.getId(), startDate: b.getStartDate().toISOString(), chicksPlaced: b.getChicksPlaced(), status: b.getStatus() })),
    })),
  }),
  fromRecord: (r) =>
    new Farm(
      r.id,
      r.name,
      r.houses.map(
        (h: any) =>
          new House(
            h.id,
            h.name,
            h.capacity,
            new ThresholdRange(h.thresholds[0], h.thresholds[1], h.thresholds[2], h.thresholds[3]),
            h.lightOn,
            h.batches.map((b: any) => new Batch(b.id, h.id, d(b.startDate), b.chicksPlaced, b.status as BatchStatus)),
          ),
      ),
    ),
};

export const supplierSerializer: Serializer<Supplier> = {
  toRecord: (s) => ({ id: s.getId(), name: s.getName(), type: s.getType(), active: s.isActive() }),
  fromRecord: (r) => new Supplier(r.id, r.name, r.type as SupplierType, r.active !== false),
};

export const categorySerializer: Serializer<CustomCategory> = {
  toRecord: (c) => ({ id: c.getId(), name: c.getName(), active: c.isActive() }),
  fromRecord: (r) => new CustomCategory(r.id, r.name, r.active !== false),
};

export function mortalitySerializer(users: Repository<User>): Serializer<MortalityRecord> {
  return {
    toRecord: (m) => ({
      id: m.getId(),
      batchId: m.getBatchId(),
      houseId: m.getHouseId(),
      timestamp: m.getTimestamp().toISOString(),
      count: m.getCount(),
      loggedBy: m.getLoggedBy().getId(),
      flaggedDuplicate: m.isFlaggedDuplicate(),
    }),
    fromRecord: (r) => {
      const user = users.findById(r.loggedBy);
      if (!user) throw new DomainError(`Unknown user ${r.loggedBy}`);
      return new MortalityRecord(r.id, r.batchId, r.houseId, d(r.timestamp), r.count, user, r.flaggedDuplicate);
    },
  };
}

export function feedSerializer(suppliers: Repository<Supplier>): Serializer<FeedDelivery> {
  return {
    toRecord: (f) => ({
      id: f.getId(),
      batchId: f.getBatchId(),
      supplierId: f.getSupplier().getId(),
      date: f.getDate().toISOString(),
      quantityKg: f.getQuantityKg(),
      cost: f.getCost(),
    }),
    fromRecord: (r) => {
      const supplier = suppliers.findById(r.supplierId);
      if (!supplier) throw new DomainError(`Unknown supplier ${r.supplierId}`);
      return new FeedDelivery(r.id, r.batchId, supplier, d(r.date), r.quantityKg, r.cost);
    },
  };
}

const BUYER_TYPES: Record<string, (name: string) => Buyer> = {
  'Bazaar Agent': (n) => new BazaarAgent(n),
  'Nurata Seller': (n) => new NurataSeller(n),
  'Shop Customer': (n) => new ShopCustomer(n),
  Client: (n) => new Client(n),
};

export function buyerFrom(type: string, name: string): Buyer {
  const make = BUYER_TYPES[type];
  if (!make) throw new DomainError(`Unknown buyer type ${type}`);
  return make(name);
}

/** Records saved before ExpenseSource existed: the id tells where they came from. */
function legacySource(id: string): ExpenseSource {
  if (id.startsWith('exp-crew-')) return ExpenseSource.CREW_PAY;
  if (id.startsWith('exp-feed')) return ExpenseSource.FEED_DELIVERY;
  return ExpenseSource.MANUAL;
}

export function financeSerializer(categories: Repository<CustomCategory>): Serializer<FinancialEntry> {
  return {
    toRecord: (e) => {
      const base = { id: e.getId(), batchId: e.getBatchId(), date: e.getDate().toISOString(), amount: e.getAmount() };
      if (e instanceof Expense)
        return { ...base, kind: 'expense', category: e.getCategory(), note: e.getNote(), source: e.getSource(), customCategoryId: e.getCustomCategory()?.getId() ?? null };
      if (e instanceof Sale) return { ...base, kind: 'sale', buyerType: e.getBuyer().typeLabel(), buyerName: e.getBuyer().getName(), kg: e.getKg(), pricePerKg: e.getPricePerKg() };
      throw new DomainError('Unknown financial entry');
    },
    fromRecord: (r) => {
      if (r.kind === 'sale') return new Sale(r.id, r.batchId, d(r.date), buyerFrom(r.buyerType, r.buyerName), r.kg, r.pricePerKg);
      // A category is archived, never erased; if one is missing anyway the expense shows as Other instead of breaking the app.
      const custom = r.customCategoryId ? (categories.findById(r.customCategoryId) ?? null) : null;
      return new Expense(r.id, r.batchId, d(r.date), r.amount, r.category as ExpenseCategory, r.note, (r.source as ExpenseSource) ?? legacySource(r.id), custom);
    },
  };
}

export const sessionSerializer: Serializer<SlaughterSession> = {
  toRecord: (s) => {
    const hc = s.getHeadCount();
    return {
      id: s.getId(),
      batchId: s.getBatchId(),
      date: s.getDate().toISOString(),
      kind: s.getKind(),
      headCount: hc && {
        reportedCount: hc.getReportedCount(),
        ratePerHead: hc.getRatePerHead(),
        recordedAt: hc.getRecordedAt().toISOString(),
        corrections: hc.getCorrections().map((c) => ({ newCount: c.getNewCount(), note: c.getNote(), at: c.getAt().toISOString() })),
      },
      tally: { agentKg: s.getTally().getAgentKg() ?? null, representativeKg: s.getTally().getRepresentativeKg() ?? null },
      saleId: s.getSaleId(),
    };
  },
  fromRecord: (r) =>
    new SlaughterSession(
      r.id,
      r.batchId,
      d(r.date),
      r.kind as SessionKind,
      r.headCount
        ? new HeadCountRecord(
            r.headCount.reportedCount,
            r.headCount.ratePerHead,
            d(r.headCount.recordedAt),
            r.headCount.corrections.map((c: any) => new HeadCountCorrection(c.newCount, c.note, d(c.at))),
          )
        : null,
      new WeightTally(r.tally.agentKg ?? undefined, r.tally.representativeKg ?? undefined),
      r.saleId,
    ),
};
